import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const includeMasters = searchParams.get('includeMasters') === 'true';

    let query = supabase
      .from('planly_process_templates')
      .select(`
        *,
        stages:planly_process_stages(
          *,
          equipment:planly_stage_equipment(*),
          bake_group:planly_bake_groups(*),
          destination_group:planly_destination_groups(*)
        )
      `)
      .order('name');

    if (siteId) {
      if (includeMasters) {
        query = query.or(`site_id.eq.${siteId},is_master.eq.true`);
      } else {
        query = query.eq('site_id', siteId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching process templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/process-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('planly_process_templates')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Error creating process template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/planly/process-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
