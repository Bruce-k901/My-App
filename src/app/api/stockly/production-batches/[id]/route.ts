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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch the production batch
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('id, company_id, site_id, status')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    // Only allow deleting planned or cancelled batches
    if (batch.status !== 'planned' && batch.status !== 'cancelled') {
      return NextResponse.json(
        { error: `Cannot delete a batch with status "${batch.status}". Only planned or cancelled batches can be deleted.` },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Reverse all inputs — restore stock batch quantities
    const { data: inputs } = await supabase
      .from('production_batch_inputs')
      .select('id, stock_batch_id, actual_quantity, planned_quantity')
      .eq('production_batch_id', id);

    if (inputs && inputs.length > 0) {
      for (const input of inputs) {
        const quantity = input.actual_quantity || input.planned_quantity || 0;
        if (quantity > 0 && input.stock_batch_id) {
          const { data: stockBatch } = await supabase
            .from('stock_batches')
            .select('quantity_remaining')
            .eq('id', input.stock_batch_id)
            .single();

          if (stockBatch) {
            // Create reversal movement
            await supabase.from('batch_movements').insert({
              company_id: batch.company_id,
              site_id: batch.site_id,
              batch_id: input.stock_batch_id,
              movement_type: 'adjustment',
              quantity: quantity,
              reference_type: 'production_batch',
              reference_id: id,
              notes: 'Reversed: production batch deleted',
              created_by: user?.id || null,
            });

            // Restore quantity
            await supabase
              .from('stock_batches')
              .update({
                quantity_remaining: stockBatch.quantity_remaining + quantity,
                status: 'active',
              })
              .eq('id', input.stock_batch_id);
          }
        }
      }

      // Delete all input records
      await supabase
        .from('production_batch_inputs')
        .delete()
        .eq('production_batch_id', id);
    }

    // 2. Delete outputs and their created stock batches
    const { data: outputs } = await supabase
      .from('production_batch_outputs')
      .select('id, batch_code')
      .eq('production_batch_id', id);

    if (outputs && outputs.length > 0) {
      for (const output of outputs) {
        // Find the stock batch created for this output
        const { data: outputStockBatch } = await supabase
          .from('stock_batches')
          .select('id')
          .eq('production_batch_id', id)
          .eq('batch_code', output.batch_code)
          .single();

        if (outputStockBatch) {
          // Delete movements for this stock batch
          await supabase
            .from('batch_movements')
            .delete()
            .eq('batch_id', outputStockBatch.id);

          // Delete the stock batch
          await supabase
            .from('stock_batches')
            .delete()
            .eq('id', outputStockBatch.id);
        }
      }

      // Delete all output records
      await supabase
        .from('production_batch_outputs')
        .delete()
        .eq('production_batch_id', id);
    }

    // 3. Delete CCP records
    await supabase
      .from('production_ccp_records')
      .delete()
      .eq('production_batch_id', id);

    // 4. Delete the production batch itself
    const { error: deleteError } = await supabase
      .from('production_batches')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete production batch' }, { status: 500 });
  }
}
