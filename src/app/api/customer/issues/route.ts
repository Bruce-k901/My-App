import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { resolveCustomer, getCustomerAdmin } from '@/lib/customer-auth';

/**
 * GET /api/customer/issues
 * List customer's issues
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await resolveCustomer(request, supabase, user);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const admin = getCustomerAdmin();

    const { data: issues, error: issuesError } = await admin
      .from('order_book_issues')
      .select(`
        *,
        order:planly_orders(id, delivery_date)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (issuesError) {
      console.error('Error fetching issues:', issuesError);
      return NextResponse.json(
        { error: issuesError.message || 'Failed to fetch issues' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: issues || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/issues:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/issues
 * Create new issue
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await resolveCustomer(request, supabase, user);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const admin = getCustomerAdmin();

    // Get company_id from site
    const { data: site } = await admin
      .from('sites')
      .select('company_id')
      .eq('id', customer.site_id)
      .single();

    const body = await request.json();
    const {
      issue_type,
      title,
      description,
      order_id,
      affected_items,
      photos,
      requested_resolution,
    } = body;

    if (!issue_type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: issue_type, title, description' },
        { status: 400 }
      );
    }

    const { data: issue, error: issueError } = await admin
      .from('order_book_issues')
      .insert({
        company_id: site?.company_id,
        customer_id: customer.id,
        issue_type,
        title,
        description,
        order_id,
        affected_items: affected_items || [],
        photos: photos || [],
        requested_resolution,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (issueError) {
      throw issueError;
    }

    return NextResponse.json({
      success: true,
      data: issue,
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/issues:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

