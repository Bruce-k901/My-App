import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/pricing?customer_id=X
 * Returns customer-specific pricing from planly_customer_product_prices,
 * filtered by current effective date.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = request.nextUrl.searchParams.get('customer_id');
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: pricing, error } = await supabase
      .from('planly_customer_product_prices')
      .select('product_id, unit_price, effective_from, effective_to')
      .eq('customer_id', customerId)
      .lte('effective_from', today)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching customer pricing:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate: keep only the most recent effective price per product
    const priceMap = new Map<string, number>();
    (pricing || []).forEach(p => {
      if (priceMap.has(p.product_id)) return;
      if (p.effective_to && p.effective_to < today) return;
      priceMap.set(p.product_id, parseFloat(p.unit_price));
    });

    // Shape to match existing { product_id, custom_price } format
    const data = Array.from(priceMap.entries()).map(([product_id, custom_price]) => ({
      product_id,
      custom_price,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in GET /api/customer/pricing:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
