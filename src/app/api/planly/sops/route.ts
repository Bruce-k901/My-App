import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/planly/sops
 *
 * Returns SOPs that can be linked to processing groups.
 * Used for lamination methods, processing instructions, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const siteId = searchParams.get('siteId');

    // Build query
    let query = supabase
      .from('sop_entries')
      .select('id, title, ref_code, category, status, site_id')
      .eq('status', 'Published')
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // If site is specified, get site-specific and company-wide SOPs
    if (siteId) {
      query = query.or(`site_id.eq.${siteId},site_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching SOPs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/planly/sops:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
