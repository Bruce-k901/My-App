'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
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
        // Query stock_levels view/table for items below reorder level
        let query = supabase
          .from('stock_levels')
          .select(`
            id,
            stock_item_id,
            current_quantity,
            stock_item:stock_items(id, name, unit, reorder_level)
          `)
          .eq('company_id', companyId);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('stock_levels table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        // Filter items below reorder level
        const lowItems = (data || []).filter((item: any) => {
          const reorderLevel = item.stock_item?.reorder_level || 0;
          return item.current_quantity < reorderLevel;
        });

        const formatted: LowStockItem[] = lowItems.slice(0, 3).map((item: any) => ({
          id: item.id,
          name: item.stock_item?.name || 'Unknown Item',
          quantity: `${item.current_quantity || 0} ${item.stock_item?.unit || ''} left`.trim(),
          isCritical: item.current_quantity <= 0 || item.current_quantity < (item.stock_item?.reorder_level || 0) * 0.5,
        }));

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
          <div className="h-8 bg-white/5 rounded w-24" />
          <div className="h-3 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
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
          />
        ))}
      </div>
    </WidgetCard>
  );
}
