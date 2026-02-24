'use client';

import { useAppContext } from '@/context/AppContext';
import { useTaskTimers } from '@/hooks/useTaskTimers';

/**
 * Global component that schedules per-task timers for due/overdue alerts
 * with snooze options. Uses Supabase Realtime to stay in sync.
 *
 * Should be included in the root layout (alongside MessageAlertSubscriber).
 */
export function TaskAlertSubscriber() {
  const { companyId, siteId, userId, profile } = useAppContext();

  useTaskTimers({
    companyId,
    siteId,
    userId: userId || profile?.id || null,
    userRole: profile?.app_role || null,
    enabled: !!profile && !!companyId,
  });

  return null;
}
