'use client';

import { useMemo } from 'react';
import { AlertTriangle } from '@/components/ui/icons';
import type { FinalPayEstimate, OffboardingFormData } from '@/types/offboarding';
import { calculateFinalPay } from '@/lib/people/final-pay-calculator';
import type { EmployeeProfile } from '@/types/employee';

interface FinalPayStepProps {
  formData: OffboardingFormData;
  employee: EmployeeProfile;
  holidayDaysTaken: number;
  holidayYearStartMonth: number;
  holidayYearStartDay: number;
}

function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function FinalPayStep({
  formData,
  employee,
  holidayDaysTaken,
  holidayYearStartMonth,
  holidayYearStartDay,
}: FinalPayStepProps) {
  const isRedundancy = formData.termination_reason === 'redundancy';

  const estimate: FinalPayEstimate | null = useMemo(() => {
    if (!formData.termination_date || !formData.last_working_day || !employee.start_date) {
      return null;
    }

    return calculateFinalPay({
      hourlyRate: employee.hourly_rate ?? null,
      salary: employee.salary ?? null,
      contractedHoursPerWeek: (employee as any).contracted_hours_per_week ?? null,
      terminationDate: formData.termination_date,
      lastWorkingDay: formData.last_working_day,
      isPILON: formData.pilon_applicable,
      isRedundancy,
      noticePeriodWeeks: 0,
      dateOfBirth: employee.date_of_birth ?? null,
      startDate: employee.start_date,
      annualLeaveAllowance: employee.annual_leave_allowance ?? 28,
      holidayDaysTaken,
      holidayYearStartMonth,
      holidayYearStartDay,
    });
  }, [formData, employee, holidayDaysTaken, holidayYearStartMonth, holidayYearStartDay, isRedundancy]);

  if (!estimate) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-neutral-500">
          Unable to calculate final pay estimate. Please ensure dates and employee details are set.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Estimate only.</strong> These figures are indicative. Actual final pay should be
          calculated and processed through your payroll system, accounting for tax, NI, pension
          deductions, and any other adjustments.
        </p>
      </div>

      {/* Pay breakdown */}
      <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/[0.04]">
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Estimated Final Pay Breakdown</h4>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">Outstanding wages</p>
              <p className="text-xs text-neutral-500">
                ~{estimate.working_days_remaining} working days at {formatGBP(estimate.daily_rate)}/day
              </p>
            </div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.outstanding_wages)}</p>
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">Accrued holiday pay</p>
              <p className="text-xs text-neutral-500">
                {estimate.accrued_holiday_days} day{estimate.accrued_holiday_days !== 1 ? 's' : ''} remaining
                ({estimate.holiday_days_taken} taken of {estimate.holiday_days_entitled} entitled)
              </p>
            </div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.accrued_holiday_pay)}</p>
          </div>

          {formData.pilon_applicable && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">Notice pay (PILON)</p>
                <p className="text-xs text-neutral-500">
                  Payment in lieu of notice — subject to income tax and NI
                </p>
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.notice_pay)}</p>
            </div>
          )}

          {isRedundancy && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">Statutory redundancy pay</p>
                <p className="text-xs text-neutral-500">
                  {estimate.redundancy_qualifying_years} qualifying year{estimate.redundancy_qualifying_years !== 1 ? 's' : ''}
                  {estimate.age_at_termination > 0 && ` \u00B7 age ${estimate.age_at_termination}`}
                  {' \u00B7 '}weekly pay capped at {formatGBP(estimate.redundancy_weekly_pay_used)}
                </p>
                {estimate.statutory_redundancy_pay > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    First \u00A330,000 of redundancy pay is tax-free
                  </p>
                )}
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.statutory_redundancy_pay)}</p>
            </div>
          )}

          {/* Total */}
          <div className="px-4 py-3 flex items-center justify-between bg-neutral-100 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Estimated total</p>
            <p className="text-base font-bold dark:text-teamly text-teamly-dark">
              {formatGBP(estimate.total_final_pay)}
            </p>
          </div>
        </div>
      </div>

      {/* Rate info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-3">
          <p className="text-xs text-neutral-500">Daily rate</p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.daily_rate)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.03] p-3">
          <p className="text-xs text-neutral-500">Weekly rate</p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{formatGBP(estimate.weekly_rate)}</p>
        </div>
      </div>
    </div>
  );
}
