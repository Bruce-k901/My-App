'use client';

import { Download } from '@/components/ui/icons';
import type { EmployeeCompliance } from '@/types/compliance';

interface ComplianceExportProps {
  data: EmployeeCompliance[];
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ComplianceExport({ data }: ComplianceExportProps) {
  const exportCSV = () => {
    const headers = [
      'Employee',
      'Employee Number',
      'Department',
      'RTW Status',
      'RTW Expiry',
      'DBS Status',
      'Training Status',
      'Documents Status',
      'Probation Status',
      'Overall Score %',
    ];

    const rows = data.map((e) => [
      e.fullName,
      e.employeeNumber || '',
      e.department || '',
      statusLabel(e.rtw),
      e.items.find((i) => i.category === 'right_to_work' && i.expiryDate)?.expiryDate || '',
      statusLabel(e.dbs),
      statusLabel(e.training),
      statusLabel(e.documents),
      statusLabel(e.probation),
      String(e.overallScore),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportCSV}
      className="flex items-center gap-2 rounded-lg bg-theme-surface-elevated border border-theme px-4 py-2 text-sm font-medium text-theme-primary hover:bg-theme-hover transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
