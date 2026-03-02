import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

// POST - Send or resend invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: customerId, userId } = await params;

    // Get portal user and customer details
    const { data: portalUser, error: userError } = await supabase
      .from('planly_customer_portal_users')
      .select(`
        *,
        customer:planly_customers(
          name,
          site_id
        )
      `)
      .eq('id', userId)
      .eq('customer_id', customerId)
      .single();

    if (userError || !portalUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (portalUser.auth_user_id) {
      return NextResponse.json(
        { error: 'User already has an active account' },
        { status: 400 }
      );
    }

    // Generate new token and expiry
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Update user with new token
    const { error: updateError } = await supabase
      .from('planly_customer_portal_users')
      .update({
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating invite token:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
    const inviteUrl = `${baseUrl}/portal/accept-invite?token=${inviteToken}`;

    // TODO: Send email via Resend or other email provider
    // For now, just log the invite URL
    console.log('Portal invite URL:', inviteUrl);
    console.log('Invite for:', portalUser.email);

    // TODO: Send email via Resend once configured
    // Install `resend` and set RESEND_API_KEY env var to enable
    if (process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY is set but resend package is not yet installed. Skipping email.');
    }

    return NextResponse.json({
      success: true,
      invite_sent_at: new Date().toISOString(),
      invite_expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in POST /api/planly/customers/[id]/portal-users/[userId]/invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
