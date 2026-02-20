// @salsa - SALSA Compliance: Batch detail and update API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/batches/[id]
 * Get batch detail with full movement history.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // @salsa — Fetch batch with joins
    const { data: batch, error: batchError } = await supabase
      .from('stock_batches')
      .select(`
        *,
        stock_item:stock_items(id, name, category_id, stock_unit),
        delivery_line:delivery_lines(
          id,
          delivery:deliveries(id, supplier_id, delivery_date, delivery_note_number, suppliers(name))
        )
      `)
      .eq('id', id)
      .single();

    if (batchError) {
      if (batchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
      }
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    // @salsa — Fetch movement history
    const { data: movements, error: movementsError } = await supabase
      .from('batch_movements')
      .select(`
        *,
        created_by_profile:profiles!batch_movements_created_by_fkey(full_name)
      `)
      .eq('batch_id', id)
      .order('created_at', { ascending: false });

    if (movementsError) {
      return NextResponse.json({ error: movementsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { ...batch, movements: movements || [] },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/stockly/batches/[id]
 * Update batch status or quantity (with reason logged as movement).
 * Body: { status?, quantity_adjustment?, adjustment_reason?, condition_notes?, use_by_date?, best_before_date? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      status,
      quantity_adjustment,
      adjustment_reason,
      condition_notes,
      use_by_date,
      best_before_date,
      reference_type,
      reference_id,
    } = body;

    // Get current batch state
    const { data: current, error: fetchError } = await supabase
      .from('stock_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Build update object
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      updates.status = status;
    }

    if (condition_notes !== undefined) {
      updates.condition_notes = condition_notes;
    }

    if (use_by_date !== undefined) {
      updates.use_by_date = use_by_date;
    }

    if (best_before_date !== undefined) {
      updates.best_before_date = best_before_date;
    }

    // @salsa — Handle quantity adjustment with movement record
    if (quantity_adjustment !== undefined && quantity_adjustment !== 0) {
      const newRemaining = current.quantity_remaining + quantity_adjustment;
      if (newRemaining < 0) {
        return NextResponse.json(
          { error: `Cannot adjust: would result in negative quantity (${newRemaining})` },
          { status: 400 }
        );
      }
      updates.quantity_remaining = newRemaining;

      // Log the adjustment movement
      await supabase.from('batch_movements').insert({
        company_id: current.company_id,
        site_id: current.site_id,
        batch_id: id,
        movement_type: 'adjustment',
        quantity: quantity_adjustment,
        reference_type: reference_type || 'adjustment',
        reference_id: reference_id || null,
        notes: adjustment_reason || 'Manual quantity adjustment',
        created_by: user?.id || null,
      });
    }

    // @salsa — Handle status change to 'recalled' — log movement
    if (status === 'recalled' && current.status !== 'recalled') {
      await supabase.from('batch_movements').insert({
        company_id: current.company_id,
        site_id: current.site_id,
        batch_id: id,
        movement_type: 'recalled',
        quantity: -current.quantity_remaining,
        reference_type: 'recall',
        notes: adjustment_reason || 'Batch recalled',
        created_by: user?.id || null,
      });
      updates.quantity_remaining = 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('stock_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 }
    );
  }
}
