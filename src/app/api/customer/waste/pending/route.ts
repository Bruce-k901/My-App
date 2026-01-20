import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // Get customer record
    const { data: customer } = await supabase
      .from('order_book_customers')
      .select('id')
      .eq('email', user.email?.toLowerCase() || '')
      .maybeSingle();

    if (!customer) {
      console.warn('Customer not found for pending waste logs');
      return NextResponse.json(emptyResponse);
    }

    // Try to call the function, but handle any errors gracefully
    let pendingLogs = null;
    let pendingError = null;
    
    try {
      const result = await supabase.rpc('get_pending_waste_logs', {
        p_customer_id: customer.id,
      });
      pendingLogs = result.data;
      pendingError = result.error;
    } catch (rpcError: any) {
      console.warn('RPC call failed:', rpcError);
      pendingError = rpcError;
    }

    // If there's any error (function doesn't exist, SQL error, etc.), return empty array
    if (pendingError) {
      console.warn('Pending waste logs function error (returning empty array):', pendingError.message || pendingError);
      return NextResponse.json(emptyResponse);
    }

    return NextResponse.json({
      success: true,
      data: pendingLogs || [],
    });
  } catch (error: any) {
    // Catch-all: return empty array instead of error
    console.error('Error in GET /api/customer/waste/pending (returning empty array):', error);
    return NextResponse.json(emptyResponse);
  }
}

