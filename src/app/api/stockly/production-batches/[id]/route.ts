// @salsa - SALSA Compliance: Production batch detail + update API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch production batch with recipe
    const { data: batch, error } = await supabase
      .from('production_batches')
      .select(`
        *,
        recipe:recipes(id, name, allergens, may_contain_allergens, yield_quantity, yield_unit, output_ingredient_id, shelf_life_days)
      `)
      .eq('id', id)
      .single();

    if (error || !batch) {
      if (error?.code === '42P01') {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    // Resolve recipe's output_ingredient_id to a stock_item_id
    if (batch.recipe?.output_ingredient_id) {
      const { data: outputStockItem } = await supabase
        .from('stock_items')
        .select('id, name, stock_unit')
        .eq('company_id', batch.company_id)
        .eq('library_item_id', batch.recipe.output_ingredient_id)
        .eq('library_type', 'ingredients_library')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (outputStockItem) {
        batch.recipe.output_stock_item = outputStockItem;
      }
    }

    // Fetch inputs with stock batch + stock item details
    const { data: inputs } = await supabase
      .from('production_batch_inputs')
      .select(`
        *,
        stock_batch:stock_batches(id, batch_code, quantity_remaining, unit, use_by_date, allergens, status),
        stock_item:stock_items(id, name, stock_unit)
      `)
      .eq('production_batch_id', id)
      .order('added_at', { ascending: true });

    // Fetch outputs
    const { data: outputs } = await supabase
      .from('production_batch_outputs')
      .select(`
        *,
        stock_item:stock_items(id, name)
      `)
      .eq('production_batch_id', id)
      .order('created_at', { ascending: true });

    // Fetch CCP records
    const { data: ccpRecords } = await supabase
      .from('production_ccp_records')
      .select('*')
      .eq('production_batch_id', id)
      .order('recorded_at', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        inputs: inputs || [],
        outputs: outputs || [],
        ccp_records: ccpRecords || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch production batch' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { status, actual_quantity, notes, started_at, operator_id } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (actual_quantity !== undefined) updates.actual_quantity = actual_quantity;
    if (notes !== undefined) updates.notes = notes;
    if (started_at !== undefined) updates.started_at = started_at;
    if (operator_id !== undefined) updates.operator_id = operator_id;

    // Auto-set started_at when moving to in_progress
    if (status === 'in_progress' && !started_at) {
      updates.started_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('production_batches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        recipe:recipes(id, name, allergens, may_contain_allergens, yield_quantity, yield_unit, output_ingredient_id, shelf_life_days)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update production batch' }, { status: 500 });
  }
}
