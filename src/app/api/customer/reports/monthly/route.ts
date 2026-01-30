import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/reports/monthly
 * Get monthly spend summary for customer
 * Query params: month (YYYY-MM format, optional, defaults to current month)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record by email (matching pattern from customers route)
    const { data: customer, error: customerError } = await supabase
      .from('order_book_customers')
      .select('id, company_id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const monthParam = request.nextUrl.searchParams.get('month');
    const month = monthParam ? new Date(monthParam + '-01') : new Date();
    
    // Check if function exists (in case migration hasn't run)
    const { data: summary, error: summaryError } = await supabase.rpc('get_monthly_summary', {
      p_customer_id: customer.id,
      p_month: month.toISOString().split('T')[0],
    });

    if (summaryError) {
      // If function doesn't exist, return empty data
      if (summaryError.code === '42883' || summaryError.message?.includes('does not exist')) {
        console.warn('Monthly summary function does not exist yet');
        return NextResponse.json({
          success: true,
          data: {
            current_month: null,
            previous_month: null,
            top_products: [],
            weekly_breakdown: [],
            trends: [],
          },
        });
      }
      console.error('Error fetching monthly summary:', summaryError);
      return NextResponse.json(
        { error: summaryError.message || 'Failed to fetch monthly summary' },
        { status: 500 }
      );
    }

    // Get weekly breakdown (ignore errors if function doesn't exist)
    const { data: weeklyBreakdown } = await supabase.rpc('get_monthly_spend_by_week', {
      p_customer_id: customer.id,
      p_month: month.toISOString().split('T')[0],
    });

    // Get trends (last 6 months) (ignore errors if function doesn't exist)
    const { data: trends } = await supabase.rpc('get_monthly_trends', {
      p_customer_id: customer.id,
      p_current_month: month.toISOString().split('T')[0],
    });

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        weekly_breakdown: weeklyBreakdown || [],
        trends: trends || [],
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/reports/monthly:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

