'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  unit: string;
}

export default function LowStockAlertsWidget({ companyId, siteId }: WidgetProps) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.stockly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchLowStock() {
      try {
        // Try stock_levels view first, fall back to stock_items
        let query = supabase
          .from('stock_levels')
          .select('id, name, current_quantity, min_quantity, unit')
          .eq('company_id', companyId)
          .lt('current_quantity', supabase.raw('min_quantity'))
          .order('current_quantity', { ascending: true })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // If view doesn't exist, try alternative approach
          if (error.code === '42P01') {
            console.debug('stock_levels view not available');
            setItems([]);
            setTotalCount(0);
            setLoading(false);
            return;
          }
          throw error;
        }

        const formattedItems: LowStockItem[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.current_quantity || 0,
          min_quantity: item.min_quantity || 0,
          unit: item.unit || 'units',
        }));

        setItems(formattedItems);

        // Get total count
        let countQuery = supabase
          .from('stock_levels')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .lt('current_quantity', supabase.raw('min_quantity'));

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching low stock items:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLowStock();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  return (
    <WidgetCard
      title="Low Stock Alerts"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <AlertTriangle className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/stockly/stock-items?filter=low"
    >
      {items.length === 0 ? (
        <WidgetEmptyState
          icon={<Package className="w-8 h-8" />}
          message="All stock levels are healthy"
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const percentage = item.min_quantity > 0
              ? Math.round((item.quantity / item.min_quantity) * 100)
              : 0;

            return (
              <Link
                key={item.id}
                href={`/dashboard/stockly/stock-items/${item.id}`}
                className="block p-2 rounded-lg bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium ml-2 flex-shrink-0">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
                    Min: {item.min_quantity}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
