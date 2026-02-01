import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/order-book/orders
 * Get orders
 * Query params: customer_id, supplier_id, delivery_date (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = request.nextUrl.searchParams.get('customer_id');
    const supplierId = request.nextUrl.searchParams.get('supplier_id');
    const deliveryDate = request.nextUrl.searchParams.get('delivery_date');

    let query = supabase
      .from('order_book_orders')
      .select(`
        *,
        customer:order_book_customers!order_book_orders_customer_id_fkey(
          id,
          business_name,
          contact_name,
          email
        )
      `)
      .order('delivery_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (deliveryDate) {
      query = query.eq('delivery_date', deliveryDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Fetch all order items separately to ensure we get ALL items, even if product join fails
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const { data: allItems, error: itemsError } = await supabase
        .from('order_book_order_items')
        .select(`
          *,
          product:order_book_products(
            id,
            name,
            category,
            unit
          )
        `)
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      }

      if (allItems) {
        console.log(`[API] Fetched ${allItems.length} order items for ${orderIds.length} orders`);
        
        // Group items by order_id
        const itemsByOrderId = new Map<string, any[]>();
        allItems.forEach(item => {
          if (!itemsByOrderId.has(item.order_id)) {
            itemsByOrderId.set(item.order_id, []);
          }
          itemsByOrderId.get(item.order_id)!.push(item);
        });

        // Attach items to their orders
        orders.forEach(order => {
          const items = itemsByOrderId.get(order.id) || [];
          order.items = items;
          console.log(`[API] Order ${order.id} (${order.delivery_date}): ${items.length} items`);
        });
      } else {
        console.warn('[API] No items returned from order_book_order_items query');
      }
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
      count: orders?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/order-book/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/order-book/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request was aborted
    if (request.signal?.aborted) {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }

    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplier_id, customer_id, delivery_date, items } = body;

    // 🔍 DEBUG: Log what we receive
    console.log('🔍 ORDER SAVE DEBUG - POST /api/order-book/orders');
    console.log('Items received from frontend:', items?.length || 0);
    console.log('Item details:', JSON.stringify(items?.map((item: any) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })), null, 2));

    // Validation
    if (!supplier_id || !customer_id || !delivery_date || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: supplier_id, customer_id, delivery_date, items' },
        { status: 400 }
      );
    }

    // Get user's profile for created_by
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];
    let skippedItems = 0;
    const skippedProductIds: string[] = [];

    console.log(`🔍 Processing ${items.length} items...`);

    // Batch fetch all products and customer pricing upfront to avoid N+1 queries
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const uniqueProductIds = [...new Set(productIds)];

    const { data: allProducts } = await supabase
      .from('order_book_products')
      .select('id, base_price, bulk_discounts, supplier_id')
      .in('id', uniqueProductIds)
      .eq('supplier_id', supplier_id);

    const { data: allCustomerPricing } = await supabase
      .from('order_book_customer_pricing')
      .select('product_id, custom_price')
      .eq('customer_id', customer_id)
      .in('product_id', uniqueProductIds);

    // Create maps for fast lookup
    const productsMap = new Map(allProducts?.map(p => [p.id, p]) || []);
    const pricingMap = new Map(allCustomerPricing?.map(cp => [cp.product_id, cp.custom_price]) || []);

    for (const item of items) {
      const { product_id, quantity } = item;

      if (!product_id || !quantity || quantity <= 0) {
        console.warn(`⚠️ Skipping invalid item: product_id=${product_id}, quantity=${quantity}`);
        skippedItems++;
        skippedProductIds.push(product_id || 'missing');
        continue; // Skip invalid items instead of failing entire order
      }

      const product = productsMap.get(product_id);
      if (!product) {
        console.warn(`⚠️ Product ${product_id} not found for supplier ${supplier_id} - skipping`);
        skippedItems++;
        skippedProductIds.push(product_id);
        continue; // Skip missing products instead of failing entire order
      }

      const unitPrice = pricingMap.get(product_id) || product.base_price;
      const lineTotal = quantity * unitPrice;
      subtotal += lineTotal;

      orderItems.push({
        product_id,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    console.log(`✅ Processed ${orderItems.length} valid items, skipped ${skippedItems} items`);
    if (skippedProductIds.length > 0) {
      console.warn(`⚠️ Skipped product IDs:`, skippedProductIds);
    }

    // Validate we have at least one item to save
    if (orderItems.length === 0) {
      console.error('❌ No valid items to save after processing');
      return NextResponse.json(
        { error: 'No valid items to save. Please check that all products exist and have valid quantities.' },
        { status: 400 }
      );
    }

    // Check if an order already exists for this delivery date
    // Check for ANY order (regardless of status) to avoid duplicates
    // IMPORTANT: Use .select() instead of .maybeSingle() to find ALL orders for this date
    // Then we'll handle duplicates by updating the most recent editable one
    console.log(`🔍 Checking for existing orders: customer_id=${customer_id}, delivery_date=${delivery_date}`);
    const { data: existingOrders, error: lookupError } = await supabase
      .from('order_book_orders')
      .select('id, status, delivery_date, customer_id, created_at')
      .eq('customer_id', customer_id)
      .eq('delivery_date', delivery_date)
      .order('created_at', { ascending: false }); // Most recent first

    if (lookupError) {
      console.error('❌ Error looking up existing orders:', lookupError);
    }

    let existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null;

    if (existingOrders && existingOrders.length > 1) {
      console.warn(`⚠️ Found ${existingOrders.length} orders for ${delivery_date}! This indicates duplicates. Will update the most recent one and delete others.`);
      // Delete duplicate orders (keep only the most recent one)
      const duplicateIds = existingOrders.slice(1).map(o => o.id);
      if (duplicateIds.length > 0) {
        console.log(`🗑️ Deleting ${duplicateIds.length} duplicate orders:`, duplicateIds);
        // Delete items for duplicate orders first
        await supabase
          .from('order_book_order_items')
          .delete()
          .in('order_id', duplicateIds);
        // Then delete the duplicate orders
        await supabase
          .from('order_book_orders')
          .delete()
          .in('id', duplicateIds);
        console.log(`✅ Deleted ${duplicateIds.length} duplicate orders`);
      }
    }

    if (existingOrder) {
      console.log(`✅ Found existing order: id=${existingOrder.id}, status=${existingOrder.status}`);
    } else {
      console.log(`ℹ️ No existing order found for ${delivery_date}, will create new order`);
    }

    let order;
    let orderError;

    if (existingOrder) {
      // Check if order can be edited (only draft, pending, or confirmed orders can be edited)
      const editableStatuses = ['draft', 'pending', 'confirmed'];
      if (!editableStatuses.includes(existingOrder.status)) {
        console.warn(`⚠️ Cannot edit order ${existingOrder.id} with status '${existingOrder.status}'`);
        return NextResponse.json(
          { error: `Cannot edit order with status '${existingOrder.status}'. Only draft, pending, or confirmed orders can be edited.` },
          { status: 400 }
        );
      }

      // Update existing order
      console.log(`🔄 Updating existing order ${existingOrder.id} for ${delivery_date}`);
      const { data: updatedOrder, error: updateError } = await supabase
        .from('order_book_orders')
        .update({
          subtotal,
          total: subtotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      order = updatedOrder;
      orderError = updateError;

      if (updateError) {
        console.error('❌ Error updating order:', updateError);
      } else {
        console.log(`✅ Successfully updated order ${existingOrder.id}`);
      }

      // Delete existing order items BEFORE inserting new ones
      if (!orderError) {
        console.log(`🗑️ Deleting existing items for order ${existingOrder.id}`);
        const { error: deleteError } = await supabase
          .from('order_book_order_items')
          .delete()
          .eq('order_id', existingOrder.id);
        
        if (deleteError) {
          console.error('❌ Error deleting existing order items:', deleteError);
          orderError = deleteError;
        } else {
          console.log(`✅ Deleted existing items for order ${existingOrder.id}`);
        }
      }
    } else {
      // Create new order
      const { data: newOrder, error: insertError } = await supabase
        .from('order_book_orders')
        .insert({
          supplier_id,
          customer_id,
          delivery_date,
          status: 'draft',
          subtotal,
          total: subtotal,
          created_by: profile?.id || null,
        })
        .select()
        .single();
      
      order = newOrder;
      orderError = insertError;
    }

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: orderError.message || 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items (for both new and updated orders)
    if (orderError) {
      console.error('❌ Order error before inserting items:', orderError);
      return NextResponse.json(
        { error: orderError.message || 'Failed to create/update order' },
        { status: 500 }
      );
    }

    console.log(`🔍 Inserting ${orderItems.length} items into order_book_order_items for order ${order.id}`);
    const itemsToInsert = orderItems.map(item => ({
      order_id: order.id,
      ...item,
    }));
    console.log('🔍 Items to insert:', JSON.stringify(itemsToInsert.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_price: i.unit_price
    })), null, 2));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_book_order_items')
      .insert(itemsToInsert)
      .select('id, product_id, quantity');

    if (itemsError) {
      console.error('❌ Error creating order items:', itemsError);
      // Only rollback if this was a NEW order (not an update)
      if (!existingOrder) {
        console.log('🔄 Rolling back order creation due to items error');
        await supabase.from('order_book_orders').delete().eq('id', order.id);
      }
      return NextResponse.json(
        { error: itemsError.message || 'Failed to create order items' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully inserted ${insertedItems?.length || 0} items into database`);
    if (insertedItems) {
      console.log('✅ Inserted item IDs:', insertedItems.map(i => `${i.product_id}: qty=${i.quantity}`));
    }

    // Return simple response without fetching complete order (to avoid timeout/abort issues)
    // The frontend will reload data after save anyway
    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        delivery_date: delivery_date,
        total: subtotal,
        items_count: insertedItems?.length || 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/order-book/orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

