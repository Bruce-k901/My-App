import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupplierIdFromAuth } from '@/lib/stockly/supplierHelpers';
import { sendPortalInviteEmail } from '@/lib/stockly/portalInvitationHelpers';

/**
 * GET /api/stockly/customers
 * Fetch all customers for current supplier
 * Query params: search, status, sortBy, includeArchived
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      // This should rarely happen now since we auto-create suppliers
      // But if it does, return empty array
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'name';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Build base query
    let query = supabase
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
      .eq('supplier_id', supplierId);

    // Filter out archived by default
    if (!includeArchived) {
      query = query.neq('status', 'archived');
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,email.ilike.%${search}%,contact_name.ilike.%${search}%`
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'name':
        query = query.order('business_name', { ascending: true });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'orders':
        // Will sort in application code after fetching
        query = query.order('business_name', { ascending: true });
        break;
      case 'value':
        // Will sort in application code after fetching
        query = query.order('business_name', { ascending: true });
        break;
      default:
        query = query.order('business_name', { ascending: true });
    }

    const { data: customers, error } = await query;

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Enhance with calculated fields
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const enhancedCustomers = (customers || []).map((customer: any) => {
      const orders = customer.orders || [];
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

      return {
        ...customer,
        orders_last_30_days: ordersLast30Days.length,
        last_order_date: lastOrder?.delivery_date || lastOrder?.created_at || null,
        has_standing_order: false, // TODO: Check standing_orders table
        total_orders: orders.length,
        total_order_value: totalOrderValue,
        avg_order_value:
          orders.length > 0 ? totalOrderValue / orders.length : 0,
      };
    });

    // Sort by orders or value if requested
    if (sortBy === 'orders') {
      enhancedCustomers.sort(
        (a, b) => b.orders_last_30_days - a.orders_last_30_days
      );
    } else if (sortBy === 'value') {
      enhancedCustomers.sort(
        (a, b) => b.total_order_value - a.total_order_value
      );
    }

    return NextResponse.json({
      success: true,
      data: enhancedCustomers,
    });
  } catch (error: any) {
    console.error('Error in GET /api/stockly/customers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stockly/customers
 * Create new customer and automatically send portal invitation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const supplierId = await getSupplierIdFromAuth();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'No supplier record found. Please set up your supplier profile before adding customers.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.business_name || !body.email || !body.address_line1 || !body.city || !body.postcode) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, email, address_line1, city, postcode' },
        { status: 400 }
      );
    }

    // Get supplier's company_id for customer record
    const { data: supplier } = await supabase
      .from('order_book_suppliers')
      .select('company_id')
      .eq('id', supplierId)
      .single();

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Create customer record
    const { data: customer, error: createError } = await supabase
      .from('order_book_customers')
      .insert({
        supplier_id: supplierId,
        company_id: supplier.company_id,
        business_name: body.business_name,
        trading_name: body.trading_name || null,
        contact_name: body.contact_name || null,
        email: body.email.toLowerCase().trim(),
        phone: body.phone || null,
        address_line1: body.address_line1,
        address_line2: body.address_line2 || null,
        city: body.city,
        postcode: body.postcode,
        country: body.country || 'UK',
        preferred_delivery_time: body.preferred_delivery_time || null,
        delivery_notes: body.delivery_notes || null,
        payment_terms_days: body.payment_terms_days || 30,
        credit_limit: body.credit_limit || null,
        minimum_order_value: body.minimum_order_value || null,
        internal_notes: body.internal_notes || null,
        portal_access_enabled: true, // Always enabled
        status: 'pending', // Changes to 'active' when they complete setup
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating customer:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create customer' },
        { status: 500 }
      );
    }

    // Automatically send portal invitation
    try {
      await sendPortalInviteEmail({
        id: customer.id,
        email: customer.email,
        business_name: customer.business_name,
        contact_name: customer.contact_name,
      });
    } catch (inviteError: any) {
      console.error('Error sending invitation email:', inviteError);
      // Don't fail the request - customer is created, invitation can be resent
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error('Error in POST /api/stockly/customers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

