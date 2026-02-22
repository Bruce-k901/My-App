// @salsa - SALSA Compliance: Batch list and creation API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateBatchCode } from '@/lib/stockly/batch-codes';

/**
 * GET /api/stockly/batches
 * List batches with optional filters.
 * Query params: stock_item_id, status, site_id, expiry_before, expiry_after, search, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const stockItemId = searchParams.get('stock_item_id');
    const status = searchParams.get('status');
    const siteId = searchParams.get('site_id');
    const expiryBefore = searchParams.get('expiry_before');
    const expiryAfter = searchParams.get('expiry_after');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // @salsa
    let query = supabase
      .from('stock_batches')
      .select(`
        *,
        stock_item:stock_items(id, name, category_id, stock_unit),
        delivery_line:delivery_lines(
          id,
          delivery:deliveries(id, supplier_id, delivery_date, suppliers(name))
        )
      `, { count: 'exact' });

    if (stockItemId) {
      query = query.eq('stock_item_id', stockItemId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }

    // Filter by expiry date range (checks both use_by and best_before)
    if (expiryBefore) {
      query = query.or(`use_by_date.lte.${expiryBefore},best_before_date.lte.${expiryBefore}`);
    }

    if (expiryAfter) {
      query = query.or(`use_by_date.gte.${expiryAfter},best_before_date.gte.${expiryAfter}`);
    }

    if (search) {
      query = query.or(`batch_code.ilike.%${search}%,supplier_batch_code.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, count });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stockly/batches
 * Create a new batch manually (rare — usually auto-created via delivery receipt).
 * Body: { company_id, site_id, stock_item_id, batch_code?, quantity_received, unit, use_by_date?, best_before_date?, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      company_id,
      site_id,
      stock_item_id,
      batch_code: manualCode,
      supplier_batch_code,
      quantity_received,
      unit,
      use_by_date,
      best_before_date,
      temperature_on_receipt,
      condition_notes,
      delivery_line_id,
      batch_code_format,
      site_name,
    } = body;

    if (!company_id || !stock_item_id || !quantity_received || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, stock_item_id, quantity_received, unit' },
        { status: 400 }
      );
    }

    // @salsa — Generate batch code if not manually provided
    const batchCode = manualCode || await generateBatchCode(supabase, company_id, {
      format: batch_code_format,
      siteName: site_name,
    });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Create the batch
    const { data: batch, error: batchError } = await supabase
      .from('stock_batches')
      .insert({
        company_id,
        site_id: site_id || null,
        stock_item_id,
        delivery_line_id: delivery_line_id || null,
        batch_code: batchCode,
        supplier_batch_code: supplier_batch_code || null,
        quantity_received,
        quantity_remaining: quantity_received,
        unit,
        use_by_date: use_by_date || null,
        best_before_date: best_before_date || null,
        temperature_on_receipt: temperature_on_receipt || null,
        condition_notes: condition_notes || null,
        status: 'active',
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (batchError) {
      // Handle unique constraint violation
      if (batchError.code === '23505') {
        return NextResponse.json(
          { error: `Batch code "${batchCode}" already exists. Please use a different code.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    // @salsa — Create the initial "received" movement
    await supabase.from('batch_movements').insert({
      company_id,
      site_id: site_id || null,
      batch_id: batch.id,
      movement_type: 'received',
      quantity: quantity_received,
      reference_type: delivery_line_id ? 'delivery_line' : null,
      reference_id: delivery_line_id || null,
      notes: 'Initial batch receipt',
      created_by: user?.id || null,
    });

    // @salsa — Link batch back to delivery line if provided
    if (delivery_line_id) {
      await supabase
        .from('delivery_lines')
        .update({ batch_id: batch.id })
        .eq('id', delivery_line_id);
    }

    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}
