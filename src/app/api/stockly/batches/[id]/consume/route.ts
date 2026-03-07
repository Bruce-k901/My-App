// @salsa - SALSA Compliance: Batch consumption API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/stockly/batches/[id]/consume
 * Record consumption against a batch (production or waste).
 * Body: { quantity, movement_type, reference_type?, reference_id?, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      quantity,
      movement_type = 'consumed_waste',
      reference_type,
      reference_id,
      notes,
    } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    // @salsa — Get current batch
    const { data: batch, error: fetchError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot consume from batch with status "${batch.status}"` },
        { status: 400 }
      );
    }

    if (quantity > batch.quantity_remaining) {
      return NextResponse.json(
        { error: `Cannot consume ${quantity} ${batch.unit} — only ${batch.quantity_remaining} ${batch.unit} remaining` },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Create consumption movement (negative quantity)
    const { error: movementError } = await supabase
      .from('batch_movements')
      .insert({
        company_id: batch.company_id,
        site_id: batch.site_id,
        batch_id: id,
        movement_type,
        quantity: -quantity, // negative for consumption
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        notes: notes || null,
        created_by: user?.id || null,
      });

    if (movementError) {
      return NextResponse.json({ error: movementError.message }, { status: 500 });
    }

    // @salsa — Update batch remaining quantity
    // The auto_deplete_stock_batch trigger handles setting status to 'depleted' if qty hits 0
    const newRemaining = batch.quantity_remaining - quantity;

    const { data: updated, error: updateError } = await supabase
      .from('stock_batches')
      .update({ quantity_remaining: newRemaining })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to consume from batch' },
      { status: 500 }
    );
  }
}
