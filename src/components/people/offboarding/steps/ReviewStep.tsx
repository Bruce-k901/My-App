'use client';

import { useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2 } from '@/components/ui/icons';
import type { OffboardingFormData } from '@/types/offboarding';
import { TERMINATION_REASON_LABELS, DISMISSAL_SUB_REASON_LABELS } from '@/types/offboarding';
import type { EmployeeProfile } from '@/types/employee';
import { OffboardingTimelineView } from '../OffboardingTimeline';
import { calculateOffboardingTimeline } from '@/lib/people/offboarding-timeline';

interface ReviewStepProps {
  formData: OffboardingFormData;
  onChange: (updates: Partial<OffboardingFormData>) => void;
  employee: EmployeeProfile;
  checklistCompletedCount: number;
  checklistTotalCount: number;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({
  formData,
  onChange,
  employee,
  checklistCompletedCount,
  checklistTotalCount,
  onConfirm,
  isSubmitting,
}: ReviewStepProps) {
  const [confirmText, setConfirmText] = useState('');

  const employeeName = employee.full_name || '';
  const isConfirmValid = confirmText.toLowerCase().trim() === employeeName.toLowerCase().trim();

  const today = new Date().toISOString().split('T')[0];
  const timeline = formData.termination_date
    ? calculateOffboardingTimeline({
        terminationInitiatedDate: today,
        noticeStartDate: today,
        noticeWeeks: 0,
        lastWorkingDay: formData.last_working_day || formData.termination_date,
        isPILON: formData.pilon_applicable,
        terminationDate: formData.termination_date,
        payFrequency: (employee as any).pay_frequency || 'monthly',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Termination Details</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-neutral-500">Employee</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Reason</p>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                {TERMINATION_REASON_LABELS[formData.termination_reason]}
                {formData.termination_sub_reason &&
                  ` — ${DISMISSAL_SUB_REASON_LABELS[formData.termination_sub_reason]}`}
              </p>
            </div>
            {formData.termination_notes && (
              <div>
                <p className="text-xs text-neutral-500">Notes</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">{formData.termination_notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Key Dates</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Last working day</p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{formData.last_working_day || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Effective termination date</p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">{formData.termination_date || 'Not set'}</p>
              </div>
            </div>
            {formData.pilon_applicable && (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-1 rounded inline-block">
                PILON applies — employee leaves immediately
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checklist progress */}
      <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 dark:text-teamly text-teamly-dark" />
        <div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Checklist: {checklistCompletedCount} of {checklistTotalCount} items completed
          </p>
          <p className="text-xs text-neutral-500">
            Remaining items can be completed during the offboarding period
          </p>
        </div>
      </div>

      {/* Timeline */}
      {timeline && (
        <div>
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Key Dates Timeline</h4>
          <OffboardingTimelineView timeline={timeline} />
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.schedule_exit_interview}
            onChange={(e) => onChange({ schedule_exit_interview: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 accent-teamly-dark dark:accent-teamly"
          />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Schedule exit interview</p>
            <p className="text-xs text-neutral-500">
              Creates an exit interview review 3 days before the last working day
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.eligible_for_rehire === true}
            onChange={(e) => onChange({ eligible_for_rehire: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 accent-teamly-dark dark:accent-teamly"
          />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Eligible for rehire</p>
            <p className="text-xs text-neutral-500">
              Mark whether this employee may be considered for future positions
            </p>
          </div>
        </label>
      </div>

      {/* Confirm */}
      <div className="rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Confirm termination</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              This will change the employee&apos;s status to &quot;Offboarding&quot;, cancel their future
              shifts and pending leave requests, and generate the offboarding checklist.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1.5">
            Type <strong className="text-neutral-900 dark:text-neutral-200">{employeeName}</strong> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={employeeName}
            className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!isConfirmValid || isSubmitting}
          className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Processing...' : 'Confirm Termination'}
        </button>
      </div>
    </div>
  );
}
