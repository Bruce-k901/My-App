'use client';

import { useState, useEffect } from 'react';
import { WidgetCard, MiniItem } from '../WidgetCard';

interface WhosOnTodayWidgetProps {
  siteId: string;
  companyId: string;
}

interface StaffOnShift {
  id: string;
  name: string;
  shiftTime: string;
  role?: string;
}

/**
 * WhosOnTodayWidget - Shows staff scheduled for today
 */
export default function WhosOnTodayWidget({ siteId, companyId }: WhosOnTodayWidgetProps) {
  const [staff, setStaff] = useState<StaffOnShift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // schedule_shifts table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-black/5 dark:bg-white/5 rounded w-12" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-3/4" />
        </div>
      </WidgetCard>
    );
  }

  if (totalCount === 0) {
    return (
      <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
        <div className="text-center py-4">
          <div className="text-[rgb(var(--text-disabled))] text-xs">No staff scheduled for today</div>
        </div>
      </WidgetCard>
    );
  }

  const remaining = totalCount - 3;

  return (
    <WidgetCard title="Who's On Today" module="teamly" viewAllHref="/dashboard/people/schedule">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[22px] font-bold text-blue-400">{totalCount}</span>
        <span className="text-[11px] text-[rgb(var(--text-disabled))]">staff on shift</span>
      </div>
      <div>
        {staff.map((person) => (
          <MiniItem
            key={person.id}
            text={person.name}
            sub={person.shiftTime}
            status="neutral"
            href="/dashboard/people/schedule"
          />
        ))}
        {remaining > 0 && (
          <div className="text-[10.5px] text-[rgb(var(--text-disabled))] mt-0.5">+ {remaining} more</div>
        )}
      </div>
    </WidgetCard>
  );
}
