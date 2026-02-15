import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/customer/standing-orders
 * Create or update a standing order for the authenticated customer
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id, delivery_days, items } = body;

    console.log('[Standing Orders] POST request:', { customer_id, delivery_days, items: items?.length });

    // Validate required fields
    if (!customer_id || !delivery_days || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, delivery_days, items' },
        { status: 400 }
      );
    }

    // Verify the customer exists and get site_id
    const { data: customer, error: customerError } = await supabase
      .from('planly_customers')
      .select('id, site_id')
      .eq('id', customer_id)
      .maybeSingle();

    if (customerError) {
      console.error('Error fetching customer:', customerError);
      return NextResponse.json({ error: `Database error: ${customerError.message}` }, { status: 500 });
    }

    if (!customer) {
      console.error('Customer not found with id:', customer_id);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if standing order already exists for this customer
    const { data: existingOrders } = await supabase
      .from('planly_standing_orders')
      .select('id')
      .eq('customer_id', customer_id);

    const standingOrderData = {
      customer_id,
      site_id: customer.site_id,
      delivery_days,
      items,
      is_active: true,
      is_paused: false,
      start_date: new Date().toISOString().split('T')[0],
    };

    if (existingOrders && existingOrders.length > 0) {
      // Update existing standing order
      const { data: updated, error: updateError } = await supabase
        .from('planly_standing_orders')
        .update({
          ...standingOrderData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrders[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating standing order:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: updated });
    } else {
      // Create new standing order
      const { data: created, error: createError } = await supabase
        .from('planly_standing_orders')
        .insert({
          ...standingOrderData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating standing order:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: created });
    }
  } catch (error: any) {
    console.error('Error in POST /api/customer/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/customer/standing-orders?customer_id=X
 * Get standing orders for a customer
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

    const { data: standingOrders, error } = await supabase
      .from('planly_standing_orders')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching standing orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: standingOrders || [] });
  } catch (error: any) {
    console.error('Error in GET /api/customer/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/customer/standing-orders
 * Update a standing order
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Standing order ID is required' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('planly_standing_orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating standing order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/customer/standing-orders:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
