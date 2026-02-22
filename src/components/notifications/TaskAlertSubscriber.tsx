'use client';

import { useAppContext } from '@/context/AppContext';
import { useGlobalTaskAlerts } from '@/hooks/useGlobalTaskAlerts';

/**
 * Global component that polls for due/overdue tasks and triggers
 * persistent popup alerts with snooze options on any page.
 *
 * Should be included in the root layout (alongside MessageAlertSubscriber).
 */
export function TaskAlertSubscriber() {
  const { companyId, siteId, userId, profile } = useAppContext();

  useGlobalTaskAlerts({
    companyId,
    siteId,
    userId: userId || profile?.id || null,
    userRole: profile?.app_role || null,
    enabled: !!profile && !!companyId,
    checkIntervalMs: 60000,
  });

  return null;
}
