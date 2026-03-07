'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, TrendingUp, AlertCircle, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';

interface PendingLog {
  order_id: string;
  order_number: string;
  delivery_date: string;
  total_ordered: number;
  days_since_delivery: number;
}

interface WasteSummary {
  avg_waste_percent: number;
  total_waste_cost: number;
  days_logged: number;
}

export function WasteDashboardWidget() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [pendingLog, setPendingLog] = useState<PendingLog | null>(null);
  const [summary, setSummary] = useState<WasteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadData();
  }, [mounted]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Check for pending logs (don't fail if this errors)
      try {
        const pendingController = new AbortController();
        const pendingTimeout = setTimeout(() => pendingController.abort(), 5000);
        
        // Support admin preview mode
        const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
        const pendingUrl = previewId ? `/api/customer/waste/pending?customer_id=${previewId}` : '/api/customer/waste/pending';
        const pendingResponse = await fetch(pendingUrl, {
          signal: pendingController.signal,
        });
        clearTimeout(pendingTimeout);
        
        if (pendingResponse.ok) {
          const pendingResult = await pendingResponse.json();
          if (pendingResult.data && Array.isArray(pendingResult.data) && pendingResult.data.length > 0) {
            setPendingLog(pendingResult.data[0]);
          }
        }
      } catch (pendingError: any) {
        // Silently handle errors - this is optional data
        if (pendingError.name !== 'AbortError') {
          console.warn('Error loading pending waste logs:', pendingError);
        }
      }

      // Get 7-day summary (don't fail if this errors)
      try {
        const insightsController = new AbortController();
        const insightsTimeout = setTimeout(() => insightsController.abort(), 5000);
        
        const insightsUrl = previewId ? `/api/customer/waste/insights?days=7&customer_id=${previewId}` : '/api/customer/waste/insights?days=7';
        const insightsResponse = await fetch(insightsUrl, {
          signal: insightsController.signal,
        });
        clearTimeout(insightsTimeout);
        
        if (insightsResponse.ok) {
          const insightsResult = await insightsResponse.json();
          if (insightsResult.data?.overview) {
            setSummary({
              avg_waste_percent: insightsResult.data.overview.avg_waste_percent || 0,
              total_waste_cost: insightsResult.data.overview.total_waste_cost || 0,
              days_logged: insightsResult.data.overview.days_logged || 0,
            });
          }
        }
      } catch (insightsError: any) {
        // Silently handle errors - this is optional data
        if (insightsError.name !== 'AbortError') {
          console.warn('Error loading waste insights:', insightsError);
        }
      }
    } catch (error) {
      console.error('Error loading waste widget data:', error);
      // Don't set error state - just show empty state
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[120px]">
          <Loader2 className="w-6 h-6 text-module-fg animate-spin" />
        </div>
      </div>
    );
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
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-center min-h-[120px]">
          <Loader2 className="w-6 h-6 text-module-fg animate-spin" />
        </div>
      </div>
    );
  }

  // If there's an error, show a simple fallback that doesn't break the page
  if (error && !pendingLog && !summary) {
    return (
      <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-theme-primary">Waste Tracking</h2>
          <Link
            href="/customer/waste/insights"
            className="text-sm text-module-fg hover:text-module-fg/80 transition-colors"
          >
            View Insights →
          </Link>
        </div>
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
          <p className="text-sm text-theme-tertiary mb-4">
            Start logging your sales to track waste patterns
          </p>
          <Link href="/customer/waste/log">
            <Button
              variant="primary"
              className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow min-h-[44px]"
            >
              Log Sales
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-button border border-theme rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-theme-primary">Waste Tracking</h2>
        <Link
          href="/customer/waste/insights"
          className="text-sm text-module-fg hover:text-module-fg/80 transition-colors"
        >
          View Insights →
        </Link>
      </div>

      {pendingLog ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-theme-primary mb-1">
                Log today's sales
              </div>
              <div className="text-xs text-theme-tertiary mb-3">
                Order #{pendingLog.order_number} from {new Date(pendingLog.delivery_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </div>
              <Link href={`/customer/waste/log?order_id=${pendingLog.order_id}`}>
                <Button
                  variant="primary"
                  className="w-full sm:w-auto bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow min-h-[44px]"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Log Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : summary && summary.days_logged > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-theme-tertiary mb-1">This Week</div>
              <div className={`text-lg font-semibold ${
                summary.avg_waste_percent < 15 ? 'text-green-600 dark:text-green-400' :
                summary.avg_waste_percent < 25 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {summary.avg_waste_percent.toFixed(1)}% waste
              </div>
            </div>
            <div>
              <div className="text-xs text-theme-tertiary mb-1">Potential Savings</div>
              <div className="text-lg font-semibold text-module-fg">
                {formatCurrency(summary.total_waste_cost * 0.1)}
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-theme">
            <Link href="/customer/waste/insights">
              <Button
                variant="ghost"
                className="w-full text-sm bg-transparent text-theme-tertiary hover:text-theme-primary border border-theme hover:border-theme-hover"
              >
                View Full Insights
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <Calendar className="w-8 h-8 text-theme-tertiary mx-auto mb-2" />
          <p className="text-sm text-theme-tertiary mb-4">
            Start logging your sales to track waste patterns
          </p>
          <Link href="/customer/waste/log">
            <Button
              variant="primary"
              className="bg-transparent text-module-fg border border-module-fg hover:shadow-module-glow min-h-[44px]"
            >
              Log Sales
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
