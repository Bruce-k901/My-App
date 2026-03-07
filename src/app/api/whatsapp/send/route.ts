import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getWhatsAppCredentials,
  sendTemplateMessage,
  sendTextMessage,
  type TemplateParam,
} from '@/lib/whatsapp/client';
import { toE164 } from '@/lib/whatsapp/phone';
import { isServiceWindowOpen } from '@/lib/whatsapp/service-window';
import { bridgeOutboundToMsgly } from '@/lib/whatsapp/bridge';

// ============================================================================
// POST /api/whatsapp/send
// Internal API called by Opsly modules to send WhatsApp messages.
// Requires authenticated user. Validates opt-in, service window, and rate.
// ============================================================================

interface SendRequest {
  phone_number: string;
  template_name?: string;
  template_params?: Record<string, string>;
  text?: string;                          // Free-form text (service window only)
  linked_entity_type?: string;
  linked_entity_id?: string;
  site_id?: string;
}

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // 2. Parse and validate
    const body = (await request.json()) as SendRequest;

    if (!body.phone_number) {
      return NextResponse.json({ error: 'phone_number is required' }, { status: 400 });
    }

    if (!body.template_name && !body.text) {
      return NextResponse.json(
        { error: 'Either template_name or text is required' },
        { status: 400 },
      );
    }

    // Normalise phone number
    const phone = toE164(body.phone_number);
    if (!phone) {
      return NextResponse.json(
        { error: 'Invalid phone number. Must be a valid UK or international number.' },
        { status: 400 },
      );
    }

    // 3. Check contact exists and has opted in
    const admin = getSupabaseAdmin();
    const { data: contact } = await admin
      .from('whatsapp_contacts')
      .select('id, opted_in, msgly_channel_id')
      .eq('phone_number', phone)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (!contact?.opted_in) {
      return NextResponse.json(
        { error: 'Contact has not opted in to WhatsApp messages' },
        { status: 403 },
      );
    }

    // 4. For free-form text, check service window
    if (body.text && !body.template_name) {
      const windowOpen = await isServiceWindowOpen(phone, profile.company_id);
      if (!windowOpen) {
        return NextResponse.json(
          { error: 'Service window closed. Use a template instead of free-form text.' },
          { status: 422 },
        );
      }
    }

    // 5. Get WhatsApp credentials
    const credentials = await getWhatsAppCredentials(profile.company_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'WhatsApp is not configured. Connect in Settings.' },
        { status: 503 },
      );
    }

    // 6. Send the message
    let result: { success: boolean; waMessageId?: string; error?: string };
    let messageType: string;
    let content: string;

    if (body.template_name) {
      // Build template parameters
      const bodyParams: TemplateParam[] = Object.entries(body.template_params || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => ({ type: 'text' as const, text: value }));

      result = await sendTemplateMessage({
        to: phone,
        templateName: body.template_name,
        bodyParams: bodyParams.length ? bodyParams : undefined,
        credentials,
      });

      messageType = 'template';
      content = Object.values(body.template_params || {}).join(' | ');
    } else {
      result = await sendTextMessage(phone, body.text!, credentials);
      messageType = 'text';
      content = body.text!;
    }

    // 7. Log the message
    const messageRow = {
      company_id: profile.company_id,
      site_id: body.site_id || null,
      direction: 'outbound' as const,
      wa_message_id: result.waMessageId || null,
      phone_number: phone,
      message_type: messageType,
      template_name: body.template_name || null,
      template_params: body.template_params ? body.template_params : null,
      content,
      status: result.success ? 'sent' : 'failed',
      status_updated_at: new Date().toISOString(),
      error_code: result.success ? null : 'SEND_FAILED',
      error_message: result.error || null,
      linked_entity_type: body.linked_entity_type || null,
      linked_entity_id: body.linked_entity_id || null,
      triggered_by: user.id,
      processing_status: 'processed' as const,
      // Set up retry if failed
      ...(result.success
        ? {}
        : {
            retry_count: 0,
            next_retry_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min
          }),
    };

    const { data: savedMsg } = await admin
      .from('whatsapp_messages')
      .insert(messageRow)
      .select('id')
      .single();

    // 8. Bridge to Msgly (fire-and-forget)
    if (result.success && contact.msgly_channel_id) {
      bridgeOutboundToMsgly({
        companyId: profile.company_id,
        phoneNumber: phone,
        content,
        templateName: body.template_name,
        triggeredByName: profile.full_name || undefined,
        channelId: contact.msgly_channel_id,
      }).catch((err) => {
        console.error('[whatsapp/send] Bridge error:', err);
      });
    }

    // 9. Return response
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send WhatsApp message',
          messageId: savedMsg?.id,
          retryScheduled: true,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: savedMsg?.id,
      waMessageId: result.waMessageId,
    });
  } catch (error: any) {
    console.error('[whatsapp/send] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
