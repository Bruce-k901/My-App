import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SaleRecord {
  id: string;
  gross_revenue: number;
  net_revenue: number;
  discounts: number;
  covers: number;
  payment_method: string;
  payment_details: PaymentDetail[] | null;
  discount_details: DiscountDetail[] | null;
  sale_date: string;
  created_at: string;
  // Enhanced fields
  customer_id: string | null;
  order_source: string | null;
  fulfillment_type: string | null;
  tips_amount: number | null;
  service_charges: ServiceChargeDetail[] | null;
}

export interface PaymentDetail {
  type: string;
  amount: number;
  card_brand?: string;
  last_4?: string;
}

export interface DiscountDetail {
  name: string;
  type?: string;
  amount: number;
  percentage?: string;
  scope?: string;
}

export interface ServiceChargeDetail {
  name: string;
  amount: number;
  percentage?: string;
  type?: string;
}

interface SaleItemRecord {
  item_name: string;
  quantity: number;
  line_total: number;
  sale_id: string;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentBreakdown {
  type: string;
  label: string;
  count: number;
  total: number;
}

export interface DiscountBreakdown {
  name: string;
  count: number;
  total: number;
}

export interface HourlyData {
  hour: string;
  revenue: number;
  count: number;
}

export interface DailyData {
  date: string;
  label: string;
  revenue: number;
  count: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
  revenue: number;
}

export interface FulfillmentBreakdown {
  type: string;
  label: string;
  count: number;
  revenue: number;
}

export interface TipsSummary {
  totalTips: number;
  tippedOrders: number;
  avgTip: number;
}

export interface LiveSalesData {
  totalRevenue: number;
  totalCovers: number;
  avgTicket: number;
  transactionCount: number;
  totalDiscounts: number;
  topItems: TopItem[];
  paymentBreakdown: PaymentBreakdown[];
  discountBreakdown: DiscountBreakdown[];
  hourlyRevenue: HourlyData[];
  dailyRevenue: DailyData[];
  // Enhanced breakdowns
  orderSourceBreakdown: SourceBreakdown[];
  fulfillmentBreakdown: FulfillmentBreakdown[];
  tipsSummary: TipsSummary;
}

const EMPTY_DATA: LiveSalesData = {
  totalRevenue: 0,
  totalCovers: 0,
  avgTicket: 0,
  transactionCount: 0,
  totalDiscounts: 0,
  topItems: [],
  paymentBreakdown: [],
  discountBreakdown: [],
  hourlyRevenue: [],
  dailyRevenue: [],
  orderSourceBreakdown: [],
  fulfillmentBreakdown: [],
  tipsSummary: { totalTips: 0, tippedOrders: 0, avgTip: 0 },
};

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Card',
  cash: 'Cash',
  gift_card: 'Gift Card',
  wallet: 'Wallet / Loyalty',
  other: 'Other',
  mixed: 'Mixed',
};

const POLL_INTERVAL = 30_000; // 30 seconds

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseLiveSalesOptions {
  dateFrom?: string; // YYYY-MM-DD (defaults to today)
  dateTo?: string;   // YYYY-MM-DD (defaults to today)
}

