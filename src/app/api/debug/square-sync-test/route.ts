import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { syncSquareSales } from '@/lib/square/sync';

/**
 * TEMPORARY — Clear + re-sync Square sales with enhanced data capture,
 * then verify new fields are populated.
 * GET /api/debug/square-sync-test
 */
export async function GET() {
  const companyId = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';
  const siteId = 'f6ddde35-74e3-4800-905d-b3ac01aadc67';
  const admin = getSupabaseAdmin();

  // 1. Delete existing Square sales (items cascade via FK)
  const { count: deletedCount, error: delErr } = await admin
    .from('sales')
    .delete({ count: 'exact' })
    .eq('company_id', companyId)
    .eq('pos_provider', 'square');

  if (delErr) {
    return NextResponse.json({ error: `Delete failed: ${delErr.message}` });
  }

  // 2. Re-sync with enhanced data capture (last 90 days for good coverage)
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  const syncResult = await syncSquareSales(companyId, siteId, from, to);

  // 3. Recalculate daily summaries
  const { data: sales } = await admin
    .from('sales')
    .select('sale_date')
    .eq('company_id', companyId)
    .eq('pos_provider', 'square');

  const dates = [...new Set((sales || []).map((s: { sale_date: string }) => s.sale_date))];
  for (const date of dates) {
    await admin.rpc('recalculate_daily_summary', {
      p_company_id: companyId,
      p_site_id: siteId,
      p_date: date,
    });
  }

  // 4. Verify enhanced fields on sales
  const { data: sampleSales } = await admin
    .from('sales')
    .select('id, pos_transaction_id, customer_id, order_source, fulfillment_type, tips_amount, service_charges, returns_data, payment_details, discount_details')
    .eq('company_id', companyId)
    .eq('pos_provider', 'square')
    .order('created_at', { ascending: false })
    .limit(5);

  // 5. Verify enhanced fields on sale items (via RPC)
  const saleIds = (sampleSales || []).map((s: { id: string }) => s.id);
  let sampleItems: unknown[] = [];
  if (saleIds.length > 0) {
    const { data: items } = await admin
      .rpc('get_sale_items_by_sale_ids', { sale_ids: saleIds });
    sampleItems = (items || []).slice(0, 10);
  }

  // 6. Count how many sales have each new field populated
  const { count: withCustomer } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .not('customer_id', 'is', null);

  const { count: withSource } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .not('order_source', 'is', null);

  const { count: withTips } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gt('tips_amount', 0);

  const { count: withFulfillment } = await admin
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .not('fulfillment_type', 'is', null);

  // 7. Check daily summaries include tips
  const { data: summaries } = await admin
    .from('daily_sales_summary')
    .select('summary_date, gross_revenue, net_revenue, transaction_count, total_tips')
    .eq('company_id', companyId)
    .order('summary_date', { ascending: false })
    .limit(5);

  return NextResponse.json({
    deletedOldSales: deletedCount,
    syncResult,
    datesRecalculated: dates.length,
    fieldCoverage: {
      totalSales: syncResult.ordersProcessed,
      withCustomerId: withCustomer,
      withOrderSource: withSource,
      withTips: withTips,
      withFulfillmentType: withFulfillment,
    },
    sampleSales,
    sampleItems,
    summariesWithTips: summaries,
  });
}
