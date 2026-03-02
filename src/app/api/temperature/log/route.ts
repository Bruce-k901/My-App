/**
 * Temperature Logging API Route
 * Handles temperature log submissions (online and offline sync)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();

  try {
    // Get current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, site_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { assetId, reading, unit, recordedAt, source, notes } = body;

    // Validate required fields
    if (!assetId || reading === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, reading' },
        { status: 400 }
      );
    }

    // Verify asset belongs to company
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, name, company_id, site_id')
      .eq('id', assetId)
      .eq('company_id', profile.company_id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found or unauthorized' },
        { status: 404 }
      );
    }

    // Determine status (in_range, out_of_range)
    // TODO: Fetch asset's acceptable temp range and compare
    const status = 'normal'; // Simplified for now

    // Insert temperature log
    const { data: tempLog, error: insertError } = await supabase
      .from('temperature_logs')
      .insert({
        company_id: profile.company_id,
        site_id: asset.site_id,
        asset_id: assetId,
        reading: parseFloat(reading),
        unit: unit || 'celsius',
        recorded_at: recordedAt || new Date().toISOString(),
        recorded_by: profile.id,
        status: status,
        source: source || 'manual',
        meta: notes ? { notes } : null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Temperature Log API] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to log temperature' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tempLog
    });

  } catch (error: any) {
    console.error('[Temperature Log API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
