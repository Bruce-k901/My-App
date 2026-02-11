import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/order-book/customers
 * Get customer profile(s)
 * Query params:
 *   customer_id (optional - if not provided, gets user's customer record)
 *   list=true (optional - platform admins can list all customers for preview mode)
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
    const listAll = request.nextUrl.searchParams.get('list') === 'true';

    // Check if user is a platform admin (needed for admin preview mode)
    let isPlatformAdmin = false;
    if (customerId || listAll) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin, app_role')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      isPlatformAdmin = !!(profile?.is_platform_admin || profile?.app_role === 'Owner');
    }

    // List all customers (admin preview mode)
    if (listAll && isPlatformAdmin) {
      const adminClient = getSupabaseAdmin();
      const { data: customers, error } = await adminClient
        .from('order_book_customers')
        .select('id, business_name')
        .order('business_name');

      if (error) {
        console.error('Error listing customers:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to list customers' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: customers || [] });
    }

    if (customerId) {
      // Use admin client for platform admins to bypass RLS
      const client = isPlatformAdmin ? getSupabaseAdmin() : supabase;
      const { data: customer, error } = await client
        .from('order_book_customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to fetch customer' },
          { status: 500 }
        );
      }

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: customer,
      });
    } else {
      // Get user's customer record using auth_user_id (more secure and reliable)
      const { data: customer, error } = await supabase
        .from('order_book_customers')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to fetch customer' },
          { status: 500 }
        );
      }

      if (!customer) {
        return NextResponse.json(
          { error: 'No customer record found for this user. Please complete your account setup.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: customer,
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/order-book/customers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
