import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/order-book/orders/batch
 * Create/update multiple orders in a single transaction
 * Body: { orders: [{ supplier_id, customer_id, delivery_date, items }] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile for created_by
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty orders array' },
        { status: 400 }
      );
    }

    // Validate all orders first
    for (const order of orders) {
      if (!order.supplier_id || !order.customer_id || !order.delivery_date || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
        return NextResponse.json(
          { error: 'Each order must have supplier_id, customer_id, delivery_date, and items array' },
          { status: 400 }
        );
      }
    }

    // Get all unique product IDs and customer IDs for batch pricing lookup
    const productIds = new Set<string>();
    const customerIds = new Set<string>();
    orders.forEach(order => {
      customerIds.add(order.customer_id);
      order.items.forEach((item: any) => productIds.add(item.product_id));
    });

    // Batch fetch all products
    const { data: products } = await supabase
      .from('order_book_products')
      .select('id, base_price, bulk_discounts, supplier_id')
      .in('id', Array.from(productIds));

    const productsMap = new Map(products?.map(p => [p.id, p]) || []);

    // Batch fetch all customer pricing
    const { data: customerPricing } = await supabase
      .from('order_book_customer_pricing')
      .select('customer_id, product_id, custom_price')
      .in('customer_id', Array.from(customerIds))
      .in('product_id', Array.from(productIds));

    const pricingMap = new Map<string, number>();
    customerPricing?.forEach(cp => {
      pricingMap.set(`${cp.customer_id}:${cp.product_id}`, cp.custom_price);
    });

    // Check for existing orders in batch
    const deliveryDates = orders.map(o => o.delivery_date);
    const { data: existingOrders } = await supabase
      .from('order_book_orders')
      .select('id, customer_id, delivery_date, status')
      .in('delivery_date', deliveryDates)
      .in('status', ['draft', 'pending', 'confirmed']);

    const existingOrdersMap = new Map<string, any>();
    existingOrders?.forEach(eo => {
      existingOrdersMap.set(`${eo.customer_id}:${eo.delivery_date}`, eo);
    });

    // Process all orders
    const ordersToInsert: any[] = [];
    const ordersToUpdate: any[] = [];
    const orderItemsToInsert: any[] = [];
    const orderItemsToDelete: string[] = [];

    for (const order of orders) {
      let subtotal = 0;
      const orderItems = [];

        // Calculate totals for this order
        for (const item of order.items) {
          const product = productsMap.get(item.product_id);
          if (!product || product.supplier_id !== order.supplier_id) {
            console.warn(`[Batch API] Skipping invalid product ${item.product_id} for order on ${order.delivery_date} - product not found or wrong supplier`);
            continue; // Skip invalid products
          }

        const pricingKey = `${order.customer_id}:${item.product_id}`;
        const unitPrice = pricingMap.get(pricingKey) || product.base_price;
        const lineTotal = item.quantity * unitPrice;
        subtotal += lineTotal;

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });
      }

      if (orderItems.length === 0) {
        continue; // Skip orders with no valid items
      }

      const existingKey = `${order.customer_id}:${order.delivery_date}`;
      const existingOrder = existingOrdersMap.get(existingKey);

      if (existingOrder) {
        // Update existing order
        ordersToUpdate.push({
          id: existingOrder.id,
          subtotal,
          total: subtotal,
          updated_at: new Date().toISOString(),
        });
        orderItemsToDelete.push(existingOrder.id);
      } else {
        // New order
        ordersToInsert.push({
          supplier_id: order.supplier_id,
          customer_id: order.customer_id,
          delivery_date: order.delivery_date,
          status: 'draft',
          subtotal,
          total: subtotal,
          created_by: profile?.id || null,
        });
      }

      // Store items for later insertion (after we know the order IDs)
      orderItemsToInsert.push({
        order_data: order,
        items: orderItems,
        is_existing: !!existingOrder,
        existing_order_id: existingOrder?.id,
      });
    }

    // Execute updates and deletes first
    if (ordersToUpdate.length > 0) {
      // Update orders
      for (const update of ordersToUpdate) {
        await supabase
          .from('order_book_orders')
          .update({ subtotal: update.subtotal, total: update.total, updated_at: update.updated_at })
          .eq('id', update.id);
      }

      // Delete old items
      if (orderItemsToDelete.length > 0) {
        await supabase
          .from('order_book_order_items')
          .delete()
          .in('order_id', orderItemsToDelete);
      }
    }

    // Insert new orders
    let insertedOrderIds: string[] = [];
    if (ordersToInsert.length > 0) {
      const { data: insertedOrders, error: insertError } = await supabase
        .from('order_book_orders')
        .insert(ordersToInsert)
        .select('id, customer_id, delivery_date');

      if (insertError) {
        console.error('Error inserting orders:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Failed to create orders' },
          { status: 500 }
        );
      }

      insertedOrderIds = insertedOrders?.map(o => o.id) || [];
    }

    // Create order items map
    const orderIdMap = new Map<string, string>();
    
    // Map existing orders
    ordersToUpdate.forEach(update => {
      const order = orders.find(o => {
        const key = `${o.customer_id}:${o.delivery_date}`;
        return existingOrdersMap.get(key)?.id === update.id;
      });
      if (order) {
        orderIdMap.set(`${order.customer_id}:${order.delivery_date}`, update.id);
      }
    });

    // Map new orders
    if (insertedOrderIds.length > 0) {
      const insertedOrders = ordersToInsert.map((o, idx) => ({
        ...o,
        id: insertedOrderIds[idx],
      }));
      insertedOrders.forEach(order => {
        orderIdMap.set(`${order.customer_id}:${order.delivery_date}`, order.id);
      });
    }

    // Insert all order items
    const allOrderItems: any[] = [];
    orderItemsToInsert.forEach(({ order_data, items, existing_order_id }) => {
      const orderId = existing_order_id || orderIdMap.get(`${order_data.customer_id}:${order_data.delivery_date}`);
      if (orderId) {
        items.forEach((item: any) => {
          allOrderItems.push({
            order_id: orderId,
            ...item,
          });
        });
      }
    });

    console.log(`[Batch API] Inserting ${allOrderItems.length} order items across ${orders.length} orders`);
    if (allOrderItems.length > 0) {
      // Log items per order for debugging
      const itemsByOrder = new Map<string, number>();
      allOrderItems.forEach(item => {
        const count = itemsByOrder.get(item.order_id) || 0;
        itemsByOrder.set(item.order_id, count + 1);
      });
      itemsByOrder.forEach((count, orderId) => {
        console.log(`[Batch API] Order ${orderId}: ${count} items`);
      });

      const { error: itemsError } = await supabase
        .from('order_book_order_items')
        .insert(allOrderItems);

      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        return NextResponse.json(
          { error: itemsError.message || 'Failed to create order items' },
          { status: 500 }
        );
      }
      console.log(`[Batch API] Successfully inserted ${allOrderItems.length} items`);
    } else {
      console.warn('[Batch API] No items to insert!');
    }

    return NextResponse.json({
      success: true,
      data: {
        created: ordersToInsert.length,
        updated: ordersToUpdate.length,
        total: ordersToInsert.length + ordersToUpdate.length,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/order-book/orders/batch:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

