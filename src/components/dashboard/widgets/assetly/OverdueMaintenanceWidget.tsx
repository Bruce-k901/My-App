'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OverdueMaintenance {
  id: string;
  asset_name: string;
  task_name: string;
  due_date: string;
  days_overdue: number;
}

export default function OverdueMaintenanceWidget({ companyId, siteId }: WidgetProps) {
  const [tasks, setTasks] = useState<OverdueMaintenance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.assetly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchOverdueMaintenance() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch overdue ppm_schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('ppm_schedules')
          .select('id, asset_id, next_due_date, task_type, description')
          .lt('next_due_date', today);

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

        let assetsQuery = supabase
          .from('assets')
          .select('id, name, site_id, sites!inner(company_id)')
          .in('id', assetIds);

        const { data: assets, error: assetsError } = await assetsQuery;

        if (assetsError) throw assetsError;

        // Filter by company and optionally by site
        const filteredAssets = (assets || []).filter((a: any) => {
          if (a.sites?.company_id !== companyId) return false;
          if (siteId && siteId !== 'all' && a.site_id !== siteId) return false;
          return true;
        });

        const assetMap = new Map(filteredAssets.map((a: any) => [a.id, a]));

        const todayDate = new Date();
        const formattedTasks: OverdueMaintenance[] = schedules
          .filter((task: any) => assetMap.has(task.asset_id))
          .map((task: any) => {
            const asset = assetMap.get(task.asset_id);
            const dueDate = new Date(task.next_due_date);
            const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
              id: task.id,
              asset_name: asset?.name || 'Unknown Asset',
              task_name: task.task_type || task.description || 'Maintenance',
              due_date: task.next_due_date,
              days_overdue: daysOverdue,
            };
          })
          .sort((a: OverdueMaintenance, b: OverdueMaintenance) => b.days_overdue - a.days_overdue)
          .slice(0, 5);

        setTasks(formattedTasks);
        setTotalCount(formattedTasks.length > 5 ? schedules.filter((s: any) => assetMap.has(s.asset_id)).length : formattedTasks.length);
      } catch (err) {
        console.error('Error fetching overdue maintenance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverdueMaintenance();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  return (
    <WidgetCard
      title="Overdue Maintenance"
      icon={
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-500/10">
          <Wrench className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/assets/maintenance"
    >
      {tasks.length === 0 ? (
        <WidgetEmptyState
          icon={<Wrench className="w-8 h-8" />}
          message="No overdue maintenance - great!"
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/assets/maintenance/${task.id}`}
              className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {task.asset_name}
                </p>
                <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 truncate">
                  {task.task_name}
                </p>
              </div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400 ml-2 flex-shrink-0">
                {task.days_overdue}d overdue
              </span>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
