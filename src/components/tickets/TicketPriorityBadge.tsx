'use client';

import { TicketPriority } from '@/types/tickets';

// ============================================================================
// TICKET PRIORITY BADGE
// ============================================================================
// Displays ticket priority with appropriate color coding
// ============================================================================

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  showIcon?: boolean;
}

const PRIORITY_CONFIG: Record<TicketPriority, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon?: string;
}> = {
  low: {
    label: 'Low',
    bgColor: 'bg-theme-surface-elevated0/10',
    textColor: 'text-theme-secondary',
    borderColor: 'border-gray-500/20',
    icon: '▾',
  },
  medium: {
    label: 'Medium',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: '▸',
  },
  high: {
    label: 'High',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500/20',
    icon: '▴',
  },
  urgent: {
    label: 'Urgent',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-500/20',
    icon: '▲',
  },
};

export function TicketPriorityBadge({ priority, showIcon = true }: TicketPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {showIcon && config.icon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
