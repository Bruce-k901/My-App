import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/customer/orders/batch
 * Batch create/update planly_orders from the customer portal.
 * Server-side resolves pricing.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id, site_id, orders } = body;

    if (!customer_id || !site_id || !orders?.length) {
      return NextResponse.json(
        { error: 'customer_id, site_id, and orders are required' },
        { status: 400 }
      );
    }

    // Get customer default ship state
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('default_ship_state')
      .eq('id', customer_id)
      .single();

    const defaultShipState = customer?.default_ship_state || 'baked';

    // Collect all unique product IDs across all orders
    const allProductIds = new Set<string>();
    orders.forEach((o: any) => {
      o.items?.forEach((item: any) => {
        if (item.quantity > 0) allProductIds.add(item.product_id);
      });
    });
    const productIds = Array.from(allProductIds);

    // Batch fetch pricing
    const today = new Date().toISOString().split('T')[0];
    const [{ data: customerPrices }, { data: listPrices }] = await Promise.all([
      supabase
        .from('planly_customer_product_prices')
        .select('product_id, unit_price, effective_from, effective_to')
        .eq('customer_id', customer_id)
        .in('product_id', productIds)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false }),
      supabase
        .from('planly_product_list_prices')
        .select('product_id, list_price, effective_from, effective_to')
        .in('product_id', productIds)
        .lte('effective_from', today)
        .order('effective_from', { ascending: false }),
    ]);

    const customerPriceMap = new Map<string, number>();
    (customerPrices || []).forEach(p => {
      if (customerPriceMap.has(p.product_id)) return;
      if (p.effective_to && p.effective_to < today) return;
      customerPriceMap.set(p.product_id, parseFloat(p.unit_price));
    });

    const listPriceMap = new Map<string, number>();
    (listPrices || []).forEach(p => {
      if (listPriceMap.has(p.product_id)) return;
      if (p.effective_to && p.effective_to < today) return;
      listPriceMap.set(p.product_id, parseFloat(p.list_price));
    });

    // Check for existing orders on these dates
    const deliveryDates = orders.map((o: any) => o.delivery_date);
    const { data: existingOrders } = await supabase
      .from('planly_orders')
      .select('id, delivery_date, status')
      .eq('customer_id', customer_id)
      .in('delivery_date', deliveryDates)
      .in('status', ['draft', 'confirmed']);

    const existingOrderMap = new Map<string, { id: string; status: string }>();
    (existingOrders || []).forEach(o => {
      existingOrderMap.set(o.delivery_date, { id: o.id, status: o.status });
    });

    let created = 0;
    let updated = 0;

    for (const orderInput of orders) {
      const { delivery_date, items } = orderInput;
      const validItems = (items || []).filter((item: any) => item.quantity > 0);

      if (validItems.length === 0) {
        // Delete existing order if no items
        const existing = existingOrderMap.get(delivery_date);
        if (existing) {
          await supabase.from('planly_orders').delete().eq('id', existing.id);
        }
        continue;
      }

      const orderLines = validItems.map((item: any) => {
        const unitPrice = customerPriceMap.get(item.product_id)
          || listPriceMap.get(item.product_id)
          || 0;
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_snapshot: unitPrice,
          ship_state: item.ship_state || defaultShipState,
          is_locked: false,
        };
      });

      const totalValue = orderLines.reduce(
        (sum: number, l: any) => sum + l.quantity * l.unit_price_snapshot,
        0
      );

      const existing = existingOrderMap.get(delivery_date);

      if (existing) {
        await supabase
          .from('planly_orders')
          .update({ total_value: totalValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        await supabase
          .from('planly_order_lines')
          .delete()
          .eq('order_id', existing.id);

        await supabase
          .from('planly_order_lines')
          .insert(orderLines.map((l: any) => ({ ...l, order_id: existing.id })));

        updated++;
      } else {
        const { data: newOrder, error: orderError } = await supabase
          .from('planly_orders')
          .insert({
            customer_id,
            site_id,
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

        const { error: linesError } = await supabase
          .from('planly_order_lines')
          .insert(orderLines.map((l: any) => ({ ...l, order_id: newOrder.id })));

        if (linesError) {
          console.error('Error inserting lines:', linesError);
          await supabase.from('planly_orders').delete().eq('id', newOrder.id);
          continue;
        }

        created++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { created, updated, total: created + updated },
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/orders/batch:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
