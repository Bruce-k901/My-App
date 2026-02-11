'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlerts } from './useAlerts';
import { toast } from 'sonner';
import type { ChecklistTaskWithTemplate, ChecklistTask } from '@/types/checklist-types';

// Simpler task type for when we don't have the full template
type SimpleTask = Pick<ChecklistTask, 'id' | 'due_time' | 'due_date' | 'status' | 'custom_name'> & {
  template_name?: string;
  template?: { name?: string } | null;
};

interface UseTaskAlertsOptions {
  tasks: (ChecklistTaskWithTemplate | SimpleTask)[];
  enabled?: boolean;
  checkIntervalMs?: number;
}

/**
 * Hook to check for due and overdue tasks and trigger alerts
 * Runs on an interval and alerts when tasks become due or overdue
 */
export function useTaskAlerts({
  tasks,
  enabled = true,
  checkIntervalMs = 60000 // Check every minute
}: UseTaskAlertsOptions) {
  const { alertTaskDue, alertUrgent, settings } = useAlerts();
  const alertedTaskIds = useRef<Set<string>>(new Set());
  const lastCheckTime = useRef<Date>(new Date());

  const getTaskName = (task: ChecklistTaskWithTemplate | SimpleTask): string => {
    // Try custom_name first, then template name, then fallback
    if (task.custom_name) return task.custom_name;
    if ('template' in task && task.template?.name) return task.template.name;
    if ('template_name' in task && task.template_name) return task.template_name;
    return 'Task';
  };

  const checkDueTasks = useCallback(() => {
    if (!enabled || !tasks.length || !settings.taskRemindersEnabled) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    tasks.forEach((task) => {
      // Skip if already alerted or completed
      if (alertedTaskIds.current.has(task.id)) return;
      if (task.status === 'completed' || task.status === 'done') return;

      // Get task due date
      const taskDate = task.due_date || today;
      if (taskDate !== today) return; // Only alert for today's tasks

      // Skip if no due time
      if (!task.due_time) return;

      // Combine date and time
      const dueDateTime = new Date(`${taskDate}T${task.due_time}`);

      // Check if task just became due (within the last check interval)
      const timeSinceDue = now.getTime() - dueDateTime.getTime();
      const justBecameDue = timeSinceDue >= 0 && timeSinceDue < checkIntervalMs;

      // Check if task is overdue by more than 15 minutes
      const isOverdue = timeSinceDue > 15 * 60 * 1000;

      const taskName = getTaskName(task);

      if (justBecameDue) {
        // Task just became due - standard alert
        alertTaskDue();

        toast.info(`Task Due: ${taskName}`, {
          description: `Due at ${task.due_time}`,
          duration: 10000, // Show for 10 seconds
          action: {
            label: 'View',
            onClick: () => {
              // Navigate to task
              window.location.href = `/dashboard/todays_tasks?task=${task.id}`;
            },
          },
        });

        alertedTaskIds.current.add(task.id);
      } else if (isOverdue && !alertedTaskIds.current.has(`${task.id}-overdue`)) {
        // Task is overdue - urgent alert (only once)
        alertUrgent();

        toast.warning(`Overdue: ${taskName}`, {
          description: `Was due at ${task.due_time}`,
          duration: 15000,
          action: {
            label: 'Complete Now',
            onClick: () => {
              window.location.href = `/dashboard/todays_tasks?task=${task.id}`;
            },
          },
        });

        alertedTaskIds.current.add(`${task.id}-overdue`);
      }
    });

    lastCheckTime.current = now;
  }, [tasks, enabled, checkIntervalMs, alertTaskDue, alertUrgent, settings.taskRemindersEnabled]);

  // Run check on interval
  useEffect(() => {
    if (!enabled || !settings.taskRemindersEnabled) return;

    // Initial check
    checkDueTasks();

    // Set up interval
    const interval = setInterval(checkDueTasks, checkIntervalMs);

    return () => clearInterval(interval);
  }, [checkDueTasks, enabled, checkIntervalMs, settings.taskRemindersEnabled]);

  // Reset alerted tasks at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      alertedTaskIds.current.clear();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  // Reset alerted tasks when the tasks list changes (e.g., new day)
  useEffect(() => {
    // Clear alerts for tasks that are no longer in the list
    const currentTaskIds = new Set(tasks.map(t => t.id));
    alertedTaskIds.current.forEach(id => {
      const baseId = id.replace('-overdue', '');
      if (!currentTaskIds.has(baseId)) {
        alertedTaskIds.current.delete(id);
      }
    });
  }, [tasks]);

  return {
    checkDueTasks, // Manual trigger if needed
    clearAlerts: () => alertedTaskIds.current.clear(),
  };
}
