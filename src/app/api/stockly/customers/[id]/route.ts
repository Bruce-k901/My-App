import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';

/**
 * GET /api/stockly/customers/[id]
 * Fetch single customer with enhanced data (stats, recent orders, custom pricing)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;

    // Fetch customer with orders
    const { data: customer, error: customerError } = await supabase
      .from('order_book_customers')
      .select(`
        *,
        orders:order_book_orders(
          id,
          order_number,
          delivery_date,
          total,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Fetch standing order status
    const { data: standingOrder } = await supabase
      .from('order_book_standing_orders')
      .select('id, is_active')
      .eq('customer_id', id)
      .eq('is_active', true)
      .maybeSingle();

    // Fetch custom pricing count
    const { count: customPricingCount } = await supabase
      .from('order_book_customer_pricing')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);

    // Calculate statistics
    const orders = customer.orders || [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const ordersLast30Days = orders.filter((o: any) => {
      const orderDate = new Date(o.delivery_date || o.created_at);
      return orderDate >= thirtyDaysAgo;
    });

    const lastOrder = orders
      .sort((a: any, b: any) => {
        const dateA = new Date(a.delivery_date || a.created_at);
        const dateB = new Date(b.delivery_date || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })[0];

    const totalOrderValue = orders.reduce(
      (sum: number, o: any) => sum + (parseFloat(o.total) || 0),
      0
    );

    // Get recent orders (last 5)
    const recentOrders = orders
      .sort((a: any, b: any) => {
        const dateA = new Date(a.delivery_date || a.created_at);
        const dateB = new Date(b.delivery_date || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    // Remove orders from customer object to avoid duplication
    const { orders: _, ...customerData } = customer;

    return NextResponse.json({
      success: true,
      data: {
        ...customerData,
        total_orders: orders.length,
        orders_last_30_days: ordersLast30Days.length,
        total_order_value: totalOrderValue,
        avg_order_value: orders.length > 0 ? totalOrderValue / orders.length : 0,
        last_order_date: lastOrder?.delivery_date || lastOrder?.created_at || null,
        has_standing_order: !!standingOrder,
        has_custom_pricing: (customPricingCount || 0) > 0,
        custom_pricing_count: customPricingCount || 0,
        recent_orders: recentOrders,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/stockly/customers/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stockly/customers/[id]
 * Update customer information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier found for this user' },
        { status: 404 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('order_book_customers')
      .select('id, supplier_id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Prepare update data (only allow updating specific fields)
    const updateData: any = {};

    if (body.business_name !== undefined) updateData.business_name = body.business_name;
    if (body.trading_name !== undefined) updateData.trading_name = body.trading_name;
    if (body.contact_name !== undefined) updateData.contact_name = body.contact_name;
    if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim();
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address_line1 !== undefined) updateData.address_line1 = body.address_line1;
    if (body.address_line2 !== undefined) updateData.address_line2 = body.address_line2;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.postcode !== undefined) updateData.postcode = body.postcode;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.preferred_delivery_time !== undefined) updateData.preferred_delivery_time = body.preferred_delivery_time;
    if (body.delivery_notes !== undefined) updateData.delivery_notes = body.delivery_notes;
    if (body.payment_terms_days !== undefined) updateData.payment_terms_days = body.payment_terms_days;
    if (body.credit_limit !== undefined) updateData.credit_limit = body.credit_limit;
    if (body.minimum_order_value !== undefined) updateData.minimum_order_value = body.minimum_order_value;
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes;
    if (body.status !== undefined) updateData.status = body.status;

    // Handle status changes
    if (body.status === 'archived') {
      updateData.archived_at = new Date().toISOString();
      updateData.portal_access_enabled = false;
    } else if (body.status === 'active' && existing.status === 'archived') {
      updateData.archived_at = null;
      updateData.portal_access_enabled = true;
    }

    // Update customer
    const { data: customer, error: updateError } = await supabase
      .from('order_book_customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update customer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/stockly/customers/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