export function useLiveSalesData(
  companyId: string | undefined | null,
  siteId: string | undefined | null,
  options?: UseLiveSalesOptions,
) {
  const [data, setData] = useState<LiveSalesData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dateFrom = options?.dateFrom || today;
  const dateTo = options?.dateTo || today;
  const isLive = dateFrom === today && dateTo === today;
  const isSingleDay = dateFrom === dateTo;

  const fetchData = useCallback(async () => {
    if (!companyId) return;

    try {
      // For ranges > 30 days, fall back to daily_sales_summary for performance
      const dayCount = Math.ceil(
        (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000),
      ) + 1;

      if (dayCount > 30) {
        await fetchFromSummary(companyId, siteId, dateFrom, dateTo);
        return;
      }

      // Fetch sales in date range
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .eq('company_id', companyId)
        .gte('sale_date', dateFrom)
        .lte('sale_date', dateTo)
        .eq('status', 'completed');

      if (siteId && siteId !== 'all') {
        salesQuery = salesQuery.eq('site_id', siteId);
      }

      const { data: sales, error: salesError } = await salesQuery;

      if (salesError) {
        if (salesError.code === '42P01') return;
        console.error('[useLiveSalesData] Sales query error:', salesError.message);
        return;
      }

      const salesData = (sales || []) as SaleRecord[];

      // Fetch sale items via RPC
      const saleIds = salesData.map(s => s.id);
      let itemsData: SaleItemRecord[] = [];
      if (saleIds.length > 0) {
        // Batch in groups of 200 to avoid overly large RPC payloads
        for (let i = 0; i < saleIds.length; i += 200) {
          const batch = saleIds.slice(i, i + 200);
          const { data: items } = await supabase
            .rpc('get_sale_items_by_sale_ids', { sale_ids: batch });
          if (items) itemsData = itemsData.concat(items as SaleItemRecord[]);
        }
      }

      // ── Compute KPIs ──

      const totalRevenue = salesData.reduce((sum, s) => sum + (s.net_revenue || 0), 0);
      const totalCovers = salesData.reduce((sum, s) => sum + (s.covers || 0), 0);
      const totalDiscounts = salesData.reduce((sum, s) => sum + (s.discounts || 0), 0);
      const transactionCount = salesData.length;
      const avgTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

      // ── Top items ──

      const itemMap = new Map<string, { quantity: number; revenue: number }>();
      for (const item of itemsData) {
        const key = item.item_name || 'Unknown';
        const existing = itemMap.get(key) || { quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 1;
        existing.revenue += item.line_total || 0;
        itemMap.set(key, existing);
      }
      const topItems: TopItem[] = Array.from(itemMap.entries())
        .map(([name, { quantity, revenue }]) => ({ name, quantity, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── Payment breakdown ──

      const paymentMap = new Map<string, { count: number; total: number }>();
      for (const sale of salesData) {
        if (sale.payment_details && sale.payment_details.length > 0) {
          for (const pd of sale.payment_details) {
            const type = (pd.type || 'UNKNOWN').toLowerCase();
            const key = type === 'square_gift_card' ? 'gift_card' : type;
            const existing = paymentMap.get(key) || { count: 0, total: 0 };
            existing.count++;
            existing.total += pd.amount || 0;
            paymentMap.set(key, existing);
          }
        } else {
          const key = sale.payment_method || 'card';
          const existing = paymentMap.get(key) || { count: 0, total: 0 };
          existing.count++;
          existing.total += sale.net_revenue || 0;
          paymentMap.set(key, existing);
        }
      }
      const paymentBreakdown: PaymentBreakdown[] = Array.from(paymentMap.entries())
        .map(([type, { count, total }]) => ({
          type,
          label: PAYMENT_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1),
          count,
          total,
        }))
        .sort((a, b) => b.total - a.total);

      // ── Discount breakdown ──

      const discountMap = new Map<string, { count: number; total: number }>();
      for (const sale of salesData) {
        if (sale.discount_details && sale.discount_details.length > 0) {
          for (const dd of sale.discount_details) {
            const name = dd.name || 'Discount';
            const existing = discountMap.get(name) || { count: 0, total: 0 };
            existing.count++;
            existing.total += dd.amount || 0;
            discountMap.set(name, existing);
          }
        }
      }
      const discountBreakdown: DiscountBreakdown[] = Array.from(discountMap.entries())
        .map(([name, { count, total }]) => ({ name, count, total }))
        .sort((a, b) => b.total - a.total);

      // ── Hourly revenue (only for single-day views) ──

      let hourlyRevenue: HourlyData[] = [];
      if (isSingleDay) {
        const hourMap = new Map<number, { revenue: number; count: number }>();
        for (const sale of salesData) {
          const hour = new Date(sale.created_at).getHours();
          const existing = hourMap.get(hour) || { revenue: 0, count: 0 };
          existing.revenue += sale.net_revenue || 0;
          existing.count++;
          hourMap.set(hour, existing);
        }

        const currentHour = isLive ? new Date().getHours() : 23;
        const minHour = salesData.length > 0
          ? Math.min(...salesData.map(s => new Date(s.created_at).getHours()))
          : currentHour;
        for (let h = minHour; h <= currentHour; h++) {
          const entry = hourMap.get(h) || { revenue: 0, count: 0 };
          hourlyRevenue.push({
            hour: `${h.toString().padStart(2, '0')}:00`,
            revenue: entry.revenue,
            count: entry.count,
          });
        }
      }

      // ── Daily revenue (for multi-day views) ──

      let dailyRevenue: DailyData[] = [];
      if (!isSingleDay) {
        const dayMap = new Map<string, { revenue: number; count: number }>();
        for (const sale of salesData) {
          const d = sale.sale_date;
          const existing = dayMap.get(d) || { revenue: 0, count: 0 };
          existing.revenue += sale.net_revenue || 0;
          existing.count++;
          dayMap.set(d, existing);
        }

        // Fill all dates in range
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const entry = dayMap.get(dateStr) || { revenue: 0, count: 0 };
          dailyRevenue.push({
            date: dateStr,
            label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            revenue: entry.revenue,
            count: entry.count,
          });
        }
      }

      // ── Order source breakdown ──

      const sourceMap = new Map<string, { count: number; revenue: number }>();
      for (const sale of salesData) {
        const src = sale.order_source || 'Unknown';
        const existing = sourceMap.get(src) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += sale.net_revenue || 0;
        sourceMap.set(src, existing);
      }
      const orderSourceBreakdown: SourceBreakdown[] = Array.from(sourceMap.entries())
        .map(([source, { count, revenue }]) => ({ source, count, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── Fulfillment breakdown ──

      const FULFILLMENT_LABELS: Record<string, string> = {
        PICKUP: 'Pickup',
        DELIVERY: 'Delivery',
        SHIPMENT: 'Shipment',
      };
      const fulfillMap = new Map<string, { count: number; revenue: number }>();
      for (const sale of salesData) {
        const type = sale.fulfillment_type || 'DINE_IN';
        const existing = fulfillMap.get(type) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += sale.net_revenue || 0;
        fulfillMap.set(type, existing);
      }
      const fulfillmentBreakdown: FulfillmentBreakdown[] = Array.from(fulfillMap.entries())
        .map(([type, { count, revenue }]) => ({
          type,
          label: FULFILLMENT_LABELS[type] || (type === 'DINE_IN' ? 'Dine-in' : type),
          count,
          revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // ── Tips summary ──

      const tippedSales = salesData.filter(s => (s.tips_amount || 0) > 0);
      const totalTips = salesData.reduce((sum, s) => sum + (s.tips_amount || 0), 0);
      const tipsSummary: TipsSummary = {
        totalTips,
        tippedOrders: tippedSales.length,
        avgTip: tippedSales.length > 0 ? totalTips / tippedSales.length : 0,
      };

      setData({
        totalRevenue,
        totalCovers,
        avgTicket,
        transactionCount,
        totalDiscounts,
        topItems,
        paymentBreakdown,
        discountBreakdown,
        hourlyRevenue,
        dailyRevenue,
        orderSourceBreakdown,
        fulfillmentBreakdown,
        tipsSummary,
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[useLiveSalesData] Error:', err);
    }
  }, [companyId, siteId, dateFrom, dateTo, isSingleDay, isLive]);

  // Fetch from daily_sales_summary for large ranges (>30 days)
  const fetchFromSummary = useCallback(async (
    cId: string,
    sId: string | undefined | null,
    from: string,
    to: string,
  ) => {
    let query = supabase
      .from('daily_sales_summary')
      .select('*')
      .eq('company_id', cId)
      .gte('summary_date', from)
      .lte('summary_date', to)
      .order('summary_date', { ascending: true });

    if (sId && sId !== 'all') {
      query = query.eq('site_id', sId);
    }

    const { data: summaries, error } = await query;
    if (error) {
      console.error('[useLiveSalesData] Summary query error:', error.message);
      return;
    }

    const rows = summaries || [];
    const totalRevenue = rows.reduce((s, r) => s + (r.net_revenue || 0), 0);
    const totalCovers = rows.reduce((s, r) => s + (r.total_covers || 0), 0);
    const transactionCount = rows.reduce((s, r) => s + (r.transaction_count || 0), 0);
    const totalDiscounts = rows.reduce((s, r) => s + ((r.gross_revenue || 0) - (r.net_revenue || 0)), 0);

    const dailyRevenue: DailyData[] = rows.map(r => ({
      date: r.summary_date,
      label: new Date(r.summary_date + 'T12:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }),
      revenue: r.net_revenue || 0,
      count: r.transaction_count || 0,
    }));

    setData({
      totalRevenue,
      totalCovers,
      avgTicket: transactionCount > 0 ? totalRevenue / transactionCount : 0,
      transactionCount,
      totalDiscounts,
      topItems: [],         // Not available from summary
      paymentBreakdown: [], // Not available from summary
      discountBreakdown: [], // Not available from summary
      hourlyRevenue: [],
      dailyRevenue,
      orderSourceBreakdown: [],
      fulfillmentBreakdown: [],
      tipsSummary: { totalTips: 0, tippedOrders: 0, avgTip: 0 },
    });
    setLastUpdated(new Date());
  }, []);

  // Debounced fetch for Realtime events
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData();
    }, 1000);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [companyId, siteId, fetchData]);

  // Supabase Realtime subscription — only when live (today)
  useEffect(() => {
    if (!companyId || !isLive) return;

    const channel = supabase
      .channel(`live-sales-${companyId}-${siteId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          debouncedFetch();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId, siteId, isLive, debouncedFetch]);

  // Polling fallback — only when live
  useEffect(() => {
    if (!companyId || !isLive) return;
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [companyId, siteId, isLive, fetchData]);

  return { data, loading, lastUpdated, isLive, isSingleDay, refresh: fetchData };
}
