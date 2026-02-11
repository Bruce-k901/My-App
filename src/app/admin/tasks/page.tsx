"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Loader2,
  Calendar
} from '@/components/ui/icons';

interface TaskMetrics {
  total_all_time: number;
  completed_all_time: number;
  missed_all_time: number;
  created_today: number;
  completed_today: number;
  pending_today: number;
  completion_rate: number;
}

interface DailyStats {
  date: string;
  created: number;
  completed: number;
}

export default function AdminTasksPage() {
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaskMetrics();
  }, []);

  async function fetchTaskMetrics() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: totalAllTime },
        { count: completedAllTime },
        { count: missedAllTime },
        { count: createdToday },
        { count: completedToday },
        { count: pendingToday }
      ] = await Promise.all([
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('status', 'missed'),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', today),
        supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('due_date', today)
      ]);

      const total = totalAllTime || 0;
      const completed = completedAllTime || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      setMetrics({
        total_all_time: total,
        completed_all_time: completed,
        missed_all_time: missedAllTime || 0,
        created_today: createdToday || 0,
        completed_today: completedToday || 0,
        pending_today: pendingToday || 0,
        completion_rate: completionRate
      });
    } catch (error) {
      console.error('Error fetching task metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Task Analytics</h1>
        <p className="text-white/60">Platform-wide task performance metrics</p>
      </div>

      {/* Today's Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-white/60" />
          Today
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400">Created Today</span>
            </div>
            <div className="text-3xl font-bold text-white">{metrics?.created_today || 0}</div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <span className="text-green-400">Completed Today</span>
            </div>
            <div className="text-3xl font-bold text-white">{metrics?.completed_today || 0}</div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <span className="text-yellow-400">Pending Today</span>
            </div>
            <div className="text-3xl font-bold text-white">{metrics?.pending_today || 0}</div>
          </div>
        </div>
      </div>

      {/* All-Time Stats */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-white/60" />
          All Time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <div className="text-white/60 text-sm mb-2">Total Tasks</div>
            <div className="text-3xl font-bold text-white">{metrics?.total_all_time?.toLocaleString() || 0}</div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <div className="text-white/60 text-sm mb-2">Completed</div>
            <div className="text-3xl font-bold text-green-400">{metrics?.completed_all_time?.toLocaleString() || 0}</div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <div className="text-white/60 text-sm mb-2">Missed</div>
            <div className="text-3xl font-bold text-red-400">{metrics?.missed_all_time?.toLocaleString() || 0}</div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <div className="text-white/60 text-sm mb-2">Completion Rate</div>
            <div className="text-3xl font-bold text-[#D37E91]">{metrics?.completion_rate || 0}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

