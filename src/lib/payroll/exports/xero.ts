// Xero Payroll CSV Export Format

export interface XeroPayrollRow {
  'Payroll Calendar': string;
  'Employee ID': string;
  'First Name': string;
  'Last Name': string;
  'Pay Period End Date': string;
  'Ordinary Hours': number;
  'Overtime Hours': number;
  'Leave Hours': number;
  'Hourly Rate': number;
  'Notes': string;
}

export interface PayrollEntry {
  employeePayrollId?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  periodEndDate: string; // YYYY-MM-DD
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  sickHours: number;
  hourlyRate?: number;
  notes?: string;
}

export function generateXeroCSV(entries: PayrollEntry[]): string {
  const headers = [
    'Payroll Calendar',
    'Employee ID', 
    'First Name',
    'Last Name',
    'Pay Period End Date',
    'Ordinary Hours',
    'Overtime Hours',
    'Leave Hours',
    'Hourly Rate',
    'Notes'
  ];
  
  const rows = entries.map(entry => {
    // Format date as DD/MM/YYYY for Xero
    const dateParts = entry.periodEndDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    return [
      'Weekly', // or 'Fortnightly', 'Monthly' - could be parameterized
      entry.employeePayrollId || entry.employeeId,
      entry.firstName,
      entry.lastName,
      formattedDate,
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      (entry.holidayHours + entry.sickHours).toFixed(2),
      entry.hourlyRate?.toFixed(2) || '',
      entry.notes || ''
    ];
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

