import type { FinalPayEstimate } from '@/types/offboarding';
import { calculateServiceLength } from './notice-calculator';

/**
 * UK Final Pay Calculator
 *
 * Calculates estimated final pay on termination including:
 * - Outstanding wages
 * - Accrued but untaken holiday pay
 * - Notice pay (if PILON)
 * - Statutory redundancy pay (if applicable)
 *
 * All amounts in pence for precision (matching existing hourly_rate convention).
 *
 * IMPORTANT: These are estimates. Actual payroll processing should be done
 * through the payroll system. This provides indicative figures for the
 * offboarding wizard.
 */

// UK Statutory redundancy pay cap — updated annually each April
// Current: 6 April 2025 to 5 April 2026
export const STATUTORY_REDUNDANCY_WEEKLY_CAP = 71900; // £719 in pence
export const STATUTORY_REDUNDANCY_MAX_YEARS = 20;

/** Calculate accrued holiday entitlement on termination */
export function calculateAccruedHoliday(params: {
  annualEntitlement: number; // days (e.g. 28)
  holidayYearStartMonth: number; // 1-12
  holidayYearStartDay: number; // 1-31
  terminationDate: string;
  daysTaken: number;
  useAnniversaryYear?: boolean;
  startDate?: string; // employee start date, for anniversary year
}): { accruedDays: number; remainingDays: number; entitled: number; taken: number } {
  const {
    annualEntitlement,
    holidayYearStartMonth,
    holidayYearStartDay,
    terminationDate,
    daysTaken,
    useAnniversaryYear = false,
    startDate,
  } = params;

  const termDate = new Date(terminationDate);

  // Determine holiday year start for this year
  let yearStart: Date;
  if (useAnniversaryYear && startDate) {
    // Anniversary year: uses employee start date month/day
    const sd = new Date(startDate);
    yearStart = new Date(termDate.getFullYear(), sd.getMonth(), sd.getDate());
    if (yearStart > termDate) {
      yearStart = new Date(termDate.getFullYear() - 1, sd.getMonth(), sd.getDate());
    }
  } else {
    // Fixed company year
    yearStart = new Date(termDate.getFullYear(), holidayYearStartMonth - 1, holidayYearStartDay);
    if (yearStart > termDate) {
      yearStart = new Date(termDate.getFullYear() - 1, holidayYearStartMonth - 1, holidayYearStartDay);
    }
  }

  const yearEnd = new Date(yearStart);
  yearEnd.setFullYear(yearEnd.getFullYear() + 1);

  // Calculate proportion of holiday year elapsed
  const totalDaysInYear = (yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed = (termDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24);
  const proportion = Math.min(1, Math.max(0, daysElapsed / totalDaysInYear));

  // Pro-rata entitlement
  const accruedDays = Math.round(annualEntitlement * proportion * 10) / 10; // 1 decimal place
  const remainingDays = Math.round((accruedDays - daysTaken) * 10) / 10;

  return {
    accruedDays,
    remainingDays, // can be negative if overpaid
    entitled: annualEntitlement,
    taken: daysTaken,
  };
}

/**
 * Calculate UK statutory redundancy pay.
 *
 * Eligibility: 2+ years continuous service, dismissed by reason of redundancy.
 *
 * Rates per complete year of service:
 * - Age under 22: 0.5 weeks
 * - Age 22–40: 1 week
 * - Age 41+: 1.5 weeks
 *
 * Weekly pay is capped at statutory limit.
 * Maximum 20 years of service counted.
 */
export function calculateStatutoryRedundancyPay(params: {
  startDate: string;
  terminationDate: string;
  dateOfBirth: string;
  weeklyPay: number; // actual weekly pay in pence
}): { amount: number; qualifyingYears: number; weeklyPayUsed: number; ageAtTermination: number } {
  const { startDate, terminationDate, dateOfBirth, weeklyPay } = params;
  const service = calculateServiceLength(startDate, terminationDate);

  // Must have 2+ years service
  if (service.years < 2) {
    return { amount: 0, qualifyingYears: 0, weeklyPayUsed: 0, ageAtTermination: 0 };
  }

  const cappedWeeklyPay = Math.min(weeklyPay, STATUTORY_REDUNDANCY_WEEKLY_CAP);
  const qualifyingYears = Math.min(service.years, STATUTORY_REDUNDANCY_MAX_YEARS);

  // Calculate age at termination
  const termDate = new Date(terminationDate);
  const dob = new Date(dateOfBirth);
  let age = termDate.getFullYear() - dob.getFullYear();
  const monthDiff = termDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && termDate.getDate() < dob.getDate())) {
    age--;
  }

  // Work backwards through each qualifying year, using age at start of that year
  let totalWeeks = 0;
  for (let i = 0; i < qualifyingYears; i++) {
    const ageInYear = age - i;
    if (ageInYear >= 41) {
      totalWeeks += 1.5;
    } else if (ageInYear >= 22) {
      totalWeeks += 1;
    } else {
      totalWeeks += 0.5;
    }
  }

  const amount = Math.round(totalWeeks * cappedWeeklyPay);

  return {
    amount,
    qualifyingYears,
    weeklyPayUsed: cappedWeeklyPay,
    ageAtTermination: age,
  };
}

