'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Maximize2 } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { MODULE_COLOURS, MODULE_BADGE_COLOURS, MODULE_LABELS, type ModuleId } from '@/config/widget-registry';
import { AnimatedCounter } from './AnimatedCounter';

interface WidgetCardProps {
  title: string;
  module: ModuleId;
  viewAllHref?: string;
  onExpand?: () => void;
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
  onExpand,
  children,
  className,
}: WidgetCardProps) {
  const borderColor = MODULE_COLOURS[module];
  const badgeColors = MODULE_BADGE_COLOURS[module];
  const moduleLabel = MODULE_LABELS[module];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D]',
        'border border-module-fg/[0.12] rounded-lg',
        'border-l-[3px]',
        borderColor,
        'flex flex-col h-full',
        'hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-black/[0.15]',
        className
      )}
      style={{ padding: 'var(--spacing-card)', gap: 'var(--spacing-row)' }}
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
          <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1 text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-primary))] transition-colors"
              title="Expand"
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

      {/* Widget content */}
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

/**
 * WidgetSkeleton - Loading skeleton for widgets
 */
export function WidgetSkeleton() {
  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D] border border-module-fg/[0.12] rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-12 bg-black/10 dark:bg-white/10 rounded" />
        <div className="h-4 w-24 bg-black/10 dark:bg-white/10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-black/5 dark:bg-white/5 rounded" />
        <div className="h-3 w-3/4 bg-black/5 dark:bg-white/5 rounded" />
        <div className="h-3 w-1/2 bg-black/5 dark:bg-white/5 rounded" />
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
    urgent: 'bg-teamly/10 text-teamly border-teamly/30',
    warning: 'bg-checkly/10 text-checkly-dark dark:text-checkly border-checkly/30',
    good: 'bg-module-fg/10 text-module-fg border-module-fg/30',
    neutral: 'bg-black/[0.03] dark:bg-white/[0.03] text-[rgb(var(--text-disabled))] border-black/10 dark:border-white/10',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'text-base font-bold w-8 h-8 rounded-md flex items-center justify-center border',
          statusColors[status]
        )}
      >
        <AnimatedCounter value={count} />
      </span>
      <span className="text-[11px] text-[rgb(var(--text-disabled))]">{label}</span>
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
  href?: string;
}

export function MiniItem({ text, sub, status = 'neutral', href }: MiniItemProps) {
  const statusColors = {
    urgent: 'text-teamly',
    warning: 'text-checkly-dark dark:text-checkly',
    good: 'text-module-fg',
    neutral: 'text-[rgb(var(--text-disabled))]',
  };

  const content = (
    <>
      <span className="text-[11.5px] text-[rgb(var(--text-secondary))] truncate pr-2">{text}</span>
      <span className={cn('text-[10.5px] flex-shrink-0', statusColors[status])}>{sub}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex justify-between items-center py-0.5 hover:bg-white/5 rounded -mx-1 px-1 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex justify-between items-center py-0.5">
      {content}
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

export function ProgressBar({ done, total, color = 'bg-teamly' }: ProgressBarProps) {
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-[5px] bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-[rgb(var(--text-disabled))] font-medium min-w-[30px]">
        {done}/{total}
      </span>
    </div>
  );
}

export default WidgetCard;
