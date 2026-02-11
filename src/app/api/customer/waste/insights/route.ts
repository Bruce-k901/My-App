import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/waste/insights
 * Get waste insights for customer
 * Query params: days (optional, defaults to 30)
 */
export async function GET(request: NextRequest) {
  // Always return 200 with data structure, even on errors
  const emptyData = {
    success: true,
    data: {
      overview: {
        avg_waste_percent: 0,
        total_waste_cost: 0,
        days_logged: 0,
        best_day: null,
        worst_day: null,
      },
      by_day: {},
      by_product: [],
    },
  };

  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('Unauthorized access attempt to waste insights');
      return NextResponse.json(emptyData);
    }

    // Get customer record from planly
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      console.warn('Customer not found for waste insights');
      return NextResponse.json(emptyData);
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);

    // Try to call the function, but handle any errors gracefully
    let insights = null;
    let insightsError = null;
    
    try {
      const result = await supabase.rpc('get_waste_insights', {
        p_customer_id: customer.id,
        p_days: days,
      });
      insights = result.data;
      insightsError = result.error;
    } catch (rpcError: any) {
      console.warn('RPC call failed:', rpcError);
      insightsError = rpcError;
    }

    // If there's any error (function doesn't exist, SQL error, etc.), return empty data
    if (insightsError) {
      console.warn('Waste insights function error (returning empty data):', insightsError.message || insightsError);
      return NextResponse.json(emptyData);
    }

    // Handle NULL response (no data yet)
    if (!insights) {
      return NextResponse.json(emptyData);
    }

    return NextResponse.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    // Catch-all: return empty data instead of error
    console.error('Error in GET /api/customer/waste/insights (returning empty data):', error);
    return NextResponse.json(emptyData);
  }
}

