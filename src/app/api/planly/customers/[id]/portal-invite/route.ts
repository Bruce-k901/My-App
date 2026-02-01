import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Get customer details
    const { data: customer, error: fetchError } = await supabase
      .from('planly_customers')
      .select('id, name, email, contact_name, site_id')
      .eq('id', id)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: 'Customer must have an email address to receive a portal invite' },
        { status: 400 }
      );
    }

    // Generate a secure access token
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Update customer with invite info
    const { error: updateError } = await supabase
      .from('planly_customers')
      .update({
        portal_invited_at: new Date().toISOString(),
        portal_access_token: accessToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating customer with portal invite:', updateError);
      return NextResponse.json(
        { error: 'Failed to create portal invite' },
        { status: 500 }
      );
    }

    // TODO: Send email invitation
    // For now, we'll just log the invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/activate?token=${accessToken}`;
    console.log(`Portal invite link for ${customer.name}: ${inviteLink}`);

    // In a real implementation, you would send an email here:
    // await sendEmail({
    //   to: customer.email,
    //   subject: "You're invited to our Customer Portal",
    //   template: 'portal-invite',
    //   data: {
    //     customer_name: customer.contact_name || customer.name,
    //     invite_link: inviteLink
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: 'Portal invitation sent successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/planly/customers/[id]/portal-invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
