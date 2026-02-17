'use client';

import { Clock, AlertTriangle, ArrowRight, X, BellOff } from '@/components/ui/icons';
import { toast } from 'sonner';

interface TaskAlertToastProps {
  toastId: string | number;
  taskId: string;
  taskName: string;
  dueTime: string;
  isOverdue: boolean;
  overdueMinutes?: number;
  category?: string | null;
  priority?: string | null;
  daypart?: string | null;
  assignedToRole?: string | null;
  onSnooze: (taskId: string, minutes: number) => void;
  onDismiss: (taskId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_safety: 'Food Safety',
  h_and_s: 'Health & Safety',
  fire: 'Fire Safety',
  cleaning: 'Cleaning',
  compliance: 'Compliance',
};

const DAYPART_LABELS: Record<string, string> = {
  before_open: 'Before Open',
  morning: 'Morning',
  midday: 'Midday',
  during_service: 'During Service',
  afternoon: 'Afternoon',
  evening: 'Evening',
  close: 'Close',
  after_close: 'After Close',
};

export function TaskAlertToast({
  toastId,
  taskId,
  taskName,
  dueTime,
  isOverdue,
  overdueMinutes,
  category,
  priority,
  daypart,
  assignedToRole,
  onSnooze,
  onDismiss,
}: TaskAlertToastProps) {
  const handleSnooze = (minutes: number) => {
    onSnooze(taskId, minutes);
    toast.dismiss(toastId);
  };

  const handleDismiss = () => {
    onDismiss(taskId);
    toast.dismiss(toastId);
  };

  const handleGoToTask = () => {
    onDismiss(taskId);
    toast.dismiss(toastId);
    window.location.href = `/dashboard/todays_tasks?task=${taskId}`;
  };

  const formatOverdue = (mins?: number) => {
    if (!mins) return 'Overdue';
    if (mins < 60) return `Overdue by ${mins}min`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `Overdue by ${hrs}hr ${remaining}min` : `Overdue by ${hrs}hr`;
  };

  const categoryLabel = category ? CATEGORY_LABELS[category] || category : null;
  const daypartLabel = daypart ? DAYPART_LABELS[daypart] || daypart : null;
  const isPriority = priority === 'high' || priority === 'critical';

  return (
    <div
      className={`w-[400px] rounded-xl border-2 p-5 shadow-xl ${
        isOverdue
          ? 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-50'
          : 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/90 text-blue-900 dark:text-blue-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {isOverdue ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <Clock className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-base font-bold">
            {isOverdue ? 'Task Overdue' : 'Task Due'}
          </span>
          {isPriority && (
            <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase leading-none ${
              priority === 'critical'
                ? 'bg-red-200 dark:bg-red-500/30 text-red-700 dark:text-red-200'
                : 'bg-orange-200 dark:bg-orange-500/30 text-orange-700 dark:text-orange-200'
            }`}>
              {priority}
            </span>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 opacity-60" />
        </button>
      </div>

      {/* Task info */}
      <div className="mt-3">
        <p className="text-[15px] font-semibold leading-snug">{taskName}</p>
        <div className={`mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`}>
          <span>{isOverdue ? formatOverdue(overdueMinutes) : `Due at ${dueTime}`}</span>
          {categoryLabel && (
            <>
              <span className="opacity-40">|</span>
              <span>{categoryLabel}</span>
            </>
          )}
          {daypartLabel && (
            <>
              <span className="opacity-40">|</span>
              <span>{daypartLabel}</span>
            </>
          )}
        </div>
        {assignedToRole && (
          <p className={`mt-1 text-xs ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
            Assigned to: {assignedToRole}
          </p>
        )}
      </div>

      {/* Snooze buttons */}
      <div className="mt-4 flex items-center gap-2">
        <BellOff className={`h-4 w-4 shrink-0 ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`} />
        <span className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-blue-300'}`}>Snooze:</span>
        {[15, 30].map((mins) => (
          <button
            key={mins}
            onClick={() => handleSnooze(mins)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              isOverdue
                ? 'bg-red-200 dark:bg-red-900/80 text-red-700 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-800'
                : 'bg-blue-200 dark:bg-blue-900/80 text-blue-700 dark:text-blue-200 hover:bg-blue-300 dark:hover:bg-blue-800'
            }`}
          >
            {mins} min
          </button>
        ))}
      </div>

      {/* Go to task */}
      <button
        onClick={handleGoToTask}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors ${
          isOverdue
            ? 'bg-red-200 dark:bg-red-500/20 text-red-700 dark:text-red-200 hover:bg-red-300 dark:hover:bg-red-500/30'
            : 'bg-blue-200 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 hover:bg-blue-300 dark:hover:bg-blue-500/30'
        }`}
      >
        Go to Task
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
