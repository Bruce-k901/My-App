'use client';

import { cn } from '@/lib/utils';
import { Package, AlertTriangle, CheckCircle, XCircle } from '@/components/ui/icons';
import type { PlanlyBadgeData } from '@/types/planly';

interface PlanlyBadgeProps {
  data: PlanlyBadgeData | null | undefined;
  size?: 'sm' | 'md';
  showDetails?: boolean;
  className?: string;
}

/**
 * Badge component showing Planly integration status for Stockly ingredients/products.
 * Shows whether an ingredient is linked to Planly and its configuration status.
 */
export function PlanlyBadge({ data, size = 'sm', showDetails = false, className }: PlanlyBadgeProps) {
  if (!data || !data.is_linked) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  const getStatusConfig = () => {
    switch (data.configuration_status) {
      case 'ready':
        return {
          bg: 'bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20',
          border: 'border-[#14B8A6]/30',
          text: 'text-[#14B8A6]',
          icon: CheckCircle,
          label: 'Planly Ready',
        };
      case 'incomplete':
        return {
          bg: 'bg-amber-100 dark:bg-amber-500/20',
          border: 'border-amber-300 dark:border-amber-500/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: AlertTriangle,
          label: 'Planly Setup Incomplete',
        };
      default:
        return {
          bg: 'bg-theme-muted',
          border: 'border-gray-200 dark:border-white/20',
          text: 'text-theme-secondary',
          icon: Package,
          label: 'Linked to Planly',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-medium',
          config.bg,
          config.border,
          config.text,
          sizeClasses[size]
        )}
        title={data.warning_message || config.label}
      >
        <Icon className={iconSize} />
        <span>Planly</span>
      </span>
      {showDetails && data.linked_groups && data.linked_groups.length > 0 && (
        <span className="text-xs text-theme-tertiary pl-1">
          {data.linked_groups.join(', ')}
        </span>
      )}
      {showDetails && data.missing_fields && data.missing_fields.length > 0 && (
        <span className="text-xs text-amber-600 dark:text-amber-400 pl-1">
          Missing: {data.missing_fields.join(', ')}
        </span>
      )}
    </div>
  );
}

/**
 * Inline badge for use in tables/lists - just shows a small indicator
 */
export function PlanlyBadgeInline({ isLinked, status }: { isLinked: boolean; status?: string }) {
  if (!isLinked) return null;

  const statusColor = status === 'ready'
    ? 'bg-[#14B8A6]'
    : status === 'incomplete'
    ? 'bg-amber-500'
    : 'bg-gray-400';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
        'bg-[#14B8A6]/10 text-[#14B8A6]'
      )}
      title="Linked to Planly"
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', statusColor)} />
      P
    </span>
  );
}
