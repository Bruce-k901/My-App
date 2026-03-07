'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface RMSpendWidgetProps {
  siteId: string;
  companyId: string;
}

export default function RMSpendWidget({ siteId, companyId }: RMSpendWidgetProps) {
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [woCount, setWoCount] = useState(0);
  const [spendByType, setSpendByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }

    async function fetchSpend() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const monthStart = `${today.substring(0, 7)}-01`;

        let query = supabase
          .from('work_orders')
          .select('actual_cost, wo_type')
          .eq('company_id', companyId)
          .gte('created_at', monthStart)
          .not('actual_cost', 'is', null);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') { setLoading(false); return; }
          throw error;
        }

        const rows = data || [];
        const total = rows.reduce((sum: number, wo: any) => sum + (wo.actual_cost || 0), 0);
        const byType: Record<string, number> = {};
        for (const wo of rows) {
          byType[wo.wo_type] = (byType[wo.wo_type] || 0) + (wo.actual_cost || 0);
        }

        setMonthlySpend(total);
        setWoCount(rows.length);
        setSpendByType(byType);
      } catch (err) {
        console.error('Error fetching R&M spend:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSpend();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="R&M Monthly Spend" module="assetly" viewAllHref="/dashboard/assets/rm/costs">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </WidgetCard>
    );
  }

  if (woCount === 0) {
    return (
      <WidgetCard title="R&M Monthly Spend" module="assetly" viewAllHref="/dashboard/assets/rm/costs">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-module-fg" />
          </div>
          <span className="text-module-fg text-xs">No spend recorded this month</span>
        </div>
      </WidgetCard>
    );
  }

  const topTypes = Object.entries(spendByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxSpend = topTypes.length > 0 ? topTypes[0][1] : 1;

  return (
    <WidgetCard title="R&M Monthly Spend" module="assetly" viewAllHref="/dashboard/assets/rm/costs">
      <div className="mb-2">
        <p className="text-2xl font-bold text-theme-primary">
          £{monthlySpend.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-theme-tertiary">{woCount} work order{woCount !== 1 ? 's' : ''} this month</p>
      </div>
      {topTypes.length > 0 && (
        <div className="space-y-1.5 mt-3">
          {topTypes.map(([type, amount]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="text-xs text-theme-tertiary w-16 truncate capitalize">{type}</span>
              <div className="flex-1 h-1.5 bg-theme-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-assetly-dark dark:bg-assetly rounded-full"
                  style={{ width: `${(amount / maxSpend) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-theme-primary w-14 text-right">
                £{amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
