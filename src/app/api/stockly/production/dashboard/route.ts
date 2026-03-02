import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/production/dashboard
 * Get production dashboard summary for a week
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
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

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      );
    }

    // Call get_production_summary function for the date range
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_production_summary',
      {
        supplier_id_param: supplier.id,
        date_from: startDate,
        date_to: endDate
      }
    );

    if (summaryError) {
      console.error('Error calling get_production_summary:', summaryError);
      return NextResponse.json(
        { error: summaryError.message || 'Failed to fetch production summary' },
        { status: 500 }
      );
    }

    // Process the summary data to build week structure
    const summaryMap = new Map<string, any>();
    (summaryData || []).forEach((day: any) => {
      summaryMap.set(day.delivery_date, day);
    });

    // Generate all days in the week
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days: any[] = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = summaryMap.get(dateStr);
      
      const dayName = currentDate.toLocaleDateString('en-GB', { weekday: 'long' });
      
      days.push({
        date: dateStr,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        orderCount: dayData?.total_orders || 0,
        itemCount: dayData?.total_items || 0,
        revenue: parseFloat(dayData?.total_value || 0),
        hasAlerts: dayData?.has_conflicts || false,
        alertCount: dayData?.has_conflicts ? 1 : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate week totals
    const weekSummary = {
      orderCount: days.reduce((sum, day) => sum + day.orderCount, 0),
      itemCount: days.reduce((sum, day) => sum + day.itemCount, 0),
      revenue: days.reduce((sum, day) => sum + day.revenue, 0),
      alertCount: days.reduce((sum, day) => sum + day.alertCount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        weekSummary,
        days
      }
    });
  } catch (error) {
    console.error('Error in production dashboard API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

