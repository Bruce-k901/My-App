import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';
import { sendPortalInviteEmail } from '@/lib/stockly/portalInvitationHelpers';

/**
 * POST /api/stockly/customers/[id]/send-invite
 * Send portal invitation email
 * Generates new token, expires old one, allows multiple invites
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;

    // Get customer and verify ownership
    const { data: customer, error: customerError } = await supabase
      .from('order_book_customers')
      .select('id, email, business_name, contact_name, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    // Send invitation email (this will generate new token and expire old one)
    try {
      await sendPortalInviteEmail({
        id: customer.id,
        email: customer.email,
        business_name: customer.business_name,
        contact_name: customer.contact_name,
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
      });
    } catch (inviteError: any) {
      console.error('Error sending invitation:', inviteError);
      return NextResponse.json(
        { error: inviteError.message || 'Failed to send invitation' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/stockly/customers/[id]/send-invite:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

