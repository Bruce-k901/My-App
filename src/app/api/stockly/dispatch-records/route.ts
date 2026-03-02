// @salsa - SALSA Compliance: Batch dispatch records API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/dispatch-records
 * List dispatch records. Query params: stock_batch_id, customer_id, site_id, from_date, to_date
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const stockBatchId = searchParams.get('stock_batch_id');
    const customerId = searchParams.get('customer_id');
    const siteId = searchParams.get('site_id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    let query = supabase
      .from('batch_dispatch_records')
      .select('*, stock_batch:stock_batches(id, batch_code, stock_item:stock_items(id, name))')
      .order('dispatch_date', { ascending: false });

    if (stockBatchId) query = query.eq('stock_batch_id', stockBatchId);
    if (customerId) query = query.eq('customer_id', customerId);
    if (siteId && siteId !== 'all') query = query.eq('site_id', siteId);
    if (fromDate) query = query.gte('dispatch_date', fromDate);
    if (toDate) query = query.lte('dispatch_date', toDate);

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ success: true, data: [] });
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/stockly/dispatch-records
 * Create a dispatch record linking a stock batch to a customer delivery
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { company_id, site_id, stock_batch_id, order_id, customer_id, customer_name, dispatch_date, quantity, unit, delivery_note_reference, created_by } = body;

    if (!company_id || !stock_batch_id || !customer_name || !dispatch_date || !quantity) {
      return NextResponse.json({ success: false, error: 'company_id, stock_batch_id, customer_name, dispatch_date, and quantity are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('batch_dispatch_records')
      .insert({
        company_id,
        site_id: site_id || null,
        stock_batch_id,
        order_id: order_id || null,
        customer_id: customer_id || null,
        customer_name,
        dispatch_date,
        quantity,
        unit: unit || null,
        delivery_note_reference: delivery_note_reference || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
