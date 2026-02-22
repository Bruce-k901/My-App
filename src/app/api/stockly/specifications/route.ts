// @salsa - SALSA Compliance: Product specifications list and create API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/specifications
 * List specs. Query params: stock_item_id, supplier_id, status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const stockItemId = searchParams.get('stock_item_id');
    const supplierId = searchParams.get('supplier_id');
    const status = searchParams.get('status');

    // @salsa
    let query = supabase
      .from('product_specifications')
      .select(`
        *,
        stock_item:stock_items(id, name),
        supplier:suppliers(id, name)
      `)
      .order('updated_at', { ascending: false });

    if (stockItemId) {
      query = query.eq('stock_item_id', stockItemId);
    }
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch specifications' }, { status: 500 });
  }
}

/**
 * POST /api/stockly/specifications
 * Create a new product specification.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { company_id, stock_item_id } = body;
    if (!company_id || !stock_item_id) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id, stock_item_id' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Create spec
    const { data, error } = await supabase
      .from('product_specifications')
      .insert({
        company_id,
        stock_item_id,
        supplier_id: body.supplier_id || null,
        version_number: 1,
        allergens: body.allergens || null,
        may_contain_allergens: body.may_contain_allergens || null,
        storage_temp_min: body.storage_temp_min ?? null,
        storage_temp_max: body.storage_temp_max ?? null,
        storage_conditions: body.storage_conditions || null,
        shelf_life_days: body.shelf_life_days ?? null,
        shelf_life_unit: body.shelf_life_unit || 'days',
        handling_instructions: body.handling_instructions || null,
        country_of_origin: body.country_of_origin || null,
        spec_document_id: body.spec_document_id || null,
        status: 'active',
        last_reviewed_at: new Date().toISOString(),
        next_review_date: body.next_review_date || null,
        reviewed_by: user?.id || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create specification' }, { status: 500 });
  }
}
