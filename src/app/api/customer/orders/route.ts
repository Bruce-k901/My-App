import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/orders?customer_id=X
 * Returns orders from planly_orders with lines, shaped as Order[].
 *
 * POST /api/customer/orders
 * Creates a planly_order + planly_order_lines.
 * Server-side resolves pricing from planly customer/list prices.
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

    const deliveryDate = request.nextUrl.searchParams.get('delivery_date');

    let query = supabase
      .from('planly_orders')
      .select('id, customer_id, delivery_date, status, total_value, notes, created_at, updated_at')
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
      .order('delivery_date', { ascending: true });

    if (deliveryDate) {
      query = query.eq('delivery_date', deliveryDate);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 });
    }

    // Fetch all order lines for these orders
    const orderIds = orders.map(o => o.id);
    const { data: allLines } = await supabase
      .from('planly_order_lines')
      .select('id, order_id, product_id, quantity, unit_price_snapshot, ship_state')
      .in('order_id', orderIds);

    // Get product names via ingredients_library
    const productIds = [...new Set((allLines || []).map(l => l.product_id))];
    let productNameMap = new Map<string, { name: string; unit: string; category: string | null }>();

    if (productIds.length > 0) {
      const { data: planlyProducts } = await supabase
        .from('planly_products')
        .select('id, stockly_product_id, category:planly_categories(name)')
        .in('id', productIds);

      const stocklyIds = (planlyProducts || []).map(p => p.stockly_product_id).filter(Boolean);
      if (stocklyIds.length > 0) {
        const { data: ingredients } = await supabase
          .from('ingredients_library')
          .select('id, ingredient_name, unit')
          .in('id', stocklyIds);

        const ingredientMap = new Map(
          (ingredients || []).map(i => [i.id, i])
        );

        (planlyProducts || []).forEach(p => {
          const ing = ingredientMap.get(p.stockly_product_id);
          const cat = p.category as any;
          if (ing) {
            productNameMap.set(p.id, {
              name: ing.ingredient_name,
              unit: ing.unit || 'unit',
              category: cat?.name || null,
            });
          }
        });
      }
    }

    // Group lines by order
    const linesByOrder = new Map<string, any[]>();
    (allLines || []).forEach(line => {
      if (!linesByOrder.has(line.order_id)) {
        linesByOrder.set(line.order_id, []);
      }
      const productInfo = productNameMap.get(line.product_id);
      linesByOrder.get(line.order_id)!.push({
        id: line.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: parseFloat(line.unit_price_snapshot),
        line_total: line.quantity * parseFloat(line.unit_price_snapshot),
        product: productInfo ? {
          name: productInfo.name,
          unit: productInfo.unit,
          category: productInfo.category,
        } : undefined,
      });
    });

    // Shape response as Order[]
    const shaped = orders.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      delivery_date: order.delivery_date,
      order_date: order.created_at,
      status: order.status,
      total: parseFloat(order.total_value) || 0,
      subtotal: parseFloat(order.total_value) || 0,
      items: linesByOrder.get(order.id) || [],
    }));

    return NextResponse.json({ success: true, data: shaped, count: shaped.length });
  } catch (error: any) {
    console.error('Error in GET /api/customer/orders:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id, site_id, delivery_date, items } = body;

    if (!customer_id || !site_id || !delivery_date || !items?.length) {
      return NextResponse.json(
        { error: 'customer_id, site_id, delivery_date, and items are required' },
        { status: 400 }
      );
    }

    // Filter out zero-quantity items
    const validItems = items.filter((item: any) => item.quantity > 0);
    if (validItems.length === 0) {
      return NextResponse.json({ error: 'No valid items' }, { status: 400 });
    }

    // Get customer info for default_ship_state
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('default_ship_state')
      .eq('id', customer_id)
      .single();

    const defaultShipState = customer?.default_ship_state || 'baked';

    // Resolve pricing: customer-specific → list price → 0
    const productIds = validItems.map((item: any) => item.product_id);
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

    // Build price maps (most recent effective price)
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

    // Check for existing order on this date (upsert pattern)
    const { data: existingOrders } = await supabase
      .from('planly_orders')
      .select('id, status')
      .eq('customer_id', customer_id)
      .eq('delivery_date', delivery_date)
      .in('status', ['draft', 'confirmed']);

    const existingOrder = existingOrders?.[0];

    // Build order lines with resolved pricing
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
      (sum: number, line: any) => sum + line.quantity * line.unit_price_snapshot,
      0
    );

    let orderId: string;

    if (existingOrder) {
      // Update existing order
      const { error: updateError } = await supabase
        .from('planly_orders')
        .update({ total_value: totalValue, updated_at: new Date().toISOString() })
        .eq('id', existingOrder.id);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Delete old lines, insert new
      await supabase
        .from('planly_order_lines')
        .delete()
        .eq('order_id', existingOrder.id);

      const linesWithOrderId = orderLines.map((l: any) => ({ ...l, order_id: existingOrder.id }));
      const { error: linesError } = await supabase
        .from('planly_order_lines')
        .insert(linesWithOrderId);

      if (linesError) {
        console.error('Error inserting order lines:', linesError);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }

      orderId = existingOrder.id;
    } else {
      // Create new order
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
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      const linesWithOrderId = orderLines.map((l: any) => ({ ...l, order_id: newOrder.id }));
      const { error: linesError } = await supabase
        .from('planly_order_lines')
        .insert(linesWithOrderId);

      if (linesError) {
        console.error('Error inserting order lines:', linesError);
        // Rollback
        await supabase.from('planly_orders').delete().eq('id', newOrder.id);
        return NextResponse.json({ error: linesError.message }, { status: 500 });
      }

      orderId = newOrder.id;
    }

    return NextResponse.json({
      success: true,
      data: { id: orderId, delivery_date, total: totalValue },
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/orders:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
