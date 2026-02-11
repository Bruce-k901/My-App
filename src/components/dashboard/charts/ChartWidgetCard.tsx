'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Maximize2 } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  MODULE_COLOURS,
  MODULE_BADGE_COLOURS,
  MODULE_LABELS,
  type ModuleId,
} from '@/config/widget-registry';

interface ChartWidgetCardProps {
  title: string;
  module: ModuleId;
  viewAllHref?: string;
  onExpand?: () => void;
  children: ReactNode;
  className?: string;
}

export function ChartWidgetCard({
  title,
  module,
  viewAllHref,
  onExpand,
  children,
  className,
}: ChartWidgetCardProps) {
  const borderColor = MODULE_COLOURS[module];
  const badgeColors = MODULE_BADGE_COLOURS[module];
  const moduleLabel = MODULE_LABELS[module];

  return (
    <div
      className={cn(
        'bg-white dark:bg-[#171B2D]',
        'border-2 border-module-fg/[0.12]',
        'rounded-xl',
        'border-l-[4px]',
        borderColor,
        'p-5',
        'flex flex-col gap-3',
        'min-h-[280px] lg:min-h-[280px]',
        'shadow-lg shadow-black/[0.03] dark:shadow-black/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[9px] font-semibold uppercase tracking-[0.06em]',
              'px-1.5 py-0.5 rounded',
              badgeColors.text,
              badgeColors.bg
            )}
          >
            {moduleLabel}
          </span>
          <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-primary))] transition-colors"
              title="Expand chart"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[10px] text-teamly/70 hover:text-teamly transition-colors"
            >
              View all →
            </Link>
          )}
        </div>
      </div>

      {/* Chart content */}
      <div className="flex-1 min-h-[220px]">{children}</div>
    </div>
  );
}

export function ChartWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-[#171B2D] border-2 border-module-fg/[0.12] rounded-xl p-5 min-h-[280px] animate-pulse shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-12 bg-slate-200 dark:bg-white/10 rounded" />
        <div className="h-4 w-28 bg-slate-200 dark:bg-white/10 rounded" />
      </div>
      <div className="h-[200px] bg-slate-100 dark:bg-white/[0.02] rounded" />
    </div>
  );
}
