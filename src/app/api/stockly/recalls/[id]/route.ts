// @salsa - SALSA Compliance: Recall detail and update API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/recalls/[id]
 * Get recall detail with affected batches and notifications
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // Get recall
    const { data: recall, error } = await supabase
      .from('recalls')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !recall) {
      return NextResponse.json({ success: false, error: 'Recall not found' }, { status: 404 });
    }

    // Get affected batches with stock_batch details
    const { data: affectedBatches } = await supabase
      .from('recall_affected_batches')
      .select('*, stock_batch:stock_batches(id, batch_code, quantity_received, quantity_remaining, unit, status, stock_item:stock_items(id, name))')
      .eq('recall_id', id)
      .order('added_at', { ascending: false });

    // Get notifications
    const { data: notifications } = await supabase
      .from('recall_notifications')
      .select('*')
      .eq('recall_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        ...recall,
        affected_batches: affectedBatches || [],
        notifications: notifications || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/stockly/recalls/[id]
 * Update recall fields (status, root_cause, corrective_actions, FSA/SALSA notifications, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateFields: Record<string, any> = {};
    const allowedFields = [
      'title', 'description', 'recall_type', 'severity', 'status',
      'reason', 'root_cause', 'corrective_actions', 'notes',
      'fsa_notified', 'fsa_notified_at', 'fsa_reference',
      'salsa_notified', 'salsa_notified_at',
      'resolved_at', 'closed_at',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    }

    // Auto-set timestamps based on status transitions
    if (body.status === 'active' && !body.initiated_at) {
      updateFields.initiated_at = new Date().toISOString();
    }
    if (body.status === 'resolved' && !body.resolved_at) {
      updateFields.resolved_at = new Date().toISOString();
    }
    if (body.status === 'closed' && !body.closed_at) {
      updateFields.closed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('recalls')
      .update(updateFields)
      .eq('id', id)
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
