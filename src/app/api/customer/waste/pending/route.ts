import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveCustomer, getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/waste/pending
 * Get orders that need waste logging (delivered in last 7 days without logs)
 */
export async function GET(request: NextRequest) {
  // Always return 200 with empty array, even on errors
  const emptyResponse = {
    success: true,
    data: [],
  };

  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('Unauthorized access attempt to pending waste logs');
      return NextResponse.json(emptyResponse);
    }

    const admin = getCustomerAdmin();

    const customer = await resolveCustomer(request, supabase, user);
    if (!customer) {
      console.warn('Customer not found for pending waste logs');
      return NextResponse.json(emptyResponse);
    }

    // Find recent planly_orders without waste logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data: recentOrders } = await admin
      .from('planly_orders')
      .select('id, delivery_date')
      .eq('customer_id', customer.id)
      .gte('delivery_date', startDate)
      .lte('delivery_date', today)
      .neq('status', 'cancelled');

    if (!recentOrders || recentOrders.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Check which already have waste logs
    const orderIds = recentOrders.map(o => o.id);
    const { data: existingLogs } = await admin
      .from('order_book_waste_logs')
      .select('order_id')
      .in('order_id', orderIds);

    const loggedOrderIds = new Set((existingLogs || []).map(l => l.order_id));
    const pendingOrders = recentOrders.filter(o => !loggedOrderIds.has(o.id));

    return NextResponse.json({
      success: true,
      data: pendingOrders.map(o => ({ order_id: o.id, delivery_date: o.delivery_date })),
    });
  } catch (error: any) {
    // Catch-all: return empty array instead of error
    console.error('Error in GET /api/customer/waste/pending (returning empty array):', error);
    return NextResponse.json(emptyResponse);
  }
}

