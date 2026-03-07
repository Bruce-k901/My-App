// @salsa - SALSA Compliance: Non-conformance register list and creation API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/non-conformances
 * List non-conformances with optional filters: status, category, severity, site_id
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const siteId = searchParams.get('site_id');

    let query = supabase
      .from('non_conformances')
      .select('*')
      .order('raised_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (siteId && siteId !== 'all') query = query.eq('site_id', siteId);

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
 * POST /api/stockly/non-conformances
 * Create a new non-conformance with auto-generated NC code
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      company_id, site_id, title, description, category, severity,
      source, source_reference, corrective_action_due, raised_by,
    } = body;

    if (!company_id || !title) {
      return NextResponse.json(
        { success: false, error: 'company_id and title are required' },
        { status: 400 }
      );
    }

    // @salsa — Auto-generate NC code: NC-{YYYY}-{SEQ}
    const currentYear = new Date().getFullYear();
    const { data: existingNCs, error: countError } = await supabase
      .from('non_conformances')
      .select('nc_code')
      .eq('company_id', company_id)
      .like('nc_code', `NC-${currentYear}-%`)
      .order('nc_code', { ascending: false })
      .limit(1);

    let nextSeq = 1;
    if (!countError && existingNCs && existingNCs.length > 0) {
      const lastCode = existingNCs[0].nc_code;
      const lastSeq = parseInt(lastCode.split('-')[2], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const ncCode = `NC-${currentYear}-${String(nextSeq).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from('non_conformances')
      .insert({
        company_id,
        site_id: site_id || null,
        nc_code: ncCode,
        title,
        description: description || null,
        category: category || 'other',
        severity: severity || 'minor',
        source: source || 'staff_observation',
        source_reference: source_reference || null,
        status: 'open',
        corrective_action_due: corrective_action_due || null,
        raised_by: raised_by || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // @salsa — Auto-create notification for critical NCs
    if (severity === 'critical') {
      await supabase.from('notifications').insert({
        company_id,
        site_id: site_id || null,
        type: 'non_conformance',
        severity: 'critical',
        priority: 'high',
        title: `Critical Non-Conformance Raised: ${ncCode}`,
        message: `${title} — requires immediate corrective action.`,
        metadata: { salsa: true, nc_id: data.id, nc_code: ncCode },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
