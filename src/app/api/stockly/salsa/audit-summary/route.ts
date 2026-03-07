// @salsa - SALSA Compliance: Audit readiness summary aggregate API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/salsa/audit-summary
 * Returns aggregate SALSA readiness data for the audit dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');
    const siteId = searchParams.get('site_id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'company_id is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];
    const in14Days = new Date(today);
    in14Days.setDate(in14Days.getDate() + 14);
    const in14DaysStr = in14Days.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // @salsa — 1. Supplier stats
    let suppliersQuery = supabase.from('suppliers').select('id, approval_status, next_review_date').eq('company_id', companyId);
    if (siteId && siteId !== 'all') suppliersQuery = suppliersQuery.eq('site_id', siteId);
    const { data: suppliers } = await suppliersQuery;

    const supplierStats = {
      total: (suppliers || []).length,
      approved: (suppliers || []).filter(s => s.approval_status === 'approved').length,
      conditional: (suppliers || []).filter(s => s.approval_status === 'conditional').length,
      overdue_review: (suppliers || []).filter(s => s.next_review_date && s.next_review_date < todayStr).length,
      expired_documents: 0,
    };

    // Check for expired supplier documents
    let docsQuery = supabase.from('supplier_documents').select('id, expiry_date').eq('company_id', companyId).lt('expiry_date', todayStr);
    const { data: expiredDocs } = await docsQuery;
    supplierStats.expired_documents = (expiredDocs || []).length;

    // @salsa — 2. Batch stats
    let batchQuery = supabase.from('stock_batches').select('id, status, use_by_date, best_before_date').eq('company_id', companyId);
    if (siteId && siteId !== 'all') batchQuery = batchQuery.eq('site_id', siteId);
    const { data: batches } = await batchQuery;

    const batchStats = {
      active: (batches || []).filter(b => b.status === 'active').length,
      expiring_soon: (batches || []).filter(b => {
        if (b.status !== 'active') return false;
        const expiryDate = b.use_by_date || b.best_before_date;
        return expiryDate && expiryDate >= todayStr && expiryDate <= in7DaysStr;
      }).length,
      expired: (batches || []).filter(b => b.status === 'expired').length,
      quarantined: (batches || []).filter(b => b.status === 'quarantined').length,
    };

    // @salsa — 3. Calibration stats
    const { data: probes } = await supabase
      .from('assets')
      .select('id')
      .eq('company_id', companyId)
      .eq('category', 'temperature_probes')
      .eq('archived', false);

    let calQuery = supabase.from('asset_calibrations').select('id, asset_id, next_calibration_due, calibration_date').eq('company_id', companyId);
    const { data: calibrations } = await calQuery;

    // Get latest calibration per asset
    const latestCalByAsset = new Map<string, any>();
    for (const cal of calibrations || []) {
      const existing = latestCalByAsset.get(cal.asset_id);
      if (!existing || new Date(cal.calibration_date) > new Date(existing.calibration_date)) {
        latestCalByAsset.set(cal.asset_id, cal);
      }
    }

    const calibrationStats = {
      total_probes: (probes || []).length,
      calibrated_current: 0,
      overdue: 0,
      due_soon: 0,
    };

    for (const cal of latestCalByAsset.values()) {
      if (!cal.next_calibration_due || cal.next_calibration_due > in14DaysStr) {
        calibrationStats.calibrated_current++;
      } else if (cal.next_calibration_due < todayStr) {
        calibrationStats.overdue++;
      } else {
        calibrationStats.due_soon++;
      }
    }

    // @salsa — 4. Non-conformance stats
    let ncQuery = supabase.from('non_conformances').select('id, status, corrective_action_due, closed_at').eq('company_id', companyId);
    if (siteId && siteId !== 'all') ncQuery = ncQuery.eq('site_id', siteId);
    const { data: ncs } = await ncQuery;

    const ncStats = {
      open: (ncs || []).filter(nc => nc.status === 'open').length,
      investigating: (ncs || []).filter(nc => nc.status === 'investigating').length,
      awaiting_closure: (ncs || []).filter(nc => nc.status === 'corrective_action' || nc.status === 'verification').length,
      closed_this_month: (ncs || []).filter(nc => nc.status === 'closed' && nc.closed_at && nc.closed_at >= monthStart).length,
      overdue_corrective_actions: (ncs || []).filter(nc => {
        return nc.corrective_action_due && nc.corrective_action_due < todayStr &&
          nc.status !== 'closed' && nc.status !== 'verification';
      }).length,
    };

    // @salsa — 5. Recall stats
    let recallQuery = supabase.from('recalls').select('id, status, initiated_at').eq('company_id', companyId);
    if (siteId && siteId !== 'all') recallQuery = recallQuery.eq('site_id', siteId);
    const { data: recalls } = await recallQuery;

    const recallStats = {
      active: (recalls || []).filter(r => r.status !== 'closed' && r.status !== 'resolved').length,
      total: (recalls || []).length,
      last_mock_exercise: null as string | null,
    };

    // Check for latest mock recall task completion
    const { data: mockTasks } = await supabase
      .from('checklist_tasks')
      .select('completed_at')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .like('template_slug', 'salsa_mock_recall%')
      .order('completed_at', { ascending: false })
      .limit(1);

    if (mockTasks && mockTasks.length > 0) {
      recallStats.last_mock_exercise = mockTasks[0].completed_at;
    }

    // @salsa — 6. Traceability stats
    let dispatchQuery = supabase.from('batch_dispatch_records').select('id').eq('company_id', companyId).gte('created_at', monthStart);
    if (siteId && siteId !== 'all') dispatchQuery = dispatchQuery.eq('site_id', siteId);
    const { data: dispatches } = await dispatchQuery;

    let prodQuery = supabase.from('production_batches').select('id').eq('company_id', companyId).gte('created_at', monthStart);
    if (siteId && siteId !== 'all') prodQuery = prodQuery.eq('site_id', siteId);
    const { data: prodBatches } = await prodQuery;

    const traceabilityStats = {
      dispatch_records_this_month: (dispatches || []).length,
      production_batches_this_month: (prodBatches || []).length,
    };

    // @salsa — 7. Compliance template stats
    const { data: salsaTasks } = await supabase
      .from('checklist_tasks')
      .select('id, status, due_date, completed_at')
      .eq('company_id', companyId)
      .like('template_slug', 'salsa_%');

    const templateStats = {
      total_salsa_templates: 7,
      completed_this_period: (salsaTasks || []).filter(t => t.status === 'completed').length,
      overdue: (salsaTasks || []).filter(t => {
        return t.due_date && t.due_date < todayStr && t.status !== 'completed';
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        suppliers: supplierStats,
        batches: batchStats,
        calibrations: calibrationStats,
        non_conformances: ncStats,
        recalls: recallStats,
        traceability: traceabilityStats,
        compliance_templates: templateStats,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
