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
      .from('planly_customer_product_prices')
      .select(`
        *,
        product:planly_products(*)
      `)
      .eq('customer_id', id)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching customer prices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/customers/[id]/prices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_customer_product_prices')
      .insert({
        ...body,
        customer_id: id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer price:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/customers/[id]/prices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
