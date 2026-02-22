'use client';

import { TicketType } from '@/types/tickets';

// ============================================================================
// TICKET TYPE BADGE
// ============================================================================
// Displays ticket type (issue, idea, question) with icon
// ============================================================================

interface TicketTypeBadgeProps {
  type: TicketType;
  showIcon?: boolean;
}

const TYPE_CONFIG: Record<TicketType, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon?: string;
}> = {
  issue: {
    label: 'Issue',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-500/20',
    icon: '⚠',
  },
  idea: {
    label: 'Idea',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500/20',
    icon: '💡',
  },
  question: {
    label: 'Question',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: '?',
  },
};

export function TicketTypeBadge({ type, showIcon = true }: TicketTypeBadgeProps) {
  const config = TYPE_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {showIcon && config.icon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
