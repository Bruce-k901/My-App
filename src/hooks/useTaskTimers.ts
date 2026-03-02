'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAlerts } from './useAlerts';
import { toast } from 'sonner';
import { TaskAlertToast } from '@/components/notifications/TaskAlertToast';
import { createElement } from 'react';

// ============================================================================
// Timer-based task notification system
// Instead of polling every 60s, this schedules a precise setTimeout for each
// task's due time. Notifications fire at the exact second, not within a window.
//
// Three timers per task:
//   -2 min  → "upcoming" toast (blue)
//    0 min  → "due now" toast + sound/vibration
//   +15 min → "overdue" toast (red) + urgent sound
//
// Realtime subscription keeps timers in sync when tasks are completed/added.
// Visibility change handler re-syncs after device sleep/wake.
// ============================================================================

interface TaskSummary {
  id: string;
  status: string;
  due_date: string;
  due_time: string;
  custom_name: string | null;
  template_id: string | null;
  priority: string | null;
  daypart: string | null;
  assigned_to_role: string | null;
  task_data: { source?: string; source_type?: string; [key: string]: unknown } | null;
}

interface TemplateLookup {
  name: string;
  category: string | null;
}

interface UseTaskTimersOptions {
  companyId: string | null;
  siteId: string | null;
  userId: string | null;
  userRole?: string | null;
  enabled?: boolean;
}

