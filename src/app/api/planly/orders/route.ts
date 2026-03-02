import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const deliveryDate = searchParams.get('deliveryDate');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    let query = supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (deliveryDate) {
      query = query.eq('delivery_date', deliveryDate);
    }

    // Date range filtering
    if (startDate) {
      query = query.gte('delivery_date', startDate);
    }

    if (endDate) {
      query = query.lte('delivery_date', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { lines, ...orderData } = body;

    // Create order first
    const { data: order, error: orderError } = await supabase
      .from('planly_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Create order lines if provided
    if (lines && lines.length > 0) {
      const orderLines = lines.map((line: any) => ({
        ...line,
        order_id: order.id,
      }));

      const { error: linesError } = await supabase
        .from('planly_order_lines')
        .insert(orderLines);

      if (linesError) {
        console.error('Error creating order lines:', linesError);
        // Rollback order creation
        await supabase.from('planly_orders').delete().eq('id', order.id);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }
    }

    // Fetch complete order with lines
    const { data: completeOrder, error: fetchError } = await supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete order:', fetchError);
    }

    return NextResponse.json(completeOrder || order, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
