// @salsa - SALSA Compliance: Recall affected batches management API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/stockly/recalls/[id]/batches
 * Add an affected batch to a recall. Auto-quarantines the stock batch.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: recallId } = await params;
    const body = await request.json();

    const { company_id, stock_batch_id, batch_type, quantity_affected, notes } = body;

    if (!company_id || !stock_batch_id) {
      return NextResponse.json({ success: false, error: 'company_id and stock_batch_id are required' }, { status: 400 });
    }

    // 1. Add to recall_affected_batches
    const { data: affectedBatch, error: insertErr } = await supabase
      .from('recall_affected_batches')
      .insert({
        company_id,
        recall_id: recallId,
        stock_batch_id,
        batch_type: batch_type || 'finished_product',
        quantity_affected: quantity_affected || null,
        action_taken: 'quarantined',
        notes: notes || null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    // 2. Auto-quarantine the stock batch
    const { error: updateErr } = await supabase
      .from('stock_batches')
      .update({ status: 'quarantined' })
      .eq('id', stock_batch_id);

    if (updateErr) {
      console.error('Failed to quarantine batch:', updateErr);
    }

    // 3. Create batch_movement record for the quarantine
    const { data: batchData } = await supabase
      .from('stock_batches')
      .select('quantity_remaining, unit')
      .eq('id', stock_batch_id)
      .single();

    if (batchData) {
      await supabase.from('batch_movements').insert({
        company_id,
        batch_id: stock_batch_id,
        movement_type: 'recalled',
        quantity: -(quantity_affected || batchData.quantity_remaining || 0),
        reference_type: 'recall',
        reference_id: recallId,
        notes: `Quarantined for recall ${recallId}`,
      });
    }

    return NextResponse.json({ success: true, data: affectedBatch });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/stockly/recalls/[id]/batches
 * Remove an affected batch from a recall.
 * Body: { affected_batch_id }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: recallId } = await params;
    const { searchParams } = new URL(request.url);
    const affectedBatchId = searchParams.get('affected_batch_id');

    if (!affectedBatchId) {
      return NextResponse.json({ success: false, error: 'affected_batch_id is required' }, { status: 400 });
    }

    // Get the affected batch record first
    const { data: record } = await supabase
      .from('recall_affected_batches')
      .select('stock_batch_id')
      .eq('id', affectedBatchId)
      .eq('recall_id', recallId)
      .single();

    if (!record) {
      return NextResponse.json({ success: false, error: 'Affected batch record not found' }, { status: 404 });
    }

    // Delete the affected batch record
    const { error } = await supabase
      .from('recall_affected_batches')
      .delete()
      .eq('id', affectedBatchId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Check if batch is still affected by other recalls before releasing quarantine
    const { data: otherRecalls } = await supabase
      .from('recall_affected_batches')
      .select('id')
      .eq('stock_batch_id', record.stock_batch_id)
      .neq('recall_id', recallId);

    if (!otherRecalls || otherRecalls.length === 0) {
      // No other recalls reference this batch — release from quarantine
      await supabase
        .from('stock_batches')
        .update({ status: 'active' })
        .eq('id', record.stock_batch_id)
        .eq('status', 'quarantined');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
