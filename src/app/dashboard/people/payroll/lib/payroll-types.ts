// TypeScript types for payroll system

export interface PayrollEmployee {
  employeeId: string;
  fullName: string;
  payType: 'hourly' | 'salaried';
  hourlyRate: number | null;
  annualSalary: number | null;
  siteId: string | null;
  siteName: string | null;
  
  // Tax info
  taxCode: string | null;
  niCategory: string | null;
  pensionEnrolled: boolean;
  pensionContributionPct: number | null;
  studentLoan: boolean;
  studentLoanPlan: string | null;
  
  // Calculated
  hoursWorked: number; // Actual worked hours
  holidayHours: number; // Holiday hours (contracted hours × days taken)
  holidayPay: number; // Holiday pay amount
  grossPay: number; // Total gross pay (worked + holiday)
  
  // Deductions
  estimatedPaye: number;
  estimatedNi: number;
  employeePension: number;
  studentLoanDeduction: number;
  totalDeductions: number;
  estimatedNetPay: number;
  
  // Employer costs
  employerNi: number;
  employerPension: number;
  holidayAccrual: number;
  totalEmployerCost: number;
}

export interface SitePayroll {
  siteId: string | null;
  siteName: string;
  employees: PayrollEmployee[];
  
  // Site totals
  totalHours: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalEmployerCost: number;
}

export interface PayrollRun {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  payDate: Date;
  status: 'draft' | 'approved' | 'exported' | 'paid';
  
  sites: SitePayroll[];
  
  // Grand totals
  totalEmployees: number;
  totalHours: number;
  totalGrossPay: number;
  totalEmployerNi: number;
  totalEmployerPension: number;
  totalHolidayAccrual: number;
  totalEmployerCost: number;
}

