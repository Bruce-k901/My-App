// UK Payroll Calculation Functions
// These provide ESTIMATES for display - actual calculations done by accounting software

import { getCurrentRates } from './uk-rates';

/**
 * Calculate estimated PAYE tax (simplified - actual uses tax codes)
 */
export function estimatePAYE(annualGross: number, taxCode: string = '1257L'): number {
  const RATES = getCurrentRates();
  
  // Extract personal allowance from tax code (1257L = £12,570)
  const allowanceMatch = taxCode.match(/^(\d+)/);
  const personalAllowance = allowanceMatch ? parseInt(allowanceMatch[1]) * 10 : RATES.personalAllowance;
  
  const taxableIncome = Math.max(0, annualGross - personalAllowance);
  
  let tax = 0;
  
  if (taxableIncome <= RATES.incomeTax.basicRateLimit) {
    tax = taxableIncome * RATES.incomeTax.basicRate;
  } else if (taxableIncome <= RATES.incomeTax.higherRateLimit) {
    tax = (RATES.incomeTax.basicRateLimit * RATES.incomeTax.basicRate) +
          ((taxableIncome - RATES.incomeTax.basicRateLimit) * RATES.incomeTax.higherRate);
  } else {
    tax = (RATES.incomeTax.basicRateLimit * RATES.incomeTax.basicRate) +
          ((RATES.incomeTax.higherRateLimit - RATES.incomeTax.basicRateLimit) * RATES.incomeTax.higherRate) +
          ((taxableIncome - RATES.incomeTax.higherRateLimit) * RATES.incomeTax.additionalRate);
  }
  
  return tax;
}

/**
 * Calculate employee National Insurance
 */
export function calculateEmployeeNI(annualGross: number): number {
  const RATES = getCurrentRates();
  const { primaryThreshold, upperEarningsLimit, mainRate, upperRate } = RATES.employeeNI;
  
  if (annualGross <= primaryThreshold) return 0;
  
  if (annualGross <= upperEarningsLimit) {
    return (annualGross - primaryThreshold) * mainRate;
  }
  
  const mainBandNI = (upperEarningsLimit - primaryThreshold) * mainRate;
  const upperBandNI = (annualGross - upperEarningsLimit) * upperRate;
  
  return mainBandNI + upperBandNI;
}

/**
 * Calculate employer National Insurance
 */
export function calculateEmployerNI(annualGross: number): number {
  const RATES = getCurrentRates();
  const { secondaryThreshold, rate } = RATES.employerNI;
  
  if (annualGross <= secondaryThreshold) return 0;
  
  return (annualGross - secondaryThreshold) * rate;
}

/**
 * Calculate pension contributions
 */
export function calculatePension(
  annualGross: number,
  employeePct: number = 0.05,
  employerPct: number = 0.03
): { employee: number; employer: number } {
  const RATES = getCurrentRates();
  const { qualifyingEarningsLower, qualifyingEarningsUpper } = RATES.pension;
  
  // Pension is calculated on "qualifying earnings"
  const qualifyingEarnings = Math.min(
    Math.max(0, annualGross - qualifyingEarningsLower),
    qualifyingEarningsUpper - qualifyingEarningsLower
  );
  
  return {
    employee: qualifyingEarnings * employeePct,
    employer: qualifyingEarnings * employerPct,
  };
}

/**
 * Calculate student loan deduction
 */
export function calculateStudentLoan(
  monthlyGross: number,
  plan: string | null | undefined
): number {
  const RATES = getCurrentRates();
  const { studentLoans } = RATES;
  
  if (!plan) return 0;
  
  let threshold = 0;
  let rate = studentLoans.rate;
  
  switch (plan.toUpperCase()) {
    case 'PLAN1':
      threshold = studentLoans.plan1Threshold;
      break;
    case 'PLAN2':
      threshold = studentLoans.plan2Threshold;
      break;
    case 'PLAN4':
      threshold = studentLoans.plan4Threshold;
      break;
    case 'PLAN5':
      threshold = studentLoans.plan5Threshold;
      break;
    case 'PG':
    case 'POSTGRADUATE':
      threshold = studentLoans.postgraduateThreshold;
      rate = studentLoans.postgraduateRate;
      break;
    default:
      return 0;
  }
  
  if (monthlyGross <= threshold) return 0;
  
  return (monthlyGross - threshold) * rate;
}

/**
 * Calculate holiday accrual for irregular hours workers
 * UK uses 12.07% of hours worked method
 */
