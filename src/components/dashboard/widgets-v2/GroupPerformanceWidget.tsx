'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import type { MultiSiteRollup } from '@/types/forecastly';

interface GroupPerformanceWidgetProps {
  siteId: string;
  companyId: string;
}

function formatCurrency(v: number) {
  return v.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function GroupPerformanceWidget({ siteId, companyId }: GroupPerformanceWidgetProps) {
  const [sites, setSites] = useState<MultiSiteRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMultiSite, setIsMultiSite] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    async function load() {
      setLoading(true);

      // Check if company has multiple sites
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      if (!count || count <= 1) {
        setIsMultiSite(false);
        setLoading(false);
        return;
      }

      setIsMultiSite(true);

      // Get this week's date range
      const now = new Date();
      const day = now.getDay();
      const mondayDiff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(monday.getDate() + mondayDiff);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const { data: rollup } = await supabase
        .rpc('forecastly_multisite_rollup', {
          p_company_id: companyId,
          p_start_date: monday.toISOString().split('T')[0],
          p_end_date: sunday.toISOString().split('T')[0],
        });

      setSites(Array.isArray(rollup) ? rollup.slice(0, 5) : []);
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [companyId]);

  // Hidden for single-site companies
  if (!isMultiSite && !loading) return null;

  if (loading) {
    return <div className="h-32 rounded bg-white/[0.03] animate-pulse" />;
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-theme-tertiary">No multi-site data yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-theme-tertiary">This Week — All Sites</p>
        <Link href="/dashboard/forecastly/group" className="text-[10px] text-forecastly-mid hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-1.5">
        {sites.map((site, i) => (
          <div key={site.site_id} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] text-theme-tertiary w-4">{i + 1}</span>
              <span className="text-xs text-theme-primary truncate">{site.site_name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="text-forecastly-dark dark:text-forecastly font-medium">
                {formatCurrency(site.total_revenue)}
              </span>
              <span className={site.revenue_vs_budget_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {site.revenue_vs_budget_pct >= 0 ? '+' : ''}{site.revenue_vs_budget_pct.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
