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

interface OrderPipelineChartProps {
  siteId: string;
  companyId: string;
}

interface StatusData {
  status: string;
  label: string;
  count: number;
  color: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  pending: { label: 'Pending', color: '#FB923C', order: 0 },
  confirmed: { label: 'Confirmed', color: '#FDBA74', order: 1 },
  in_production: { label: 'In Production', color: '#F97316', order: 2 },
  ready: { label: 'Ready', color: '#34D399', order: 3 },
  delivered: { label: 'Delivered', color: '#10B981', order: 4 },
  completed: { label: 'Completed', color: '#059669', order: 5 },
};

export default function OrderPipelineChart({ siteId, companyId }: OrderPipelineChartProps) {
  const [data, setData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // planly_customer_orders table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) return <ChartWidgetSkeleton />;

  if (data.length === 0) {
    return (
      <ChartWidgetCard title="Order Pipeline" module="planly" viewAllHref="/dashboard/planly/order-book">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No orders this week
        </div>
      </ChartWidgetCard>
    );
  }

  return (
    <ChartWidgetCard title="Order Pipeline" module="planly" viewAllHref="/dashboard/planly/order-book">
      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis
            dataKey="label"
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
          />
          <YAxis
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: ct.tooltipText,
            }}
            formatter={(value: number) => [value, 'Orders']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Orders">
            {data.map((item, index) => (
              <Cell key={index} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWidgetCard>
  );
}
