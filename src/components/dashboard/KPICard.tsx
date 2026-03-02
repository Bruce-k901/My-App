'use client';

import { LucideIcon } from '@/components/ui/icons';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  sparklineData?: number[];
  status: 'good' | 'warning' | 'urgent' | 'neutral';
  color: string; // Tailwind text color class e.g. 'text-teamly'
  accentHex: string; // Hex for sparkline e.g. '#F472B6'
  href?: string;
  icon: LucideIcon;
}

const STATUS_GLOW: Record<string, string> = {
  good: 'shadow-emerald-500/10',
  warning: 'shadow-blue-500/10',
  urgent: 'shadow-teamly/10',
  neutral: 'shadow-white/5',
};

export function KPICard({
  label,
  value,
  subtitle,
  trend,
  sparklineData,
  status,
  color,
  accentHex,
  href,
  icon: Icon,
}: KPICardProps) {
  const router = useRouter();

  // Map status to background gradient for better visual hierarchy
  const STATUS_BG: Record<string, string> = {
    good: 'from-emerald-500/[0.08] to-transparent dark:from-emerald-500/[0.12]',
    warning: 'from-blue-500/[0.08] to-transparent dark:from-blue-500/[0.12]',
    urgent: 'from-teamly/[0.08] to-transparent dark:from-teamly/[0.12]',
    neutral: 'from-slate-500/[0.03] to-transparent dark:from-slate-500/[0.06]',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={href ? () => router.push(href) : undefined}
      className={cn(
        'relative overflow-hidden',
        'bg-white dark:bg-[#171B2D]',
        'border-2 border-module-fg/[0.12]',
        'rounded-xl',
        'p-5',
        'flex-1 min-w-[160px]',
        'flex flex-col gap-3',
        'shadow-lg shadow-black/[0.03] dark:shadow-black/20',
        'transition-all duration-200',
        href && 'cursor-pointer hover:shadow-xl hover:border-module-fg/[0.25]'
      )}
    >
      {/* Subtle gradient background based on status */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-100', STATUS_BG[status])} />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-3">
        {/* Top row: icon + trend */}
        <div className="flex items-center justify-between">
          <div className={cn('p-2.5 rounded-xl bg-white/60 dark:bg-black/20 shadow-sm', color)}>
            <Icon className="w-5 h-5" strokeWidth={2.5} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                'text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-full',
                trend > 0
                  ? 'text-module-fg bg-module-fg/10'
                  : 'text-teamly dark:text-teamly bg-teamly/10'
              )}
            >
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>

        {/* Value - more prominent */}
        <div className="flex flex-col gap-1">
          <div className={cn('text-3xl font-bold leading-none tracking-tight', color)}>
            {value}
            {subtitle && (
 <span className="text-base font-medium text-theme-tertiary ml-0.5">
                /{subtitle}
              </span>
            )}
          </div>
          {/* Label - better contrast */}
 <div className="text-xs font-medium text-theme-secondary leading-snug">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#171B2D] border-2 border-module-fg/[0.12] rounded-xl p-5 flex-1 min-w-[160px] animate-pulse shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5" />
        <div className="w-12 h-6 rounded-full bg-slate-200 dark:bg-white/5" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-9 w-20 rounded bg-slate-200 dark:bg-white/5" />
        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/5" />
      </div>
    </div>
  );
}
