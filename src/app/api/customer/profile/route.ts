import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/profile
 * Get customer profile from planly_customers by authenticated user's email.
 * Supports admin preview via ?customer_id= param.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getCustomerAdmin();
    const customerIdParam = request.nextUrl.searchParams.get('customer_id');

    // Admin preview: allow specifying customer_id directly
    if (customerIdParam) {
      const { data: profile } = await admin
        .from('profiles')
        .select('is_platform_admin, app_role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const isAdmin = profile?.is_platform_admin || profile?.app_role === 'Owner';
      if (isAdmin) {
        const { data: customer, error } = await admin
          .from('planly_customers')
          .select('id, name, contact_name, email, phone, site_id, is_active, default_ship_state')
          .eq('id', customerIdParam)
          .maybeSingle();

        if (error || !customer) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            id: customer.id,
            site_id: customer.site_id,
            business_name: customer.name,
            contact_name: customer.contact_name,
            email: customer.email,
            phone: customer.phone,
            is_active: customer.is_active,
            default_ship_state: customer.default_ship_state,
          },
        });
      }
    }

    // Regular customer: look up by email
    const { data: customer, error: customerError } = await admin
      .from('planly_customers')
      .select('id, name, contact_name, email, phone, site_id, is_active, default_ship_state')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        site_id: customer.site_id,
        business_name: customer.name,
        contact_name: customer.contact_name,
        email: customer.email,
        phone: customer.phone,
        is_active: customer.is_active,
        default_ship_state: customer.default_ship_state,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/profile:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
