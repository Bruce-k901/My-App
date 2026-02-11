'use client';

import { useState, useEffect } from 'react';
import { Check } from '@/components/ui/icons';
import { WidgetCard, CountBadge, MiniItem } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface OverdueChecksWidgetProps {
  siteId: string;
  companyId: string;
}

interface OverdueCheck {
  id: string;
  name: string;
  timeOverdue: string;
  isUrgent: boolean;
}

/**
 * OverdueChecksWidget - Shows count of overdue checks with top 3 items
 */
export default function OverdueChecksWidget({ siteId, companyId }: OverdueChecksWidgetProps) {
  const [checks, setChecks] = useState<OverdueCheck[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchOverdue() {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        let query = supabase
          .from('checklist_tasks')
          .select(`
            id,
            due_date,
            due_time,
            custom_name,
            template:task_templates(name)
          `)
          .eq('company_id', companyId)
          .neq('status', 'completed')
          .or(`due_date.lt.${today},and(due_date.eq.${today},due_time.lt.${currentTime})`)
          .order('due_date', { ascending: true })
          .limit(3);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          // Table may not exist yet — degrade gracefully
          setLoading(false);
          return;
        }

        const formattedChecks: OverdueCheck[] = (data || []).map((task: any) => {
          const dueDate = new Date(task.due_date + (task.due_time ? `T${task.due_time}` : ''));
          const diffMs = now.getTime() - dueDate.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor(diffMs / (1000 * 60));

          let timeOverdue: string;
          if (diffHours >= 24) {
            timeOverdue = `${Math.floor(diffHours / 24)}d overdue`;
          } else if (diffHours >= 1) {
            timeOverdue = `${diffHours}h overdue`;
          } else {
            timeOverdue = `${diffMins}m overdue`;
          }

          return {
            id: task.id,
            name: task.custom_name || task.template?.name || 'Unknown Task',
            timeOverdue,
            isUrgent: diffHours >= 2,
          };
        });

        setChecks(formattedChecks);

        // Get total count
        let countQuery = supabase
          .from('checklist_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .neq('status', 'completed')
          .or(`due_date.lt.${today},and(due_date.eq.${today},due_time.lt.${currentTime})`);

        if (siteId && siteId !== 'all') {
          countQuery = countQuery.eq('site_id', siteId);
        }

        const { count } = await countQuery;
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching overdue checks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverdue();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Overdue Checks" module="checkly" viewAllHref="/dashboard/todays_tasks?filter=overdue">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-black/5 dark:bg-white/5 rounded w-24" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Overdue Checks" module="checkly" viewAllHref="/dashboard/todays_tasks">
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-emerald-400 text-xs">No overdue checks — great work!</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Overdue Checks" module="checkly" viewAllHref="/dashboard/todays_tasks?filter=overdue">
      <CountBadge count={totalCount} label="checks overdue" status="urgent" />
      <div className="mt-2">
        {checks.map((check) => (
          <MiniItem
            key={check.id}
            text={check.name}
            sub={check.timeOverdue}
            status={check.isUrgent ? 'urgent' : 'warning'}
            href="/dashboard/todays_tasks?filter=overdue"
          />
        ))}
      </div>
    </WidgetCard>
  );
}
