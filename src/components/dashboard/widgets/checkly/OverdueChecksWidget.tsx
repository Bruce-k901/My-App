'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { AlertTriangle, Clock } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OverdueTask {
  id: string;
  template_name: string;
  due_date: string;
  due_time: string | null;
  site_name?: string;
}

export default function OverdueChecksWidget({ companyId, siteId }: WidgetProps) {
  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.checkly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchOverdueTasks() {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        // Build query for overdue tasks
        let query = supabase
          .from('checklist_tasks')
          .select(`
            id,
            due_date,
            due_time,
            custom_name,
            template:task_templates(name),
            site:sites(name)
          `)
          .eq('company_id', companyId)
          .neq('status', 'completed')
          .or(`due_date.lt.${today},and(due_date.eq.${today},due_time.lt.${currentTime})`)
          .order('due_date', { ascending: true })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const formattedTasks: OverdueTask[] = (data || []).map((task: any) => ({
          id: task.id,
          template_name: task.custom_name || task.template?.name || 'Unknown Task',
          due_date: task.due_date,
          due_time: task.due_time,
          site_name: task.site?.name,
        }));

        setTasks(formattedTasks);

        // Get total count for badge
        let countQuery = supabase
          .from('checklist_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .neq('status', 'completed')
          .or(`due_date.lt.${today},and(due_date.eq.${today},due_time.lt.${currentTime})`);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count: total } = await countQuery;
        setTotalCount(total || 0);
      } catch (err) {
        console.error('Error fetching overdue tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverdueTasks();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatDueDate = (date: string, time: string | null) => {
    const dueDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return time ? `Today at ${time}` : 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <WidgetCard
      title="Overdue Checks"
      icon={
        <div className={cn('p-2 rounded-lg bg-red-100 dark:bg-red-500/10')}>
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
      }
      badge={
        totalCount > 0 && (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
            {totalCount}
          </span>
        )
      }
      viewAllHref="/dashboard/todays_tasks?filter=overdue"
    >
      {tasks.length === 0 ? (
        <WidgetEmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          message="No overdue checks - great work!"
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/dashboard/todays_tasks?task=${task.id}`}
              className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                  {task.template_name}
                </p>
                {siteId === 'all' && task.site_name && (
                  <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary truncate">
                    {task.site_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 ml-2 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatDueDate(task.due_date, task.due_time)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
