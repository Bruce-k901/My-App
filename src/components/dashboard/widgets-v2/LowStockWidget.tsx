'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface LowStockWidgetProps {
  siteId: string;
  companyId: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: string;
  isCritical: boolean;
}

/**
 * LowStockWidget - Shows items below reorder level
 */
export default function LowStockWidget({ siteId, companyId }: LowStockWidgetProps) {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchLowStock() {
      try {
        // Query stock_levels view (public view over stockly.stock_levels)
        let query = supabase
          .from('stock_levels')
          .select('id, stock_item_id, quantity')

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist yet (42P01) or other query error — degrade gracefully
          setLoading(false);
          return;
        }

        // Fetch stock item details separately (FK to view doesn't support joins)
        const itemIds = [...new Set((data || []).map((sl: any) => sl.stock_item_id).filter(Boolean))];
        const itemMap = new Map<string, { name: string; par_level: number }>();
        if (itemIds.length > 0) {
          const { data: items } = await supabase
            .from('stock_items')
            .select('id, name, par_level')
            .eq('company_id', companyId)
            .in('id', itemIds);
          (items || []).forEach((si: any) => itemMap.set(si.id, { name: si.name, par_level: si.par_level || 0 }));
        }

        // Filter items below par level (reorder level)
        const lowItems = (data || []).filter((item: any) => {
          const stockItem = itemMap.get(item.stock_item_id);
          const parLevel = stockItem?.par_level || 0;
          return parLevel > 0 && item.quantity < parLevel;
        });

        const formatted: LowStockItem[] = lowItems.slice(0, 3).map((item: any) => {
          const stockItem = itemMap.get(item.stock_item_id);
          return {
            id: item.id,
            name: stockItem?.name || 'Unknown Item',
            quantity: `${item.quantity || 0} left`,
            isCritical: item.quantity <= 0 || item.quantity < (stockItem?.par_level || 0) * 0.5,
          };
        });

        setItems(formatted);
        setTotalCount(lowItems.length);
      } catch (err) {
        console.error('Error fetching low stock:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLowStock();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Low Stock Alerts" module="stockly" viewAllHref="/dashboard/stockly/stock-items">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Low Stock Alerts" module="stockly" viewAllHref="/dashboard/stockly/stock-items">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-emerald-400 text-xs">Stock levels are healthy</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Low Stock Alerts" module="stockly" viewAllHref="/dashboard/stockly/stock-items">
      <CountBadge count={totalCount} label="items below reorder" status="warning" />
      <div className="mt-2">
        {items.map((item) => (
          <MiniItem
            key={item.id}
            text={item.name}
            sub={item.quantity}
            status={item.isCritical ? 'urgent' : 'warning'}
            href="/dashboard/stockly/stock-items"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
