'use client';

import type { ComplianceCategory } from '@/types/compliance';

interface ComplianceCategoryCardProps {
  category: ComplianceCategory;
  label: string;
  icon: React.ElementType;
  compliant: number;
  total: number;
  urgent: number;
  active?: boolean;
  onClick?: () => void;
}

export function ComplianceCategoryCard({
  label,
  icon: Icon,
  compliant,
  total,
  urgent,
  active,
  onClick,
}: ComplianceCategoryCardProps) {
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 100;
  const color =
    pct >= 80
      ? 'text-emerald-500'
      : pct >= 60
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-xl p-4 text-left transition-all
        ${active ? 'bg-teamly/10 dark:bg-teamly/10 ring-1 ring-teamly/30' : 'bg-theme-surface-elevated hover:bg-theme-hover'}
        border border-theme`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-theme-secondary" />
          <span className="text-sm font-medium text-theme-primary">{label}</span>
        </div>
        {urgent > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
            {urgent} urgent
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${color}`}>{compliant}</span>
        <span className="text-sm text-theme-secondary">/ {total}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-theme-surface">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  );
}
