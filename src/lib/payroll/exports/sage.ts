// Sage Payroll CSV Export Format

export interface PayrollEntry {
  employeePayrollId?: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  periodEndDate: string; // YYYY-MM-DD
  regularHours: number;
  overtimeHours: number;
  hourlyRate?: number;
  overtimeRate?: number;
  payType: 'hourly' | 'salaried' | 'zero_hours';
}

export function generateSageCSV(entries: PayrollEntry[]): string {
  const headers = [
    'Employee Reference',
    'Surname',
    'Forename', 
    'Hours Worked',
    'Pay Rate',
    'Overtime Hours',
    'Overtime Rate',
    'Payment Type',
    'Pay Date'
  ];
  
  const rows = entries.map(entry => {
    // Format date as DD/MM/YYYY for Sage
    const dateParts = entry.periodEndDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    return [
      entry.employeePayrollId || entry.employeeId,
      entry.lastName,
      entry.firstName,
      entry.regularHours.toFixed(2),
      entry.hourlyRate?.toFixed(2) || '',
      entry.overtimeHours.toFixed(2),
      entry.overtimeRate?.toFixed(2) || '',
      entry.payType === 'salaried' ? 'Salary' : 'Hourly',
      formattedDate
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

