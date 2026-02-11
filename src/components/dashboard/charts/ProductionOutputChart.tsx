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
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';
import { ChartWidgetCard, ChartWidgetSkeleton } from './ChartWidgetCard';

interface ProductionOutputChartProps {
  siteId: string;
  companyId: string;
}

interface DayData {
  label: string;
  completed: number;
  total: number;
}

export default function ProductionOutputChart({ siteId, companyId }: ProductionOutputChartProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // planly_production_tasks table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) return <ChartWidgetSkeleton />;

  if (data.every((d) => d.total === 0)) {
    return (
      <ChartWidgetCard title="Production Output" module="planly" viewAllHref="/dashboard/planly/production-plan">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No production data available
        </div>
      </ChartWidgetCard>
    );
  }

  return (
    <ChartWidgetCard title="Production Output" module="planly" viewAllHref="/dashboard/planly/production-plan">
      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis
            dataKey="label"
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
            interval={2}
          />
          <YAxis
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
          />
          <Bar
            dataKey="total"
            fill="rgba(251,146,60,0.2)"
            radius={[4, 4, 0, 0]}
            name="Total"
          />
          <Bar
            dataKey="completed"
            fill="#FB923C"
            radius={[4, 4, 0, 0]}
            name="Completed"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWidgetCard>
  );
}
