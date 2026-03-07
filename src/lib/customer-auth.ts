import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface ResolvedCustomer {
  id: string;
  site_id: string;
}

/**
 * Get the admin Supabase client for customer portal data operations.
 * All customer API routes should use this for data queries (bypasses RLS).
 * Auth verification is still done via createServerSupabaseClient().
 */
export function getCustomerAdmin() {
  return getSupabaseAdmin();
}

/**
 * Resolve the customer for a customer portal API request.
 * Uses the service-role admin client to bypass RLS.
 * Supports admin preview via ?customer_id= query param.
 * Falls back to email-based lookup in planly_customers.
 */
export async function resolveCustomer(
  request: NextRequest,
  _supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<ResolvedCustomer | null> {
  const admin = getSupabaseAdmin();
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
      const { data: customer } = await admin
        .from('planly_customers')
        .select('id, site_id')
        .eq('id', customerIdParam)
        .maybeSingle();

      if (customer) {
        return { id: customer.id, site_id: customer.site_id };
      }
    }
  }

  // Regular customer: look up by email
  const { data: customer } = await admin
    .from('planly_customers')
    .select('id, site_id')
    .eq('email', user.email?.toLowerCase() || '')
    .eq('is_active', true)
    .maybeSingle();

  return customer || null;
}
