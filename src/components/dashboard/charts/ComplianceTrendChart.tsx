'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useChartTheme } from '@/hooks/dashboard/useChartTheme';
import { ChartWidgetCard, ChartWidgetSkeleton } from './ChartWidgetCard';

interface ComplianceTrendChartProps {
  siteId: string;
  companyId: string;
}

interface DayData {
  date: string;
  label: string;
  score: number;
}

export default function ComplianceTrendChart({ siteId, companyId }: ComplianceTrendChartProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const ct = useChartTheme();

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 13);

        let query = supabase
          .from('checklist_tasks')
          .select('due_date, status')
          .eq('company_id', companyId)
          .gte('due_date', startDate.toISOString().split('T')[0])
          .lte('due_date', endDate.toISOString().split('T')[0]);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data: tasks, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        // Group by date
        const byDate: Record<string, { done: number; total: number }> = {};
        (tasks || []).forEach((t: any) => {
          if (!byDate[t.due_date]) byDate[t.due_date] = { done: 0, total: 0 };
          byDate[t.due_date].total++;
          if (t.status === 'completed') byDate[t.due_date].done++;
        });

        // Build 14 days of chart data
        const chartData: DayData[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const day = byDate[dateStr];
          const score = day && day.total > 0
            ? Math.round((day.done / day.total) * 100)
            : 0;

          chartData.push({
            date: dateStr,
            label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            score,
          });
        }

        setData(chartData);
      } catch (err) {
        console.error('Error fetching compliance trend:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  if (loading) return <ChartWidgetSkeleton />;

  if (data.length === 0) {
    return (
      <ChartWidgetCard title="Compliance Trend" module="checkly" viewAllHref="/dashboard/reports">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No compliance data available
        </div>
      </ChartWidgetCard>
    );
  }

  return (
    <ChartWidgetCard title="Compliance Trend" module="checkly" viewAllHref="/dashboard/reports">
      <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
          <XAxis
            dataKey="label"
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
            interval={2}
          />
          <YAxis
            domain={[0, 100]}
            stroke={ct.axis}
            tick={{ fontSize: 10, fill: ct.tick }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: ct.tooltipBg,
              border: `1px solid ${ct.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: ct.tooltipText,
            }}
            formatter={(value: number) => [`${value}%`, 'Compliance']}
          />
          <ReferenceLine
            y={90}
            stroke="#34D399"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#F472B6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#F472B6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWidgetCard>
  );
}