export function calculateHolidayAccrual(hoursWorked: number, hourlyRate: number): {
  hoursAccrued: number;
  valueAccrued: number;
} {
  const RATES = getCurrentRates();
  const hoursAccrued = hoursWorked * RATES.holidayAccrual.irregularHoursRate;
  const valueAccrued = hoursAccrued * hourlyRate;
  
  return { hoursAccrued, valueAccrued };
}

/**
 * Calculate total employer cost
 */
export function calculateEmployerCost(
  grossPay: number,
  pensionEnrolled: boolean = false,
  employerPensionPct: number = 0.03,
  includeHolidayAccrual: boolean = true,
  hourlyRate: number = 0,
  hoursWorked: number = 0
): {
  grossPay: number;
  employerNI: number;
  employerPension: number;
  holidayAccrual: number;
  totalCost: number;
} {
  const annualizedGross = grossPay * 12; // Estimate for calculations
  
  const employerNI = calculateEmployerNI(annualizedGross) / 12;
  
  const pension = pensionEnrolled 
    ? calculatePension(annualizedGross, 0.05, employerPensionPct)
    : { employee: 0, employer: 0 };
  
  const holidayAccrual = includeHolidayAccrual && hourlyRate > 0
    ? calculateHolidayAccrual(hoursWorked, hourlyRate).valueAccrued
    : 0;
  
  return {
    grossPay,
    employerNI,
    employerPension: pension.employer / 12,
    holidayAccrual,
    totalCost: grossPay + employerNI + (pension.employer / 12) + holidayAccrual,
  };
}

export interface PayrollCalculation {
  grossPay: number;
  estimatedPAYE: number;
  employeeNI: number;
  employeePension: number;
  studentLoan: number;
  netPay: number;
  employerNI: number;
  employerPension: number;
  holidayAccrual: number;
  totalEmployerCost: number;
}

export interface EmployeePayrollData {
  payType: 'hourly' | 'salaried' | 'zero_hours';
  hourlyRate?: number;
  annualSalary?: number;
  taxCode: string;
  niCategory: string;
  pensionEnrolled: boolean;
  pensionEmployeePct: number;
  pensionEmployerPct: number;
  studentLoanPlan?: string | null;
}

export interface HoursData {
  regular: number;
  overtime: number;
  holiday: number;
  sick: number;
}

/**
 * Full payroll calculation for one employee
 */
export function calculatePayrollEntry(
  employee: EmployeePayrollData,
  hours: HoursData,
  overtimeMultiplier: number = 1.5
): PayrollCalculation {
  // Calculate gross pay
  let grossPay = 0;
  let hourlyRate = employee.hourlyRate || 0;
  
  if (employee.payType === 'salaried') {
    // Salaried: monthly portion of annual salary
    grossPay = (employee.annualSalary || 0) / 12;
    // Calculate effective hourly rate for records
    hourlyRate = employee.annualSalary ? employee.annualSalary / 52 / 40 : 0;
  } else {
    // Hourly/Zero hours
    const regularPay = hours.regular * hourlyRate;
    const overtimePay = hours.overtime * hourlyRate * overtimeMultiplier;
    const holidayPay = hours.holiday * hourlyRate;
    const sickPay = hours.sick * hourlyRate; // Simplified - actual SSP rules more complex
    grossPay = regularPay + overtimePay + holidayPay + sickPay;
  }
  
  // Annualize for tax calculations
  const annualizedGross = grossPay * 12;
  
  // Calculate deductions
  const estimatedPAYE = estimatePAYE(annualizedGross, employee.taxCode) / 12;
  const employeeNI = calculateEmployeeNI(annualizedGross) / 12;
  const pension = employee.pensionEnrolled 
    ? calculatePension(annualizedGross, employee.pensionEmployeePct, employee.pensionEmployerPct)
    : { employee: 0, employer: 0 };
  
  // Student loan
  const studentLoan = calculateStudentLoan(grossPay, employee.studentLoanPlan);
  
  // Employer costs
  const employerNI = calculateEmployerNI(annualizedGross) / 12;
  const totalHours = hours.regular + hours.overtime + hours.holiday + hours.sick;
  const holidayAccrual = employee.payType !== 'salaried' 
    ? calculateHolidayAccrual(totalHours, hourlyRate)
    : { hoursAccrued: 0, valueAccrued: 0 };
  
  // Net pay
  const netPay = grossPay - estimatedPAYE - employeeNI - (pension.employee / 12) - studentLoan;
  
  return {
    grossPay,
    estimatedPAYE,
    employeeNI,
    employeePension: pension.employee / 12,
    studentLoan,
    netPay,
    employerNI,
    employerPension: pension.employer / 12,
    holidayAccrual: holidayAccrual.valueAccrued,
    totalEmployerCost: grossPay + employerNI + (pension.employer / 12) + holidayAccrual.valueAccrued,
  };
}

