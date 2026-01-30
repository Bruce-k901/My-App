'use client';

import { Send, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { WeekAttendance } from '@/lib/attendance/types';

interface WeekSummaryProps {
  weekData: WeekAttendance;
  isLocked: boolean;
  canApprove: boolean;
  onSubmitPayroll: () => void;
}

export default function WeekSummary({
  weekData,
  isLocked,
  canApprove,
  onSubmitPayroll
}: WeekSummaryProps) {
  const allComplete = weekData.percentComplete === 100;
  const hasIssues = weekData.days.some(d => 
    d.records.some(r => r.attendanceStatus === 'missing_attendance')
  );
  
  return (
    <div className={`
      bg-white/[0.03] border rounded-xl p-6 mt-6
      ${isLocked ? 'border-green-500/30' : 'border-white/[0.06]'}
    `}>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        {isLocked ? (
          <>
            <Lock className="w-5 h-5 text-green-400" />
            Week Submitted to Payroll
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 text-[#EC4899]" />
            Week Summary
          </>
        )}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.05] rounded-lg p-4">
          <p className="text-sm text-zinc-400">Total Scheduled</p>
          <p className="text-2xl font-bold">{weekData.totalScheduledHours.toFixed(1)}h</p>
        </div>
        
        <div className="bg-white/[0.05] rounded-lg p-4">
          <p className="text-sm text-zinc-400">Total Actual</p>
          <p className="text-2xl font-bold">{weekData.totalActualHours.toFixed(1)}h</p>
        </div>
        
        <div className="bg-white/[0.05] rounded-lg p-4">
          <p className="text-sm text-zinc-400">Variance</p>
          <p className={`text-2xl font-bold ${
            weekData.totalVariance >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {weekData.totalVariance >= 0 ? '+' : ''}{weekData.totalVariance.toFixed(1)}h
          </p>
        </div>
        
        <div className="bg-white/[0.05] rounded-lg p-4">
          <p className="text-sm text-zinc-400">Signed Off</p>
          <p className="text-2xl font-bold">
            {weekData.signedOffCount}/{weekData.totalCount}
            <span className="text-sm text-zinc-400 ml-2">({weekData.percentComplete}%)</span>
          </p>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${allComplete ? 'bg-green-500' : 'bg-[#EC4899]'}`}
            style={{ width: `${weekData.percentComplete}%` }}
          />
        </div>
      </div>
      
      {/* Warnings */}
      {hasIssues && !isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Attention Required</p>
            <p className="text-sm text-zinc-400 mt-1">
              Some staff have missing attendance records. Please add or adjust their hours before submitting to payroll.
            </p>
          </div>
        </div>
      )}
      
      {/* Submit button */}
      {canApprove && !isLocked && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            {allComplete 
              ? 'All hours have been signed off and are ready for payroll.'
              : `${weekData.totalCount - weekData.signedOffCount} entries still pending sign-off.`
            }
          </p>
          
          <button
            onClick={onSubmitPayroll}
            disabled={!allComplete}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
              ${allComplete 
                ? 'bg-[#EC4899] hover:bg-[#EC4899]/90 text-white' 
                : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
            Lock Week & Send to Payroll
          </button>
        </div>
      )}
      
      {isLocked && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-400">
            Submitted on {new Date().toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
          <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full">
            Payroll Complete
          </span>
        </div>
      )}
    </div>
  );
}

