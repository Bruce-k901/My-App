'use client';

import { useMemo } from 'react';
import { Calendar, Clock, AlertTriangle } from '@/components/ui/icons';
import type { OffboardingFormData, NoticePeriodCalculation } from '@/types/offboarding';
import { calculateApplicableNotice, calculateServiceLength } from '@/lib/people/notice-calculator';
import type { EmployeeProfile } from '@/types/employee';

interface DatesStepProps {
  formData: OffboardingFormData;
  onChange: (updates: Partial<OffboardingFormData>) => void;
  employee: EmployeeProfile;
}

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-lg bg-white dark:bg-white/[0.06] border border-neutral-300 dark:border-white/[0.12] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-teamly-dark/40 dark:focus:ring-teamly/40 focus:border-teamly-dark dark:focus:border-teamly transition-colors';

export function DatesStep({ formData, onChange, employee }: DatesStepProps) {
  const today = new Date().toISOString().split('T')[0];

  const service = useMemo(() => {
    if (!employee.start_date) return null;
    return calculateServiceLength(employee.start_date, today);
  }, [employee.start_date, today]);

  const noticePeriod: NoticePeriodCalculation | null = useMemo(() => {
    if (!employee.start_date) return null;
    return calculateApplicableNotice({
      startDate: employee.start_date,
      terminationDate: formData.termination_date || today,
      contractualWeeks: employee.notice_period_weeks ?? null,
      terminationReason: formData.termination_reason,
      subReason: formData.termination_sub_reason,
      isPILON: formData.pilon_applicable,
    });
  }, [
    employee.start_date,
    employee.notice_period_weeks,
    formData.termination_date,
    formData.termination_reason,
    formData.termination_sub_reason,
    formData.pilon_applicable,
    today,
  ]);

  const handleApplyCalculatedDates = () => {
    if (!noticePeriod) return;
    onChange({
      termination_date: noticePeriod.notice_end_date,
      last_working_day: noticePeriod.last_working_day,
      notice_end_date: noticePeriod.notice_end_date,
    });
  };

  return (
    <div className="space-y-6">
      {/* Service Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-3">
          <p className="text-xs text-neutral-500 mb-0.5">Start date</p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{employee.start_date || 'Not set'}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-3">
          <p className="text-xs text-neutral-500 mb-0.5">Length of service</p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {service
              ? `${service.years} year${service.years !== 1 ? 's' : ''}, ${service.months} month${service.months !== 1 ? 's' : ''}`
              : 'Unknown'}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-3">
          <p className="text-xs text-neutral-500 mb-0.5">Contract type</p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 capitalize">{employee.contract_type || 'Permanent'}</p>
        </div>
      </div>

      {/* Notice Period Comparison */}
      {noticePeriod && !noticePeriod.is_summary_dismissal && (
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 dark:text-teamly text-teamly-dark" />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notice Period</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500">Statutory minimum</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {noticePeriod.statutory_weeks} week{noticePeriod.statutory_weeks !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-neutral-500">Based on {service?.years ?? 0} year{(service?.years ?? 0) !== 1 ? 's' : ''} service</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Contractual</p>
              <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {noticePeriod.contractual_weeks} week{noticePeriod.contractual_weeks !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-neutral-500">Per employment contract</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Applicable</p>
              <p className="text-lg font-semibold dark:text-teamly text-teamly-dark">
                {noticePeriod.applicable_weeks} week{noticePeriod.applicable_weeks !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-neutral-500">Greater of the two</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyCalculatedDates}
            className="text-xs dark:text-teamly text-teamly-dark hover:underline"
          >
            Apply calculated dates below
          </button>
        </div>
      )}

      {noticePeriod?.is_summary_dismissal && (
        <div className="rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Summary Dismissal — No Notice Period</p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Gross misconduct allows dismissal without notice. However, a fair investigation and
              hearing must still have been conducted before this point.
            </p>
          </div>
        </div>
      )}

      {/* Date Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Last working day <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input type="date" value={formData.last_working_day || ''} onChange={(e) => onChange({ last_working_day: e.target.value })} className={INPUT_CLASS} />
          <p className="text-xs text-neutral-500 mt-1">The employee&apos;s final day of work</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Effective termination date <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input type="date" value={formData.termination_date || ''} onChange={(e) => onChange({ termination_date: e.target.value })} className={INPUT_CLASS} />
          <p className="text-xs text-neutral-500 mt-1">End of notice period (when employment formally ends)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Notice end date
          </label>
          <input type="date" value={formData.notice_end_date || ''} onChange={(e) => onChange({ notice_end_date: e.target.value })} className={INPUT_CLASS} />
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pilon_applicable}
              onChange={(e) => {
                onChange({ pilon_applicable: e.target.checked });
                if (e.target.checked) {
                  onChange({
                    pilon_applicable: true,
                    last_working_day: today,
                  });
                }
              }}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-teamly-dark dark:text-teamly accent-teamly-dark dark:accent-teamly"
            />
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Payment in Lieu of Notice (PILON)</p>
              <p className="text-xs text-neutral-500">
                Employee leaves immediately; notice pay is paid as a lump sum
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
