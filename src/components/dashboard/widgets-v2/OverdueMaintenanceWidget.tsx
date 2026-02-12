'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface OverdueMaintenanceWidgetProps {
  siteId: string;
  companyId: string;
}

interface OverdueMaintenance {
  id: string;
  assetName: string;
  taskName: string;
  daysOverdue: number;
}

/**
 * OverdueMaintenanceWidget - Shows overdue PPM maintenance tasks
 */
export default function OverdueMaintenanceWidget({ siteId, companyId }: OverdueMaintenanceWidgetProps) {
  const [tasks, setTasks] = useState<OverdueMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchOverdueMaintenance() {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Fetch overdue ppm_schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('ppm_schedules')
          .select('id, asset_id, next_due_date, task_type, description')
          .lt('next_due_date', todayStr);

        if (schedulesError) {
          if (schedulesError.code === '42P01') {
            console.debug('ppm_schedules table not available');
            setLoading(false);
            return;
          }
          throw schedulesError;
        }

        if (!schedules || schedules.length === 0) {
          setTasks([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        // Get asset IDs and fetch assets with site filtering
        const assetIds = [...new Set(schedules.map((s: any) => s.asset_id).filter(Boolean))];

        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, site_id, sites!inner(company_id)')
          .in('id', assetIds);

        if (assetsError) throw assetsError;

        // Filter by company and optionally by site
        const filteredAssets = (assets || []).filter((a: any) => {
          if (a.sites?.company_id !== companyId) return false;
          if (siteId && siteId !== 'all' && a.site_id !== siteId) return false;
          return true;
        });

        const assetMap = new Map(filteredAssets.map((a: any) => [a.id, a]));

        const formatted: OverdueMaintenance[] = schedules
          .filter((task: any) => assetMap.has(task.asset_id))
          .map((task: any) => {
            const asset = assetMap.get(task.asset_id);
            const dueDate = new Date(task.next_due_date);
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
              id: task.id,
              assetName: asset?.name || 'Unknown Asset',
              taskName: task.task_type || task.description || 'Maintenance',
              daysOverdue,
            };
          })
          .sort((a: OverdueMaintenance, b: OverdueMaintenance) => b.daysOverdue - a.daysOverdue)
          .slice(0, 3);

        setTasks(formatted);
        setTotalCount(schedules.filter((s: any) => assetMap.has(s.asset_id)).length);
      } catch (err) {
        console.error('Error fetching overdue maintenance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverdueMaintenance();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Overdue Maintenance" module="assetly" viewAllHref="/dashboard/assets">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Overdue Maintenance" module="assetly" viewAllHref="/dashboard/assets">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-module-fg/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-module-fg" />
          </div>
          <span className="text-module-fg text-xs">No overdue maintenance — great!</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Overdue Maintenance" module="assetly" viewAllHref="/dashboard/assets">
      <CountBadge count={totalCount} label="overdue task" status="urgent" />
      <div className="mt-2">
        {tasks.map((task) => (
          <MiniItem
            key={task.id}
            text={`${task.assetName} — ${task.taskName}`}
            sub={`${task.daysOverdue}d overdue`}
            status="urgent"
            href="/dashboard/assets"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
