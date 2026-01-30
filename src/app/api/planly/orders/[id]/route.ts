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
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/orders/[id]:', error);
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
    const { lines, ...orderData } = body;

    // Update order
    const { data: order, error: orderError } = await supabase
      .from('planly_orders')
      .update(orderData)
      .eq('id', id)
      .select()
      .single();

    if (orderError) {
      console.error('Error updating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Update lines if provided
    if (lines) {
      // Delete existing lines
      await supabase.from('planly_order_lines').delete().eq('order_id', id);

      // Insert new lines
      if (lines.length > 0) {
        const orderLines = lines.map((line: any) => ({
          ...line,
          order_id: id,
        }));

        const { error: linesError } = await supabase
          .from('planly_order_lines')
          .insert(orderLines);

        if (linesError) {
          console.error('Error updating order lines:', linesError);
          return NextResponse.json({ error: linesError.message }, { status: 500 });
        }
      }
    }

    // Fetch complete order
    const { data: completeOrder } = await supabase
      .from('planly_orders')
      .select(`
        *,
        customer:planly_customers(*),
        lines:planly_order_lines(
          *,
          product:planly_products(*)
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json(completeOrder || order);
  } catch (error) {
    console.error('Error in PUT /api/planly/orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = params;

    const { error } = await supabase
      .from('planly_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/planly/orders/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
