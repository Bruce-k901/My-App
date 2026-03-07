import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  getWhatsAppCredentials,
  GRAPH_API_BASE,
} from '@/lib/whatsapp/client';

// ============================================================================
// GET    /api/whatsapp/templates — List templates for the user's company
// POST   /api/whatsapp/templates — Submit a new template to Meta for approval
// DELETE /api/whatsapp/templates — Delete a template from Meta
// ============================================================================

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const { data: templates, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      display_name,
      category = 'utility',
      language = 'en_GB',
      header_type,
      header_text,
      body_text,
      footer_text,
      buttons,
    } = body;

    if (!name || !body_text) {
      return NextResponse.json(
        { error: 'name and body_text are required' },
        { status: 400 },
      );
    }

    // Get WhatsApp credentials to submit to Meta
    const credentials = await getWhatsAppCredentials(profile.company_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'WhatsApp not configured' },
        { status: 503 },
      );
    }

    // Build Meta template components
    const components: Record<string, unknown>[] = [];
    if (header_type && header_text) {
      components.push({
        type: 'HEADER',
        format: header_type.toUpperCase(),
        text: header_text,
      });
    }
    components.push({
      type: 'BODY',
      text: body_text,
    });
    if (footer_text) {
      components.push({
        type: 'FOOTER',
        text: footer_text,
      });
    }
    if (buttons?.length) {
      components.push({
        type: 'BUTTONS',
        buttons,
      });
    }

    // Submit to Meta
    const metaRes = await fetch(
      `${GRAPH_API_BASE}/${credentials.wabaId}/message_templates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          language,
          category: category.toUpperCase(),
          components,
        }),
      },
    );

    const metaData = await metaRes.json();

    // Save to local table regardless of Meta response
    const admin = getSupabaseAdmin();
    const { data: template, error: dbError } = await admin
      .from('whatsapp_templates')
      .insert({
        company_id: profile.company_id,
        name,
        display_name: display_name || name.replace(/_/g, ' '),
        category,
        language,
        header_type,
        header_text,
        body_text,
        footer_text,
        buttons,
        meta_template_id: metaData.id || null,
        meta_status: metaRes.ok ? 'PENDING' : 'DRAFT',
        meta_rejection_reason: metaRes.ok ? null : metaData.error?.message,
        is_system: false,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      template,
      metaSubmitted: metaRes.ok,
      metaError: metaRes.ok ? null : metaData.error?.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const templateName = searchParams.get('name');

    if (!templateId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Delete from Meta if template has a name
    if (templateName) {
      const credentials = await getWhatsAppCredentials(profile.company_id);
      if (credentials) {
        await fetch(
          `${GRAPH_API_BASE}/${credentials.wabaId}/message_templates?name=${templateName}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          },
        );
      }
    }

    // Delete from local table
    const { error } = await admin
      .from('whatsapp_templates')
      .delete()
      .eq('id', templateId)
      .eq('company_id', profile.company_id)
      .eq('is_system', false); // Cannot delete system templates

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
