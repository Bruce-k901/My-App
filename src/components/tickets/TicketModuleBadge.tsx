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
    bgColor: 'bg-teamly/10',
    textColor: 'text-teamly dark:text-teamly',
    borderColor: 'border-teamly/20',
  },
  stockly: {
    label: 'Stockly',
    bgColor: 'bg-module-fg/10',
    textColor: 'text-module-fg',
    borderColor: 'border-module-fg/30',
  },
  teamly: {
    label: 'Teamly',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/20',
  },
  planly: {
    label: 'Planly',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  assetly: {
    label: 'Assetly',
    bgColor: 'bg-module-fg/10',
    textColor: 'text-module-fg',
    borderColor: 'border-module-fg/30',
  },
  msgly: {
    label: 'Msgly',
    bgColor: 'bg-module-fg/10',
    textColor: 'text-module-fg',
    borderColor: 'border-module-fg/30',
  },
  general: {
    label: 'General',
    bgColor: 'bg-theme-surface-elevated0/10',
    textColor: 'text-theme-secondary',
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
