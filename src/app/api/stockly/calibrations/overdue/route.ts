// @salsa - SALSA Compliance: Overdue and upcoming calibrations API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/calibrations/overdue
 * List assets with overdue or upcoming (within 14 days) calibrations,
 * plus temperature probes with no calibration records at all.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const today = new Date();
    const in14Days = new Date(today);
    in14Days.setDate(in14Days.getDate() + 14);
    const todayStr = today.toISOString().split('T')[0];
    const in14DaysStr = in14Days.toISOString().split('T')[0];

    // @salsa — Get calibrations due within 14 days or already overdue
    const { data: dueSoon, error: dueError } = await supabase
      .from('asset_calibrations')
      .select('*')
      .lte('next_calibration_due', in14DaysStr)
      .order('next_calibration_due', { ascending: true });

    if (dueError && dueError.code !== '42P01') {
      return NextResponse.json({ success: false, error: dueError.message }, { status: 500 });
    }

    // @salsa — Find the latest calibration per asset to determine status
    const calibrationsByAsset = new Map<string, any>();
    for (const cal of dueSoon || []) {
      const existing = calibrationsByAsset.get(cal.asset_id);
      if (!existing || new Date(cal.calibration_date) > new Date(existing.calibration_date)) {
        calibrationsByAsset.set(cal.asset_id, cal);
      }
    }

    // Only include assets whose LATEST calibration is due soon/overdue
    const overdueItems = Array.from(calibrationsByAsset.values()).filter(cal => {
      return cal.next_calibration_due && cal.next_calibration_due <= in14DaysStr;
    }).map(cal => ({
      ...cal,
      is_overdue: cal.next_calibration_due < todayStr,
      is_due_soon: cal.next_calibration_due >= todayStr && cal.next_calibration_due <= in14DaysStr,
    }));

    // @salsa — Find temperature probe assets with no calibration records
    const { data: allProbes, error: probeError } = await supabase
      .from('assets')
      .select('id, name, company_id, site_id, category')
      .eq('category', 'temperature_probes')
      .eq('archived', false);

    if (probeError && probeError.code !== '42P01') {
      return NextResponse.json({ success: false, error: probeError.message }, { status: 500 });
    }

    const { data: allCalibrations, error: allCalError } = await supabase
      .from('asset_calibrations')
      .select('asset_id');

    const calibratedAssetIds = new Set((allCalibrations || []).map(c => c.asset_id));
    const neverCalibrated = (allProbes || [])
      .filter(probe => !calibratedAssetIds.has(probe.id))
      .map(probe => ({
        asset_id: probe.id,
        asset_name: probe.name,
        company_id: probe.company_id,
        site_id: probe.site_id,
        category: probe.category,
        never_calibrated: true,
      }));

    return NextResponse.json({
      success: true,
      data: {
        overdue_or_due_soon: overdueItems,
        never_calibrated: neverCalibrated,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
