'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface StockValueWidgetProps {
  siteId: string;
  companyId: string;
}

interface CategoryValue {
  id: string;
  name: string;
  formattedValue: string;
  rawValue: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * StockValueWidget - Shows total stock value with top categories
 */
export default function StockValueWidget({ siteId, companyId }: StockValueWidgetProps) {
  const [categories, setCategories] = useState<CategoryValue[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchStockValue() {
      try {
        // Query stock_levels (has site_id but no company_id)
        let levelsQuery = supabase
          .from('stock_levels')
          .select('stock_item_id, quantity, avg_cost, total_value');

        if (siteId && siteId !== 'all') {
          levelsQuery = levelsQuery.eq('site_id', siteId);
        }

        const { data: levels, error: levelsError } = await levelsQuery;

        if (levelsError || !levels || levels.length === 0) {
          setLoading(false);
          return;
        }

        // Get stock items for company_id filtering + category_id
        const itemIds = [...new Set(levels.map((l: any) => l.stock_item_id).filter(Boolean))];
        const itemMap = new Map<string, { name: string; category_id: string | null }>();
        if (itemIds.length > 0) {
          const { data: items } = await supabase
            .from('stock_items')
            .select('id, name, category_id')
            .eq('company_id', companyId)
            .in('id', itemIds);
          (items || []).forEach((si: any) =>
            itemMap.set(si.id, { name: si.name, category_id: si.category_id })
          );
        }

        // Filter to only items belonging to this company
        const companyLevels = levels.filter((l: any) => itemMap.has(l.stock_item_id));

        if (companyLevels.length === 0) {
          setLoading(false);
          return;
        }

        // Get category names
        const categoryIds = [
          ...new Set(
            companyLevels
              .map((l: any) => itemMap.get(l.stock_item_id)?.category_id)
              .filter(Boolean)
          ),
        ];
        const categoryMap = new Map<string, string>();
        if (categoryIds.length > 0) {
          const { data: cats } = await supabase
            .from('stock_categories')
            .select('id, name')
            .eq('company_id', companyId)
            .in('id', categoryIds as string[]);
          (cats || []).forEach((c: any) => categoryMap.set(c.id, c.name));
        }

        // Aggregate by category
        const catTotals = new Map<string, number>();
        let total = 0;
        companyLevels.forEach((l: any) => {
          const itemValue = l.total_value || (l.quantity || 0) * (l.avg_cost || 0);
          total += itemValue;
          const catId = itemMap.get(l.stock_item_id)?.category_id || 'uncategorized';
          catTotals.set(catId, (catTotals.get(catId) || 0) + itemValue);
        });

        // Top 3 categories
        const sorted = Array.from(catTotals.entries())
          .map(([catId, value]) => ({
            id: catId,
            name: categoryMap.get(catId) || 'Uncategorized',
            formattedValue: formatCurrency(value),
            rawValue: value,
          }))
          .sort((a, b) => b.rawValue - a.rawValue)
          .slice(0, 3);

        setCategories(sorted);
        setTotalValue(total);
      } catch (err) {
        console.error('Error fetching stock value:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStockValue();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Stock Value" module="stockly" viewAllHref="/dashboard/stockly">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalValue === 0) {
    return (
      <WidgetCard title="Stock Value" module="stockly" viewAllHref="/dashboard/stockly">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No stock value data</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Stock Value" module="stockly" viewAllHref="/dashboard/stockly">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[22px] font-bold text-[rgb(var(--text-primary))]">
          {formatCurrency(totalValue)}
        </span>
        <span className="text-[11px] text-[rgb(var(--text-disabled))]">total at cost</span>
      </div>
      <div>
        {categories.map((cat) => (
          <MiniItem
            key={cat.id}
            text={cat.name}
            sub={cat.formattedValue}
            status="neutral"
            href="/dashboard/stockly"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
