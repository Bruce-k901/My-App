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

    // If Resend is configured, send the email
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'Orders Portal <orders@opsly.io>',
          to: portalUser.email,
          subject: `You're invited to the ordering portal`,
          html: `
            <h2>Welcome to the Ordering Portal</h2>
            <p>Hi ${portalUser.name},</p>
            <p>You've been invited to join the online ordering portal for ${portalUser.customer?.name}.</p>
            <p>Click the link below to set up your account:</p>
            <p><a href="${inviteUrl}">${inviteUrl}</a></p>
            <p>This invite expires on ${expiresAt.toLocaleDateString()}.</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the request if email fails - the invite is still created
      }
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
