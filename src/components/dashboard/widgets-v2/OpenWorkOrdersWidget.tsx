'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';
import { OPEN_STATUSES, PRIORITY_CONFIG } from '@/types/rm';

interface OpenWorkOrdersWidgetProps {
  siteId: string;
  companyId: string;
}

interface OpenWO {
  id: string;
  wo_number: string;
  title: string;
  priority: string;
  daysOpen: number;
}

export default function OpenWorkOrdersWidget({ siteId, companyId }: OpenWorkOrdersWidgetProps) {
  const [workOrders, setWorkOrders] = useState<OpenWO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [p1Count, setP1Count] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }

    async function fetchOpenWOs() {
      try {
        let query = supabase
          .from('work_orders')
          .select('id, wo_number, title, priority, created_at')
          .eq('company_id', companyId)
          .in('status', OPEN_STATUSES)
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') { setLoading(false); return; }
          throw error;
        }

        const now = new Date();
        const formatted: OpenWO[] = (data || []).map((wo: any) => {
          const createdDate = new Date(wo.created_at);
          const daysOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: wo.id,
            wo_number: wo.wo_number,
            title: wo.title,
            priority: wo.priority,
            daysOpen,
          };
        });

        setWorkOrders(formatted);
        setTotalCount(data?.length || 0);
        setP1Count((data || []).filter((wo: any) => wo.priority === 'P1').length);

        // Get exact total count
        let countQuery = supabase
          .from('work_orders')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', OPEN_STATUSES);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        if (count !== null) setTotalCount(count);
      } catch (err) {
        console.error('Error fetching open work orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOpenWOs();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Open Work Orders" module="assetly" viewAllHref="/dashboard/assets/rm/work-orders">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Open Work Orders" module="assetly" viewAllHref="/dashboard/assets/rm/work-orders">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-module-fg" />
          </div>
          <span className="text-module-fg text-xs">No open work orders</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Open Work Orders" module="assetly" viewAllHref="/dashboard/assets/rm/work-orders">
      <CountBadge count={totalCount} label="open" status={p1Count > 0 ? 'urgent' : 'warning'} />
      <div className="mt-2">
        {workOrders.slice(0, maxItems).map((wo) => {
          const cfg = PRIORITY_CONFIG[wo.priority as keyof typeof PRIORITY_CONFIG];
          return (
            <MiniItem
              key={wo.id}
              text={`${wo.wo_number} — ${wo.title}`}
              sub={`${cfg?.label || wo.priority} · ${wo.daysOpen}d open`}
              status={wo.priority === 'P1' ? 'urgent' : wo.priority === 'P2' ? 'warning' : 'neutral'}
              href="/dashboard/assets/rm/work-orders"
            />
          );
        })}
      </div>
    </WidgetCard>
  );
}
