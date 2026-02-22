import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { ensureValidToken, getSquareTokens } from './tokens';
import { getSquareClient } from './client';
import { handleSquareError, withRetry, sleep } from './errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  ordersSkipped: number;
  ordersFailed: number;
  revenueTotal: number;
  dateFrom: string;
  dateTo: string;
  importId?: string;
  error?: string;
}

interface SquareMoney {
  amount?: bigint;
  currency?: string;
}

function moneyToNumber(money?: SquareMoney | null): number {
  if (!money?.amount) return 0;
  return Number(money.amount) / 100;
}

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

/**
 * Sync Square sales for a company/site over a date range.
 * Fetches orders from Square, maps them to stockly.sales + stockly.sale_items,
 * and recalculates daily summaries.
 */
export async function syncSquareSales(
  companyId: string,
  siteId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();

  // Default date range: last 7 days
  const now = new Date();
  const from = dateFrom || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const to = dateTo || now.toISOString().split('T')[0];

  const result: SyncResult = {
    success: false,
    ordersProcessed: 0,
    ordersSkipped: 0,
    ordersFailed: 0,
    revenueTotal: 0,
    dateFrom: from,
    dateTo: to,
  };

  // Get valid token
  const accessToken = await ensureValidToken(companyId);
  if (!accessToken) {
    result.error = 'Square token expired or unavailable — please reconnect';
    return result;
  }

  // Get location ID
  const tokens = await getSquareTokens(companyId);
  if (!tokens?.locationId) {
    result.error = 'No Square location selected';
    return result;
  }

  // Create import record (public.sales_imports view uses INSTEAD OF trigger
  // that passes NEW.id directly, so we must provide a UUID)
  const importId = crypto.randomUUID();
  const { error: importError } = await supabase
    .from('sales_imports')
    .insert({
      id: importId,
      company_id: companyId,
      site_id: siteId,
      import_type: 'pos_sync',
      pos_provider: 'square',
      date_from: from,
      date_to: to,
      status: 'processing',
    });

  if (importError) {
    console.error('[square/sync] Failed to create import record:', importError);
  } else {
    result.importId = importId;
  }

  const client = getSquareClient(accessToken);
  const affectedDates = new Set<string>();

  try {
    // Fetch orders with cursor-based pagination
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const searchResponse = await withRetry(() =>
        client.orders.search({
          locationIds: [tokens.locationId!],
          query: {
            filter: {
              dateTimeFilter: {
                closedAt: {
                  startAt: `${from}T00:00:00Z`,
                  endAt: `${to}T23:59:59Z`,
                },
              },
              stateFilter: {
                states: ['COMPLETED'],
              },
            },
            sort: {
              sortField: 'CLOSED_AT',
              sortOrder: 'ASC',
            },
          },
          cursor,
        }),
      );

      const orders = searchResponse.orders ?? [];
      cursor = searchResponse.cursor ?? undefined;

      // Process orders in batches
      const salesBatch: Record<string, unknown>[] = [];
      const itemsBatch: { saleIndex: number; items: Record<string, unknown>[] }[] = [];

      for (const order of orders) {
        if (!order.id) continue;

        // Check idempotency — skip if already imported
        const { data: existing } = await supabase
          .from('sales')
          .select('id')
          .eq('company_id', companyId)
          .eq('pos_transaction_id', order.id)
          .maybeSingle();

        if (existing) {
          result.ordersSkipped++;
          continue;
        }

        try {
          const saleDate = order.closedAt
            ? new Date(order.closedAt).toISOString().split('T')[0]
            : from;

          // Determine payment method from tenders
          let paymentMethod = 'card';
          const tenders = order.tenders ?? [];
          if (tenders.length === 1) {
            const tenderType = tenders[0].type;
            paymentMethod = tenderType === 'CASH' ? 'cash' : 'card';
          } else if (tenders.length > 1) {
            paymentMethod = 'mixed';
          }

          const grossRevenue = moneyToNumber(order.totalMoney);
          const discounts = moneyToNumber(order.totalDiscountMoney);
          const netRevenue = grossRevenue - discounts;
          const tax = moneyToNumber(order.totalTaxMoney);
          const totalAmount = grossRevenue;

          const saleRecord: Record<string, unknown> = {
            company_id: companyId,
            site_id: siteId,
            pos_transaction_id: order.id,
            pos_provider: 'square',
            import_batch_id: result.importId || null,
            sale_date: saleDate,
            gross_revenue: grossRevenue,
            discounts,
            net_revenue: netRevenue,
            vat_amount: tax,
            total_amount: totalAmount,
            covers: 1,
            payment_method: paymentMethod,
            status: 'completed',
          };

          salesBatch.push(saleRecord);
          affectedDates.add(saleDate);

          // Map line items
          const lineItems = (order.lineItems ?? []).map((item) => ({
            item_name: item.name || 'Unknown Item',
            category_name: item.catalogObjectId ? `square:${item.catalogObjectId}` : null,
            quantity: Number(item.quantity || '1'),
            unit_price: moneyToNumber(item.basePriceMoney),
            line_total: moneyToNumber(item.totalMoney),
          }));

          itemsBatch.push({ saleIndex: salesBatch.length - 1, items: lineItems });
          result.revenueTotal += totalAmount;
          result.ordersProcessed++;
        } catch (err) {
          console.error(`[square/sync] Failed to process order ${order.id}:`, err);
          result.ordersFailed++;
        }
      }

      // Batch insert sales
      if (salesBatch.length > 0) {
        const { data: insertedSales, error: salesError } = await supabase
          .from('sales')
          .insert(salesBatch)
          .select('id');

        if (salesError) {
          console.error('[square/sync] Sales insert error:', salesError);
          result.ordersFailed += salesBatch.length;
          result.ordersProcessed -= salesBatch.length;
        } else if (insertedSales) {
          // Insert sale items linked to the inserted sales
          const allItems: Record<string, unknown>[] = [];
          for (const { saleIndex, items } of itemsBatch) {
            const saleId = insertedSales[saleIndex]?.id;
            if (!saleId) continue;
            for (const item of items) {
              allItems.push({ ...item, sale_id: saleId });
            }
          }

          if (allItems.length > 0) {
            // Insert in chunks of 100
            for (let i = 0; i < allItems.length; i += 100) {
              const chunk = allItems.slice(i, i + 100);
              const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(chunk);
              if (itemsError) {
                console.error('[square/sync] Sale items insert error:', itemsError);
              }
            }
          }
        }
      }

      // Respect rate limits between pages
      if (cursor) await sleep(200);
    } while (cursor);

    // Recalculate daily summaries for affected dates
    for (const date of affectedDates) {
      try {
        await supabase.rpc('recalculate_daily_summary', {
          p_company_id: companyId,
          p_site_id: siteId,
          p_date: date,
        });
      } catch (err) {
        console.error(`[square/sync] Failed to recalculate summary for ${date}:`, err);
      }
    }

    // Update import record
    if (result.importId) {
      await supabase
        .from('sales_imports')
        .update({
          records_total: result.ordersProcessed + result.ordersSkipped + result.ordersFailed,
          records_imported: result.ordersProcessed,
          records_failed: result.ordersFailed,
          revenue_total: result.revenueTotal,
          status: result.ordersFailed > 0 ? 'completed' : 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', result.importId);
    }

    result.success = true;
    return result;
  } catch (err) {
    console.error('[square/sync] Sync failed:', err);

    // Update import record as failed
    if (result.importId) {
      await supabase
        .from('sales_imports')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', result.importId);
    }

    try {
      handleSquareError(err);
    } catch (squareErr) {
      result.error = squareErr instanceof Error ? squareErr.message : String(err);
    }

    return result;
  }
}

/**
 * Sync a single order (used by webhook handler).
 */
export async function syncSingleOrder(
  companyId: string,
  siteId: string,
  orderId: string,
): Promise<SyncResult> {
  const accessToken = await ensureValidToken(companyId);
  if (!accessToken) {
    return {
      success: false,
      ordersProcessed: 0,
      ordersSkipped: 0,
      ordersFailed: 0,
      revenueTotal: 0,
      dateFrom: '',
      dateTo: '',
      error: 'Token unavailable',
    };
  }

  const client = getSquareClient(accessToken);

  try {
    const order = await withRetry(() => client.orders.get(orderId));
    if (!order || order.state !== 'COMPLETED') {
      return {
        success: true,
        ordersProcessed: 0,
        ordersSkipped: 1,
        ordersFailed: 0,
        revenueTotal: 0,
        dateFrom: '',
        dateTo: '',
      };
    }

    const saleDate = order.closedAt
      ? new Date(order.closedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Use the bulk sync for a single day — simplest approach, reuses all logic
    return await syncSquareSales(companyId, siteId, saleDate, saleDate);
  } catch (err) {
    console.error(`[square/sync] Single order sync failed for ${orderId}:`, err);
    return {
      success: false,
      ordersProcessed: 0,
      ordersSkipped: 0,
      ordersFailed: 1,
      revenueTotal: 0,
      dateFrom: '',
      dateTo: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
