import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/customer-support/credit-requests
 * List all customer credit requests for the admin's company.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.is_platform_admin || ['Owner', 'Admin', 'Manager'].includes(profile?.app_role || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: requests, error: requestsError } = await supabase
      .from('order_book_credit_requests')
      .select(`
        *,
        order:planly_orders(id, delivery_date),
        issue:order_book_issues(id, issue_number, title),
        customer:planly_customers(id, name, email)
      `)
      .eq('company_id', profile!.company_id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      throw requestsError;
    }

    return NextResponse.json({ success: true, data: requests || [] });
  } catch (error: any) {
    console.error('Error in GET /api/planly/customer-support/credit-requests:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/planly/customer-support/credit-requests
 * Update credit request status (approve, reject)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = profile?.is_platform_admin || ['Owner', 'Admin', 'Manager'].includes(profile?.app_role || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, approved_amount, admin_notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (approved_amount !== undefined) {
      updateData.approved_amount = approved_amount;
    }
    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    const { data: updated, error: updateError } = await supabase
      .from('order_book_credit_requests')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', profile!.company_id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/planly/customer-support/credit-requests:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