/** Millisecond offsets relative to due time */
const UPCOMING_OFFSET_MS = -2 * 60 * 1000;   // 2 min before
const DUE_NOW_OFFSET_MS = 0;                   // at due time
const OVERDUE_OFFSET_MS = 15 * 60 * 1000;     // 15 min after

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function isInQuietHours(): boolean {
  try {
    const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
    const qh = prefs.quiet_hours;
    if (!qh?.enabled || !qh.start || !qh.end) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = qh.start.split(':').map(Number);
    const [endH, endM] = qh.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch { return false; }
}

export function useTaskTimers({
  companyId,
  siteId,
  userId,
  userRole,
  enabled = true,
}: UseTaskTimersOptions) {
  const { alertTaskDue, alertUrgent, settings } = useAlerts();

  // State refs (avoid re-renders)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());
  const snoozeMap = useRef<Map<string, number>>(new Map());
  const dismissedIds = useRef<Set<string>>(new Set());
  const activeToastIds = useRef<Map<string, string | number>>(new Map());
  const templateCache = useRef<Map<string, TemplateLookup>>(new Map());
  const tasksRef = useRef<TaskSummary[]>([]);
  const mountedRef = useRef(true);

  // ── Snooze / Dismiss ──────────────────────────────────────────────────

  const handleSnooze = useCallback((taskId: string, minutes: number) => {
    snoozeMap.current.set(taskId, Date.now() + minutes * 60 * 1000);
    activeToastIds.current.delete(taskId);

    // Re-schedule a timer to fire when snooze expires
    const ms = minutes * 60 * 1000;
    const timer = setTimeout(() => {
      snoozeMap.current.delete(taskId);
      // Re-fire alert for this task if still pending
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (task && !dismissedIds.current.has(taskId)) {
        fireAlert(task, true);
      }
    }, ms);

    // Store snooze timer alongside task timers
    const existing = timers.current.get(taskId) || [];
    existing.push(timer);
    timers.current.set(taskId, existing);
  }, []);

  const handleDismiss = useCallback((taskId: string) => {
    dismissedIds.current.add(taskId);
    activeToastIds.current.delete(taskId);
  }, []);

  // ── Fetch tasks ───────────────────────────────────────────────────────

  const fetchTasks = useCallback(async (): Promise<TaskSummary[]> => {
    if (!companyId) return [];

    const today = getToday();

    let query = supabase
      .from('checklist_tasks')
      .select('id, status, due_date, due_time, custom_name, template_id, priority, daypart, assigned_to_role, assigned_to_user_id, task_data')
      .eq('company_id', companyId)
      .eq('due_date', today)
      .in('status', ['pending', 'in_progress'])
      .not('due_time', 'is', null);

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId);
    }

    const role = userRole?.toLowerCase();
    const isAdminOrManager = role === 'admin' || role === 'manager' || role === 'owner' || role === 'general_manager';
    if (!isAdminOrManager && role) {
      const filters = [`assigned_to_role.is.null,assigned_to_role.eq.${role}`];
      if (userId) {
        filters.push(`assigned_to_user_id.eq.${userId}`);
      }
      query = query.or(filters.join(','));
    }

    const { data, error } = await query;
    if (error) {
      console.debug('[TaskTimers] Fetch error:', error.message);
      return [];
    }

    return ((data || []) as TaskSummary[]).filter(
      (t) => !t.template_id || t.task_data?.source === 'cron' || t.task_data?.source_type
    );
  }, [companyId, siteId, userId, userRole]);

  // ── Template resolution ───────────────────────────────────────────────

  const resolveTemplateNames = useCallback(async (tasks: TaskSummary[]) => {
    const missingIds = tasks
      .filter((t) => t.template_id && !templateCache.current.has(t.template_id))
      .map((t) => t.template_id!)
      .filter((id, i, arr) => arr.indexOf(id) === i);

    if (missingIds.length === 0) return;

    const { data } = await supabase
      .from('checklist_templates')
      .select('id, name, category')
      .in('id', missingIds);

    if (data) {
      data.forEach((t) => templateCache.current.set(t.id, { name: t.name, category: t.category }));
    }
  }, []);

  const getTaskName = useCallback((task: TaskSummary): string => {
    if (task.custom_name) return task.custom_name;
    if (task.template_id) return templateCache.current.get(task.template_id)?.name || 'Task';
    return 'Task';
  }, []);

  const getTaskCategory = useCallback((task: TaskSummary): string | null => {
    if (task.template_id) return templateCache.current.get(task.template_id)?.category || null;
    return null;
  }, []);

  // ── Fire a single alert ───────────────────────────────────────────────

  const fireAlert = useCallback((task: TaskSummary, isOverdue: boolean) => {
    if (!mountedRef.current) return;
    if (!settings.taskRemindersEnabled) return;
    if (isInQuietHours()) return;
    if (dismissedIds.current.has(task.id)) return;
    if (snoozeMap.current.has(task.id) && Date.now() < (snoozeMap.current.get(task.id) || 0)) return;
    if (activeToastIds.current.has(task.id)) return;

    const now = new Date();
    const today = getToday();
    const dueDateTime = new Date(`${today}T${task.due_time}`);
    const timeSinceDue = now.getTime() - dueDateTime.getTime();
    const overdueMinutes = isOverdue ? Math.max(0, Math.floor(timeSinceDue / 60000)) : undefined;

    const taskName = getTaskName(task);
    const category = getTaskCategory(task);

    // Sound/vibration
    if (isOverdue && timeSinceDue > 15 * 60 * 1000) {
      alertUrgent();
    } else {
      alertTaskDue();
    }

    const id = toast.custom(
      (toastId) =>
        createElement(TaskAlertToast, {
          toastId,
          taskId: task.id,
          taskName,
          dueTime: task.due_time,
          isOverdue,
          overdueMinutes,
          category,
          priority: task.priority,
          daypart: task.daypart,
          assignedToRole: task.assigned_to_role,
          onSnooze: handleSnooze,
          onDismiss: handleDismiss,
        }),
      { duration: Infinity }
    );

    activeToastIds.current.set(task.id, id);
  }, [settings.taskRemindersEnabled, getTaskName, getTaskCategory, alertTaskDue, alertUrgent, handleSnooze, handleDismiss]);

  // ── Clear all timers for a task ───────────────────────────────────────

  const clearTaskTimers = useCallback((taskId: string) => {
    const taskTimers = timers.current.get(taskId);
    if (taskTimers) {
      taskTimers.forEach(clearTimeout);
      timers.current.delete(taskId);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    timers.current.forEach((taskTimers) => taskTimers.forEach(clearTimeout));
    timers.current.clear();
  }, []);

  // ── Schedule timers for a single task ─────────────────────────────────

  const scheduleTaskTimers = useCallback((task: TaskSummary) => {
    // Clear any existing timers for this task first
    clearTaskTimers(task.id);

    const today = getToday();
    const dueTime = new Date(`${today}T${task.due_time}`).getTime();
    const now = Date.now();
    const taskTimerIds: ReturnType<typeof setTimeout>[] = [];

    // Calculate ms until each alert point
    const offsets = [
      { offset: UPCOMING_OFFSET_MS, isOverdue: false },
      { offset: DUE_NOW_OFFSET_MS, isOverdue: false },
      { offset: OVERDUE_OFFSET_MS, isOverdue: true },
    ];

    for (const { offset, isOverdue } of offsets) {
      const fireAt = dueTime + offset;
      const delay = fireAt - now;

      if (delay > 0) {
        // Future — schedule timer
        const timer = setTimeout(() => {
          fireAlert(task, isOverdue);
        }, delay);
        taskTimerIds.push(timer);
      } else if (delay > -60000 && offset === DUE_NOW_OFFSET_MS) {
        // Due within the last minute — fire immediately (just loaded / tab woke up)
        fireAlert(task, false);
      }
    }

    // If task is already overdue, fire immediately
    const timeSinceDue = now - dueTime;
    if (timeSinceDue > 0 && timeSinceDue <= 4 * 60 * 60 * 1000) {
      // Overdue but less than 4 hours — show alert now
      fireAlert(task, true);
    }

    if (taskTimerIds.length > 0) {
      timers.current.set(task.id, taskTimerIds);
    }
  }, [clearTaskTimers, fireAlert]);

  // ── Schedule timers for all tasks ─────────────────────────────────────

  const scheduleAllTimers = useCallback((tasks: TaskSummary[]) => {
    clearAllTimers();

    // Dismiss toasts for tasks no longer in the list
    const currentIds = new Set(tasks.map((t) => t.id));
    activeToastIds.current.forEach((toastId, taskId) => {
      if (!currentIds.has(taskId)) {
        toast.dismiss(toastId);
        activeToastIds.current.delete(taskId);
      }
    });

    for (const task of tasks) {
      if (dismissedIds.current.has(task.id)) continue;
      if (snoozeMap.current.has(task.id) && Date.now() < (snoozeMap.current.get(task.id) || 0)) continue;

      scheduleTaskTimers(task);
    }

    console.debug(`[TaskTimers] Scheduled timers for ${tasks.length} tasks (${timers.current.size} with future alerts)`);
  }, [clearAllTimers, scheduleTaskTimers]);

  // ── Main setup effect ─────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !companyId || !settings.taskRemindersEnabled) return;

    mountedRef.current = true;

    const setup = async () => {
      const tasks = await fetchTasks();
      if (!mountedRef.current) return;
      await resolveTemplateNames(tasks);
      if (!mountedRef.current) return;
      tasksRef.current = tasks;
      scheduleAllTimers(tasks);
    };

    // Short delay to let app settle
    const initialTimeout = setTimeout(setup, 3000);

    // ── Supabase Realtime subscription ────────────────────────────────
    // Listen for task changes (completed, deleted, new tasks) to keep
    // timers in sync without polling.
    const today = getToday();
    const channel = supabase
      .channel(`task-timers-${companyId}-${siteId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_tasks',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          if (!mountedRef.current) return;

          const record = (payload.new || payload.old) as TaskSummary | undefined;
          if (!record) return;

          // Only care about today's tasks
          if (record.due_date !== today) return;

          if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && (record.status === 'completed' || record.status === 'done' || record.status === 'missed'))) {
            // Task completed/deleted — cancel timers and dismiss toast
            clearTaskTimers(record.id);
            const toastId = activeToastIds.current.get(record.id);
            if (toastId) {
              toast.dismiss(toastId);
              activeToastIds.current.delete(record.id);
            }
            tasksRef.current = tasksRef.current.filter((t) => t.id !== record.id);
          } else if (payload.eventType === 'INSERT') {
            // New task — resolve template name and schedule timers
            const newTask = record as TaskSummary;
            if (newTask.due_time && (newTask.status === 'pending' || newTask.status === 'in_progress')) {
              // Check it passes the same filters as fetchTasks
              const validTask = !newTask.template_id || newTask.task_data?.source === 'cron' || newTask.task_data?.source_type;
              if (validTask) {
                await resolveTemplateNames([newTask]);
                if (!mountedRef.current) return;
                tasksRef.current.push(newTask);
                scheduleTaskTimers(newTask);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      clearAllTimers();
      supabase.removeChannel(channel);
      activeToastIds.current.forEach((toastId) => toast.dismiss(toastId));
      activeToastIds.current.clear();
    };
  }, [enabled, companyId, siteId, settings.taskRemindersEnabled, fetchTasks, resolveTemplateNames, scheduleAllTimers, clearAllTimers, scheduleTaskTimers, clearTaskTimers]);

  // ── Visibility change: re-sync after device sleep/wake ────────────────

  useEffect(() => {
    if (!enabled || !companyId || !settings.taskRemindersEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!mountedRef.current) return;

      // Tab just became visible — timers may have drifted during sleep
      // Re-fetch and re-schedule everything
      console.debug('[TaskTimers] Tab visible — re-syncing timers');
      const tasks = await fetchTasks();
      if (!mountedRef.current) return;
      await resolveTemplateNames(tasks);
      if (!mountedRef.current) return;
      tasksRef.current = tasks;
      scheduleAllTimers(tasks);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, companyId, settings.taskRemindersEnabled, fetchTasks, resolveTemplateNames, scheduleAllTimers]);

  // ── Context change: reset ─────────────────────────────────────────────

  useEffect(() => {
    toast.dismiss();
    activeToastIds.current.clear();
    dismissedIds.current.clear();
  }, [companyId, siteId]);

  // ── Midnight reset ────────────────────────────────────────────────────

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      clearAllTimers();
      snoozeMap.current.clear();
      dismissedIds.current.clear();
      activeToastIds.current.forEach((toastId) => toast.dismiss(toastId));
      activeToastIds.current.clear();
      templateCache.current.clear();
      tasksRef.current = [];
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [clearAllTimers]);
}
