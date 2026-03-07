'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface LabourAlertWidgetProps {
  siteId: string;
  companyId: string;
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function LabourAlertWidget({ siteId, companyId }: LabourAlertWidgetProps) {
  const [data, setData] = useState<{
    labourPct: number;
    labourCost: number;
    budgetTarget: number;
    status: 'green' | 'amber' | 'red';
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId || !companyId) return;

    async function load() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data: actual } = await supabase
        .from('forecastly_actuals')
        .select('labour_cost_foh, labour_cost_boh, lunch_food_revenue, lunch_bev_revenue, dinner_food_revenue, dinner_bev_revenue, pdr_food_revenue, pdr_bev_revenue')
        .eq('site_id', siteId)
        .eq('date', today)
        .single();

      if (actual) {
        const totalRevenue =
          (actual.lunch_food_revenue || 0) + (actual.lunch_bev_revenue || 0) +
          (actual.dinner_food_revenue || 0) + (actual.dinner_bev_revenue || 0) +
          (actual.pdr_food_revenue || 0) + (actual.pdr_bev_revenue || 0);
        const netRevenue = totalRevenue / 1.2;
        const labourCost = (actual.labour_cost_foh || 0) + (actual.labour_cost_boh || 0);
        const labourPct = netRevenue > 0 ? (labourCost / netRevenue) * 100 : 0;

        setData({
          labourPct,
          labourCost,
          budgetTarget: 30, // Default — will come from locked budget
          status: labourPct <= 30 ? 'green' : labourPct <= 35 ? 'amber' : 'red',
        });
      } else {
        setData(null);
      }
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [siteId, companyId]);

  if (loading) {
    return <div className="h-20 rounded bg-white/[0.03] animate-pulse" />;
  }

  if (!data) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-theme-tertiary">No labour data today</p>
      </div>
    );
  }

  const statusColour = {
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', indicator: 'bg-emerald-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', indicator: 'bg-amber-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', indicator: 'bg-red-400' },
  }[data.status];

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-theme-tertiary">Today&apos;s Labour</p>
        <span className={`w-2 h-2 rounded-full ${statusColour.indicator}`} />
      </div>
      <p className={`text-xl font-medium mt-1 ${statusColour.text}`}>
        {data.labourPct.toFixed(1)}%
      </p>
      <p className="text-xs text-theme-tertiary mt-1">
        {formatCurrency(data.labourCost)} · Target: {data.budgetTarget}%
      </p>
      {data.status === 'red' && (
        <Link
          href="/dashboard/people/schedule"
          className="text-[10px] text-red-400 hover:underline mt-1 block"
        >
          Review rota &rarr;
        </Link>
      )}
    </div>
  );
}
