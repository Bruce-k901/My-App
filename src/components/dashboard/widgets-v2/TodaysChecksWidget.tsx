'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, ProgressBar, MiniItem } from '../WidgetCard';
import { useWidgetSize } from '../WidgetSizeContext';
import { supabase } from '@/lib/supabase';

interface TodaysChecksWidgetProps {
  siteId: string;
  companyId: string;
}

interface TodayCheck {
  id: string;
  name: string;
  status: string;
  dueTime: string | null;
}

/**
 * TodaysChecksWidget - Shows progress of today's checks with task list
 */
export default function TodaysChecksWidget({ siteId, companyId }: TodaysChecksWidgetProps) {
  const [checks, setChecks] = useState<TodayCheck[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchTodaysChecks() {
      try {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
          .from('checklist_tasks')
          .select(`
            id,
            status,
            due_time,
            custom_name,
            template:task_templates(name)
          `)
          .eq('company_id', companyId)
          .eq('due_date', today)
          .order('due_time', { ascending: true, nullsFirst: false })
          .limit(10);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const formattedChecks: TodayCheck[] = (data || []).map((task: any) => ({
          id: task.id,
          name: task.custom_name || task.template?.name || 'Unknown Task',
          status: task.status,
          dueTime: task.due_time ? task.due_time.slice(0, 5) : null,
        }));

        setChecks(formattedChecks);

        // Get totals
        let statsQuery = supabase
          .from('checklist_tasks')
          .select('status')
          .eq('company_id', companyId)
          .eq('due_date', today);

        if (siteId && siteId !== 'all') {
          statsQuery = statsQuery.eq('site_id', siteId);
        }

        const { data: allTasks } = await statsQuery;

        if (allTasks) {
          setTotalCount(allTasks.length);
          setDoneCount(allTasks.filter((t: any) => t.status === 'completed').length);
        }
      } catch (err) {
        console.error('Error fetching today\'s checks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTodaysChecks();
  }, [companyId, siteId]);

  const { maxItems } = useWidgetSize();

  if (loading) {
    return (
      <WidgetCard title="Today's Checks" module="checkly" viewAllHref="/dashboard/todays_tasks">
        <div className="animate-pulse space-y-2">
          <div className="h-2 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/2" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Today's Checks" module="checkly" viewAllHref="/dashboard/todays_tasks">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No checks scheduled for today</div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Today's Checks" module="checkly" viewAllHref="/dashboard/todays_tasks">
      <ProgressBar done={doneCount} total={totalCount} color="bg-teamly" />
      <div className="mt-2">
        {checks.slice(0, maxItems).map((check) => (
          <MiniItem
            key={check.id}
            text={check.name}
            sub={check.status === 'completed' ? '✓ Done' : check.dueTime ? `Due ${check.dueTime}` : 'Pending'}
            status={check.status === 'completed' ? 'good' : 'neutral'}
            href="/dashboard/todays_tasks"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
