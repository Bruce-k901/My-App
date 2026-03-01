'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'confirmed' | 'locked' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    confirmed: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
    locked: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
    pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
    approved: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30',
    rejected: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30',
    active: 'bg-module-fg/10 text-module-fg border-module-fg/20',
    inactive: 'bg-theme-muted text-theme-tertiary border-gray-200 dark:border-white/20',
  };

  return (
    <span
      className={cn(
        'text-xs px-2 py-1 rounded border font-medium',
        styles[status],
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
