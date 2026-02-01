import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const today = new Date().toISOString().split('T')[0];

    // Try customer-specific price first
    if (customerId) {
      const { data: customerPrice } = await supabase
        .from('planly_customer_product_prices')
        .select('unit_price')
        .eq('product_id', productId)
        .eq('customer_id', customerId)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (customerPrice) {
        return NextResponse.json({
          unit_price: customerPrice.unit_price,
          price_type: 'customer',
        });
      }
    }

    // Fall back to list price
    const { data: listPrice } = await supabase
      .from('planly_product_list_prices')
      .select('list_price')
      .eq('product_id', productId)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (listPrice) {
      return NextResponse.json({
        list_price: listPrice.list_price,
        unit_price: listPrice.list_price,
        price_type: 'list',
      });
    }

    // No price found - return 0 as default
    return NextResponse.json({
      unit_price: 0,
      list_price: 0,
      price_type: 'none',
    });
  } catch (error) {
    console.error('Error in GET /api/planly/products/[id]/price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
