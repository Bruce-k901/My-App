'use client';

import { TicketStatus } from '@/types/tickets';

// ============================================================================
// TICKET STATUS BADGE
// ============================================================================
// Displays ticket status with appropriate color coding
// ============================================================================

interface TicketStatusBadgeProps {
  status: TicketStatus;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon?: string;
}> = {
  open: {
    label: 'Open',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: '●',
  },
  in_progress: {
    label: 'In Progress',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-yellow-500/20',
    icon: '◐',
  },
  resolved: {
    label: 'Resolved',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500/20',
    icon: '✓',
  },
  closed: {
    label: 'Closed',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-500/20',
    icon: '✕',
  },
};

export function TicketStatusBadge({ status, showIcon = true }: TicketStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {showIcon && config.icon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
