'use client';

import { useEffect, useState } from 'react';
import { CheckSquare, MessageSquare, Clock, AlertTriangle } from '@/components/ui/icons';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { usePanelStore } from '@/lib/stores/panel-store';

interface SummaryData {
  tasksDue: number;
  tasksOverdue: number;
  unreadMessages: number;
  nextShift?: string;
}

export function PrioritySummaryCard() {
  const { siteId, companyId, userId } = useAppContext();
  const [summary, setSummary] = useState<SummaryData>({
    tasksDue: 0,
    tasksOverdue: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setMessagingOpen } = usePanelStore();

  useEffect(() => {
    const fetchSummary = async () => {
      if (!companyId) return;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nowTime = today.toTimeString().slice(0, 5);

      try {
        // Fetch tasks due today
        let taskQuery = supabase
          .from('checklist_tasks')
          .select('id, due_date, due_time, status')
          .eq('company_id', companyId)
          .eq('due_date', todayStr)
          .in('status', ['pending', 'in_progress']);

        if (siteId && siteId !== 'all') {
          taskQuery = taskQuery.eq('site_id', siteId);
        }

        const { data: tasks } = await taskQuery;

        const tasksDue = tasks?.length || 0;
        const tasksOverdue = tasks?.filter(t =>
          t.due_time && t.due_time < nowTime && t.status !== 'completed'
        ).length || 0;

        // Fetch unread messages count (simplified - just get recent unread)
        let messageCount = 0;
        if (userId) {
          const { count } = await supabase
            .from('direct_messages')
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);
          messageCount = count || 0;
        }

        // Fetch next shift (if user has schedule data)
        let nextShift: string | undefined;
        if (userId) {
          const { data: shifts } = await supabase
            .from('shift_patterns')
            .select('start_time, end_time')
            .eq('user_id', userId)
            .gte('date', todayStr)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(1);

          if (shifts?.[0]) {
            nextShift = shifts[0].start_time?.slice(0, 5);
          }
        }

        setSummary({
          tasksDue,
          tasksOverdue,
          unreadMessages: messageCount,
          nextShift,
        });
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [companyId, siteId, userId]);

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 animate-pulse">
        <div className="h-16 bg-white/[0.05] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Today's Overview
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {/* Tasks Due */}
        <button
          onClick={() => router.push('/dashboard/todays_tasks')}
          className="flex flex-col items-center p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
        >
          <div className="relative">
            <CheckSquare className="w-6 h-6 text-[#D37E91] mb-1" />
            {summary.tasksOverdue > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                !
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-white">{summary.tasksDue}</span>
          <span className="text-[10px] text-gray-500">Tasks Due</span>
        </button>

        {/* Messages */}
        <button
          onClick={() => setMessagingOpen(true)}
          className="flex flex-col items-center p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-amber-400 mb-1" />
            {summary.unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                {summary.unreadMessages > 9 ? '9+' : summary.unreadMessages}
              </span>
            )}
          </div>
          <span className="text-xl font-bold text-white">{summary.unreadMessages}</span>
          <span className="text-[10px] text-gray-500">Messages</span>
        </button>

        {/* Next Shift / Overdue */}
        {summary.tasksOverdue > 0 ? (
          <button
            onClick={() => router.push('/dashboard/todays_tasks?filter=overdue')}
            className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            <AlertTriangle className="w-6 h-6 text-red-400 mb-1" />
            <span className="text-xl font-bold text-red-400">{summary.tasksOverdue}</span>
            <span className="text-[10px] text-red-400">Overdue</span>
          </button>
        ) : (
          <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.02]">
            <Clock className="w-6 h-6 text-emerald-400 mb-1" />
            <span className="text-xl font-bold text-white">
              {summary.nextShift || '--:--'}
            </span>
            <span className="text-[10px] text-gray-500">Next Shift</span>
          </div>
        )}
      </div>
    </div>
  );
}
