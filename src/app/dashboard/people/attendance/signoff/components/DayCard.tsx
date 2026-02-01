'use client';

import { useState } from 'react';
import { 
  Check, 
  Clock, 
  AlertTriangle, 
  Edit2, 
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import { DayAttendance, AttendanceRecord } from '@/lib/attendance/types';

interface DayCardProps {
  day: DayAttendance;
  isLocked: boolean;
  canApprove: boolean;
  onSignOff: (record: AttendanceRecord, signedOff: boolean) => void;
  onSignOffDay: (date: string, signedOff: boolean) => void;
  onEditRecord: (record: AttendanceRecord) => void;
  onAddRecord: (staffId: string | null) => void;
}

export default function DayCard({
  day,
  isLocked,
  canApprove,
  onSignOff,
  onSignOffDay,
  onEditRecord,
  onAddRecord
}: DayCardProps) {
  const [expanded, setExpanded] = useState(true);
  
  const allSignedOff = day.totalCount > 0 && day.signedOffCount === day.totalCount;
  const hasIssues = day.records.some(r => 
    r.attendanceStatus === 'missing_attendance' || 
    r.attendanceStatus === 'late_arrival'
  );
  
  // Format time from ISO string or TIME
  function formatTime(time: string | null): string {
    if (!time) return '—';
    if (time.includes('T')) {
      return new Date(time).toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    return time.substring(0, 5); // HH:MM from TIME field
  }
  
  // Format hours nicely
  function formatHours(hours: number | null): string {
    if (hours === null || hours === undefined) return '—';
    return `${hours.toFixed(2)}h`;
  }
  
  // Variance badge color
  function getVarianceColor(variance: number): string {
    if (variance === 0) return 'text-gray-500 dark:text-white/60';
    if (variance > 0) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  }
  
  // Status badge
  function getStatusBadge(status: string) {
    switch (status) {
      case 'missing_attendance':
        return (
          <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Missing
          </span>
        );
      case 'late_arrival':
        return (
          <span className="text-xs bg-yellow-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Late
          </span>
        );
      case 'early_departure':
        return (
          <span className="text-xs bg-yellow-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Early
          </span>
        );
      case 'unscheduled_shift':
        return (
          <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
            Extra
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div className={`
      bg-white dark:bg-white/[0.03] border rounded-xl overflow-hidden
      ${allSignedOff ? 'border-green-200 dark:border-green-500/30' : hasIssues ? 'border-yellow-200 dark:border-amber-500/30' : 'border-gray-200 dark:border-white/[0.06]'}
    `}>
      {/* Day Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {allSignedOff ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : hasIssues ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <Clock className="w-5 h-5 text-gray-500 dark:text-white/60" />
          )}
          
          <div>
            <h3 className="font-semibold">{day.dayName}</h3>
            <p className="text-sm text-gray-500 dark:text-white/60">
              {new Date(day.date).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Day summary */}
          <div className="text-right text-sm">
            <p className="text-gray-500 dark:text-white/60">
              {day.signedOffCount}/{day.totalCount} signed off
            </p>
            <p className={getVarianceColor(day.totalVariance)}>
              {day.totalVariance >= 0 ? '+' : ''}{day.totalVariance.toFixed(2)}h variance
            </p>
          </div>
          
          {/* Sign off all button */}
          {canApprove && !isLocked && day.totalCount > 0 && !allSignedOff && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSignOffDay(day.date, true);
              }}
              className="text-xs bg-transparent border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-all duration-200 ease-in-out"
            >
              Sign Off All
            </button>
          )}
          
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-white/60" />
          )}
        </div>
      </div>
      
      {/* Records Table */}
      {expanded && (
        <div className="border-t border-gray-200 dark:border-white/[0.06]">
          {day.records.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-white/50">
              <p>No scheduled shifts for this day</p>
              <button
                onClick={() => onAddRecord(null)}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                + Add attendance record
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.05]">
                <tr className="text-left text-gray-500 dark:text-white/60">
                  <th className="px-4 py-2 font-medium">Staff</th>
                  <th className="px-4 py-2 font-medium">Scheduled</th>
                  <th className="px-4 py-2 font-medium">Actual</th>
                  <th className="px-4 py-2 font-medium text-right">Variance</th>
                  <th className="px-4 py-2 font-medium text-center">Status</th>
                  <th className="px-4 py-2 font-medium text-center">Sign Off</th>
                  <th className="px-4 py-2 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
                {day.records.map((record, idx) => (
                  <tr key={`${record.staffId}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    {/* Staff Name */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{record.staffName}</p>
                        {record.positionTitle && (
                          <p className="text-xs text-gray-500 dark:text-white/50">{record.positionTitle}</p>
                        )}
                      </div>
                    </td>
                    
                    {/* Scheduled */}
                    <td className="px-4 py-3">
                      <p>{formatTime(record.scheduledStart)} - {formatTime(record.scheduledEnd)}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">{formatHours(record.scheduledHours)}</p>
                    </td>
                    
                    {/* Actual */}
                    <td className="px-4 py-3">
                      <p>{formatTime(record.actualClockIn)} - {formatTime(record.actualClockOut)}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">{formatHours(record.actualHours)}</p>
                    </td>
                    
                    {/* Variance */}
                    <td className={`px-4 py-3 text-right ${getVarianceColor(record.hoursVariance)}`}>
                      {record.hoursVariance >= 0 ? '+' : ''}
                      {record.hoursVariance.toFixed(2)}h
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(record.attendanceStatus)}
                      {record.manuallyAdjusted && (
                        <span className="text-xs text-purple-400 ml-1">(edited)</span>
                      )}
                    </td>
                    
                    {/* Sign Off Checkbox */}
                    <td className="px-4 py-3 text-center">
                      {canApprove && !isLocked ? (
                        <button
                          onClick={() => onSignOff(record, !record.signedOff)}
                          className={`
                            w-6 h-6 rounded border-2 flex items-center justify-center transition-colors
                            ${record.signedOff 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-400 dark:border-white/40 hover:border-blue-600 dark:border-blue-400'
                            }
                          `}
                        >
                          {record.signedOff && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ) : record.signedOff ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400 dark:text-white/40">—</span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {record.attendanceId ? (
                          <button
                            onClick={() => onEditRecord(record)}
                            disabled={isLocked}
                            className="p-1 text-gray-500 dark:text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit times"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onAddRecord(record.staffId)}
                            disabled={isLocked}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add attendance"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* Day totals footer */}
          <div className="bg-gray-50 dark:bg-white/[0.05] px-4 py-3 flex items-center justify-between text-sm border-t border-gray-200 dark:border-white/[0.06]">
            <span className="text-gray-500 dark:text-white/60">Day Total</span>
            <div className="flex items-center gap-6">
              <span>Scheduled: <strong>{day.totalScheduledHours.toFixed(2)}h</strong></span>
              <span>Actual: <strong>{day.totalActualHours.toFixed(2)}h</strong></span>
              <span className={getVarianceColor(day.totalVariance)}>
                Variance: <strong>{day.totalVariance >= 0 ? '+' : ''}{day.totalVariance.toFixed(2)}h</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

