import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/order-book/customer-pricing
 * Get customer-specific pricing for all products
 * Query params: customer_id
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

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing customer_id parameter' },
        { status: 400 }
      );
    }

    const { data: pricing, error } = await supabase
      .from('order_book_customer_pricing')
      .select('product_id, custom_price')
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error fetching customer pricing:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch customer pricing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pricing || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/order-book/customer-pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

