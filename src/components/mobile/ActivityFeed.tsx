'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  Clock,
  ChevronRight,
  Activity,
  LogOut,
  RefreshCw,
} from '@/components/ui/icons';
import { ThemedLottie } from '@/components/ui/ThemedLottie';
import { cn } from '@/lib/utils';
import { useActivityFeed, type ActivityItem } from '@/hooks/useActivityFeed';
import { haptics } from '@/lib/haptics';

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'task_completed': return CheckCircle2;
    case 'task_overdue': return AlertTriangle;
    case 'stock_alert': return Package;
    case 'clock_in': return Clock;
    case 'clock_out': return LogOut;
    default: return Activity;
  }
}

function getActivityColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'task_completed': return '#10B981'; // success green
    case 'task_overdue': return '#EF4444';   // error red
    case 'stock_alert': return '#F59E0B';    // warning amber
    case 'clock_in': return '#D37E91';       // brand CTA
    case 'clock_out': return '#D37E91';      // brand CTA
    default: return '#6B7280';               // gray
  }
}

export function ActivityFeed() {
  const router = useRouter();
  const { items, loading, error, refresh } = useActivityFeed(15);

  // Loading state
  if (loading) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider mb-3">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="backdrop-blur-xl bg-black/[0.03] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.12] shadow-lg shadow-black/5 rounded-xl p-6 text-center">
        <Activity size={32} className="mx-auto mb-2 text-theme-tertiary" />
        <p className="text-sm font-medium text-theme-primary">Unable to load activity</p>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 mx-auto mt-2 text-xs text-[#D37E91] hover:text-[#D37E91]/80 transition-colors"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-black/[0.03] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.12] shadow-lg shadow-black/5 rounded-xl p-6 text-center">
        <ThemedLottie
          src="/lottie/task-complete.json"
          module="checkly"
          width={200}
          height={200}
          loop
        />
        <h3 className="text-base font-semibold mt-4 text-theme-primary">All caught up!</h3>
        <p className="text-sm text-theme-secondary mt-2">No new activity. Enjoy your day!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
          Recent Activity
        </h3>
        <button
          onClick={refresh}
          className="text-xs text-[#D37E91] hover:text-[#D37E91]/80 transition-colors flex items-center gap-1"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const Icon = getActivityIcon(item.type);
          const color = getActivityColor(item.type);

          return (
            <button
              key={item.id}
              onClick={() => { if (item.href) { haptics.light(); router.push(item.href); } }}
              disabled={!item.href}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                "backdrop-blur-sm bg-black/[0.02] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.10]",
                item.href
                  ? "hover:bg-black/[0.04] dark:hover:bg-white/[0.10] active:scale-[0.98] cursor-pointer"
                  : "cursor-default"
              )}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon size={16} style={{ color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-primary truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.detail && (
                    <span className="text-xs text-theme-tertiary truncate">{item.detail}</span>
                  )}
                  <span className="text-xs text-theme-tertiary flex-shrink-0">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              </div>

              {/* Chevron for navigable items */}
              {item.href && (
                <ChevronRight size={14} className="text-theme-tertiary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
