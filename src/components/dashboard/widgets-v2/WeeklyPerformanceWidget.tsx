'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface WeeklyPerformanceWidgetProps {
  siteId: string;
  companyId: string;
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export default function WeeklyPerformanceWidget({ siteId, companyId }: WeeklyPerformanceWidgetProps) {
  const [data, setData] = useState<{
    totalRevenue: number;
    daysCompleted: number;
    gpPct: number;
    labourPct: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId || !companyId) return;

    async function load() {
      setLoading(true);
      const monday = getMonday(new Date());

      const { data: rollup } = await supabase
        .rpc('forecastly_weekly_rollup', {
          p_site_id: siteId,
          p_week_commencing: monday,
        });

      if (rollup) {
        const totalRev = (rollup.total_food_revenue || 0) + (rollup.total_bev_revenue || 0);
        const netRev = totalRev / 1.2;
        const labourPct = netRev > 0 ? ((rollup.total_labour_cost || 0) / netRev) * 100 : 0;

        setData({
          totalRevenue: totalRev,
          daysCompleted: rollup.days_with_data || 0,
          gpPct: rollup.avg_gp_pct || 0,
          labourPct,
        });
      } else {
        setData(null);
      }
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [siteId, companyId]);

  if (loading) {
    return <div className="h-24 rounded bg-white/[0.03] animate-pulse" />;
  }

  if (!data) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-theme-tertiary">No weekly data yet</p>
        <Link href="/dashboard/forecastly" className="text-[10px] text-forecastly-mid hover:underline">
          Set up Forecastly
        </Link>
      </div>
    );
  }

  return (
    <Link href="/dashboard/forecastly/performance" className="block">
      <p className="text-xs text-theme-tertiary">This Week (WTD)</p>
      <p className="text-xl font-medium text-forecastly-dark dark:text-forecastly mt-1">
        {formatCurrency(data.totalRevenue)}
      </p>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="text-theme-tertiary">{data.daysCompleted}/7 days</span>
        <span className={data.gpPct >= 70 ? 'text-emerald-400' : data.gpPct >= 65 ? 'text-amber-400' : 'text-red-400'}>
          GP {data.gpPct.toFixed(1)}%
        </span>
        <span className={data.labourPct <= 30 ? 'text-emerald-400' : data.labourPct <= 35 ? 'text-amber-400' : 'text-red-400'}>
          Lab {data.labourPct.toFixed(1)}%
        </span>
      </div>
    </Link>
  );
}
