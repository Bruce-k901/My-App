"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useLiveSalesData } from '@/hooks/useLiveSalesData';
import type { PaymentBreakdown, DiscountBreakdown, TopItem, HourlyData, DailyData, SourceBreakdown, FulfillmentBreakdown } from '@/hooks/useLiveSalesData';
import { SalesPeriodSelector, periodToDateRange } from '@/components/stockly/sales/SalesPeriodSelector';
import type { PeriodKey, DateRange } from '@/components/stockly/sales/SalesPeriodSelector';
import {
  DollarSign,
  Users,
  Receipt,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Loader2,
  CreditCard,
  Banknote,
  Gift,
  Wallet,
  Tag,
  Percent,
  BarChart3,
  Store,
  Truck,
  Heart,
} from '@/components/ui/icons';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatCurrencyDecimal = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  gift_card: Gift,
  wallet: Wallet,
  other: Tag,
  mixed: CreditCard,
};

// ─── Page ─────────────────────────────────────────────────────────────────

export default function LiveSalesPage() {
  const { companyId, siteId } = useAppContext();

  // Period state
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [dateRange, setDateRange] = useState<DateRange>(() => periodToDateRange('today'));

  const { data, loading, lastUpdated, isLive, isSingleDay, refresh } = useLiveSalesData(
    companyId,
    siteId,
    { dateFrom: dateRange.from, dateTo: dateRange.to },
  );

  const [refreshing, setRefreshing] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState('');

  function handlePeriodChange(newPeriod: PeriodKey, range: DateRange) {
    setPeriod(newPeriod);
    setDateRange(range);
  }

  // Update "time ago" every 5 seconds
  useEffect(() => {
    setTimeAgoStr(timeAgo(lastUpdated));
    const interval = setInterval(() => {
      setTimeAgoStr(timeAgo(lastUpdated));
    }, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
      </div>
    );
  }

  // Chart data — hourly for single day, daily for multi-day
  const chartData = isSingleDay ? data.hourlyRevenue : data.dailyRevenue;
  const chartDataKey = isSingleDay ? 'hour' : 'label';
  const chartTitle = isSingleDay ? 'Revenue by Hour' : 'Daily Revenue';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/stockly/sales"
            className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
              {isLive ? 'Live Sales' : 'Sales'}
            </h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">
              {isLive
                ? "Today\u2019s sales updating in real-time"
                : `Sales data for selected period`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator — only when viewing today */}
          {isLive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-surface-elevated border border-theme rounded-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                Updated {timeAgoStr}
              </span>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <SalesPeriodSelector value={period} onChange={handlePeriodChange} />

      {/* Empty state — no transactions */}
      {data.transactionCount === 0 && (
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-8 text-center">
          <Receipt className="w-10 h-10 text-[rgb(var(--text-secondary))]/30 dark:text-theme-tertiary/30 mx-auto mb-3" />
          <p className="text-[rgb(var(--text-primary))] dark:text-white font-medium mb-1">
            No sales {isLive ? 'yet today' : 'in this period'}
          </p>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-theme-tertiary mb-4">
            {isLive
              ? 'Sales will appear here as Square orders come in.'
              : 'Try selecting a different date range.'}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={DollarSign}
          iconColor="text-green-500 dark:text-green-400"
          label="Revenue"
          value={formatCurrency(data.totalRevenue)}
        />
        <KPICard
          icon={Users}
          iconColor="text-module-fg"
          label="Covers"
          value={data.totalCovers.toLocaleString()}
        />
        <KPICard
          icon={Receipt}
          iconColor="text-purple-500 dark:text-purple-400"
          label="Transactions"
          value={data.transactionCount.toLocaleString()}
        />
        <KPICard
          icon={TrendingUp}
          iconColor="text-blue-500 dark:text-blue-400"
          label="Avg Ticket"
          value={formatCurrencyDecimal(data.avgTicket)}
        />
        <KPICard
          icon={Percent}
          iconColor="text-amber-500 dark:text-amber-400"
          label="Discounts"
          value={formatCurrency(data.totalDiscounts)}
        />
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-module-fg" />
            <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
              {chartTitle}
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey={chartDataKey}
                tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `£${v}`}
              />
              <Tooltip
                content={isSingleDay ? <HourlyTooltip /> : <DailyTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar
                dataKey="revenue"
                fill="var(--module-fg)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment + Discounts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Breakdown */}
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-module-fg" />
            <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
              Payment Types
            </h2>
          </div>
          {data.paymentBreakdown.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              No payment data available
            </p>
          ) : (
            <div className="space-y-3">
              {data.paymentBreakdown.map((pm) => (
                <PaymentRow key={pm.type} item={pm} total={data.totalRevenue} />
              ))}
            </div>
          )}
        </div>

        {/* Discount Breakdown */}
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
              Discounts
            </h2>
          </div>
          {data.discountBreakdown.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              No discounts in this period
            </p>
          ) : (
            <div className="space-y-3">
              {data.discountBreakdown.map((d) => (
                <DiscountRow key={d.name} item={d} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tips + Order Source + Fulfillment row */}
      {(data.tipsSummary.totalTips > 0 || data.orderSourceBreakdown.length > 0 || data.fulfillmentBreakdown.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tips */}
          <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-pink-500 dark:text-pink-400" />
              <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                Tips
              </h2>
            </div>
            {data.tipsSummary.totalTips > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Total tips</span>
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                    {formatCurrencyDecimal(data.tipsSummary.totalTips)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Tipped orders</span>
                  <span className="text-sm text-[rgb(var(--text-primary))] dark:text-white">
                    {data.tipsSummary.tippedOrders} of {data.transactionCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">Avg tip</span>
                  <span className="text-sm text-[rgb(var(--text-primary))] dark:text-white">
                    {formatCurrencyDecimal(data.tipsSummary.avgTip)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                No tips in this period
              </p>
            )}
          </div>

          {/* Order Source */}
          <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-4 h-4 text-module-fg" />
              <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                Order Source
              </h2>
            </div>
            {data.orderSourceBreakdown.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                No source data available
              </p>
            ) : (
              <div className="space-y-2">
                {data.orderSourceBreakdown.map(src => {
                  const pct = data.totalRevenue > 0 ? (src.revenue / data.totalRevenue) * 100 : 0;
                  return (
                    <div key={src.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[rgb(var(--text-primary))] dark:text-white truncate">
                          {src.source}
                        </span>
                        <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary ml-2 shrink-0">
                          {src.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-theme-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-module-fg rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fulfillment Type */}
          <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                Fulfillment
              </h2>
            </div>
            {data.fulfillmentBreakdown.length === 0 ? (
              <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                No fulfillment data available
              </p>
            ) : (
              <div className="space-y-2">
                {data.fulfillmentBreakdown.map(f => {
                  const pct = data.totalRevenue > 0 ? (f.revenue / data.totalRevenue) * 100 : 0;
                  return (
                    <div key={f.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[rgb(var(--text-primary))] dark:text-white">
                          {f.label}
                        </span>
                        <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary shrink-0">
                          {f.count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-theme-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Sold — full-width table */}
      <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-module-fg" />
          <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
            Items Sold
          </h2>
          {data.topItems.length > 0 && (
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary ml-auto">
              {data.topItems.length} item{data.topItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {data.topItems.length === 0 ? (
          <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            {isSingleDay && !isLive
              ? 'Item data not available for summary view'
              : 'No items sold in this period'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary border-b border-theme">
                  <th className="text-left pb-2 pr-3 font-medium">#</th>
                  <th className="text-left pb-2 pr-3 font-medium">Item</th>
                  <th className="text-right pb-2 pr-3 font-medium">Qty</th>
                  <th className="text-right pb-2 pr-3 font-medium">Revenue</th>
                  <th className="text-right pb-2 pr-3 font-medium">Avg Price</th>
                  <th className="text-right pb-2 font-medium">% of Sales</th>
                </tr>
              </thead>
              <tbody>
                {data.topItems.map((item, i) => {
                  const avgPrice = item.quantity > 0 ? item.revenue / item.quantity : 0;
                  const share = data.totalRevenue > 0 ? (item.revenue / data.totalRevenue) * 100 : 0;
                  return (
                    <tr key={item.name} className="border-b border-theme/50 last:border-0">
                      <td className="py-2 pr-3 text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                        {i + 1}
                      </td>
                      <td className="py-2 pr-3 text-[rgb(var(--text-primary))] dark:text-white truncate max-w-[200px]">
                        {item.name}
                      </td>
                      <td className="py-2 pr-3 text-right text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                        {item.quantity}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-[rgb(var(--text-primary))] dark:text-white">
                        {formatCurrencyDecimal(item.revenue)}
                      </td>
                      <td className="py-2 pr-3 text-right text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
                        {formatCurrencyDecimal(avgPrice)}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-theme-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-module-fg rounded-full"
                              style={{ width: `${Math.min(share, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary w-10 text-right">
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: typeof DollarSign;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-theme-surface-elevated border border-theme rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-xs">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{value}</p>
    </div>
  );
}

function PaymentRow({ item, total }: { item: PaymentBreakdown; total: number }) {
  const Icon = PAYMENT_ICONS[item.type] || CreditCard;
  const pct = total > 0 ? (item.total / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-theme-tertiary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-[rgb(var(--text-primary))] dark:text-white truncate">
            {item.label}
          </p>
          <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
            {item.count} transaction{item.count !== 1 ? 's' : ''} ({pct.toFixed(0)}%)
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white shrink-0 ml-3">
        {formatCurrency(item.total)}
      </p>
    </div>
  );
}

function DiscountRow({ item }: { item: DiscountBreakdown }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm text-[rgb(var(--text-primary))] dark:text-white truncate">
          {item.name}
        </p>
        <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
          {item.count} use{item.count !== 1 ? 's' : ''}
        </p>
      </div>
      <p className="text-sm font-medium text-amber-600 dark:text-amber-400 shrink-0 ml-3">
        -{formatCurrency(item.total)}
      </p>
    </div>
  );
}

function HourlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: HourlyData }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-medium">{label}</p>
      <p className="text-green-400">{formatCurrency(entry.revenue)}</p>
      <p className="text-gray-400">{entry.count} order{entry.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

function DailyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: DailyData }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-medium">{label}</p>
      <p className="text-green-400">{formatCurrency(entry.revenue)}</p>
      <p className="text-gray-400">{entry.count} order{entry.count !== 1 ? 's' : ''}</p>
    </div>
  );
}
