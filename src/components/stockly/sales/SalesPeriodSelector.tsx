'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/icons';

export type PeriodKey = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

interface SalesPeriodSelectorProps {
  value: PeriodKey;
  onChange: (period: PeriodKey, range: DateRange) => void;
  className?: string;
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'custom', label: 'Custom' },
];

export function periodToDateRange(period: PeriodKey, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      return { from: yesterday, to: yesterday };
    }
    case '7d': {
      const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      return { from: sevenAgo, to: today };
    }
    case '30d': {
      const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      return { from: thirtyAgo, to: today };
    }
    case '90d': {
      const ninetyAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      return { from: ninetyAgo, to: today };
    }
    case 'custom':
      return {
        from: customFrom || today,
        to: customTo || today,
      };
    default:
      return { from: today, to: today };
  }
}

export function SalesPeriodSelector({ value, onChange, className = '' }: SalesPeriodSelectorProps) {
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() =>
    new Date().toISOString().split('T')[0],
  );

  const isCustom = value === 'custom';

  // Label for the active range
  const rangeLabel = useMemo(() => {
    const range = periodToDateRange(value, customFrom, customTo);
    if (range.from === range.to) {
      return new Date(range.from + 'T12:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const fmt = (d: string) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    return `${fmt(range.from)} – ${fmt(range.to)}`;
  }, [value, customFrom, customTo]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              if (p.key === 'custom') {
                onChange('custom', periodToDateRange('custom', customFrom, customTo));
              } else {
                onChange(p.key, periodToDateRange(p.key));
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              value === p.key
                ? 'bg-module-fg/20 text-module-fg'
                : 'bg-theme-button text-[rgb(var(--text-secondary))] dark:text-theme-tertiary hover:bg-theme-button-hover hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}

        {/* Compact range label */}
        <span className="ml-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {rangeLabel}
        </span>
      </div>

      {/* Custom date inputs */}
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              onChange('custom', periodToDateRange('custom', e.target.value, customTo));
            }}
            className="px-2 py-1 text-xs bg-theme-button border border-theme rounded-lg text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:border-module-fg"
          />
          <span className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              onChange('custom', periodToDateRange('custom', customFrom, e.target.value));
            }}
            className="px-2 py-1 text-xs bg-theme-button border border-theme rounded-lg text-[rgb(var(--text-primary))] dark:text-white focus:outline-none focus:border-module-fg"
          />
        </div>
      )}
    </div>
  );
}
