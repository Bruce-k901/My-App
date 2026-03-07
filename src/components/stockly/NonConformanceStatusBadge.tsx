// @salsa - SALSA Compliance: Non-conformance status badge component
'use client';

import { NonConformanceStatus } from '@/lib/types/stockly';

const STATUS_CONFIG: Record<NonConformanceStatus, { label: string; classes: string }> = {
  open: { label: 'Open', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  investigating: { label: 'Investigating', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  corrective_action: { label: 'Corrective Action', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  verification: { label: 'Verification', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  closed: { label: 'Closed', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

interface NonConformanceStatusBadgeProps {
  status: NonConformanceStatus;
  className?: string;
}

export default function NonConformanceStatusBadge({ status, className = '' }: NonConformanceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}
