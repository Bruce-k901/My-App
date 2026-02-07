'use client';

import { useState, useEffect } from 'react';
import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetEmptyState, WidgetLoading } from '../WidgetWrapper';
import { Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

    async function fetchHours() {
      try {
        // Get start and end of current week (Monday to Sunday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const mondayStr = monday.toISOString().split('T')[0];
        const sundayStr = sunday.toISOString().split('T')[0];

        // Get scheduled hours from schedule_shifts
        let scheduleQuery = supabase
          .from('schedule_shifts')
          .select('start_time, end_time')
          .eq('company_id', companyId)
          .gte('date', mondayStr)
          .lte('date', sundayStr);

        if (siteId && siteId !== 'all') {
          scheduleQuery = scheduleQuery.eq('site_id', siteId);
        }

        const { data: shifts, error: shiftsError } = await scheduleQuery;

        let scheduledHours = 0;
        if (!shiftsError && shifts) {
          shifts.forEach((shift: any) => {
            if (shift.start_time && shift.end_time) {
              const start = parseFloat(shift.start_time.split(':')[0]) + parseFloat(shift.start_time.split(':')[1]) / 60;
              const end = parseFloat(shift.end_time.split(':')[0]) + parseFloat(shift.end_time.split(':')[1]) / 60;
              scheduledHours += end > start ? end - start : (24 - start) + end;
            }
          });
        }

        // Get worked hours from staff_attendance
        let attendanceQuery = supabase
          .from('staff_attendance')
          .select('clock_in, clock_out')
          .eq('company_id', companyId)
          .gte('date', mondayStr)
          .lte('date', sundayStr);

        if (siteId && siteId !== 'all') {
          attendanceQuery = attendanceQuery.eq('site_id', siteId);
        }

        const { data: attendance, error: attendanceError } = await attendanceQuery;

        let workedHours = 0;
        if (!attendanceError && attendance) {
          attendance.forEach((record: any) => {
            if (record.clock_in && record.clock_out) {
              const clockIn = new Date(record.clock_in);
              const clockOut = new Date(record.clock_out);
              workedHours += (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
            }
          });
        }

        setSummary({
          scheduledHours: Math.round(scheduledHours * 10) / 10,
          workedHours: Math.round(workedHours * 10) / 10,
          contractedHours: null, // Would need to sum from profiles
        });
      } catch (err) {
        console.error('Error fetching hours:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHours();
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
            <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
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
            <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
              Worked
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40">
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
