'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface CategoryValue {
  category: string;
  value: number;
}

interface StockSummary {
  totalValue: number;
  categories: CategoryValue[];
}

export default function StockValueSummaryWidget({ companyId, siteId }: WidgetProps) {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.stockly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchStockValue() {
      try {
        // Try to get stock value from stock_levels
        let query = supabase
          .from('stock_levels')
          .select('current_quantity, unit_cost, category')
          .eq('company_id', companyId);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('stock_levels view not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        // Calculate totals by category
        const categoryMap = new Map<string, number>();
        let totalValue = 0;

        (data || []).forEach((item: any) => {
          const value = (item.current_quantity || 0) * (item.unit_cost || 0);
          totalValue += value;

          const category = item.category || 'Uncategorized';
          categoryMap.set(category, (categoryMap.get(category) || 0) + value);
        });

        // Sort categories by value descending
        const categories = Array.from(categoryMap.entries())
          .map(([category, value]) => ({ category, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 categories

        setSummary({ totalValue, categories });
      } catch (err) {
        console.error('Error fetching stock value:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStockValue();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!summary || summary.totalValue === 0) {
    return (
      <WidgetCard
        title="Stock Value"
        icon={
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <DollarSign className={cn('w-4 h-4', colors.text)} />
          </div>
        }
      >
        <WidgetEmptyState
          icon={<Package className="w-8 h-8" />}
          message="No stock value data available"
          actionLabel="Add stock items"
          actionHref="/dashboard/stockly/stock-items"
        />
      </WidgetCard>
    );
  }

  const maxValue = Math.max(...summary.categories.map((c) => c.value));

  return (
    <WidgetCard
      title="Stock Value"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <DollarSign className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      viewAllHref="/dashboard/stockly/reports"
    >
      <div className="space-y-4">
        {/* Total value */}
        <div className="text-center py-2">
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
            Total inventory value at cost
          </div>
        </div>

        {/* Category breakdown */}
        {summary.categories.length > 0 && (
          <div className="space-y-2">
            {summary.categories.map((category) => {
              const percentage = maxValue > 0 ? (category.value / maxValue) * 100 : 0;

              return (
                <div key={category.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[rgb(var(--text-secondary))] dark:text-white/60 truncate">
                      {category.category}
                    </span>
                    <span className="text-[rgb(var(--text-primary))] dark:text-white font-medium ml-2">
                      {formatCurrency(category.value)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
