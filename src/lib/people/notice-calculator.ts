import type { NoticePeriodCalculation } from '@/types/offboarding';
import type { TerminationReason } from '@/types/teamly';
import type { DismissalSubReason } from '@/types/offboarding';

/**
 * UK Statutory Notice Period Calculator
 *
 * Employment Rights Act 1996, s.86:
 * - < 1 month service: no statutory notice
 * - 1 month to < 2 years: 1 week
 * - 2–12 years: 1 week per complete year of service
 * - 12+ years: 12 weeks (statutory maximum)
 *
 * Employee → employer statutory minimum is always 1 week (after 1 month).
 * Contractual notice may be longer — whichever is greater applies.
 */

/** Calculate complete years and months of continuous service */
export function calculateServiceLength(
  startDate: string,
  endDate: string,
): { years: number; months: number; totalMonths: number } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (end.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    totalMonths: Math.max(0, years * 12 + months),
  };
}

/** Calculate statutory notice period in weeks (employer → employee) */
export function calculateStatutoryNotice(startDate: string, terminationDate: string): number {
  const { totalMonths, years } = calculateServiceLength(startDate, terminationDate);

  // Less than 1 month: no statutory notice
  if (totalMonths < 1) return 0;

  // 1 month to less than 2 years: 1 week
  if (years < 2) return 1;

  // 2–12 years: 1 week per complete year
  if (years <= 12) return years;

  // 12+ years: capped at 12 weeks
  return 12;
}

/** Add weeks to a date, returning ISO date string */
export function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the applicable notice period, comparing statutory vs contractual.
 * Returns full calculation with dates.
 */
export function calculateApplicableNotice(params: {
  startDate: string;
  terminationDate: string;
  contractualWeeks: number | null;
  terminationReason: TerminationReason;
  subReason?: DismissalSubReason | null;
  isPILON?: boolean;
}): NoticePeriodCalculation {
  const {
    startDate,
    terminationDate,
    contractualWeeks,
    terminationReason,
    subReason,
    isPILON = false,
  } = params;

  const service = calculateServiceLength(startDate, terminationDate);

  // Summary dismissal (gross misconduct) = zero notice
  const isSummaryDismissal =
    terminationReason === 'dismissed' && subReason === 'gross_misconduct';

  if (isSummaryDismissal) {
    return {
      statutory_weeks: 0,
      contractual_weeks: contractualWeeks ?? 0,
      applicable_weeks: 0,
      notice_start_date: terminationDate,
      notice_end_date: terminationDate,
      last_working_day: terminationDate,
      is_pilon: false,
      is_summary_dismissal: true,
      service_years: service.years,
      service_months: service.months,
    };
  }

  const statutory = calculateStatutoryNotice(startDate, terminationDate);
  const contractual = contractualWeeks ?? 0;
  const applicable = Math.max(statutory, contractual);

  // Notice starts today (or the date the process is initiated)
  const today = new Date().toISOString().split('T')[0];
  const noticeStart = today;
  const noticeEnd = addWeeks(noticeStart, applicable);

  // If PILON, last working day is today; otherwise it's the notice end
  const lastWorkingDay = isPILON ? today : noticeEnd;

  return {
    statutory_weeks: statutory,
    contractual_weeks: contractual,
    applicable_weeks: applicable,
    notice_start_date: noticeStart,
    notice_end_date: noticeEnd,
    last_working_day: lastWorkingDay,
    is_pilon: isPILON,
    is_summary_dismissal: false,
    service_years: service.years,
    service_months: service.months,
  };
}
