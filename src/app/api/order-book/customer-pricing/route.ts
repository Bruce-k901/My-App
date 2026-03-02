import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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

    // Check if user is a platform admin for RLS bypass
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    const isPlatformAdmin = !!(profile?.is_platform_admin || profile?.app_role === 'Owner');
    const client = isPlatformAdmin ? getSupabaseAdmin() : supabase;

    const { data: pricing, error } = await client
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

