// @salsa - SALSA Compliance: CCP (Critical Control Point) record API
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
    const { ccp_type, target_value, actual_value, unit, is_within_spec, corrective_action } = body;

    if (!ccp_type) {
      return NextResponse.json({ error: 'ccp_type is required' }, { status: 400 });
    }

    // Verify production batch exists
    const { data: batch, error: batchError } = await supabase
      .from('production_batches')
      .select('id, company_id, status')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Production batch not found' }, { status: 404 });
    }

    if (batch.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot add CCP records to cancelled batch' }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('production_ccp_records')
      .insert({
        company_id: batch.company_id,
        production_batch_id: id,
        ccp_type,
        target_value: target_value || null,
        actual_value: actual_value || null,
        unit: unit || null,
        is_within_spec: is_within_spec ?? null,
        corrective_action: corrective_action || null,
        recorded_by: user?.id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to record CCP measurement' }, { status: 500 });
  }
}
