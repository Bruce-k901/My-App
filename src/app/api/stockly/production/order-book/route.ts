import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/order-book
 * Get order book grid data (customer × product matrix) for a delivery date
 * Query params: date (YYYY-MM-DD) - delivery date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json(
        { error: 'User profile or company not found' },
        { status: 404 }
      );
    }

    // Get supplier_id for this company
    const { data: supplier, error: supplierError } = await supabase
      .from('order_book_suppliers')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .maybeSingle();

    if (supplierError) {
      console.error('Error fetching supplier:', supplierError);
      return NextResponse.json(
        { error: 'Failed to fetch supplier' },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: 'No active supplier found for this company' },
        { status: 404 }
      );
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'date query parameter is required' },
        { status: 400 }
      );
    }

    // Get all orders for this delivery date
    const { data: orders, error: ordersError } = await supabase
      .from('order_book_orders')
      .select(`
        id,
        delivery_date,
        total,
        customer_id,
        customer:order_book_customers!order_book_orders_customer_id_fkey(
          id,
          business_name,
          contact_name,
          preferred_delivery_time
        ),
        items:order_book_order_items(
          id,
          product_id,
          quantity,
          line_total,
          product:order_book_products(
            id,
            name,
            category,
            unit
          )
        )
      `)
      .eq('supplier_id', supplier.id)
      .eq('delivery_date', date)
      .in('status', ['confirmed', 'locked', 'in_production'])
      .order('delivery_date', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: ordersError.message || 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          customers: [],
          products: [],
          grandTotal: {
            items: 0,
            value: 0
          }
        }
      });
    }

    // Build customer × product matrix
    const customerMap = new Map<string, {
      id: string;
      businessName: string;
      deliveryTime: string;
      items: Map<string, number>; // product_id -> quantity
      totalItems: number;
      orderValue: number;
    }>();

    const productMap = new Map<string, {
      id: string;
      name: string;
      category: string;
      unit: string;
      totalQty: number;
      batchCount: number;
    }>();

    let grandTotalItems = 0;
    let grandTotalValue = 0;

    // Process each order
    for (const order of orders) {
      const customerId = order.customer_id;
      const customer = order.customer as any;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: customerId,
          businessName: customer?.business_name || 'Unknown Customer',
          deliveryTime: customer?.preferred_delivery_time || '09:00',
          items: new Map(),
          totalItems: 0,
          orderValue: parseFloat(order.total || 0)
        });
      }

      const customerData = customerMap.get(customerId)!;
      grandTotalValue += customerData.orderValue;

      // Process order items
      const items = order.items as any[] || [];
      for (const item of items) {
        const productId = item.product_id;
        const product = item.product as any;
        const quantity = parseFloat(item.quantity || 0);

        if (!product) continue;

        // Add to customer's items
        const currentQty = customerData.items.get(productId) || 0;
        customerData.items.set(productId, currentQty + quantity);
        customerData.totalItems += quantity;
        grandTotalItems += quantity;

        // Add to product totals
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: productId,
            name: product.name || 'Unknown Product',
            category: product.category || '',
            unit: product.unit || '',
            totalQty: 0,
            batchCount: 0
          });
        }

        const productData = productMap.get(productId)!;
        productData.totalQty += quantity;
      }
    }

    // Calculate batch counts from production profiles
    // Get production profiles for all products
    const productIds = Array.from(productMap.keys());
    if (productIds.length > 0) {
      const { data: productionProfiles, error: profilesError } = await supabase
        .from('order_book_production_profiles')
        .select('product_id, batch_size')
        .eq('supplier_id', supplier.id)
        .in('product_id', productIds);

      if (!profilesError && productionProfiles) {
        for (const profile of productionProfiles) {
          const productData = productMap.get(profile.product_id);
          if (productData && profile.batch_size) {
            // Calculate number of batches needed
            productData.batchCount = Math.ceil(productData.totalQty / profile.batch_size);
          }
        }
      }
    }

    // Convert maps to arrays
    const customers = Array.from(customerMap.values()).map(customer => ({
      id: customer.id,
      businessName: customer.businessName,
      deliveryTime: customer.deliveryTime,
      items: Array.from(customer.items.entries()).map(([productId, quantity]) => ({
        productId,
        quantity
      })),
      totalItems: customer.totalItems,
      orderValue: customer.orderValue
    }));

    const products = Array.from(productMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        customers,
        products,
        grandTotal: {
          items: grandTotalItems,
          value: grandTotalValue
        }
      }
    });
  } catch (error) {
    console.error('Error in production order-book API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

