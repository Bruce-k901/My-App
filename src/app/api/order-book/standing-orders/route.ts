import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/order-book/standing-orders
 * Get standing orders
 * Query params: customer_id, supplier_id (optional)
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

    let query = supabase
      .from('order_book_standing_orders')
      .select(`
        *,
        customer:order_book_customers!order_book_standing_orders_customer_id_fkey(
          id,
          business_name,
          contact_name
        )
      `)
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: standingOrders, error } = await query;

    if (error) {
      console.error('Error fetching standing orders:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch standing orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: standingOrders || [],
      count: standingOrders?.length || 0,
    });
  } catch (error: any) {
    console.error('Error in GET /api/order-book/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/order-book/standing-orders
 * Create a new standing order
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplier_id, customer_id, delivery_days, items, start_date, end_date } = body;

    // Validation
    if (!supplier_id || !customer_id || !delivery_days || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: supplier_id, customer_id, delivery_days, items' },
        { status: 400 }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.product_id || item.quantity === undefined || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Each item must have product_id and quantity > 0' },
          { status: 400 }
        );
      }
    }

    // Create standing order
    const { data: standingOrder, error } = await supabase
      .from('order_book_standing_orders')
      .insert({
        supplier_id,
        customer_id,
        delivery_days,
        items: items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        start_date: start_date || new Date().toISOString().split('T')[0],
        end_date: end_date || null,
        is_active: true,
        is_paused: false,
      })
      .select(`
        *,
        customer:order_book_customers!order_book_standing_orders_customer_id_fkey(
          id,
          business_name,
          contact_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating standing order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create standing order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: standingOrder,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/order-book/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/order-book/standing-orders
 * Update a standing order
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Validate items if provided
    if (updates.items && Array.isArray(updates.items)) {
      for (const item of updates.items) {
        if (!item.product_id || item.quantity === undefined || item.quantity <= 0) {
          return NextResponse.json(
            { error: 'Each item must have product_id and quantity > 0' },
            { status: 400 }
          );
        }
      }
      // Transform items to JSONB format
      updates.items = updates.items.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));
    }

    // Update standing order
    const { data: standingOrder, error } = await supabase
      .from('order_book_standing_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:order_book_customers!order_book_standing_orders_customer_id_fkey(
          id,
          business_name,
          contact_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating standing order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update standing order' },
        { status: 500 }
      );
    }

    if (!standingOrder) {
      return NextResponse.json({ error: 'Standing order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: standingOrder,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/order-book/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

