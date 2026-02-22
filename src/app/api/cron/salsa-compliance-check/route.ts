// @salsa - SALSA Compliance: Daily compliance check cron job
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/cron/salsa-compliance-check
 * Runs daily at 5am UTC via Vercel cron. Checks for:
 * - Overdue calibrations
 * - Overdue corrective actions on non-conformances
 * - Recall notifications not sent to SALSA within 3 working days
 * - Supplier documents expiring within 30 days
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel cron sends this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    let notificationsCreated = 0;

    // @salsa — Get all companies with stockly module enabled
    const { data: companies } = await supabase
      .from('company_modules')
      .select('company_id')
      .eq('module', 'stockly')
      .eq('enabled', true);

    if (!companies || companies.length === 0) {
      return NextResponse.json({ success: true, message: 'No companies with stockly enabled', notificationsCreated: 0 });
    }

    for (const company of companies) {
      const companyId = company.company_id;

      // @salsa — 1. Check overdue calibrations
      const { data: calibrations } = await supabase
        .from('asset_calibrations')
        .select('id, asset_id, next_calibration_due, company_id')
        .eq('company_id', companyId)
        .lt('next_calibration_due', todayStr);

      // Get latest calibration per asset to avoid duplicate alerts
      const latestCalByAsset = new Map<string, any>();
      for (const cal of calibrations || []) {
        const existing = latestCalByAsset.get(cal.asset_id);
        if (!existing || new Date(cal.next_calibration_due) > new Date(existing.next_calibration_due)) {
          latestCalByAsset.set(cal.asset_id, cal);
        }
      }

      for (const cal of latestCalByAsset.values()) {
        if (cal.next_calibration_due < todayStr) {
          // Get asset name
          const { data: asset } = await supabase
            .from('assets')
            .select('name')
            .eq('id', cal.asset_id)
            .single();

          await supabase.from('notifications').insert({
            company_id: companyId,
            type: 'calibration_overdue',
            severity: 'warning',
            priority: 'high',
            title: `Calibration overdue for ${asset?.name || 'unknown asset'}`,
            message: `Calibration was due on ${cal.next_calibration_due}. Please arrange recalibration.`,
            metadata: { salsa: true, asset_id: cal.asset_id, calibration_id: cal.id },
          });
          notificationsCreated++;
        }
      }

      // @salsa — 2. Check overdue corrective actions on non-conformances
      const { data: overdueNCs } = await supabase
        .from('non_conformances')
        .select('id, nc_code, title, corrective_action_due')
        .eq('company_id', companyId)
        .lt('corrective_action_due', todayStr)
        .not('status', 'in', '("closed","verification")');

      for (const nc of overdueNCs || []) {
        await supabase.from('notifications').insert({
          company_id: companyId,
          type: 'nc_corrective_action_overdue',
          severity: 'warning',
          priority: 'high',
          title: `Corrective action overdue for NC ${nc.nc_code}`,
          message: `${nc.title} — corrective action was due on ${nc.corrective_action_due}.`,
          metadata: { salsa: true, nc_id: nc.id, nc_code: nc.nc_code },
        });
        notificationsCreated++;
      }

      // @salsa — 3. Check recalls not notified to SALSA within 3 working days
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString();

      const { data: unnotifiedRecalls } = await supabase
        .from('recalls')
        .select('id, recall_code, title, initiated_at')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .eq('salsa_notified', false)
        .lt('initiated_at', threeDaysAgoStr);

      for (const recall of unnotifiedRecalls || []) {
        await supabase.from('notifications').insert({
          company_id: companyId,
          type: 'recall_salsa_notification_overdue',
          severity: 'critical',
          priority: 'high',
          title: `SALSA notification overdue for recall ${recall.recall_code}`,
          message: `${recall.title} — must notify SALSA within 3 working days of initiating a recall.`,
          metadata: { salsa: true, recall_id: recall.id, recall_code: recall.recall_code },
        });
        notificationsCreated++;
      }

      // @salsa — 4. Check supplier documents expiring within 30 days
      const { data: expiringDocs } = await supabase
        .from('supplier_documents')
        .select('id, document_name, expiry_date, supplier_id')
        .eq('company_id', companyId)
        .gte('expiry_date', todayStr)
        .lte('expiry_date', in30DaysStr);

      for (const doc of expiringDocs || []) {
        // Get supplier name
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', doc.supplier_id)
          .single();

        await supabase.from('notifications').insert({
          company_id: companyId,
          type: 'supplier_document_expiring',
          severity: 'info',
          priority: 'high',
          title: `Supplier document expiring soon: ${doc.document_name}`,
          message: `${doc.document_name} for ${supplier?.name || 'supplier'} expires on ${doc.expiry_date}.`,
          metadata: { salsa: true, document_id: doc.id, supplier_id: doc.supplier_id },
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      companiesChecked: companies.length,
    });
  } catch (error: any) {
    console.error('SALSA compliance check cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
