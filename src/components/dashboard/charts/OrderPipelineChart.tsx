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
  draft: { label: 'Draft', color: '#94A3B8', order: 0 },
  confirmed: { label: 'Confirmed', color: '#FB923C', order: 1 },
  locked: { label: 'Locked', color: '#34D399', order: 2 },
  cancelled: { label: 'Cancelled', color: '#F87171', order: 3 },
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

    async function fetchData() {
      try {
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
            setLoading(false);
            return;
          }
        }

        // Query orders from last 30 days
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 30);

        let ordersQuery = supabase
          .from('planly_orders')
          .select('id, status')
          .gte('delivery_date', sinceDate.toISOString().split('T')[0]);

        if (customerIds) {
          ordersQuery = ordersQuery.in('customer_id', customerIds);
        }

        const { data: orders, error } = await ordersQuery;

        if (error) {
          console.error('Error fetching order pipeline:', error);
          setLoading(false);
          return;
        }

        // Count by status
        const counts = new Map<string, number>();
        (orders || []).forEach((o: any) => {
          counts.set(o.status, (counts.get(o.status) || 0) + 1);
        });

        // Build chart data for all statuses (show full pipeline)
        const chartData: StatusData[] = Object.entries(STATUS_CONFIG)
          .map(([status, config]) => ({
            status,
            label: config.label,
            count: counts.get(status) || 0,
            color: config.color,
          }))
          .sort((a, b) => STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order);

        setData(chartData);
      } catch (err) {
        console.error('Error fetching order pipeline:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  if (loading) return <ChartWidgetSkeleton />;

  if (data.length === 0) {
    return (
      <ChartWidgetCard title="Order Pipeline" module="planly" viewAllHref="/dashboard/planly/order-book">
        <div className="flex items-center justify-center h-full text-[rgb(var(--text-disabled))] text-xs">
          No orders this month
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
