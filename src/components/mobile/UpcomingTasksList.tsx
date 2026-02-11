'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, ChevronRight } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  due_time: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  is_critical: boolean;
}

interface UpcomingTasksListProps {
  limit?: number;
}

export function UpcomingTasksList({ limit = 5 }: UpcomingTasksListProps) {
  const { siteId, companyId } = useAppContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!companyId) return;

      const today = new Date().toISOString().split('T')[0];

      try {
        let query = supabase
          .from('checklist_tasks')
          .select('id, title, due_time, status, is_critical')
          .eq('company_id', companyId)
          .eq('due_date', today)
          .in('status', ['pending', 'in_progress'])
          .order('due_time', { ascending: true, nullsFirst: false })
          .limit(limit);

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTasks(data || []);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [companyId, siteId, limit]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/dashboard/tasks/${taskId}`);
  };

  const handleViewAll = () => {
    router.push('/dashboard/todays_tasks');
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Upcoming Tasks
          </h3>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-white/[0.03] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-white">All caught up!</p>
        <p className="text-xs text-gray-500">No pending tasks for today</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Upcoming Tasks
        </h3>
        <button
          onClick={handleViewAll}
          className="text-xs text-[#D37E91] hover:text-[#D37E91] transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_time && task.due_time < new Date().toTimeString().slice(0, 5);

          return (
            <button
              key={task.id}
              onClick={() => handleTaskClick(task.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                "bg-white/[0.03] border border-white/[0.06]",
                "hover:bg-white/[0.06] active:scale-[0.98]",
                isOverdue && "border-red-500/30 bg-red-500/5"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "flex-shrink-0",
                task.status === 'in_progress' ? 'text-blue-400' : 'text-gray-500'
              )}>
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  task.is_critical ? "text-red-400" : "text-white"
                )}>
                  {task.title}
                </p>
                {task.due_time && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-400" : "text-gray-500"
                  )}>
                    <Clock className="w-3 h-3" />
                    <span>{task.due_time.slice(0, 5)}</span>
                    {isOverdue && <span className="font-medium">• Overdue</span>}
                  </div>
                )}
              </div>

              {/* Critical badge */}
              {task.is_critical && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">
                  Critical
                </span>
              )}

              <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
