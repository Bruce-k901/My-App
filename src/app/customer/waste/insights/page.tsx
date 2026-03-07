'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, AlertTriangle, Loader2, Target } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import { format } from 'date-fns';

interface WasteInsights {
  overview: {
    avg_waste_percent: number;
    total_waste_cost: number;
    best_day: string | null;
    worst_day: string | null;
  };
  by_day: {
    [dayName: string]: {
      avg_waste_percent: number;
      log_count: number;
    };
  };
  by_product: Array<{
    product_id: string;
    product_name: string;
    avg_waste_percent: number;
    total_waste_cost: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
  }>;
}

export default function WasteInsightsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<WasteInsights | null>(null);
  const [days, setDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, [days]);

  async function loadInsights() {
    try {
      setLoading(true);
      setError(null);

      // Support admin preview mode
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const params = new URLSearchParams({ days: days.toString() });
      if (previewId) params.set('customer_id', previewId);
      const response = await fetch(`/api/customer/waste/insights?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load waste insights');
      }

      const result = await response.json();
      setInsights(result.data);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      setError(error.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
      case 'good':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      default:
        return 'text-theme-tertiary bg-theme-button border-theme';
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Loading Insights</h2>
          <p className="text-theme-tertiary mb-4">{error}</p>
          <Button
            onClick={loadInsights}
            variant="primary"
            className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-theme-button border border-theme rounded-xl p-8 text-center">
          <Calendar className="w-16 h-16 text-theme-tertiary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-theme-primary mb-2">No Waste Data Yet</h2>
          <p className="text-theme-tertiary mb-6">
            Start logging your daily sales to see waste insights and optimization suggestions.
          </p>
          <Link href="/customer/waste/log">
            <Button
              variant="primary"
              className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
            >
              Log Today's Sales
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { overview, by_day, by_product } = insights || {};

  // Calculate potential savings (assuming 10% reduction in waste)
  const potentialSavings = (overview?.total_waste_cost || 0) * 0.1;
  const weeklySavings = days > 0 ? potentialSavings / (days / 7) : 0;
  const yearlySavings = weeklySavings * 52;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customer/dashboard"
          className="inline-flex items-center gap-2 text-theme-tertiary hover:text-theme-primary mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">Waste Insights</h1>
            <p className="text-theme-tertiary text-sm sm:text-base">
              Track patterns and optimize your orders
            </p>
          </div>
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDays(7)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                days === 7
                  ? 'bg-module-fg/20 text-module-fg border border-module-fg'
                  : 'bg-theme-button text-theme-tertiary border border-theme hover:bg-theme-hover'
              }`}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                days === 30
                  ? 'bg-module-fg/20 text-module-fg border border-module-fg'
                  : 'bg-theme-button text-theme-tertiary border border-theme hover:bg-theme-hover'
              }`}
            >
              Last 30 days
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                days === 90
                  ? 'bg-module-fg/20 text-module-fg border border-module-fg'
                  : 'bg-theme-button text-theme-tertiary border border-theme hover:bg-theme-hover'
              }`}
            >
              Last 90 days
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
          <div className="text-sm text-theme-tertiary mb-2">Average Waste</div>
          <div className={`text-2xl font-bold mb-1 ${
            (overview?.avg_waste_percent || 0) < 15 ? 'text-green-600 dark:text-green-400' :
            (overview?.avg_waste_percent || 0) < 25 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {overview?.avg_waste_percent?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-theme-tertiary flex items-center gap-1">
            <Target className="w-3 h-3" />
            Target: &lt;15%
          </div>
        </div>

        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
          <div className="text-sm text-theme-tertiary mb-2">Best Day</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
            {overview?.best_day || 'N/A'}
          </div>
          {overview?.best_day && (
            <div className="text-xs text-theme-tertiary">
              Lowest waste day
            </div>
          )}
        </div>

        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
          <div className="text-sm text-theme-tertiary mb-2">Worst Day</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
            {overview?.worst_day || 'N/A'}
          </div>
          {overview?.worst_day && (
            <div className="text-xs text-theme-tertiary">
              Highest waste day
            </div>
          )}
        </div>

        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
          <div className="text-sm text-theme-tertiary mb-2">Potential Savings</div>
          <div className="text-2xl font-bold text-module-fg mb-1">
            {formatCurrency(weeklySavings)}/week
          </div>
          <div className="text-xs text-theme-tertiary">
            {formatCurrency(yearlySavings)}/year
          </div>
        </div>
      </div>

      {/* Waste by Day of Week */}
      {by_day && Object.keys(by_day).length > 0 && (
        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Waste by Day of Week</h2>
          <div className="space-y-3">
            {Object.entries(by_day)
              .sort(([a], [b]) => {
                const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                return dayOrder.indexOf(a) - dayOrder.indexOf(b);
              })
              .map(([dayName, data]) => {
                const percent = data.avg_waste_percent || 0;
                const status = percent < 10 ? 'excellent' : percent < 20 ? 'good' : percent < 30 ? 'warning' : 'critical';
                return (
                  <div key={dayName} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-theme-secondary font-medium">{dayName}</div>
                    <div className="flex-1 bg-theme-hover rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          status === 'excellent' ? 'bg-green-500' :
                          status === 'good' ? 'bg-blue-500' :
                          status === 'warning' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className={`text-sm font-semibold w-20 text-right ${getStatusColor(status).split(' ')[0]}`}>
                      {percent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-theme-tertiary w-16 text-right">
                      {data.log_count} logs
                    </div>
                  </div>
                );
              })}
          </div>
          {overview?.worst_day && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-theme-secondary">
                  <strong>💡 Insight:</strong> You consistently over-order on {overview.worst_day}. Consider reducing your standing order for this day.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waste by Product */}
      {by_product && by_product.length > 0 && (
        <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-theme-primary mb-4">Waste by Product</h2>
          <div className="space-y-3">
            {by_product.map((product) => {
              const statusColors = getStatusColor(product.status).split(' ');
              return (
                <div
                  key={product.product_id}
                  className={`border rounded-lg p-4 ${statusColors.join(' ')}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-theme-primary mb-1">{product.product_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-theme-tertiary">
                        <span>Avg Waste: <strong className={statusColors[0]}>{product.avg_waste_percent.toFixed(1)}%</strong></span>
                        <span>Cost: <strong>{formatCurrency(product.total_waste_cost)}</strong></span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors.join(' ')}`}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </div>
                  </div>
                  
                  {product.status === 'critical' && (
                    <div className="mt-3 pt-3 border-t border-theme-hover">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-sm text-theme-secondary">
                          <strong>💡 Suggestion:</strong> This product has high waste ({product.avg_waste_percent.toFixed(1)}%). 
                          Consider reducing your standing order quantity.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6 text-center">
        <h3 className="text-lg font-semibold text-theme-primary mb-2">Keep Tracking to See More Insights</h3>
        <p className="text-theme-tertiary text-sm mb-4">
          Log your sales daily to build better waste patterns and optimize your orders.
        </p>
        <Link href="/customer/waste/log">
          <Button
            variant="primary"
            className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow"
          >
            Log Today's Sales
          </Button>
        </Link>
      </div>
    </div>
  );
}

