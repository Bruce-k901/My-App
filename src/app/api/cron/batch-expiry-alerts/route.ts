// @salsa - SALSA Compliance: Daily batch expiry alerts cron job
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/cron/batch-expiry-alerts
 * Runs daily via Vercel cron. Checks all active batches for approaching
 * use_by and best_before dates. Creates notifications and auto-expires
 * batches past their use_by date.
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

    let notificationsCreated = 0;
    let batchesExpired = 0;

    // @salsa — 1. Auto-expire batches past use_by date
    const { data: expiredBatches, error: expiredError } = await supabase
      .from('stock_batches')
      .select('id, company_id, site_id, batch_code, stock_item_id, use_by_date, quantity_remaining')
      .eq('status', 'active')
      .lt('use_by_date', todayStr)
      .gt('quantity_remaining', 0);

    if (!expiredError && expiredBatches && expiredBatches.length > 0) {
      for (const batch of expiredBatches) {
        // Set status to expired
        await supabase
          .from('stock_batches')
          .update({ status: 'expired' })
          .eq('id', batch.id);

        // Log movement
        await supabase.from('batch_movements').insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          batch_id: batch.id,
          movement_type: 'adjustment',
          quantity: 0,
          reference_type: 'expiry_cron',
          notes: `Auto-expired: use-by date ${batch.use_by_date} has passed`,
        });

        // Create critical notification
        await supabase.from('notifications').insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          type: 'alert',
          title: `Batch ${batch.batch_code} — USE BY DATE EXPIRED`,
          message: `Batch ${batch.batch_code} has passed its use-by date (${batch.use_by_date}). ${batch.quantity_remaining} remaining. This stock must be discarded per food safety regulations.`,
          severity: 'critical',
          priority: 'urgent',
          status: 'active',
          metadata: {
            salsa: true,
            batch_id: batch.id,
            batch_code: batch.batch_code,
            stock_item_id: batch.stock_item_id,
            expiry_type: 'use_by',
          },
        });

        batchesExpired++;
        notificationsCreated++;
      }
    }

    // @salsa — 2. Alert for batches approaching use_by date (within 3 days)
    const useByThreshold = new Date(today);
    useByThreshold.setDate(useByThreshold.getDate() + 3);
    const useByThresholdStr = useByThreshold.toISOString().split('T')[0];

    const { data: approachingUseBy } = await supabase
      .from('stock_batches')
      .select('id, company_id, site_id, batch_code, stock_item_id, use_by_date, quantity_remaining')
      .eq('status', 'active')
      .gte('use_by_date', todayStr)
      .lte('use_by_date', useByThresholdStr)
      .gt('quantity_remaining', 0);

    if (approachingUseBy && approachingUseBy.length > 0) {
      for (const batch of approachingUseBy) {
        const daysLeft = Math.ceil(
          (new Date(batch.use_by_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from('notifications').insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          type: 'alert',
          title: `Batch ${batch.batch_code} — use by in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          message: `Batch ${batch.batch_code} use-by date is ${batch.use_by_date}. ${batch.quantity_remaining} remaining. Use or discard before expiry.`,
          severity: daysLeft <= 1 ? 'critical' : 'warning',
          priority: daysLeft <= 1 ? 'high' : 'medium',
          status: 'active',
          metadata: {
            salsa: true,
            batch_id: batch.id,
            batch_code: batch.batch_code,
            stock_item_id: batch.stock_item_id,
            expiry_type: 'use_by',
            days_until_expiry: daysLeft,
          },
        });
        notificationsCreated++;
      }
    }

    // @salsa — 3. Alert for batches approaching best_before date (within 7 days)
    const bbThreshold = new Date(today);
    bbThreshold.setDate(bbThreshold.getDate() + 7);
    const bbThresholdStr = bbThreshold.toISOString().split('T')[0];

    const { data: approachingBB } = await supabase
      .from('stock_batches')
      .select('id, company_id, site_id, batch_code, stock_item_id, best_before_date, quantity_remaining')
      .eq('status', 'active')
      .gte('best_before_date', todayStr)
      .lte('best_before_date', bbThresholdStr)
      .gt('quantity_remaining', 0);

    if (approachingBB && approachingBB.length > 0) {
      for (const batch of approachingBB) {
        const daysLeft = Math.ceil(
          (new Date(batch.best_before_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from('notifications').insert({
          company_id: batch.company_id,
          site_id: batch.site_id,
          type: 'alert',
          title: `Batch ${batch.batch_code} — best before in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          message: `Batch ${batch.batch_code} best-before date is ${batch.best_before_date}. ${batch.quantity_remaining} remaining. Consider prioritising this stock.`,
          severity: 'info',
          priority: 'low',
          status: 'active',
          metadata: {
            salsa: true,
            batch_id: batch.id,
            batch_code: batch.batch_code,
            stock_item_id: batch.stock_item_id,
            expiry_type: 'best_before',
            days_until_expiry: daysLeft,
          },
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        batches_expired: batchesExpired,
        notifications_created: notificationsCreated,
        checked_at: today.toISOString(),
      },
    });
  } catch (err) {
    console.error('[batch-expiry-alerts] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process batch expiry alerts' },
      { status: 500 }
    );
  }
}
