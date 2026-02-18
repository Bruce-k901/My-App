// @salsa - SALSA Compliance: Production batch input (raw material consumption) API
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { stock_batch_id, stock_item_id, planned_quantity, actual_quantity, unit } = body;

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
      .select('id, quantity_remaining, status, company_id')
      .eq('id', stock_batch_id)
      .single();

    if (stockError || !stockBatch) {
      return NextResponse.json({ error: 'Stock batch not found' }, { status: 404 });
    }

    if (stockBatch.status !== 'active') {
      return NextResponse.json({ error: `Cannot consume from ${stockBatch.status} batch` }, { status: 400 });
    }

    if (quantity > stockBatch.quantity_remaining) {
      return NextResponse.json(
        { error: `Only ${stockBatch.quantity_remaining} remaining in stock batch` },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Create the input record
    const { data: input, error: inputError } = await supabase
      .from('production_batch_inputs')
      .insert({
        company_id: batch.company_id,
        production_batch_id: id,
        stock_batch_id,
        stock_item_id,
        planned_quantity: planned_quantity || null,
        actual_quantity: actual_quantity || null,
        unit: unit || null,
        added_by: user?.id || null,
      })
      .select(`
        *,
        stock_batch:stock_batches(id, batch_code, quantity_remaining, unit, use_by_date, allergens, status),
        stock_item:stock_items(id, name, stock_unit)
      `)
      .single();

    if (inputError) {
      return NextResponse.json({ error: inputError.message }, { status: 500 });
    }

    // Create batch movement record (consumed_production)
    await supabase.from('batch_movements').insert({
      company_id: batch.company_id,
      site_id: batch.site_id,
      batch_id: stock_batch_id,
      movement_type: 'consumed_production',
      quantity: -quantity,
      reference_type: 'production_batch',
      reference_id: id,
      notes: `Consumed for production batch ${batch.company_id}`,
      created_by: user?.id || null,
    });

    // Update stock batch quantity_remaining
    const newRemaining = stockBatch.quantity_remaining - quantity;
    await supabase
      .from('stock_batches')
      .update({ quantity_remaining: newRemaining })
      .eq('id', stock_batch_id);

    return NextResponse.json({ success: true, data: input });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add production input' }, { status: 500 });
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
        const { data: { user } } = await supabase.auth.getUser();

        // Create reversal movement
        await supabase.from('batch_movements').insert({
          company_id: input.company_id,
          batch_id: input.stock_batch_id,
          movement_type: 'adjustment',
          quantity: quantity,
          reference_type: 'production_batch',
          reference_id: id,
          notes: 'Reversed production consumption',
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
