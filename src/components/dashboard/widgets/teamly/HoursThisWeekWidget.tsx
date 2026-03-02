'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Clock, TrendingUp, TrendingDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface HoursSummary {
  scheduledHours: number;
  workedHours: number;
  contractedHours: number | null;
}

export default function HoursThisWeekWidget({ companyId, siteId }: WidgetProps) {
  const [summary, setSummary] = useState<HoursSummary | null>(null);
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

  if (!summary) {
    return (
      <WidgetCard
        title="Hours This Week"
        icon={
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <Clock className={cn('w-4 h-4', colors.text)} />
          </div>
        }
      >
        <WidgetEmptyState
          icon={<Clock className="w-8 h-8" />}
          message="No schedule data available"
          actionLabel="View schedule"
          actionHref="/dashboard/people/schedule"
        />
      </WidgetCard>
    );
  }

  const utilizationRate = summary.scheduledHours > 0
    ? Math.round((summary.workedHours / summary.scheduledHours) * 100)
    : 0;

  const isOverSchedule = summary.workedHours > summary.scheduledHours;

  return (
    <WidgetCard
      title="Hours This Week"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Clock className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      viewAllHref="/dashboard/people/attendance"
    >
      <div className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
              {summary.scheduledHours}h
            </div>
            <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              Scheduled
            </div>
          </div>
          <div>
            <div className={cn(
              'text-2xl font-bold',
              isOverSchedule
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            )}>
              {summary.workedHours}h
            </div>
            <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              Worked
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">
              Utilization
            </span>
            <div className={cn(
              'flex items-center gap-1',
              isOverSchedule
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            )}>
              {isOverSchedule ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="font-medium">{utilizationRate}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isOverSchedule ? 'bg-yellow-500' : 'bg-purple-500'
              )}
              style={{ width: `${Math.min(utilizationRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
