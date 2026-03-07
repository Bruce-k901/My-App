'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';
import { ChartWidgetCard, ChartWidgetSkeleton } from './ChartWidgetCard';

interface StockHealthChartProps {
  siteId: string;
  companyId: string;
}

interface StockItem {
  name: string;
  fillPercent: number;
}

function getBarColor(percent: number): string {
  if (percent > 50) return '#34D399'; // emerald
  if (percent > 25) return '#60A5FA'; // blue
  return '#F472B6'; // blush
}

export default function StockHealthChart({ siteId, companyId }: StockHealthChartProps) {
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        let query = supabase
          .from('stock_levels')
          .select('stock_item_id, quantity');

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: levels, error } = await query;

        if (error) {
          console.error('Stock levels query error:', error);
          setLoading(false);
          return;
        }

        if (!levels || levels.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch stock item details separately (FK to view doesn't support joins)
        const itemIds = [...new Set(levels.map((l: any) => l.stock_item_id).filter(Boolean))];
        const itemMap = new Map<string, { name: string; par_level: number }>();
        if (itemIds.length > 0) {
          const { data: stockItems } = await supabase
            .from('stock_items')
            .select('id, name, par_level')
            .eq('company_id', companyId)
            .in('id', itemIds);
          (stockItems || []).forEach((si: any) => itemMap.set(si.id, { name: si.name, par_level: si.par_level || 0 }));
        }

        // Calculate fill percentages — only items with par_level set, sort by urgency
        const items: StockItem[] = levels
          .filter((l: any) => {
            const si = itemMap.get(l.stock_item_id);
            return si && si.par_level > 0;
          })
          .map((l: any) => {
            const stockItem = itemMap.get(l.stock_item_id)!;
            const parLevel = stockItem.par_level;
            const current = l.quantity || 0;
            // Fill percent relative to 2x par level (full = double the par)
            const fillPercent = Math.min(Math.round((current / (parLevel * 2)) * 100), 100);
            return {
              name: stockItem?.name?.substring(0, 18) || 'Unknown',
              fillPercent,
            };
          })
          .sort((a: StockItem, b: StockItem) => a.fillPercent - b.fillPercent)
          .slice(0, 8);

        setData(items);
      } catch (err) {
        console.error('Error fetching stock health:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  if (loading) return <ChartWidgetSkeleton />;

  if (data.length === 0) {
    return (
      <ChartWidgetCard title="Stock Health" module="stockly" viewAllHref="/dashboard/stockly">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No stock data available
        </div>
      </ChartWidgetCard>
    );
  }

  return (
    <ChartWidgetCard title="Stock Health" module="stockly" viewAllHref="/dashboard/stockly">
      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: ct.tooltipText,
            }}
            formatter={(value: number) => [`${value}%`, 'Stock Level']}
          />
          <Bar dataKey="fillPercent" radius={[0, 4, 4, 0]} name="Stock Level">
            {data.map((item, index) => (
              <Cell key={index} fill={getBarColor(item.fillPercent)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWidgetCard>
  );
}
