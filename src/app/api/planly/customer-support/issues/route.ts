import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/planly/customer-support/issues
 * List all customer issues for the admin's company.
 * Query params: status (optional), site_id (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, is_platform_admin, app_role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    const isAdmin = profile.is_platform_admin || ['Owner', 'Admin', 'Manager'].includes(profile.app_role || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const statusFilter = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('order_book_issues')
      .select(`
        *,
        order:planly_orders(id, delivery_date),
        customer:planly_customers(id, name, email)
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: issues, error: issuesError } = await query;

    if (issuesError) {
      console.error('Error fetching issues:', issuesError);
      return NextResponse.json({ error: issuesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: issues || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/planly/customer-support/issues:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/planly/customer-support/issues
 * Update issue status (resolve, close, etc.)
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
    const { issue_id, status, resolution_notes } = body;

    if (!issue_id || !status) {
      return NextResponse.json({ error: 'issue_id and status are required' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    }

    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }

    const { data: issue, error: updateError } = await supabase
      .from('order_book_issues')
      .update(updateData)
      .eq('id', issue_id)
      .eq('company_id', profile!.company_id)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, data: issue });
  } catch (error: any) {
    console.error('Error in PATCH /api/planly/customer-support/issues:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
