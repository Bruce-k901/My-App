import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { addDays, format, parseISO } from 'date-fns';

/**
 * POST /api/planly/standing-orders/generate
 * Generate orders from standing orders for a date range
 *
 * Body:
 * - start_date: string (YYYY-MM-DD)
 * - end_date: string (YYYY-MM-DD)
 * - site_id: string
 * - auto_confirm: boolean (default: false) - if true, creates confirmed orders, else draft
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { start_date, end_date, site_id, auto_confirm = false } = body;

    if (!start_date || !end_date || !site_id) {
      return NextResponse.json(
        { error: 'start_date, end_date, and site_id are required' },
        { status: 400 }
      );
    }

    console.log('[Standing Orders Generate]', { start_date, end_date, site_id, auto_confirm });

    // Get all active standing orders for this site
    const { data: standingOrders, error: soError } = await supabase
      .from('planly_standing_orders')
      .select('*, customer:planly_customers(id, name, site_id)')
      .eq('site_id', site_id)
      .eq('is_active', true)
      .eq('is_paused', false);

    if (soError) {
      console.error('Error fetching standing orders:', soError);
      return NextResponse.json({ error: soError.message }, { status: 500 });
    }

    if (!standingOrders || standingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active standing orders found',
        generated: 0,
        skipped: 0,
      });
    }

    // Generate orders for each delivery date in range
    const startDate = parseISO(start_date);
    const endDate = parseISO(end_date);

    const ordersToCreate = [];
    const skipped = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const dayName = format(currentDate, 'EEEE').toLowerCase(); // monday, tuesday, etc.
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Check each standing order to see if it should deliver on this day
      for (const standingOrder of standingOrders) {
        const customer = standingOrder.customer as any;
        if (!customer) continue;

        // Check if this standing order delivers on this day
        const deliveryDays = standingOrder.delivery_days || [];
        if (!deliveryDays.includes(dayName)) {
          continue;
        }

        // Check if order already exists for this customer and date
        const { data: existingOrder } = await supabase
          .from('planly_orders')
          .select('id')
          .eq('customer_id', standingOrder.customer_id)
          .eq('delivery_date', dateStr)
          .maybeSingle();

        if (existingOrder) {
          skipped.push({
            customer_id: standingOrder.customer_id,
            customer_name: customer.name,
            delivery_date: dateStr,
            reason: 'Order already exists',
          });
          continue;
        }

        // Create order from standing order (store items separately for later)
        ordersToCreate.push({
          customer_id: standingOrder.customer_id,
          delivery_date: dateStr,
          status: auto_confirm ? 'confirmed' : 'draft',
          notes: `Auto-generated from standing order`,
          standing_order_id: standingOrder.id,
          _items: standingOrder.items, // Temp field for processing, not inserted
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    // Bulk insert orders (exclude _items temp field)
    let created = 0;
    if (ordersToCreate.length > 0) {
      // Remove _items from the data to be inserted
      const ordersForInsert = ordersToCreate.map(({ _items, ...order }) => order);

      const { data: createdOrders, error: createError } = await supabase
        .from('planly_orders')
        .insert(ordersForInsert)
        .select('id, customer_id, delivery_date, status');

      if (createError) {
        console.error('Error creating orders:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      created = createdOrders?.length || 0;

      // Create order lines for each order
      for (const order of createdOrders || []) {
        const sourceOrder = ordersToCreate.find(o =>
          o.customer_id === order.customer_id && o.delivery_date === order.delivery_date
        );

        if (sourceOrder && sourceOrder._items) {
          const items = sourceOrder._items as any[];
          const orderLines = items.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price_snapshot: 0, // Will be updated with actual pricing later
            notes: null,
          }));

          const { error: linesError } = await supabase
            .from('planly_order_lines')
            .insert(orderLines);

          if (linesError) {
            console.error('Error creating order lines:', linesError);
          }
        }
      }

      // Send notifications to customers about generated orders (grouped by customer)
      const ordersByCustomer = new Map<string, { ids: string[]; standing_order_id: string }>();
      for (const order of createdOrders || []) {
        const sourceOrder = ordersToCreate.find(o =>
          o.customer_id === order.customer_id && o.delivery_date === order.delivery_date
        );
        if (!ordersByCustomer.has(order.customer_id)) {
          ordersByCustomer.set(order.customer_id, {
            ids: [],
            standing_order_id: sourceOrder?.standing_order_id || '',
          });
        }
        ordersByCustomer.get(order.customer_id)!.ids.push(order.id);
      }

      // Send notifications asynchronously (don't wait for them)
      for (const [customerId, { ids, standing_order_id }] of ordersByCustomer.entries()) {
        fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/planly/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId,
            order_ids: ids,
            standing_order_id,
            notification_type: 'order_generated',
          }),
        }).catch(error => {
          console.error('Error sending notification:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      generated: created,
      skipped: skipped.length,
      details: {
        created_orders: ordersToCreate.length,
        skipped_orders: skipped,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/planly/standing-orders/generate:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
