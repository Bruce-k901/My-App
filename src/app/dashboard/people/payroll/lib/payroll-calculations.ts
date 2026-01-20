// Payroll calculation functions
// UK Tax Rates 2024/25

import { PayrollEmployee } from './payroll-types';

const TAX_RATES = {
  personalAllowance: 12570,
  basicRateLimit: 37700,
  basicRate: 0.20,
  higherRate: 0.40,
  
  niPrimaryThreshold: 12570,
  niUpperLimit: 50270,
  niMainRate: 0.08,
  niUpperRate: 0.02,
  
  niEmployerThreshold: 9100,
  niEmployerRate: 0.138,
  
  holidayAccrualRate: 0.1207, // 12.07%
  
  studentLoanThresholds: {
    plan1: 22015,
    plan2: 27295,
    plan4: 27660,
    plan5: 25000,
    postgrad: 21000,
  },
  studentLoanRate: 0.09,
  postgradRate: 0.06,
};

interface EmployeeInput {
  employeeId: string;
  fullName: string;
  payType: string;
  hourlyRate: number | null;
  annualSalary: number | null;
  siteId: string | null;
  siteName: string | null;
  taxCode: string | null;
  niCategory: string | null;
  pensionEnrolled: boolean;
  pensionContributionPct: number | null;
  studentLoan: boolean;
  studentLoanPlan: string | null;
  hoursWorked: number;
  holidayHours?: number; // Holiday hours (contracted hours × days taken)
  contractedHours?: number | null; // Weekly contracted hours for holiday calculation
  payPeriodsPerYear?: number; // For salaried: 12 (monthly) or 52 (weekly)
}

export function calculatePayrollForEmployee(input: EmployeeInput): PayrollEmployee {
  const {
    employeeId,
    fullName,
    payType,
    hourlyRate,
    annualSalary,
    siteId,
    siteName,
    taxCode,
    niCategory,
    pensionEnrolled,
    pensionContributionPct,
    studentLoan,
    studentLoanPlan,
    hoursWorked,
    holidayHours = 0,
    contractedHours,
    payPeriodsPerYear = 12, // Default to monthly
  } = input;

  // Calculate holiday pay
  // Holiday pay = holiday hours × hourly rate
  // For hourly employees: use hourly_rate
  // For salaried: calculate effective hourly rate from annual salary
  let holidayPay = 0;
  if (holidayHours > 0 && hourlyRate) {
    holidayPay = holidayHours * hourlyRate;
  } else if (holidayHours > 0 && payType === 'salaried' && annualSalary && contractedHours) {
    // For salaried: calculate effective hourly rate
    // Annual salary / (52 weeks × contracted hours per week)
    const effectiveHourlyRate = annualSalary / (52 * contractedHours);
    holidayPay = holidayHours * effectiveHourlyRate;
  }

  // Calculate gross pay (worked hours + holiday pay)
  let workedPay = 0;
  let effectiveAnnualSalary = 0;
  
  if (payType === 'salaried' && annualSalary) {
    // Salaried: divide by pay periods per year (12 for monthly, 52 for weekly)
    workedPay = annualSalary / payPeriodsPerYear;
    effectiveAnnualSalary = annualSalary;
  } else if (hourlyRate) {
    // Hourly: hours × rate
    workedPay = hoursWorked * hourlyRate;
    effectiveAnnualSalary = (workedPay + holidayPay) * payPeriodsPerYear; // Annualize for tax calc
  }
  
  const grossPay = workedPay + holidayPay;

  // Estimate PAYE
  let estimatedPaye = 0;
  if (effectiveAnnualSalary > TAX_RATES.personalAllowance) {
    const taxableIncome = effectiveAnnualSalary - TAX_RATES.personalAllowance;
    
    if (taxableIncome <= TAX_RATES.basicRateLimit) {
      estimatedPaye = taxableIncome * TAX_RATES.basicRate;
    } else {
      estimatedPaye = (TAX_RATES.basicRateLimit * TAX_RATES.basicRate) +
                      ((taxableIncome - TAX_RATES.basicRateLimit) * TAX_RATES.higherRate);
    }
    estimatedPaye = estimatedPaye / payPeriodsPerYear; // Monthly or weekly
  }

  // Estimate Employee NI
  let estimatedNi = 0;
  if (effectiveAnnualSalary > TAX_RATES.niPrimaryThreshold) {
    if (effectiveAnnualSalary <= TAX_RATES.niUpperLimit) {
      estimatedNi = (effectiveAnnualSalary - TAX_RATES.niPrimaryThreshold) * TAX_RATES.niMainRate;
    } else {
      estimatedNi = ((TAX_RATES.niUpperLimit - TAX_RATES.niPrimaryThreshold) * TAX_RATES.niMainRate) +
                    ((effectiveAnnualSalary - TAX_RATES.niUpperLimit) * TAX_RATES.niUpperRate);
    }
    estimatedNi = estimatedNi / payPeriodsPerYear; // Monthly or weekly
  }

  // Employee Pension
  let employeePension = 0;
  if (pensionEnrolled && pensionContributionPct) {
    employeePension = grossPay * (pensionContributionPct / 100);
  }

  // Student Loan
  let studentLoanDeduction = 0;
  if (studentLoan && studentLoanPlan) {
    const threshold = TAX_RATES.studentLoanThresholds[studentLoanPlan as keyof typeof TAX_RATES.studentLoanThresholds] || 0;
    const periodThreshold = threshold / payPeriodsPerYear;
    
    if (grossPay > periodThreshold) {
      const rate = studentLoanPlan === 'postgrad' ? TAX_RATES.postgradRate : TAX_RATES.studentLoanRate;
      studentLoanDeduction = (grossPay - periodThreshold) * rate;
    }
  }

  const totalDeductions = estimatedPaye + estimatedNi + employeePension + studentLoanDeduction;
  const estimatedNetPay = grossPay - totalDeductions;

  // Employer NI
  let employerNi = 0;
  if (effectiveAnnualSalary > TAX_RATES.niEmployerThreshold) {
    employerNi = ((effectiveAnnualSalary - TAX_RATES.niEmployerThreshold) * TAX_RATES.niEmployerRate) / payPeriodsPerYear;
  }

  // Employer Pension
  let employerPension = 0;
  if (pensionEnrolled) {
    const employerPct = 0.03; // Default 3%
    employerPension = grossPay * employerPct;
  }

  // Holiday Accrual (only for hourly workers)
  let holidayAccrual = 0;
  if (payType === 'hourly' && hourlyRate) {
    holidayAccrual = hoursWorked * hourlyRate * TAX_RATES.holidayAccrualRate;
  }

  const totalEmployerCost = grossPay + employerNi + employerPension + holidayAccrual;

  return {
    employeeId,
    fullName,
    payType: payType as 'hourly' | 'salaried',
    hourlyRate,
    annualSalary,
    siteId,
    siteName,
    taxCode,
    niCategory,
    pensionEnrolled,
    pensionContributionPct,
    studentLoan,
    studentLoanPlan,
    hoursWorked,
    holidayHours,
    holidayPay,
    grossPay,
    estimatedPaye,
    estimatedNi,
    employeePension,
    studentLoanDeduction,
    totalDeductions,
    estimatedNetPay,
    employerNi,
    employerPension,
    holidayAccrual,
    totalEmployerCost,
  };
}

