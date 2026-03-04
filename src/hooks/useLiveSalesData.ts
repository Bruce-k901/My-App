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
  created_at: string;
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

export function useLiveSalesData(companyId: string | undefined, siteId: string | undefined) {
  const [data, setData] = useState<LiveSalesData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTodayData = useCallback(async () => {
    if (!companyId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's sales
      let salesQuery = supabase
        .from('sales')
        .select('id, gross_revenue, net_revenue, discounts, covers, payment_method, payment_details, discount_details, created_at')
        .eq('company_id', companyId)
        .eq('sale_date', today)
        .eq('status', 'completed');

      if (siteId && siteId !== 'all') {
        salesQuery = salesQuery.eq('site_id', siteId);
      }

      const { data: sales, error: salesError } = await salesQuery;

      if (salesError) {
        // Table might not exist (42P01) — return empty
        if (salesError.code === '42P01') return;
        console.error('[useLiveSalesData] Sales query error:', salesError);
        return;
      }

      const salesData = (sales || []) as SaleRecord[];

      // Fetch sale items for today's sales
      const saleIds = salesData.map(s => s.id);
      let itemsData: SaleItemRecord[] = [];
      if (saleIds.length > 0) {
        // Fetch in chunks if needed
        const chunkSize = 100;
        for (let i = 0; i < saleIds.length; i += chunkSize) {
          const chunk = saleIds.slice(i, i + chunkSize);
          const { data: items } = await supabase
            .from('sale_items')
            .select('item_name, quantity, line_total, sale_id')
            .in('sale_id', chunk);
          if (items) itemsData = itemsData.concat(items as SaleItemRecord[]);
        }
      }

      // ── Compute KPIs ──

      const totalRevenue = salesData.reduce((sum, s) => sum + (s.net_revenue || 0), 0);
      const totalCovers = salesData.reduce((sum, s) => sum + (s.covers || 0), 0);
      const totalDiscounts = salesData.reduce((sum, s) => sum + (s.discounts || 0), 0);
      const transactionCount = salesData.length;
      const avgTicket = transactionCount > 0 ? totalRevenue / transactionCount : 0;

      // ── Top items (grouped by name, sorted by revenue) ──

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
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // ── Payment breakdown ──

      // First try granular payment_details, fall back to payment_method
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

      // ── Discount breakdown (by name) ──

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

      // ── Hourly revenue ──

      const hourMap = new Map<number, { revenue: number; count: number }>();
      for (const sale of salesData) {
        const hour = new Date(sale.created_at).getHours();
        const existing = hourMap.get(hour) || { revenue: 0, count: 0 };
        existing.revenue += sale.net_revenue || 0;
        existing.count++;
        hourMap.set(hour, existing);
      }

      // Fill all hours from earliest sale to current hour
      const currentHour = new Date().getHours();
      const minHour = salesData.length > 0
        ? Math.min(...salesData.map(s => new Date(s.created_at).getHours()))
        : currentHour;
      const hourlyRevenue: HourlyData[] = [];
      for (let h = minHour; h <= currentHour; h++) {
        const entry = hourMap.get(h) || { revenue: 0, count: 0 };
        hourlyRevenue.push({
          hour: `${h.toString().padStart(2, '0')}:00`,
          revenue: entry.revenue,
          count: entry.count,
        });
      }

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
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useLiveSalesData] Error:', err);
    }
  }, [companyId, siteId]);

  // Debounced fetch for Realtime events
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTodayData();
    }, 1000);
  }, [fetchTodayData]);

  // Initial fetch
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchTodayData().finally(() => setLoading(false));
  }, [companyId, siteId, fetchTodayData]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`live-sales-${companyId}-${siteId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'stockly',
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
  }, [companyId, siteId, debouncedFetch]);

  // Polling fallback
  useEffect(() => {
    if (!companyId) return;
    const interval = setInterval(fetchTodayData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [companyId, siteId, fetchTodayData]);

  return { data, loading, lastUpdated, refresh: fetchTodayData };
}
