// @salsa - SALSA Compliance: Recalls list and creation API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/recalls
 * List recalls with optional filters: status, severity, site_id, recall_type
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const siteId = searchParams.get('site_id');
    const recallType = searchParams.get('recall_type');

    let query = supabase
      .from('recalls')
      .select('*')
      .order('initiated_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (siteId && siteId !== 'all') query = query.eq('site_id', siteId);
    if (recallType && recallType !== 'all') query = query.eq('recall_type', recallType);

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ success: true, data: [] });
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/stockly/recalls
 * Create a new recall/withdrawal
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { company_id, site_id, recall_code, title, description, recall_type, severity, reason, initiated_by, created_by } = body;

    if (!company_id || !recall_code || !title) {
      return NextResponse.json({ success: false, error: 'company_id, recall_code, and title are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recalls')
      .insert({
        company_id,
        site_id: site_id || null,
        recall_code,
        title,
        description: description || null,
        recall_type: recall_type || 'recall',
        severity: severity || 'class_2',
        status: 'draft',
        reason: reason || null,
        initiated_by: initiated_by || null,
        created_by: created_by || null,
      })
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
