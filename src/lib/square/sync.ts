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

/**
 * Recursively convert BigInt values to Number in an object so it can be
 * safely JSON-serialised (e.g. for JSONB columns in Postgres).
 */
function sanitiseBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitiseBigInts);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = sanitiseBigInts(v);
    }
    return out;
  }
  return obj;
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

  // Pre-load category names from pos_menu_items so we can resolve
  // catalogObjectId → category_name during line item processing.
  const categoryLookup = new Map<string, string>();
  {
    const { data: menuItems } = await supabase
      .from('pos_menu_items')
      .select('catalog_variation_id, category_name')
      .eq('company_id', companyId)
      .eq('pos_provider', 'square')
      .not('category_name', 'is', null);

    for (const mi of menuItems ?? []) {
      if (mi.catalog_variation_id && mi.category_name) {
        categoryLookup.set(mi.catalog_variation_id, mi.category_name);
      }
    }
  }

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
          const tenders = order.tenders ?? [];
          let paymentMethod = 'card';
          if (tenders.length === 1) {
            const tenderType = tenders[0].type;
            switch (tenderType) {
              case 'CASH': paymentMethod = 'cash'; break;
              case 'SQUARE_GIFT_CARD': paymentMethod = 'gift_card'; break;
              case 'WALLET': paymentMethod = 'wallet'; break;
              case 'OTHER': paymentMethod = 'other'; break;
              default: paymentMethod = 'card'; break;
            }
          } else if (tenders.length > 1) {
            paymentMethod = 'mixed';
          }

          // Capture granular tender details
          const paymentDetails = tenders.length > 0 ? tenders.map(t => ({
            type: t.type || 'UNKNOWN',
            amount: moneyToNumber(t.amountMoney),
            card_brand: (t as Record<string, unknown>).cardDetails
              ? ((t as Record<string, unknown>).cardDetails as Record<string, unknown>)?.card
                ? (((t as Record<string, unknown>).cardDetails as Record<string, unknown>)?.card as Record<string, unknown>)?.cardBrand
                : undefined
              : undefined,
            last_4: (t as Record<string, unknown>).cardDetails
              ? ((t as Record<string, unknown>).cardDetails as Record<string, unknown>)?.card
                ? (((t as Record<string, unknown>).cardDetails as Record<string, unknown>)?.card as Record<string, unknown>)?.last4
                : undefined
              : undefined,
          })) : null;

          // Capture individual discount details
          const orderDiscounts = order.discounts ?? [];
          const discountDetails = orderDiscounts.length > 0 ? orderDiscounts.map(d => ({
            name: d.name || 'Discount',
            type: d.type,
            amount: moneyToNumber(d.appliedMoney || d.amountMoney),
            percentage: d.percentage,
            scope: d.scope,
          })) : null;

          // Service charges (tips, delivery fees, etc.)
          const serviceCharges = (order as Record<string, unknown>).serviceCharges as Array<Record<string, unknown>> | undefined;
          const serviceChargeList = (serviceCharges ?? []).map(sc => ({
            name: (sc.name as string) || 'Service Charge',
            amount: moneyToNumber(sc.amountMoney as SquareMoney),
            percentage: sc.percentage as string | undefined,
            type: sc.type as string | undefined,
          }));
          const serviceChargeDetails = serviceChargeList.length > 0 ? serviceChargeList : null;

          // Tips = service charges with tip/gratuity in the name
          const tipsAmount = serviceChargeList
            .filter(sc => /tip|gratuity/i.test(sc.name))
            .reduce((sum, sc) => sum + sc.amount, 0);

          // Fulfillment type (PICKUP, DELIVERY, SHIPMENT, or null for dine-in)
          const fulfillments = (order as Record<string, unknown>).fulfillments as Array<Record<string, unknown>> | undefined;
          const fulfillmentType = (fulfillments ?? []).length > 0
            ? ((fulfillments ?? [])[0].type as string) || null
            : null;

          // Returns data (sanitise BigInts so JSONB insert doesn't fail)
          const returns = (order as Record<string, unknown>).returns as Array<Record<string, unknown>> | undefined;
          const returnsData = (returns ?? []).length > 0 ? sanitiseBigInts(returns) : null;

          // Order source (Square POS, Square Online, DoorDash, etc.)
          const orderSource = (order as Record<string, unknown>).source
            ? ((order as Record<string, unknown>).source as Record<string, unknown>)?.name as string || null
            : null;

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
            payment_details: paymentDetails,
            discount_details: discountDetails,
            customer_id: (order as Record<string, unknown>).customerId || null,
            order_source: orderSource,
            fulfillment_type: fulfillmentType,
            tips_amount: tipsAmount,
            service_charges: serviceChargeDetails,
            returns_data: returnsData,
            status: 'completed',
            created_at: order.closedAt || order.createdAt || new Date().toISOString(),
          };

          salesBatch.push(saleRecord);
          affectedDates.add(saleDate);

          // Map line items with modifiers, variation, notes
          const lineItems = (order.lineItems ?? []).map((item) => {
            const mods = (item as Record<string, unknown>).modifiers as Array<Record<string, unknown>> | undefined;
            // Resolve category from pos_menu_items lookup
            const resolvedCategory = item.catalogObjectId
              ? categoryLookup.get(item.catalogObjectId) || null
              : null;
            return {
              item_name: item.name || 'Unknown Item',
              category_name: resolvedCategory,
              catalog_object_id: item.catalogObjectId || null,
              quantity: Number(item.quantity || '1'),
              unit_price: moneyToNumber(item.basePriceMoney),
              line_total: moneyToNumber(item.totalMoney),
              variation_name: (item as Record<string, unknown>).variationName as string || null,
              item_note: (item as Record<string, unknown>).note as string || null,
              modifiers: (mods ?? []).length > 0
                ? mods!.map(m => ({
                    name: (m.name as string) || 'Modifier',
                    amount: moneyToNumber(m.totalPriceMoney as SquareMoney),
                    catalog_modifier_id: (m.catalogObjectId as string) || null,
                  }))
                : null,
            };
          });

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
            // Insert via RPC to bypass PostgREST schema cache issues with the view
            for (let i = 0; i < allItems.length; i += 100) {
              const chunk = allItems.slice(i, i + 100);
              const { error: itemsError } = await supabase
                .rpc('batch_insert_sale_items', { items: chunk });
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
