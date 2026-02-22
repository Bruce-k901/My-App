// @salsa - SALSA Compliance: Calibration records list and creation API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/calibrations
 * List calibration records with optional filters: assetId, site_id
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const assetId = searchParams.get('assetId');
    const siteId = searchParams.get('site_id');

    let query = supabase
      .from('asset_calibrations')
      .select('*')
      .order('calibration_date', { ascending: false });

    if (assetId) query = query.eq('asset_id', assetId);
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
 * POST /api/stockly/calibrations
 * Create a new calibration record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const {
      company_id, site_id, asset_id, calibration_date,
      next_calibration_due, calibrated_by, certificate_reference,
      certificate_url, method, readings, result, notes, created_by,
    } = body;

    if (!company_id || !asset_id || !calibration_date || !calibrated_by) {
      return NextResponse.json(
        { success: false, error: 'company_id, asset_id, calibration_date, and calibrated_by are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('asset_calibrations')
      .insert({
        company_id,
        site_id: site_id || null,
        asset_id,
        calibration_date,
        next_calibration_due: next_calibration_due || null,
        calibrated_by,
        certificate_reference: certificate_reference || null,
        certificate_url: certificate_url || null,
        method: method || null,
        readings: readings || null,
        result: result || 'pass',
        notes: notes || null,
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
