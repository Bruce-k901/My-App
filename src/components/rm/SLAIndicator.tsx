'use client';

import { PRIORITY_CONFIG } from '@/types/rm';
import type { WorkOrder } from '@/types/rm';

interface Props {
  workOrder: WorkOrder;
  compact?: boolean;
}

export default function SLAIndicator({ workOrder, compact = false }: Props) {
  if (!workOrder.sla_target_hours || !workOrder.created_at) return null;

  const createdAt = new Date(workOrder.created_at).getTime();
  const now = Date.now();
  const elapsedMs = now - createdAt;
  const slaMs = workOrder.sla_target_hours * 60 * 60 * 1000;
  const percentUsed = Math.min((elapsedMs / slaMs) * 100, 100);

  // If already breached or closed
  if (workOrder.sla_breached) {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30'} text-red-600 dark:text-red-400 font-medium`}>
        SLA Breached
      </span>
    );
  }

  // Completed/closed/cancelled — show green
  if (['completed', 'verified', 'closed', 'cancelled'].includes(workOrder.status)) {
    return (
      <span className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30'} text-green-600 dark:text-green-400 font-medium`}>
        Within SLA
      </span>
    );
  }

  // Active — calculate remaining time
  const remainingMs = slaMs - elapsedMs;
  const remainingHours = Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
  const remainingMins = Math.max(0, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)));

  let timeStr: string;
  if (remainingHours >= 24) {
    const days = Math.floor(remainingHours / 24);
    timeStr = `${days}d ${remainingHours % 24}h`;
  } else if (remainingHours > 0) {
    timeStr = `${remainingHours}h ${remainingMins}m`;
  } else {
    timeStr = `${remainingMins}m`;
  }

  // Colour based on percentage used
  let colourClasses: string;
  if (percentUsed >= 100) {
    colourClasses = 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  } else if (percentUsed >= 75) {
    colourClasses = 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
  } else {
    colourClasses = 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  }

  if (compact) {
    return (
      <span className={`text-xs font-medium ${percentUsed >= 100 ? 'text-red-600 dark:text-red-400' : percentUsed >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
        {percentUsed >= 100 ? 'Overdue' : timeStr}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colourClasses}`}>
      {percentUsed >= 100 ? 'SLA Overdue' : `${timeStr} left`}
    </span>
  );
}
