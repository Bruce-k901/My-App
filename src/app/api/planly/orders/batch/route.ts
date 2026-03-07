import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface OrderLine {
  product_id: string;
  quantity: number;
  unit_price_snapshot: number;
  ship_state: 'baked' | 'frozen';
}

interface OrderInput {
  delivery_date: string;
  lines: OrderLine[];
}

interface BatchOrderRequest {
  customer_id: string;
  site_id: string;
  orders: OrderInput[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body: BatchOrderRequest = await request.json();

    const { customer_id, site_id, orders } = body;

    if (!customer_id || !site_id || !orders) {
      return NextResponse.json(
        { error: 'customer_id, site_id, and orders are required' },
        { status: 400 }
      );
    }

    // Get all unique delivery dates
    const deliveryDates = orders.map((o) => o.delivery_date);

    // Check for existing orders for this customer on these dates
    // Note: orders don't have site_id - site access is through customer relationship
    const { data: existingOrders, error: fetchError } = await supabase
      .from('planly_orders')
      .select('id, delivery_date')
      .eq('customer_id', customer_id)
      .in('delivery_date', deliveryDates);

    if (fetchError) {
      console.error('Error fetching existing orders:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Create a map of existing orders by date
    const existingOrderMap: Record<string, string> = {};
    for (const order of existingOrders || []) {
      existingOrderMap[order.delivery_date] = order.id;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const orderInput of orders) {
      const { delivery_date, lines } = orderInput;

      // Filter out zero-quantity lines
      const validLines = lines.filter((line) => line.quantity > 0);

      if (validLines.length === 0) {
        // No items for this day - skip or delete existing order
        const existingOrderId = existingOrderMap[delivery_date];
        if (existingOrderId) {
          // Delete the existing order (cascade will delete lines)
          const { error: deleteError } = await supabase
            .from('planly_orders')
            .delete()
            .eq('id', existingOrderId);

          if (deleteError) {
            console.error('Error deleting order:', deleteError);
          }
        }
        skipped++;
        continue;
      }

      // Calculate total value
      const totalValue = validLines.reduce(
        (sum, line) => sum + line.quantity * line.unit_price_snapshot,
        0
      );

      const existingOrderId = existingOrderMap[delivery_date];

      if (existingOrderId) {
        // Update existing order
        const { error: updateError } = await supabase
          .from('planly_orders')
          .update({
            total_value: totalValue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOrderId);

        if (updateError) {
          console.error('Error updating order:', updateError);
          continue;
        }

        // Delete existing lines
        const { error: deleteLinesError } = await supabase
          .from('planly_order_lines')
          .delete()
          .eq('order_id', existingOrderId);

        if (deleteLinesError) {
          console.error('Error deleting order lines:', deleteLinesError);
          continue;
        }

        // Insert new lines
        const orderLines = validLines.map((line) => ({
          order_id: existingOrderId,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price_snapshot: line.unit_price_snapshot,
          ship_state: line.ship_state,
          is_locked: false,
        }));

        const { error: insertLinesError } = await supabase
          .from('planly_order_lines')
          .insert(orderLines);

        if (insertLinesError) {
          console.error('Error inserting order lines:', insertLinesError);
          continue;
        }

        updated++;
      } else {
        // Create new order (site access is through customer relationship)
        const { data: newOrder, error: orderError } = await supabase
          .from('planly_orders')
          .insert({
            customer_id,
            delivery_date,
            status: 'confirmed',
            total_value: totalValue,
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
          continue;
        }

        // Insert order lines
        const orderLines = validLines.map((line) => ({
          order_id: newOrder.id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price_snapshot: line.unit_price_snapshot,
          ship_state: line.ship_state,
          is_locked: false,
        }));

        const { error: linesError } = await supabase
          .from('planly_order_lines')
          .insert(orderLines);

        if (linesError) {
          console.error('Error creating order lines:', linesError);
          // Rollback order creation
          await supabase.from('planly_orders').delete().eq('id', newOrder.id);
          continue;
        }

        created++;
      }
    }

    return NextResponse.json({ created, updated, skipped }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/planly/orders/batch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
