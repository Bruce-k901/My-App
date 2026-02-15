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

    async function fetchData() {
      try {
        // Build 7-day range
        const days: { date: string; label: string }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push({
            date: d.toISOString().split('T')[0],
            label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
          });
        }

        const startDate = days[0].date;
        const endDate = days[days.length - 1].date;

        // Site filtering: planly_orders -> customer_id -> planly_customers.site_id
        let customerIds: string[] | null = null;
        if (siteId && siteId !== 'all') {
          const { data: customers } = await supabase
            .from('planly_customers')
            .select('id')
            .eq('site_id', siteId)
            .eq('is_active', true);
          customerIds = (customers || []).map((c: any) => c.id);
          if (customerIds.length === 0) {
            setData(days.map((d) => ({ label: d.label, completed: 0, total: 0 })));
            setLoading(false);
            return;
          }
        }

        // Query orders in range
        let ordersQuery = supabase
          .from('planly_orders')
          .select('id, delivery_date, status')
          .gte('delivery_date', startDate)
          .lte('delivery_date', endDate)
          .neq('status', 'cancelled');

        if (customerIds) {
          ordersQuery = ordersQuery.in('customer_id', customerIds);
        }

        const { data: orders, error: ordersError } = await ordersQuery;

        if (ordersError || !orders || orders.length === 0) {
          setData(days.map((d) => ({ label: d.label, completed: 0, total: 0 })));
          setLoading(false);
          return;
        }

        // Fetch order lines
        const orderIds = orders.map((o: any) => o.id);
        const { data: lines } = await supabase
          .from('planly_order_lines')
          .select('order_id, quantity, is_locked')
          .in('order_id', orderIds);

        // Map order_id -> delivery_date
        const orderDateMap = new Map<string, string>();
        orders.forEach((o: any) => orderDateMap.set(o.id, o.delivery_date));

        // Aggregate by date
        const dateAgg = new Map<string, { total: number; completed: number }>();
        days.forEach((d) => dateAgg.set(d.date, { total: 0, completed: 0 }));

        (lines || []).forEach((line: any) => {
          const date = orderDateMap.get(line.order_id);
          if (!date || !dateAgg.has(date)) return;
          const agg = dateAgg.get(date)!;
          agg.total += line.quantity || 0;
          if (line.is_locked) {
            agg.completed += line.quantity || 0;
          }
        });

        const chartData: DayData[] = days.map((d) => ({
          label: d.label,
          total: dateAgg.get(d.date)?.total || 0,
          completed: dateAgg.get(d.date)?.completed || 0,
        }));

        setData(chartData);
      } catch (err) {
        console.error('Error fetching production output:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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
