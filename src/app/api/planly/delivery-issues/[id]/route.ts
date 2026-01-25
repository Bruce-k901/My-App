import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching delivery issue:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/delivery-issues/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_delivery_issues')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating delivery issue:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/delivery-issues/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
