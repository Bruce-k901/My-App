import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const orderLineId = searchParams.get('orderLineId');
    const status = searchParams.get('status');

    let query = supabase
      .from('planly_delivery_issues')
      .select(`
        *,
        order_line:planly_order_lines(
          *,
          product:planly_products(*),
          order:planly_orders(
            *,
            customer:planly_customers(*)
          )
        )
      `)
      .order('reported_at', { ascending: false });

    if (orderLineId) {
      query = query.eq('order_line_id', orderLineId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching delivery issues:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/delivery-issues:', error);
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

    const { data, error } = await supabase
      .from('planly_delivery_issues')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Error creating delivery issue:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/delivery-issues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
