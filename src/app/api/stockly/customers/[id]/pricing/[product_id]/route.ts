import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * DELETE /api/stockly/customers/[id]/pricing/[product_id]
 * Remove custom price (revert to standard pricing)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; product_id: string } }
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

    const { id, product_id } = params;

    // Verify customer ownership
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify product belongs to supplier
    const { data: product } = await supabase
      .from('order_book_products')
      .select('id, supplier_id')
      .eq('id', product_id)
      .eq('supplier_id', supplierId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete custom pricing
    const { error: deleteError } = await supabase
      .from('order_book_customer_pricing')
      .delete()
      .eq('customer_id', id)
      .eq('product_id', product_id);

    if (deleteError) {
      console.error('Error removing custom price:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to remove custom price' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Custom price removed successfully',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/stockly/customers/[id]/pricing/[product_id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

