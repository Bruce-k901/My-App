import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/order-book/orders/[id]/items
 * Get all items for a specific order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Verify the order exists and user has access (check order and customer in parallel)
    const [orderResult, customerResult] = await Promise.all([
      supabase
        .from('order_book_orders')
        .select('id, customer_id')
        .eq('id', orderId)
        .single(),
      supabase
        .from('order_book_customers')
        .select('id, email')
        .eq('email', user.email?.toLowerCase() || '')
        .maybeSingle()
    ]);

    if (orderResult.error || !orderResult.data) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!customerResult.data) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify user is the customer (by matching customer_id)
    if (orderResult.data.customer_id !== customerResult.data.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch ALL items for this order using admin client to bypass RLS
    // Since we've already verified customer access, we can safely fetch all items
    const adminClient = getSupabaseAdmin();
    
    // Fetch all items first
    const { data: items, error: itemsError } = await adminClient
      .from('order_book_order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json(
        { error: itemsError.message || 'Failed to fetch order items' },
        { status: 500 }
      );
    }

    // Fetch product info only for items that have product_id
    if (items && items.length > 0) {
      const productIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await adminClient
          .from('order_book_products')
          .select('id, name, category, unit, base_price')
          .in('id', productIds);

        // Map products to items
        const productMap = new Map(products?.map(p => [p.id, p]) || []);
        items.forEach((item: any) => {
          if (item.product_id && productMap.has(item.product_id)) {
            item.product = productMap.get(item.product_id);
          }
        });
      }
    }

    console.log(`[API] Returning ${items?.length || 0} items for order ${orderId}`);
    
    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/order-book/orders/[id]/items:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

