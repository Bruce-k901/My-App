import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/customer/credit-requests
 * List customer's credit requests
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record from planly
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('id, site_id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: requests, error: requestsError } = await supabase
      .from('order_book_credit_requests')
      .select(`
        *,
        order:planly_orders(id, delivery_date),
        issue:order_book_issues(id, issue_number, title)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching credit requests:', requestsError);
      return NextResponse.json(
        { error: requestsError.message || 'Failed to fetch credit requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/credit-requests:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/credit-requests
 * Create credit request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer record from planly
    const { data: customer } = await supabase
      .from('planly_customers')
      .select('id, site_id')
      .eq('email', user.email?.toLowerCase() || '')
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get company_id from site
    const { data: site } = await supabase
      .from('sites')
      .select('company_id')
      .eq('id', customer.site_id)
      .single();

    const body = await request.json();
    const {
      order_id,
      issue_id,
      affected_items,
      reason,
      requested_amount,
    } = body;

    if (!affected_items || !reason || !requested_amount) {
      return NextResponse.json(
        { error: 'Missing required fields: affected_items, reason, requested_amount' },
        { status: 400 }
      );
    }

    const { data: creditRequest, error: creditError } = await supabase
      .from('order_book_credit_requests')
      .insert({
        company_id: site?.company_id,
        customer_id: customer.id,
        order_id,
        issue_id,
        affected_items,
        reason,
        requested_amount,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (creditError) {
      throw creditError;
    }

    return NextResponse.json({
      success: true,
      data: creditRequest,
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/credit-requests:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

