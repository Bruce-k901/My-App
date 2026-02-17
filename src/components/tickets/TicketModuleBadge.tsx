'use client';

import { TicketModule } from '@/types/tickets';

// ============================================================================
// TICKET MODULE BADGE
// ============================================================================
// Displays ticket module with brand colors
// Module color system: checkly=teamly (blush), stockly=emerald, teamly=blue,
// planly=orange, assetly=cyan, msgly=teal
// ============================================================================

interface TicketModuleBadgeProps {
  module: TicketModule;
}

const MODULE_CONFIG: Record<TicketModule, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  checkly: {
    label: 'Checkly',
    bgColor: 'bg-checkly-dark/10 dark:bg-checkly/10',
    textColor: 'text-checkly-dark dark:text-checkly',
    borderColor: 'border-checkly-dark/20 dark:border-checkly/20',
  },
  stockly: {
    label: 'Stockly',
    bgColor: 'bg-stockly-dark/10 dark:bg-stockly/10',
    textColor: 'text-stockly-dark dark:text-stockly',
    borderColor: 'border-stockly-dark/20 dark:border-stockly/20',
  },
  teamly: {
    label: 'Teamly',
    bgColor: 'bg-teamly-dark/10 dark:bg-teamly/10',
    textColor: 'text-teamly-dark dark:text-teamly',
    borderColor: 'border-teamly-dark/20 dark:border-teamly/20',
  },
  planly: {
    label: 'Planly',
    bgColor: 'bg-planly-dark/10 dark:bg-planly/10',
    textColor: 'text-planly-dark dark:text-planly',
    borderColor: 'border-planly-dark/20 dark:border-planly/20',
  },
  assetly: {
    label: 'Assetly',
    bgColor: 'bg-assetly-dark/10 dark:bg-assetly/10',
    textColor: 'text-assetly-dark dark:text-assetly',
    borderColor: 'border-assetly-dark/20 dark:border-assetly/20',
  },
  msgly: {
    label: 'Msgly',
    bgColor: 'bg-msgly-dark/10 dark:bg-msgly/10',
    textColor: 'text-msgly-dark dark:text-msgly',
    borderColor: 'border-msgly-dark/20 dark:border-msgly/20',
  },
  general: {
    label: 'General',
    bgColor: 'bg-gray-100 dark:bg-gray-500/10',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-500/20',
  },
};

export function TicketModuleBadge({ module }: TicketModuleBadgeProps) {
  const config = MODULE_CONFIG[module];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}
