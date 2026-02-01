import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * POST /api/stockly/customers/[id]/pause
 * Pause customer (cosmetic only - no behavioral restrictions)
 * Customer maintains full portal access
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
    const body = await request.json();

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

    // Update to paused status (cosmetic only - no restrictions)
    const updateData: any = {
      status: 'paused',
      paused_at: new Date().toISOString(),
    };

    if (body.reason) {
      updateData.paused_reason = body.reason;
    }

    // Portal access remains enabled - no behavioral restrictions
    const { data: customer, error: updateError } = await supabase
      .from('order_book_customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error pausing customer:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to pause customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer paused successfully',
      data: customer,
    });
  } catch (error: any) {
    console.error('Error in POST /api/stockly/customers/[id]/pause:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

