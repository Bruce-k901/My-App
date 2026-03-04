import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { autoMatchTeamMembers } from '@/lib/square/labor';

/**
 * GET /api/integrations/square/labor/match
 * List employee mappings for a company.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('pos_employee_mappings')
      .select(`
        id,
        pos_team_member_id,
        pos_team_member_name,
        profile_id,
        match_method,
        is_active,
        site_id,
        updated_at
      `)
      .eq('company_id', companyId)
      .eq('pos_provider', 'square')
      .order('pos_team_member_name');

    if (error) {
      console.error('[api/square/labor/match] GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[api/square/labor/match] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load mappings' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integrations/square/labor/match
 * Trigger auto-match of Square team members to Teamly profiles.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, siteId } = await request.json();
    if (!companyId || !siteId) {
      return NextResponse.json({ error: 'companyId and siteId are required' }, { status: 400 });
    }

    const result = await autoMatchTeamMembers(companyId, siteId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('[api/square/labor/match] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Auto-match failed' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/integrations/square/labor/match
 * Manually set the profile_id for a Square team member mapping.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mappingId, profileId } = await request.json();
    if (!mappingId) {
      return NextResponse.json({ error: 'mappingId is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('pos_employee_mappings')
      .update({
        profile_id: profileId || null,
        match_method: profileId ? 'manual' : 'unmatched',
        updated_at: new Date().toISOString(),
      })
      .eq('id', mappingId);

    if (error) {
      console.error('[api/square/labor/match] PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/square/labor/match] PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
