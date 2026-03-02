'use client';

import { useMemo } from 'react';
import {
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from '@/components/ui/icons';

interface EmployeeDay {
  date: string;
  dayName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduledHours: number | null;
  clockIn: string | null;
  clockOut: string | null;
  actualHours: number | null;
  signedOff: boolean;
  status: 'completed' | 'pending' | 'missing' | 'off';
}

interface EmployeeWeekData {
  staffId: string;
  staffName: string;
  positionTitle: string | null;
  hourlyRate: number | null;
  days: EmployeeDay[];
  totalScheduledHours: number;
  totalActualHours: number;
  totalVariance: number;
  signedOffCount: number;
  totalShifts: number;
}

interface WeeklyEmployeeViewProps {
  employees: Array<{
    staffId: string;
    staffName: string;
    positionTitle: string | null;
    hourlyRate: number | null;
    days: {
      [date: string]: {
        scheduledStart: string | null;
        scheduledEnd: string | null;
        scheduledNetHours: number | null;
        clockIn: string | null;
        clockOut: string | null;
        actualHours: number | null;
        signedOff: boolean;
      };
    };
  }>;
  weekDates: Array<{ date: string; dayName: string }>;
  isLocked: boolean;
}

export default function WeeklyEmployeeView({
  employees,
  weekDates,
  isLocked
}: WeeklyEmployeeViewProps) {
  // Transform employee data into weekly summaries
  const employeeWeeks = useMemo(() => {
    return employees.map(emp => {
      const days: EmployeeDay[] = weekDates.map(({ date, dayName }) => {
        const dayData = emp.days[date];

        let status: 'completed' | 'pending' | 'missing' | 'off' = 'off';

        if (dayData?.scheduledStart) {
          // Has a scheduled shift
          if (dayData.clockIn && dayData.clockOut) {
            status = 'completed';
          } else if (dayData.clockIn && !dayData.clockOut) {
            status = 'pending';
          } else {
            status = 'missing';
          }
        } else if (dayData?.clockIn) {
          // Unscheduled but worked
          status = dayData.clockOut ? 'completed' : 'pending';
        }

        return {
          date,
          dayName,
          scheduledStart: dayData?.scheduledStart || null,
          scheduledEnd: dayData?.scheduledEnd || null,
          scheduledHours: dayData?.scheduledNetHours || null,
          clockIn: dayData?.clockIn || null,
          clockOut: dayData?.clockOut || null,
          actualHours: dayData?.actualHours || null,
          signedOff: dayData?.signedOff || false,
          status
        };
      });

      // Calculate totals
      const totalScheduledHours = days.reduce((sum, d) => sum + (d.scheduledHours || 0), 0);
      const totalActualHours = days.reduce((sum, d) => sum + (d.actualHours || 0), 0);
      const totalVariance = totalActualHours - totalScheduledHours;
      const signedOffCount = days.filter(d => d.signedOff).length;
      const totalShifts = days.filter(d => d.scheduledStart || d.clockIn).length;

      return {
        staffId: emp.staffId,
        staffName: emp.staffName,
        positionTitle: emp.positionTitle,
        hourlyRate: emp.hourlyRate,
        days,
        totalScheduledHours,
        totalActualHours,
        totalVariance,
        signedOffCount,
        totalShifts
      };
    });
  }, [employees, weekDates]);

  // Format time from various formats to HH:MM
  function formatTime(time: string | null): string {
    if (!time) return '—';

    // If it's an ISO timestamp
    if (time.includes('T')) {
      return new Date(time).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // If it's already HH:MM:SS or HH:MM
    return time.substring(0, 5);
  }

  // Get status styles
  function getStatusStyles(status: string) {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case 'pending':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case 'missing':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: <AlertTriangle className="w-3.5 h-3.5" />
        };
      default:
        return {
          bg: 'bg-theme-surface-elevated0/10',
          border: 'border-gray-500/30',
          text: 'text-theme-tertiary',
          icon: <Minus className="w-3.5 h-3.5" />
        };
    }
  }

  // Get variance color
  function getVarianceColor(variance: number): string {
    if (variance === 0) return 'text-theme-tertiary';
    if (variance > 0) return 'text-green-400';
    return 'text-red-400';
  }

  // Get variance icon
  function getVarianceIcon(variance: number) {
    if (variance === 0) return <Minus className="w-4 h-4" />;
    if (variance > 0) return <TrendingUp className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  }

  if (employeeWeeks.length === 0) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 text-center">
        <User className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
        <p className="text-theme-tertiary">No employees with shifts this week</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {employeeWeeks.map(employee => (
        <div
          key={employee.staffId}
          className="bg-theme-surface border border-theme rounded-xl overflow-hidden"
        >
          {/* Employee Header */}
          <div className="flex items-center justify-between p-4 border-b border-theme">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {employee.staffName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold text-theme-primary">
                  {employee.staffName}
                </h3>
                {employee.positionTitle && (
                  <p className="text-sm text-theme-tertiary">
                    {employee.positionTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Week Totals */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-theme-tertiary">Scheduled</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {employee.totalScheduledHours.toFixed(1)}h
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-theme-tertiary">Actual</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {employee.totalActualHours.toFixed(1)}h
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-theme-tertiary">Variance</p>
                <div className={`flex items-center gap-1 justify-end ${getVarianceColor(employee.totalVariance)}`}>
                  {getVarianceIcon(employee.totalVariance)}
                  <p className="text-lg font-semibold">
                    {employee.totalVariance >= 0 ? '+' : ''}{employee.totalVariance.toFixed(1)}h
                  </p>
                </div>
              </div>

              {employee.hourlyRate && (
                <div className="text-right border-l border-theme pl-6">
                  <p className="text-xs text-theme-tertiary">Est. Pay</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    £{(employee.totalActualHours * employee.hourlyRate).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {employee.days.map((day) => {
                const statusStyles = getStatusStyles(day.status);
                const hasShift = day.scheduledStart || day.clockIn;

                return (
                  <div
                    key={day.date}
                    className={`
                      rounded-lg p-3 border transition-colors
                      ${hasShift
                        ? `${statusStyles.bg} ${statusStyles.border}`
                        : 'bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.04]'
                      }
                    `}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-theme-tertiary">
                        {day.dayName.substring(0, 3)}
                      </span>
                      {hasShift && (
                        <span className={statusStyles.text}>
                          {statusStyles.icon}
                        </span>
                      )}
                    </div>

                    {/* Day Content */}
                    {hasShift ? (
                      <div className="space-y-1.5">
                        {/* Scheduled */}
                        {day.scheduledStart && (
                          <div>
                            <p className="text-[10px] text-theme-tertiary uppercase">Sched</p>
                            <p className="text-xs font-mono text-theme-secondary">
                              {formatTime(day.scheduledStart)}-{formatTime(day.scheduledEnd)}
                            </p>
                          </div>
                        )}

                        {/* Actual */}
                        {day.clockIn && (
                          <div>
                            <p className="text-[10px] text-theme-tertiary uppercase">Actual</p>
                            <p className="text-xs font-mono text-theme-primary">
                              {formatTime(day.clockIn)}-{day.clockOut ? formatTime(day.clockOut) : '...'}
                            </p>
                          </div>
                        )}

                        {/* Hours */}
                        {day.actualHours !== null && (
                          <div className="pt-1 border-t border-theme">
                            <p className="text-sm font-semibold text-theme-primary">
                              {day.actualHours.toFixed(1)}h
                            </p>
                          </div>
                        )}

                        {/* Sign-off indicator */}
                        {day.signedOff && (
                          <div className="flex items-center gap-1 text-green-500 text-[10px]">
                            <CheckCircle className="w-3 h-3" />
                            <span>Signed</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-xs text-theme-tertiary/30">Off</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer - Sign-off status */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-theme">
            <div className="flex items-center gap-2">
              {employee.signedOffCount === employee.totalShifts && employee.totalShifts > 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    All shifts signed off
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-theme-tertiary" />
                  <span className="text-sm text-theme-tertiary">
                    {employee.signedOffCount}/{employee.totalShifts} shifts signed off
                  </span>
                </>
              )}
            </div>

            {isLocked && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                Locked for payroll
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
