'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MODULE_COLOURS, MODULE_BADGE_COLOURS, MODULE_LABELS, type ModuleId } from '@/config/widget-registry';

interface WidgetCardProps {
  title: string;
  module: ModuleId;
  viewAllHref?: string;
  children: ReactNode;
  className?: string;
}

/**
 * WidgetCard - Wrapper component for dashboard widgets
 *
 * Features:
 * - Module-coloured left border (3px)
 * - Module badge (small uppercase label)
 * - Optional "View all →" link
 * - Consistent styling with Opsly colour system
 */
export function WidgetCard({
  title,
  module,
  viewAllHref,
  children,
  className,
}: WidgetCardProps) {
  const borderColor = MODULE_COLOURS[module];
  const badgeColors = MODULE_BADGE_COLOURS[module];
  const moduleLabel = MODULE_LABELS[module];

  return (
    <div
      className={cn(
        'bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D]',
        'border border-white/[0.06] rounded-lg',
        'border-l-[3px]',
        borderColor,
        'p-4',
        'flex flex-col gap-2.5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Module badge */}
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
          {/* Widget title */}
          <span className="text-[13px] font-semibold text-white">
            {title}
          </span>
        </div>
        {/* View all link */}
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-[10px] text-fuchsia-400/70 hover:text-fuchsia-400 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      {/* Widget content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

/**
 * WidgetSkeleton - Loading skeleton for widgets
 */
export function WidgetSkeleton() {
  return (
    <div className="bg-[#171B2D] border border-white/[0.06] rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-12 bg-white/10 rounded" />
        <div className="h-4 w-24 bg-white/10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-white/5 rounded" />
        <div className="h-3 w-3/4 bg-white/5 rounded" />
        <div className="h-3 w-1/2 bg-white/5 rounded" />
      </div>
    </div>
  );
}

/**
 * CountBadge - Status count badge for widgets
 */
interface CountBadgeProps {
  count: number;
  label: string;
  status?: 'urgent' | 'warning' | 'good' | 'neutral';
}

export function CountBadge({ count, label, status = 'urgent' }: CountBadgeProps) {
  const statusColors = {
    urgent: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-400/30',
    warning: 'bg-blue-500/10 text-blue-400 border-blue-400/30',
    good: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/30',
    neutral: 'bg-white/[0.03] text-white/40 border-white/10',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'text-base font-bold w-8 h-8 rounded-md flex items-center justify-center border',
          statusColors[status]
        )}
      >
        {count}
      </span>
      <span className="text-[11px] text-white/40">{label}</span>
    </div>
  );
}

/**
 * MiniItem - List item for widget content
 */
interface MiniItemProps {
  text: string;
  sub: string;
  status?: 'urgent' | 'warning' | 'good' | 'neutral';
}

export function MiniItem({ text, sub, status = 'neutral' }: MiniItemProps) {
  const statusColors = {
    urgent: 'text-fuchsia-400',
    warning: 'text-blue-400',
    good: 'text-emerald-400',
    neutral: 'text-white/40',
  };

  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11.5px] text-white/60 truncate pr-2">{text}</span>
      <span className={cn('text-[10.5px] flex-shrink-0', statusColors[status])}>{sub}</span>
    </div>
  );
}

/**
 * ProgressBar - Progress indicator for widgets
 */
interface ProgressBarProps {
  done: number;
  total: number;
  color?: string;
}

export function ProgressBar({ done, total, color = 'bg-fuchsia-400' }: ProgressBarProps) {
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-white/40 font-medium min-w-[30px]">
        {done}/{total}
      </span>
    </div>
  );
}

export default WidgetCard;
