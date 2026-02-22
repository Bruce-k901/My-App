// @salsa - SALSA Compliance: Non-conformance detail and status transitions API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/non-conformances/[id]
 * Get a single non-conformance
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('non_conformances')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Non-conformance not found' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/stockly/non-conformances/[id]
 * Update a non-conformance with automatic status transitions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // @salsa — Fetch current state for status transition logic
    const { data: current, error: fetchError } = await supabase
      .from('non_conformances')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    const updates = { ...body };

    // @salsa — Auto status transitions based on field changes
    if (updates.root_cause && current.status === 'open') {
      updates.status = 'investigating';
    }
    if (updates.corrective_action && (current.status === 'open' || current.status === 'investigating')) {
      updates.status = 'corrective_action';
    }
    if (updates.corrective_action_completed_at && current.status !== 'closed') {
      updates.status = 'verification';
    }
    if (updates.closed_at) {
      updates.status = 'closed';
    }

    const { data, error } = await supabase
      .from('non_conformances')
      .update(updates)
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
