'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, ProgressBar, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface TodaysProductionWidgetProps {
  siteId: string;
  companyId: string;
}

interface ProductionTask {
  id: string;
  name: string;
  status: string;
  quantity: number;
}

/**
 * TodaysProductionWidget - Shows production progress for today
 */
export default function TodaysProductionWidget({ siteId, companyId }: TodaysProductionWidgetProps) {
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchProduction() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Try production_tasks or planly_production_tasks
        let query = supabase
          .from('planly_production_tasks')
          .select(`
            id,
            status,
            quantity,
            product:planly_products(id, name)
          `)
          .eq('company_id', companyId)
          .eq('production_date', today)
          .order('created_at', { ascending: true })
          .limit(3);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            console.debug('planly_production_tasks table not available');
            setLoading(false);
            return;
          }
          throw error;
        }

        const formatted: ProductionTask[] = (data || []).map((task: any) => ({
          id: task.id,
          name: task.product?.name || 'Production Task',
          status: task.status || 'pending',
          quantity: task.quantity || 0,
        }));

        setTasks(formatted);

        // Get totals
        let statsQuery = supabase
          .from('planly_production_tasks')
          .select('status')
          .eq('company_id', companyId)
          .eq('production_date', today);

        if (siteId && siteId !== 'all') {
          statsQuery = statsQuery.eq('site_id', siteId);
        }

        const { data: allTasks } = await statsQuery;

        if (allTasks) {
          setTotalCount(allTasks.length);
          setDoneCount(allTasks.filter((t: any) => t.status === 'completed').length);
        }
      } catch (err) {
        console.error('Error fetching production:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduction();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
        <div className="animate-pulse space-y-2">
          <div className="h-2 bg-white/5 rounded" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
        <div className="text-center py-4">
          <div className="text-white/40 text-xs">No production scheduled for today</div>
        </div>
      </WidgetCard>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '✓ Done';
      case 'in_progress': return 'In progress';
      default: return 'Queued';
    }
  };

  const getStatusType = (status: string): 'good' | 'warning' | 'neutral' => {
    switch (status) {
      case 'completed': return 'good';
      case 'in_progress': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <WidgetCard title="Today's Production" module="planly" viewAllHref="/dashboard/planly/production-plan">
      <ProgressBar done={doneCount} total={totalCount} color="bg-orange-400" />
      <div className="mt-2">
        {tasks.map((task) => (
          <MiniItem
            key={task.id}
            text={`${task.name} (x${task.quantity})`}
            sub={getStatusLabel(task.status)}
            status={getStatusType(task.status)}
          />
        ))}
      </div>
    </WidgetCard>
  );
}
