'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Download } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import Link from 'next/link';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';

interface MonthlySpendData {
  current_month: {
    month_date: string;
    order_count: number;
    total_spend: number;
    avg_order_value: number;
    total_units_ordered: number;
    unique_products: number;
  } | null;
  previous_month: {
    month_date: string;
    order_count: number;
    total_spend: number;
    avg_order_value: number;
    total_units_ordered: number;
    unique_products: number;
  } | null;
  top_products: Array<{
    product_id: string;
    product_name: string;
    total_quantity: number;
    total_spend: number;
    avg_unit_price: number;
  }>;
}

export function MonthlySpendCard() {
  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonthlySpendData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth]);

  async function loadMonthlyData() {
    try {
      setLoading(true);
      setError(null);
      const monthStr = format(selectedMonth, 'yyyy-MM');
      const params = new URLSearchParams({ month: monthStr });

      // Support admin preview mode
      const previewCustomerId = typeof window !== 'undefined'
        ? sessionStorage.getItem('admin_preview_customer_id')
        : null;
      if (previewCustomerId) {
        params.set('customer_id', previewCustomerId);
      }

      const response = await fetch(`/api/customer/reports/monthly?${params}`);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.error || `Request failed (${response.status})`;
        if (response.status === 404) {
          // Customer record not linked yet - show empty state rather than error
          setData(null);
          return;
        }
        throw new Error(msg);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      console.error('Error loading monthly data:', err);
      setError(err.message || 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateTrend = (current: number, previous: number | null) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    };
  };

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data || !data.current_month) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </button>
            <h2 className="text-xl font-semibold text-white">
              {format(selectedMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              disabled={format(selectedMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
              className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
            >
              <ChevronRight className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
        <p className="text-white/60">No orders for this month</p>
      </div>
    );
  }

  const current = data.current_month;
  const previous = data.previous_month;

  const spendTrend = calculateTrend(current.total_spend, previous?.total_spend || null);
  const orderTrend = calculateTrend(current.order_count, previous?.order_count || null);
  const avgOrderTrend = calculateTrend(current.avg_order_value, previous?.avg_order_value || null);
  const unitsTrend = calculateTrend(current.total_units_ordered, previous?.total_units_ordered || null);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
          <h2 className="text-xl font-semibold text-white">
            {format(selectedMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            disabled={format(selectedMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>
        <Link href={`/customer/reports/monthly?month=${format(selectedMonth, 'yyyy-MM')}`}>
          <Button variant="secondary" className="text-sm">
            View Full Report
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Spend"
          value={formatCurrency(current.total_spend)}
          trend={spendTrend}
          previousValue={previous?.total_spend}
        />
        <MetricCard
          label="Orders Placed"
          value={current.order_count.toString()}
          trend={orderTrend}
          previousValue={previous?.order_count}
          isCount={true}
        />
        <MetricCard
          label="Average Order"
          value={formatCurrency(current.avg_order_value)}
          trend={avgOrderTrend}
          previousValue={previous?.avg_order_value}
        />
        <MetricCard
          label="Products Ordered"
          value={`${current.total_units_ordered} units`}
          trend={unitsTrend}
          previousValue={previous?.total_units_ordered}
        />
      </div>

      {/* Top Products */}
      {data.top_products && data.top_products.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-white/80 mb-3">Top Products</h3>
          <div className="space-y-2">
            {data.top_products.slice(0, 3).map((product) => {
              const maxSpend = Math.max(...data.top_products.map(p => p.total_spend));
              const widthPercent = (product.total_spend / maxSpend) * 100;
              
              return (
                <div key={product.product_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/90 truncate">{product.product_name}</div>
                    <div className="text-xs text-white/60">{product.total_quantity} units</div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-[#D37E91] rounded-full transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium text-white w-20 text-right">
                    {formatCurrency(product.total_spend)}
                  </div>
                </div>
              );
            })}
          </div>
          {data.top_products.length > 3 && (
            <Link
              href={`/customer/reports/monthly?month=${format(selectedMonth, 'yyyy-MM')}`}
              className="text-sm text-[#D37E91] hover:text-[#D37E91]/80 mt-3 inline-block"
            >
              View All Products →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  previousValue,
  isCount = false,
}: {
  label: string;
  value: string;
  trend: { value: number; isPositive: boolean };
  previousValue?: number | null;
  isCount?: boolean;
}) {
  const TrendIcon = trend.isPositive ? TrendingUp : TrendingDown;
  const trendText = previousValue
    ? trend.isPositive
      ? `+${trend.value.toFixed(1)}%`
      : `-${trend.value.toFixed(1)}%`
    : 'N/A';

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div className="text-xl font-bold text-white mb-1">{value}</div>
      {previousValue && (
        <div className={`flex items-center gap-1 text-xs ${
          trend.isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          <TrendIcon className="w-3 h-3" />
          <span>{trendText} vs previous</span>
        </div>
      )}
    </div>
  );
}

