import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/waste/logs
 * Get historical waste logs
 * Query params: startDate, endDate, limit (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30', 10);

    let query = supabase
      .from('order_book_waste_logs')
      .select(`
        id,
        log_date,
        total_ordered,
        total_sold,
        waste_percent,
        total_waste_cost,
        status,
        order:order_book_orders!order_book_waste_logs_order_id_fkey(
          order_number
        )
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'submitted')
      .order('log_date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('log_date', startDate);
    }

    if (endDate) {
      query = query.lte('log_date', endDate);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching waste logs:', logsError);
      return NextResponse.json(
        { error: logsError.message || 'Failed to fetch waste logs' },
        { status: 500 }
      );
    }

    // Format response
    const formattedLogs = logs?.map((log: any) => ({
      id: log.id,
      logDate: log.log_date,
      orderNumber: log.order?.order_number || 'N/A',
      totalOrdered: log.total_ordered,
      totalSold: log.total_sold,
      wastePercent: log.waste_percent,
      totalWasteCost: log.total_waste_cost,
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      count: formattedLogs.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/waste/logs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

