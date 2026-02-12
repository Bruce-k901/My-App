'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Users, Clock } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StaffOnShift {
  id: string;
  full_name: string;
  position_title: string | null;
  shift_start: string;
  shift_end: string;
  is_clocked_in: boolean;
}

export default function WhosOnTodayWidget({ companyId, siteId }: WidgetProps) {
  const [staff, setStaff] = useState<StaffOnShift[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const colors = MODULE_COLORS.teamly;

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    // schedule_shifts table not yet created — skip query to avoid 404
    setLoading(false);
  }, [companyId, siteId]);

  if (loading) {
    return <WidgetLoading />;
  }

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  return (
    <WidgetCard
      title="Who's On Today"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Users className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      badge={
        <span className="text-xs font-medium text-[rgb(var(--text-secondary))] dark:text-theme-tertiary">
          {totalCount} scheduled
        </span>
      }
      viewAllHref="/dashboard/people/schedule"
    >
      {staff.length === 0 ? (
        <WidgetEmptyState
          icon={<Users className="w-8 h-8" />}
          message="No staff scheduled for today"
          actionLabel="View schedule"
          actionHref="/dashboard/people/schedule"
        />
      ) : (
        <div className="space-y-2">
          {staff.map((person) => (
            <Link
              key={person.id}
              href={`/dashboard/people/directory/${person.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    person.is_clocked_in ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {person.full_name}
                  </p>
                  {person.position_title && (
                    <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary truncate">
                      {person.position_title}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary ml-2 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {formatTime(person.shift_start)} - {formatTime(person.shift_end)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
