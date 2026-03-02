import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const deliveryDate = searchParams.get('deliveryDate');
    const siteId = searchParams.get('siteId');

    if (!deliveryDate) {
      return NextResponse.json(
        { error: 'deliveryDate query parameter is required' },
        { status: 400 }
      );
    }

    // Get all orders for this delivery date
    let query = supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers!inner(
          *,
          site_id
        ),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('delivery_date', deliveryDate)
      .in('status', ['confirmed', 'locked']);

    if (siteId) {
      query = query.eq('customer.site_id', siteId);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching order book:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to order book format
    const orderBook = orders?.map((order: any) => ({
      customer_id: order.customer_id,
      customer_name: order.customer?.name || '',
      delivery_date: order.delivery_date,
      products: order.lines?.map((line: any) => ({
        product_id: line.product_id,
        product_name: line.product?.name || '',
        quantity: line.quantity,
        unit_price: line.unit_price_snapshot,
        is_locked: line.is_locked,
      })) || [],
      total_value: order.total_value || 0,
      is_locked: order.status === 'locked',
    })) || [];

    return NextResponse.json({
      date: deliveryDate,
      orders: orderBook,
    });
  } catch (error) {
    console.error('Error in GET /api/planly/orders/book:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
