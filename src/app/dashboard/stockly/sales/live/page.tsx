"use client";

import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useLiveSalesData } from '@/hooks/useLiveSalesData';
import type { PaymentBreakdown, DiscountBreakdown, TopItem, HourlyData } from '@/hooks/useLiveSalesData';
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
  const { data, loading, lastUpdated, refresh } = useLiveSalesData(companyId, siteId);
  const [refreshing, setRefreshing] = useState(false);
  const [timeAgoStr, setTimeAgoStr] = useState('');

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
              Live Sales
            </h1>
            <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-sm mt-1">
              Today&apos;s sales updating in real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-surface-elevated border border-theme rounded-lg">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              Updated {timeAgoStr}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-theme-button hover:bg-theme-button-hover text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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

      {/* Hourly Revenue Chart */}
      {data.hourlyRevenue.length > 0 && (
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-module-fg" />
            <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
              Revenue by Hour
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.hourlyRevenue} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="hour"
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
                content={<HourlyTooltip />}
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

      {/* Bottom grid: Payment + Discounts + Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              No transactions yet today
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
              No discounts applied today
            </p>
          ) : (
            <div className="space-y-3">
              {data.discountBreakdown.map((d) => (
                <DiscountRow key={d.name} item={d} />
              ))}
            </div>
          )}
        </div>

        {/* Top Items */}
        <div className="bg-theme-surface-elevated border border-theme rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-module-fg" />
            <h2 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
              Top Sellers
            </h2>
          </div>
          {data.topItems.length === 0 ? (
            <p className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
              No items sold yet today
            </p>
          ) : (
            <div className="space-y-2">
              {data.topItems.map((item, i) => (
                <TopItemRow key={item.name} item={item} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
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

function TopItemRow({ item, rank }: { item: TopItem; rank: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary w-5 text-right shrink-0">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[rgb(var(--text-primary))] dark:text-white truncate">
          {item.name}
        </p>
      </div>
      <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-theme-tertiary shrink-0">
        x{item.quantity}
      </span>
      <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white shrink-0 w-16 text-right">
        {formatCurrency(item.revenue)}
      </span>
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
