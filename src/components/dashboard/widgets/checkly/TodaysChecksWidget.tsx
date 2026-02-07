'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { CheckSquare, Circle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TodayTask {
  id: string;
  template_name: string;
  due_time: string | null;
  status: string;
}

interface TodayStats {
  total: number;
  completed: number;
  pending: number;
}

export default function TodaysChecksWidget({ companyId, siteId }: WidgetProps) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [stats, setStats] = useState<TodayStats>({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.checkly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchTodaysTasks() {
      try {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
          .from('checklist_tasks')
          .select(`
            id,
            due_time,
            status,
            custom_name,
            template:task_templates(name)
          `)
          .eq('company_id', companyId)
          .eq('due_date', today)
          .order('due_time', { ascending: true, nullsFirst: false })
          .limit(5);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const formattedTasks: TodayTask[] = (data || []).map((task: any) => ({
          id: task.id,
          template_name: task.custom_name || task.template?.name || 'Unknown Task',
          due_time: task.due_time,
          status: task.status,
        }));

        setTasks(formattedTasks);

        // Get stats
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
          const total = allTasks.length;
          const completed = allTasks.filter((t) => t.status === 'completed').length;
          setStats({
            total,
            completed,
            pending: total - completed,
          });
        }
      } catch (err) {
        console.error('Error fetching today\'s tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTodaysTasks();
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <WidgetCard
      title="Today's Checks"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <CheckSquare className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">
          {stats.completed}/{stats.total}
        </span>
      }
      viewAllHref="/dashboard/todays_tasks"
    >
      {stats.total === 0 ? (
        <WidgetEmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          message="No checks scheduled for today"
          actionLabel="View all tasks"
          actionHref="/dashboard/todays_tasks"
        />
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40">
                {stats.completed} completed
              </span>
              <span className={cn('font-medium', colors.text)}>{completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-1">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/todays_tasks?task=${task.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    'text-sm truncate flex-1',
                    task.status === 'completed'
                      ? 'text-[rgb(var(--text-tertiary))] dark:text-white/40 line-through'
                      : 'text-[rgb(var(--text-primary))] dark:text-white'
                  )}
                >
                  {task.template_name}
                </span>
                {task.due_time && (
                  <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 flex-shrink-0">
                    {task.due_time.slice(0, 5)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
