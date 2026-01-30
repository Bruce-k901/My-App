// Generic CSV Export Format (Flexible)

export interface PayrollEntry {
  employeePayrollId?: string;
  employeeId: string;
  employeeName: string;
  periodStartDate: string; // YYYY-MM-DD
  periodEndDate: string; // YYYY-MM-DD
  payType: 'hourly' | 'salaried' | 'zero_hours';
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  sickHours: number;
  totalHours: number;
  hourlyRate?: number;
  grossPay?: number;
  estimatedPaye?: number;
  estimatedEmployeeNi?: number;
  estimatedEmployeePension?: number;
  estimatedNetPay?: number;
  employerNi?: number;
  employerPension?: number;
  holidayAccrual?: number;
  totalEmployerCost?: number;
}

export interface ExportOptions {
  includeGrossPay?: boolean;
  includeEmployerCosts?: boolean;
  includeTaxEstimates?: boolean;
}

export function generateGenericCSV(
  entries: PayrollEntry[],
  options: ExportOptions = {}
): string {
  const {
    includeGrossPay = true,
    includeEmployerCosts = false,
    includeTaxEstimates = false,
  } = options;
  
  const headers = [
    'Employee ID',
    'Employee Name',
    'Pay Period Start',
    'Pay Period End',
    'Pay Type',
    'Regular Hours',
    'Overtime Hours',
    'Holiday Hours',
    'Sick Hours',
    'Total Hours',
    'Hourly Rate',
  ];
  
  if (includeGrossPay) {
    headers.push('Gross Pay');
  }
  
  if (includeTaxEstimates) {
    headers.push('Est. PAYE', 'Est. Employee NI', 'Est. Employee Pension', 'Est. Net Pay');
  }
  
  if (includeEmployerCosts) {
    headers.push('Employer NI', 'Employer Pension', 'Holiday Accrual', 'Total Employer Cost');
  }
  
  const rows = entries.map(entry => {
    const row = [
      entry.employeePayrollId || entry.employeeId,
      entry.employeeName,
      entry.periodStartDate,
      entry.periodEndDate,
      entry.payType,
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.holidayHours.toFixed(2),
      entry.sickHours.toFixed(2),
      entry.totalHours.toFixed(2),
      entry.hourlyRate?.toFixed(2) || '',
    ];
    
    if (includeGrossPay && entry.grossPay !== undefined) {
      row.push(entry.grossPay.toFixed(2));
    }
    
    if (includeTaxEstimates) {
      row.push(
        entry.estimatedPaye?.toFixed(2) || '0.00',
        entry.estimatedEmployeeNi?.toFixed(2) || '0.00',
        entry.estimatedEmployeePension?.toFixed(2) || '0.00',
        entry.estimatedNetPay?.toFixed(2) || '0.00'
      );
    }
    
    if (includeEmployerCosts) {
      row.push(
        entry.employerNi?.toFixed(2) || '0.00',
        entry.employerPension?.toFixed(2) || '0.00',
        entry.holidayAccrual?.toFixed(2) || '0.00',
        entry.totalEmployerCost?.toFixed(2) || '0.00'
      );
    }
    
    return row;
  });
  
  // Escape commas and quotes in CSV
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvRows = [headers, ...rows].map(row => 
    row.map(cell => escapeCSV(String(cell))).join(',')
  );
  
  return csvRows.join('\n');
}