/** Calculate full final pay estimate */
export function calculateFinalPay(params: {
  hourlyRate: number | null; // pence (stored as pence in DB)
  salary: number | null; // annual salary (pounds)
  contractedHoursPerWeek: number | null;
  terminationDate: string;
  lastWorkingDay: string;
  isPILON: boolean;
  isRedundancy: boolean;
  noticePeriodWeeks: number;
  dateOfBirth: string | null;
  startDate: string;
  annualLeaveAllowance: number;
  holidayDaysTaken: number;
  holidayYearStartMonth: number;
  holidayYearStartDay: number;
}): FinalPayEstimate {
  const {
    hourlyRate,
    salary,
    contractedHoursPerWeek,
    terminationDate,
    lastWorkingDay,
    isPILON,
    isRedundancy,
    noticePeriodWeeks,
    dateOfBirth,
    startDate,
    annualLeaveAllowance,
    holidayDaysTaken,
    holidayYearStartMonth,
    holidayYearStartDay,
  } = params;

  // Calculate daily and weekly rates
  const hoursPerWeek = contractedHoursPerWeek ?? 40;
  let weeklyRate: number;
  let dailyRate: number;

  if (salary && salary > 0) {
    // Salary-based: annual salary / 52 weeks
    weeklyRate = Math.round((salary * 100) / 52); // convert to pence
    dailyRate = Math.round(weeklyRate / 5);
  } else if (hourlyRate && hourlyRate > 0) {
    // Hourly rate (already in pence)
    weeklyRate = hourlyRate * hoursPerWeek;
    dailyRate = Math.round(weeklyRate / 5);
  } else {
    weeklyRate = 0;
    dailyRate = 0;
  }

  // Outstanding wages: working days from last pay to last working day
  // This is a rough estimate — actual payroll handles precise calculation
  const today = new Date();
  const lastDay = new Date(lastWorkingDay);
  const workingDaysRemaining = Math.max(
    0,
    Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)) * 5,
  );
  const outstandingWages = workingDaysRemaining * dailyRate;

  // Accrued holiday
  const holiday = calculateAccruedHoliday({
    annualEntitlement: annualLeaveAllowance || 28,
    holidayYearStartMonth: holidayYearStartMonth || 1,
    holidayYearStartDay: holidayYearStartDay || 1,
    terminationDate,
    daysTaken: holidayDaysTaken,
    startDate,
  });
  const accruedHolidayPay = Math.max(0, Math.round(holiday.remainingDays * dailyRate));

  // Notice pay (if PILON — employer pays in lieu of working the notice)
  const noticePay = isPILON ? noticePeriodWeeks * weeklyRate : 0;

  // Statutory redundancy pay
  let redundancyPay = 0;
  let redundancyDetails = { amount: 0, qualifyingYears: 0, weeklyPayUsed: 0, ageAtTermination: 0 };

  if (isRedundancy && dateOfBirth) {
    redundancyDetails = calculateStatutoryRedundancyPay({
      startDate,
      terminationDate,
      dateOfBirth,
      weeklyPay: weeklyRate,
    });
    redundancyPay = redundancyDetails.amount;
  }

  const totalFinalPay = outstandingWages + accruedHolidayPay + noticePay + redundancyPay;

  return {
    outstanding_wages: outstandingWages,
    accrued_holiday_pay: accruedHolidayPay,
    accrued_holiday_days: Math.max(0, holiday.remainingDays),
    notice_pay: noticePay,
    statutory_redundancy_pay: redundancyPay,
    total_final_pay: totalFinalPay,
    daily_rate: dailyRate,
    weekly_rate: weeklyRate,
    working_days_remaining: workingDaysRemaining,
    holiday_days_entitled: holiday.entitled,
    holiday_days_taken: holiday.taken,
    holiday_days_remaining: holiday.remainingDays,
    redundancy_qualifying_years: redundancyDetails.qualifyingYears,
    redundancy_weekly_pay_used: redundancyDetails.weeklyPayUsed,
    age_at_termination: redundancyDetails.ageAtTermination,
  };
}
