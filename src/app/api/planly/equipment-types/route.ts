import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const companyId = searchParams.get('companyId');
    const includeCompanyWide = searchParams.get('includeCompanyWide') === 'true';

    let query = supabase
      .from('planly_equipment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (siteId) {
      if (includeCompanyWide) {
        // Get both site-specific and company-wide equipment types
        const { data: site } = await supabase
          .from('sites')
          .select('company_id')
          .eq('id', siteId)
          .single();

        if (site) {
          query = query.or(`site_id.eq.${siteId},and(site_id.is.null,company_id.eq.${site.company_id})`);
        } else {
          query = query.eq('site_id', siteId);
        }
      } else {
        query = query.eq('site_id', siteId);
      }
    } else if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching equipment types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/planly/equipment-types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('planly_equipment_types')
      .insert({
        ...body,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating equipment type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/equipment-types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
