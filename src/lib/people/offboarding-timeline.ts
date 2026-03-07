import type { OffboardingTimeline } from '@/types/offboarding';
import type { PayFrequency } from '@/types/teamly';
import { addWeeks } from './notice-calculator';

/**
 * Calculate key dates for the offboarding timeline.
 *
 * UK-specific dates:
 * - Tribunal claim window: 3 months less 1 day from effective termination date
 *   (ERA 2025 extends this to 6 months, expected implementation Oct 2026)
 * - Document retention: 6 years from termination (Limitation Act 1980)
 * - P45: must be issued "without unreasonable delay" — we use 14 days as guidance
 */
export function calculateOffboardingTimeline(params: {
  terminationInitiatedDate: string;
  noticeStartDate: string;
  noticeWeeks: number;
  lastWorkingDay: string;
  isPILON: boolean;
  payFrequency?: PayFrequency;
  terminationDate?: string; // effective date of termination
}): OffboardingTimeline {
  const {
    terminationInitiatedDate,
    noticeStartDate,
    noticeWeeks,
    lastWorkingDay,
    isPILON,
    payFrequency = 'monthly',
    terminationDate,
  } = params;

  // Notice end = notice start + applicable weeks
  const noticeEnd = isPILON ? noticeStartDate : addWeeks(noticeStartDate, noticeWeeks);

  // Effective termination date is the notice end date (or terminationDate if provided)
  const effectiveTermination = terminationDate || noticeEnd;

  // Final pay date: estimate based on pay frequency
  const finalPayDate = estimateNextPayDate(effectiveTermination, payFrequency);

  // P45 due: "without unreasonable delay" — use 14 days as guidance
  const p45DueBy = addDays(effectiveTermination, 14);

  // Tribunal claim window: 3 months less 1 day from effective termination
  const tribunalWindowEnd = calculateTribunalDeadline(effectiveTermination);

  // Document retention: 6 years from termination
  const retentionEnd = addYears(effectiveTermination, 6);

  return {
    termination_initiated: terminationInitiatedDate,
    notice_start: noticeStartDate,
    last_working_day: lastWorkingDay,
    notice_end: noticeEnd,
    final_pay_date: finalPayDate,
    p45_due_by: p45DueBy,
    tribunal_window_end: tribunalWindowEnd,
    document_retention_until: retentionEnd,
  };
}

/** Add days to an ISO date string */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/** Add years to an ISO date string */
function addYears(dateStr: string, years: number): string {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate tribunal claim deadline: 3 months less 1 day from termination.
 * Note: ERA 2025 extends this to 6 months (expected implementation Oct 2026).
 */
function calculateTribunalDeadline(terminationDate: string): string {
  const date = new Date(terminationDate);
  date.setMonth(date.getMonth() + 3);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/** Estimate the next pay date after termination based on pay frequency */
function estimateNextPayDate(terminationDate: string, frequency: PayFrequency): string {
  const date = new Date(terminationDate);

  switch (frequency) {
    case 'weekly':
      // Next Friday after termination
      const dayOfWeek = date.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      return addDays(terminationDate, daysUntilFriday);

    case 'fortnightly':
      // ~2 weeks after termination
      return addDays(terminationDate, 14);

    case 'four_weekly':
      // ~4 weeks after termination
      return addDays(terminationDate, 28);

    case 'monthly':
    default:
      // Last working day of the month, or the 25th/28th — estimate as end of month
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 28);
      return nextMonth.toISOString().split('T')[0];
  }
}
