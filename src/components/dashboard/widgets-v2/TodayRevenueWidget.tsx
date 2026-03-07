'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TodayRevenueWidgetProps {
  siteId: string;
  companyId: string;
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function TodayRevenueWidget({ siteId, companyId }: TodayRevenueWidgetProps) {
  const [data, setData] = useState<{
    revenue: number;
    forecastRevenue: number;
    variancePct: number;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId || !companyId) return;

    async function load() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Try today first, fall back to yesterday
      let { data: actual } = await supabase
        .from('forecastly_actuals')
        .select('*')
        .eq('site_id', siteId)
        .eq('date', today)
        .single();

      let label = 'Today';

      if (!actual) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const { data: yesterdayActual } = await supabase
          .from('forecastly_actuals')
          .select('*')
          .eq('site_id', siteId)
          .eq('date', yesterdayStr)
          .single();
        actual = yesterdayActual;
        label = 'Yesterday';
      }

      if (actual) {
        const revenue =
          (actual.lunch_food_revenue || 0) + (actual.lunch_bev_revenue || 0) +
          (actual.dinner_food_revenue || 0) + (actual.dinner_bev_revenue || 0) +
          (actual.pdr_food_revenue || 0) + (actual.pdr_bev_revenue || 0);

        setData({
          revenue,
          forecastRevenue: 0, // TODO: fetch from forecast
          variancePct: actual.revenue_variance_pct || 0,
          label,
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
        <p className="text-xs text-theme-tertiary">No revenue data yet</p>
        <Link href="/dashboard/forecastly" className="text-[10px] text-forecastly-mid hover:underline">
          Set up Forecastly
        </Link>
      </div>
    );
  }

  const isPositive = data.variancePct >= 0;

  return (
    <Link href="/dashboard/forecastly/actuals" className="block">
      <p className="text-xs text-theme-tertiary">{data.label}&apos;s Revenue</p>
      <p className="text-xl font-medium text-forecastly-dark dark:text-forecastly mt-1">
        {formatCurrency(data.revenue)}
      </p>
      {data.variancePct !== 0 && (
        <p className={`text-xs mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{data.variancePct.toFixed(1)}% vs forecast
        </p>
      )}
      {/* Progress bar */}
      {data.forecastRevenue > 0 && (
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-forecastly-mid/40 rounded-full transition-all"
            style={{ width: `${Math.min((data.revenue / data.forecastRevenue) * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
