import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * PATCH /api/stockly/customers/[id]/unarchive
 * Unarchive customer (restore portal access)
 */
export async function PATCH(
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

    // Verify ownership
    const { data: existing } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id, status')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'archived') {
      return NextResponse.json(
        { error: 'Customer is not archived' },
        { status: 400 }
      );
    }

    // Unarchive customer
    const { data: customer, error: updateError } = await supabase
      .from('order_book_customers')
      .update({
        status: 'active',
        archived_at: null,
        portal_access_enabled: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error unarchiving customer:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to unarchive customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer unarchived successfully',
      data: customer,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/stockly/customers/[id]/unarchive:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

