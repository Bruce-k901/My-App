'use client';

import { cn } from '@/lib/utils';

/**
 * ProgressRail props:
 * { modules: { id: string; title: string; isActive: boolean; isComplete: boolean; percentage: number }[]; onSelect?: (index: number) => void }
 */
export function ProgressRail({
  modules,
  overallPercent = 0,
  onSelect,
}: {
  modules: {
    id: string;
    title: string;
    isActive: boolean;
    isComplete: boolean;
  }[];
  overallPercent?: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <nav aria-label="Module progress" className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200">
        <p className="font-semibold text-white">Overall progress</p>
        <div className="mt-2 h-2 rounded-full bg-neutral-800">
          <div
            className="h-2 rounded-full bg-pink-500"
            style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
            aria-hidden="true"
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">{overallPercent}% complete</p>
      </div>
      {modules.map((module, index) => (
        <button
          type="button"
          key={module.id}
          onClick={() => onSelect?.(index)}
          className={cn(
            'w-full rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
            module.isActive
              ? 'border-pink-400/70 bg-pink-400/10 text-white'
              : module.isComplete
              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300'
              : 'border-white/10 bg-black/60 text-slate-300 hover:border-white/25'
          )}
        >
          <div className="text-sm font-semibold">{module.title}</div>
          <p className="mt-1 text-xs text-slate-400">
            {module.isComplete ? 'Completed' : module.isActive ? 'In progress' : 'Locked'}
          </p>
        </button>
      ))}
    </nav>
  );
}
