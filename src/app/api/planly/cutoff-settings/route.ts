import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('planly_cutoff_settings')
      .select('*')
      .eq('site_id', siteId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching cutoff settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return defaults if not found
    if (!data) {
      return NextResponse.json({
        site_id: siteId,
        default_buffer_days: 1,
        default_cutoff_time: '14:00:00',
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/planly/cutoff-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { siteId, ...settings } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('planly_cutoff_settings')
      .upsert({
        site_id: siteId,
        ...settings,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating cutoff settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/planly/cutoff-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
