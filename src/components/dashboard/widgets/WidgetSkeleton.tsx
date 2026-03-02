'use client';

import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/dashboard';

interface WidgetSkeletonProps {
  size?: WidgetSize;
  className?: string;
}

/**
 * Animated skeleton loader for widgets
 * Matches the visual style of the actual widget cards
 */
export function WidgetSkeleton({ size = 'medium', className }: WidgetSkeletonProps) {
  const heightClass = size === 'small' ? 'h-32' : size === 'large' ? 'h-64' : 'h-44';

  return (
    <div
      className={cn(
        'bg-theme-surface border border-theme rounded-xl p-4',
        heightClass,
        'animate-pulse',
        className
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-white/10 rounded-lg" />
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-full w-12" />
      </div>

      {/* Content skeleton */}
      {size !== 'small' && (
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-full" />
          <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
          {size === 'large' && (
            <>
              <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-5/6" />
              <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
            </>
          )}
        </div>
      )}

      {/* Footer skeleton */}
      <div className="mt-auto pt-3">
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-20" />
      </div>
    </div>
  );
}

/**
 * Multiple skeleton cards for grid loading state
 */
export function WidgetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <WidgetSkeleton key={i} size={i % 3 === 0 ? 'small' : 'medium'} />
      ))}
    </div>
  );
}
