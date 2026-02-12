'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import Link from 'next/link';

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
  weekly_breakdown?: Array<{
    week: number;
    start_date: string;
    end_date: string;
    spend: number;
    order_count: number;
  }>;
  trends?: Array<{
    month: string;
    total_spend: number;
    order_count: number;
    avg_order_value: number;
  }>;
}

export default function MonthlyReportPage() {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const [selectedMonth, setSelectedMonth] = useState(
    monthParam ? new Date(monthParam + '-01') : startOfMonth(new Date())
  );
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
      const response = await fetch(`/api/customer/reports/monthly?month=${monthStr}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load monthly data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (error: any) {
      console.error('Error loading monthly data:', error);
      setError(error.message || 'Failed to load report');
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="secondary" onClick={loadMonthlyData}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data || !data.current_month) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <p className="text-theme-tertiary mb-4">No data available for this month</p>
          <Link href="/customer/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const current = data.current_month;
  const previous = data.previous_month;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/customer/dashboard">
            <Button variant="outline" className="text-sm">
              ← Back
            </Button>
          </Link>
          <button
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-theme-tertiary" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">
            {format(selectedMonth, 'MMMM yyyy')} Report
          </h1>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            disabled={format(selectedMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5 text-theme-tertiary" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="text-xs text-theme-tertiary mb-1">Total Spend</div>
          <div className="text-2xl font-bold text-theme-primary">{formatCurrency(current.total_spend)}</div>
          {previous && (
            <div className="text-xs text-theme-tertiary mt-1">
              vs {formatCurrency(previous.total_spend)} previous month
            </div>
          )}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="text-xs text-theme-tertiary mb-1">Orders Placed</div>
          <div className="text-2xl font-bold text-theme-primary">{current.order_count}</div>
          {previous && (
            <div className="text-xs text-theme-tertiary mt-1">
              vs {previous.order_count} previous month
            </div>
          )}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="text-xs text-theme-tertiary mb-1">Average Order</div>
          <div className="text-2xl font-bold text-theme-primary">{formatCurrency(current.avg_order_value)}</div>
          {previous && (
            <div className="text-xs text-theme-tertiary mt-1">
              vs {formatCurrency(previous.avg_order_value)} previous month
            </div>
          )}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <div className="text-xs text-theme-tertiary mb-1">Products Ordered</div>
          <div className="text-2xl font-bold text-theme-primary">{current.total_units_ordered}</div>
          <div className="text-xs text-theme-tertiary mt-1">{current.unique_products} unique products</div>
        </div>
      </div>

      {/* Top Products Table */}
      {data.top_products && data.top_products.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Product Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-4 text-sm font-medium text-theme-tertiary">Product</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-theme-tertiary">Quantity</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-theme-tertiary">Unit Price</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-theme-tertiary">Total</th>
                  <th className="text-right py-2 px-4 text-sm font-medium text-theme-tertiary">% of Spend</th>
                </tr>
              </thead>
              <tbody>
                {data.top_products.map((product) => {
                  const percentOfSpend = current.total_spend > 0
                    ? ((product.total_spend / current.total_spend) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <tr key={product.product_id} className="border-b border-white/[0.06]">
                      <td className="py-3 px-4 text-theme-primary">{product.product_name}</td>
                      <td className="py-3 px-4 text-right text-theme-secondary">{product.total_quantity}</td>
                      <td className="py-3 px-4 text-right text-theme-secondary">{formatCurrency(product.avg_unit_price)}</td>
                      <td className="py-3 px-4 text-right text-theme-primary font-medium">{formatCurrency(product.total_spend)}</td>
                      <td className="py-3 px-4 text-right text-theme-tertiary">{percentOfSpend}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.06] font-semibold">
                  <td className="py-3 px-4 text-theme-primary">Total</td>
                  <td className="py-3 px-4 text-right text-theme-primary">{current.total_units_ordered}</td>
                  <td className="py-3 px-4 text-right text-theme-tertiary">-</td>
                  <td className="py-3 px-4 text-right text-theme-primary">{formatCurrency(current.total_spend)}</td>
                  <td className="py-3 px-4 text-right text-theme-primary">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Weekly Breakdown */}
      {data.weekly_breakdown && data.weekly_breakdown.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Weekly Breakdown</h2>
          <div className="space-y-2">
            {data.weekly_breakdown.map((week) => (
              <div key={week.week} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <div>
                  <div className="text-sm font-medium text-theme-primary">Week {week.week}</div>
                  <div className="text-xs text-theme-tertiary">
                    {format(new Date(week.start_date), 'MMM d')} - {format(new Date(week.end_date), 'MMM d')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-theme-primary">{formatCurrency(week.spend)}</div>
                  <div className="text-xs text-theme-tertiary">{week.order_count} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

