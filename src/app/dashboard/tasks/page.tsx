"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Clock, AlertTriangle, Calendar, TrendingUp, FileText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface TaskMetrics {
  totalToday: number;
  completedToday: number;
  pendingToday: number;
  overdueToday: number;
  completionRate: number;
  totalActive: number;
  totalTemplates: number;
}

function TasksDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { companyId, siteId, profile } = useAppContext();
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Handle deep linking with task parameter
  // CRITICAL: ONLY redirect if there's a task parameter - otherwise show the dashboard
  useEffect(() => {
    // Only process redirects if we're actually on the /dashboard/tasks page
    if (pathname !== '/dashboard/tasks') {
      return; // Don't do anything if we're not on the dashboard page
    }
    
    // Get task parameter from URL
    const taskParam = searchParams.get('task');
    
    // Only redirect if we have a valid, non-empty task parameter
    if (taskParam && typeof taskParam === 'string' && taskParam.trim().length > 0) {
      // Redirect to my-tasks page with the task parameter for deep linking
      router.replace(`/dashboard/tasks/my-tasks?task=${encodeURIComponent(taskParam)}`);
      return;
    }
    
    // IMPORTANT: If no task parameter, DO NOT redirect - show the dashboard
    // This is the default behavior when navigating to /dashboard/tasks
  }, [router, searchParams, pathname]);

  useEffect(() => {
    // Load metrics when companyId is available
    // Don't block rendering if companyId is not available yet
    if (companyId) {
      loadMetrics();
    } else {
      // If no companyId yet, just set loading to false so the page can render
      setLoading(false);
    }
  }, [companyId, siteId]);

  const loadMetrics = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's tasks
      let todayTasksQuery = supabase
        .from('checklist_tasks')
        .select('id, status, due_date, due_time')
        .eq('company_id', companyId)
        .eq('due_date', today);

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        todayTasksQuery = todayTasksQuery.eq('site_id', siteId);
      }

      const { data: todayTasks, error: todayError } = await todayTasksQuery;

      if (todayError) throw todayError;

      // Fetch active tasks (pending or in_progress)
      let activeTasksQuery = supabase
        .from('checklist_tasks')
        .select('id, status')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress']);

      if (siteId) {
        activeTasksQuery = activeTasksQuery.eq('site_id', siteId);
      }

      const { data: activeTasks, error: activeError } = await activeTasksQuery;

      // Fetch templates count
      const { count: templatesCount, error: templatesError } = await supabase
        .from('task_templates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Fetch recent tasks
      let recentTasksQuery = supabase
        .from('checklist_tasks')
        .select(`
          id,
          status,
          due_date,
          due_time,
          custom_name,
          template:task_templates(name, category)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Only filter by site_id if it's a valid UUID (not "all")
      if (siteId && siteId !== 'all') {
        recentTasksQuery = recentTasksQuery.eq('site_id', siteId);
      }

      const { data: recentTasksData, error: recentError } = await recentTasksQuery;

      // Calculate metrics
      const totalToday = todayTasks?.length || 0;
      const completedToday = todayTasks?.filter(t => t.status === 'completed').length || 0;
      const pendingToday = todayTasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
      
      // Check for overdue tasks (pending/in_progress with due_date in the past)
      const now = new Date();
      const overdueToday = todayTasks?.filter(t => {
        if (t.status === 'completed') return false;
        const dueDateTime = t.due_time ? new Date(`${t.due_date}T${t.due_time}`) : new Date(t.due_date);
        return dueDateTime < now;
      }).length || 0;

      const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

      setMetrics({
        totalToday,
        completedToday,
        pendingToday,
        overdueToday,
        completionRate,
        totalActive: activeTasks?.length || 0,
        totalTemplates: templatesCount || 0,
      });

      setRecentTasks(recentTasksData || []);
    } catch (error) {
      console.error('Error loading task metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state only if we're actively loading and have a companyId
  if (loading && companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[rgb(var(--text-primary))] dark:text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">Checkly Dashboard</h1>
          <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 mt-1">Task management overview</p>
        </div>
        <Link
          href="/dashboard/tasks/my-tasks"
          className="px-4 py-2 bg-[#EC4899] hover:bg-[#EC4899]/90 text-white rounded-lg transition-colors"
        >
          View All Tasks
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Tasks */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Today's Tasks</h3>
            <Calendar className="w-5 h-5 text-[#EC4899]" />
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{metrics?.totalToday || 0}</div>
          <div className="text-sm text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-1">
            {metrics?.completedToday || 0} completed
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Completion Rate</h3>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{metrics?.completionRate || 0}%</div>
          <div className="text-sm text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-1">
            {metrics?.completedToday || 0} of {metrics?.totalToday || 0} tasks
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Pending</h3>
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{metrics?.pendingToday || 0}</div>
          {metrics && metrics.overdueToday > 0 && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
              {metrics.overdueToday} overdue
            </div>
          )}
        </div>

        {/* Active Tasks */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60">Active Tasks</h3>
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white">{metrics?.totalActive || 0}</div>
          <div className="text-sm text-[rgb(var(--text-tertiary))] dark:text-white/40 mt-1">All sites</div>
        </div>
      </div>

      {/* Quick Actions & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/todays_tasks"
              className="flex items-center gap-3 p-4 bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] rounded-lg transition-colors border border-theme dark:border-white/[0.06]"
            >
              <Calendar className="w-5 h-5 text-[#EC4899]" />
              <div>
                <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white">Today's Tasks</div>
                <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">View today</div>
              </div>
            </Link>
            <Link
              href="/dashboard/tasks/my-tasks"
              className="flex items-center gap-3 p-4 bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] rounded-lg transition-colors border border-theme dark:border-white/[0.06]"
            >
              <CheckCircle2 className="w-5 h-5 text-[#EC4899]" />
              <div>
                <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white">My Tasks</div>
                <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">Assigned to me</div>
              </div>
            </Link>
            <Link
              href="/dashboard/tasks/compliance"
              className="flex items-center gap-3 p-4 bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] rounded-lg transition-colors border border-theme dark:border-white/[0.06]"
            >
              <ShieldCheck className="w-5 h-5 text-[#EC4899]" />
              <div>
                <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white">Compliance</div>
                <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">Templates</div>
              </div>
            </Link>
            <Link
              href="/dashboard/tasks/templates"
              className="flex items-center gap-3 p-4 bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] rounded-lg transition-colors border border-theme dark:border-white/[0.06]"
            >
              <FileText className="w-5 h-5 text-[#EC4899]" />
              <div>
                <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white">Templates</div>
                <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">Custom templates</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Recent Tasks</h2>
            <Link
              href="/dashboard/tasks/my-tasks"
              className="text-sm text-[#EC4899] hover:text-[#EC4899]/80"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-[rgb(var(--text-tertiary))] dark:text-white/40">
                <p>No recent tasks</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/my-tasks?task=${task.id}`}
                  className="flex items-center justify-between p-3 bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                      {task.custom_name || task.template?.name || 'Untitled Task'}
                    </div>
                    <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-white/60 mt-1">
                      {task.due_date} {task.due_time ? `at ${task.due_time}` : ''}
                    </div>
                  </div>
                  <div className="ml-4">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[rgb(var(--text-primary))] dark:text-white">Loading...</div>
      </div>
    }>
      <TasksDashboardContent />
    </Suspense>
  );
}
