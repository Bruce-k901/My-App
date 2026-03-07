// @salsa - SALSA Compliance: Supplier detail API (get, update with approval fields)
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/suppliers/[id]
 * Get supplier with documents and approval log.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    // @salsa — Fetch supplier with approval fields
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // @salsa — Fetch documents
    const { data: documents } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    // @salsa — Fetch approval log
    const { data: approvalLog } = await supabase
      .from('supplier_approval_log')
      .select('*, performed_by_profile:profiles!performed_by(full_name)')
      .eq('supplier_id', id)
      .order('performed_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        documents: documents || [],
        approval_log: approvalLog || [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

/**
 * PATCH /api/stockly/suppliers/[id]
 * Update supplier fields (including approval fields).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    // Only allow known fields
    const allowedFields = [
      'name', 'code', 'contact_name', 'email', 'phone', 'address',
      'ordering_method', 'ordering_config', 'payment_terms_days',
      'minimum_order_value', 'delivery_days', 'lead_time_days',
      'order_cutoff_time', 'account_number', 'is_approved',
      'approval_status', 'risk_rating', 'next_review_date',
      'approved_at', 'approved_by',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}
