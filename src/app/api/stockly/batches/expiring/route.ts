// @salsa - SALSA Compliance: Expiring batches query API
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/stockly/batches/expiring
 * Get batches approaching use_by or best_before dates.
 * Query params: site_id, use_by_days (default 3), best_before_days (default 7), include_expired
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const siteId = searchParams.get('site_id');
    const useByDays = parseInt(searchParams.get('use_by_days') || '3', 10);
    const bestBeforeDays = parseInt(searchParams.get('best_before_days') || '7', 10);
    const includeExpired = searchParams.get('include_expired') === 'true';

    const today = new Date();
    const useByThreshold = new Date(today);
    useByThreshold.setDate(useByThreshold.getDate() + useByDays);
    const bestBeforeThreshold = new Date(today);
    bestBeforeThreshold.setDate(bestBeforeThreshold.getDate() + bestBeforeDays);

    const todayStr = today.toISOString().split('T')[0];
    const useByStr = useByThreshold.toISOString().split('T')[0];
    const bestBeforeStr = bestBeforeThreshold.toISOString().split('T')[0];

    // @salsa — Query batches with approaching expiry
    // Get active batches where use_by_date or best_before_date is within threshold
    let query = supabase
      .from('stock_batches')
      .select(`
        *,
        stock_item:stock_items(id, name, stock_unit)
      `)
      .eq('status', 'active')
      .gt('quantity_remaining', 0);

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }

    // Get all active batches with expiry dates, then filter in code
    // (complex OR conditions with nullable fields are cleaner this way)
    query = query.order('use_by_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // @salsa — Categorise batches by expiry urgency
    const alerts = (data || [])
      .map((batch) => {
        const alerts = [];

        // Check use_by_date (safety-critical)
        if (batch.use_by_date) {
          const daysUntil = Math.ceil(
            (new Date(batch.use_by_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil < 0 && includeExpired) {
            alerts.push({
              batch_id: batch.id,
              batch_code: batch.batch_code,
              stock_item_name: batch.stock_item?.name || 'Unknown',
              quantity_remaining: batch.quantity_remaining,
              unit: batch.unit,
              expiry_type: 'use_by' as const,
              expiry_date: batch.use_by_date,
              days_until_expiry: daysUntil,
              severity: 'expired' as const,
            });
          } else if (daysUntil >= 0 && daysUntil <= useByDays) {
            alerts.push({
              batch_id: batch.id,
              batch_code: batch.batch_code,
              stock_item_name: batch.stock_item?.name || 'Unknown',
              quantity_remaining: batch.quantity_remaining,
              unit: batch.unit,
              expiry_type: 'use_by' as const,
              expiry_date: batch.use_by_date,
              days_until_expiry: daysUntil,
              severity: daysUntil <= 1 ? 'critical' as const : 'warning' as const,
            });
          }
        }

        // Check best_before_date (quality)
        if (batch.best_before_date) {
          const daysUntil = Math.ceil(
            (new Date(batch.best_before_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil < 0 && includeExpired) {
            alerts.push({
              batch_id: batch.id,
              batch_code: batch.batch_code,
              stock_item_name: batch.stock_item?.name || 'Unknown',
              quantity_remaining: batch.quantity_remaining,
              unit: batch.unit,
              expiry_type: 'best_before' as const,
              expiry_date: batch.best_before_date,
              days_until_expiry: daysUntil,
              severity: 'expired' as const,
            });
          } else if (daysUntil >= 0 && daysUntil <= bestBeforeDays) {
            alerts.push({
              batch_id: batch.id,
              batch_code: batch.batch_code,
              stock_item_name: batch.stock_item?.name || 'Unknown',
              quantity_remaining: batch.quantity_remaining,
              unit: batch.unit,
              expiry_type: 'best_before' as const,
              expiry_date: batch.best_before_date,
              days_until_expiry: daysUntil,
              severity: 'warning' as const,
            });
          }
        }

        return alerts;
      })
      .flat()
      .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

    // Summary counts
    const summary = {
      expired_use_by: alerts.filter(a => a.expiry_type === 'use_by' && a.severity === 'expired').length,
      critical_use_by: alerts.filter(a => a.expiry_type === 'use_by' && a.severity === 'critical').length,
      warning_use_by: alerts.filter(a => a.expiry_type === 'use_by' && a.severity === 'warning').length,
      expired_best_before: alerts.filter(a => a.expiry_type === 'best_before' && a.severity === 'expired').length,
      warning_best_before: alerts.filter(a => a.expiry_type === 'best_before' && a.severity === 'warning').length,
      total: alerts.length,
    };

    return NextResponse.json({ success: true, data: alerts, summary });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch expiring batches' },
      { status: 500 }
    );
  }
}
