// @salsa - SALSA Compliance: Production batch input (raw material consumption) API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { convertQuantity } from '@/lib/utils/unitConversions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { stock_batch_id, stock_item_id, planned_quantity, actual_quantity, unit, is_rework, rework_source_batch_id } = body;

    if (!stock_batch_id || !stock_item_id) {
      return NextResponse.json({ error: 'stock_batch_id and stock_item_id are required' }, { status: 400 });
    }

    const quantity = actual_quantity || planned_quantity;
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
    }

    // Verify production batch exists and is not completed/cancelled
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('id, company_id, site_id, status')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot add inputs to ${batch.status} batch` }, { status: 400 });
    }

    // Verify stock batch exists and has enough quantity
    const { data: stockBatch, error: stockError } = await supabase
      .from('stock_batches')
      .select('id, quantity_remaining, unit, status, company_id')
      .eq('id', stock_batch_id)
      .single();

    if (stockError || !stockBatch) {
      return NextResponse.json({ error: 'Stock batch not found' }, { status: 404 });
    }

    if (stockBatch.status !== 'active') {
      return NextResponse.json({ error: `Cannot consume from ${stockBatch.status} batch` }, { status: 400 });
    }

    // Convert input quantity to the stock batch's unit for comparison/deduction
    const batchUnit = stockBatch.unit || unit || '';
    const inputUnit = unit || batchUnit;
    const converted = convertQuantity(quantity, inputUnit, batchUnit);
    const deductQty = converted.quantity; // quantity in stock batch's unit

    if (deductQty > stockBatch.quantity_remaining) {
      return NextResponse.json(
        { error: `Only ${stockBatch.quantity_remaining} ${batchUnit} remaining in stock batch` },
        { status: 400 }
      );
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || null;

    // Build insert payload — only include rework fields when actually reworking
    const insertPayload: Record<string, unknown> = {
      company_id: batch.company_id,
      production_batch_id: id,
      stock_batch_id,
      stock_item_id,
      planned_quantity: planned_quantity || null,
      actual_quantity: actual_quantity || null,
      unit: unit || null,
      added_by: userId,
    };
    if (is_rework) {
      insertPayload.is_rework = true;
      insertPayload.rework_source_batch_id = rework_source_batch_id || null;
    }

    // Create the input record
    const { error: inputError } = await supabase
      .from('production_batch_inputs')
      .insert(insertPayload);

    if (inputError) {
      console.error('production_batch_inputs insert error:', inputError.code, inputError.message, inputError.details);
      return NextResponse.json({ error: inputError.message }, { status: 500 });
    }

    // Create batch movement record (consumed_production) — use converted qty in batch unit
    const { error: movementError } = await supabase.from('batch_movements').insert({
      company_id: batch.company_id,
      site_id: batch.site_id,
      batch_id: stock_batch_id,
      movement_type: is_rework ? 'rework' : 'consumed_production',
      quantity: -deductQty,
      reference_type: 'production_batch',
      reference_id: id,
      notes: is_rework ? `Rework material used in production batch` : `Consumed for production batch`,
      created_by: userId,
    });

    if (movementError) {
      console.error('batch_movements insert error:', movementError.code, movementError.message);
      return NextResponse.json({ error: `Stock movement failed: ${movementError.message}` }, { status: 500 });
    }

    // Update stock batch quantity_remaining (set depleted if zero)
    const newRemaining = Math.round((stockBatch.quantity_remaining - deductQty) * 1000) / 1000;
    const { error: updateError } = await supabase
      .from('stock_batches')
      .update({
        quantity_remaining: newRemaining,
        ...(newRemaining <= 0 ? { status: 'depleted' } : {}),
      })
      .eq('id', stock_batch_id);

    if (updateError) {
      console.error('stock_batches update error:', updateError.code, updateError.message);
      return NextResponse.json({ error: `Stock update failed: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Failed to add production input:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Failed to add production input' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const inputId = searchParams.get('inputId');

    if (!inputId) {
      return NextResponse.json({ error: 'inputId query param required' }, { status: 400 });
    }

    // Get the input record to reverse the consumption
    const { data: input, error: fetchError } = await supabase
      .from('production_batch_inputs')
      .select('*, production_batch:production_batches(status)')
      .eq('id', inputId)
      .eq('production_batch_id', id)
      .single();

    if (fetchError || !input) {
      return NextResponse.json({ error: 'Input record not found' }, { status: 404 });
    }

    if (input.production_batch?.status === 'completed' || input.production_batch?.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot remove inputs from completed/cancelled batch' }, { status: 400 });
    }

    const quantity = input.actual_quantity || input.planned_quantity || 0;

    // Reverse the stock batch quantity
    if (quantity > 0) {
      const { data: stockBatch } = await supabase
        .from('stock_batches')
        .select('quantity_remaining')
        .eq('id', input.stock_batch_id)
        .single();

      if (stockBatch) {
        const { data: userData } = await supabase.auth.getUser();

        // Create reversal movement
        await supabase.from('batch_movements').insert({
          company_id: input.company_id,
          batch_id: input.stock_batch_id,
          movement_type: 'adjustment',
          quantity: quantity,
          reference_type: 'production_batch',
          reference_id: id,
          notes: 'Reversed production consumption',
          created_by: userData?.user?.id || null,
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

    // Delete the input record
    const { error: deleteError } = await supabase
      .from('production_batch_inputs')
      .delete()
      .eq('id', inputId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to remove production input' }, { status: 500 });
  }
}
