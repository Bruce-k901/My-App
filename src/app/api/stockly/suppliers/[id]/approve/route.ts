// @salsa - SALSA Compliance: Supplier approval action API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/stockly/suppliers/[id]/approve
 * Change supplier approval status and log the action.
 * Body: { action, new_status?, risk_rating?, next_review_date?, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { action, new_status, risk_rating, next_review_date, notes } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // @salsa — Get current supplier state
    const { data: supplier, error: fetchError } = await supabase
      .from('suppliers')
      .select('approval_status, risk_rating, company_id')
      .eq('id', id)
      .single();

    if (fetchError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // @salsa — Build update payload
    const updatePayload: Record<string, unknown> = {};

    if (new_status) {
      updatePayload.approval_status = new_status;
      if (new_status === 'approved') {
        updatePayload.approved_at = new Date().toISOString();
        updatePayload.approved_by = user?.id || null;
      }
    }

    if (risk_rating) {
      updatePayload.risk_rating = risk_rating;
    }

    if (next_review_date !== undefined) {
      updatePayload.next_review_date = next_review_date;
    }

    // @salsa — Update supplier
    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // @salsa — Log the action
    const { error: logError } = await supabase
      .from('supplier_approval_log')
      .insert({
        company_id: supplier.company_id,
        supplier_id: id,
        action,
        old_status: supplier.approval_status || null,
        new_status: new_status || supplier.approval_status || null,
        old_risk_rating: supplier.risk_rating || null,
        new_risk_rating: risk_rating || supplier.risk_rating || null,
        notes: notes || null,
        performed_by: user?.id || null,
      });

    if (logError) {
      console.error('[supplier-approve] Log error:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update approval status' }, { status: 500 });
  }
}
