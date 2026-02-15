// QuickBooks IIF Export Format

export interface PayrollEntry {
  employeeName: string;
  periodEndDate: string; // YYYY-MM-DD
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  sickHours: number;
}

export function generateQuickBooksIIF(entries: PayrollEntry[]): string {
  const lines: string[] = [];
  
  // Header
  lines.push('!TIMERHDR\tVER\tREL\tCOMPANYNAME\tIMPORTEDBEFORE\tFROMTIMER\tTIME');
  lines.push('TIMERHDR\t8\t0\t\tN\tN\t0');
  
  // Time entries
  lines.push('!TIMEACT\tDATE\tJOB\tEMP\tITEM\tDURATION\tNOTE');
  
  entries.forEach(entry => {
    // Format date as MM/DD/YYYY for QuickBooks
    const dateParts = entry.periodEndDate.split('-');
    const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
    
    if (entry.regularHours > 0) {
      lines.push([
        'TIMEACT',
        formattedDate,
        '',
        entry.employeeName,
        'Regular',
        formatDuration(entry.regularHours),
        ''
      ].join('\t'));
    }
    
    if (entry.overtimeHours > 0) {
      lines.push([
        'TIMEACT',
        formattedDate,
        '',
        entry.employeeName,
        'Overtime',
        formatDuration(entry.overtimeHours),
        ''
      ].join('\t'));
    }
    
    if (entry.holidayHours > 0) {
      lines.push([
        'TIMEACT',
        formattedDate,
        '',
        entry.employeeName,
        'Holiday',
        formatDuration(entry.holidayHours),
        ''
      ].join('\t'));
    }
    
    if (entry.sickHours > 0) {
      lines.push([
        'TIMEACT',
        formattedDate,
        '',
        entry.employeeName,
        'Sick',
        formatDuration(entry.sickHours),
        ''
      ].join('\t'));
    }
  });
  
  return lines.join('\n');
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

