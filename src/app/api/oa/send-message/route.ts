import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { oa } from '@/lib/oa';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get sender's profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('id, company_id, full_name')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (!senderProfile?.company_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Parse and validate
    const body = await request.json();
    const { recipientProfileId, content } = body;

    if (!recipientProfileId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientProfileId and content' },
        { status: 400 },
      );
    }

    // 4. Verify recipient exists and is in same company
    const supabaseAdmin = getSupabaseAdmin();
    const { data: recipient } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id, full_name')
      .eq('id', recipientProfileId)
      .maybeSingle();

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    if (recipient.company_id !== senderProfile.company_id) {
      return NextResponse.json({ error: 'Recipient not in your company' }, { status: 403 });
    }

    // 5. Send DM via OA
    const channelId = await oa.sendDM({
      recipientProfileId,
      content: content.trim(),
      companyId: senderProfile.company_id,
      metadata: {
        messageType: 'general',
        sentBy: senderProfile.full_name,
        sentByProfileId: senderProfile.id,
      },
    });

    if (!channelId) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      channelId,
      recipientName: recipient.full_name,
    });
  } catch (error: any) {
    console.error('Error in POST /api/oa/send-message:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
