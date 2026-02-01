'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageShell props:
 * { title?: string; children: React.ReactNode; rightPanel?: React.ReactNode; rightPanelTitle?: string }
 */
export function PageShell({
  title,
  children,
  rightPanel,
  rightPanelTitle = 'Key points',
}: {
  title?: string;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelTitle?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(240px,320px)]">
      <div className="rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 bg-[rgb(var(--surface-elevated))] dark:bg-neutral-900/80 p-6 shadow-lg shadow-black/30">
        {title ? <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">{title}</h2> : null}
        <div className={cn('mt-4 space-y-5 text-base text-[rgb(var(--text-secondary))] dark:text-slate-100 leading-relaxed', !title && 'mt-0')}>
          {children}
        </div>
      </div>
      {rightPanel ? (
        <aside className="flex flex-col">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="mb-3 w-full rounded-xl border border-pink-400/60 bg-pink-100 dark:bg-pink-400/10 px-4 py-2 text-sm font-semibold text-pink-700 dark:text-pink-100 transition hover:border-pink-500 dark:hover:border-pink-300 hover:text-pink-800 dark:hover:text-white"
          >
            {open ? 'Hide info' : 'Show info'}
          </button>
          <div
            className={cn(
              'space-y-3 rounded-2xl border border-[rgb(var(--border))] dark:border-white/10 bg-[rgb(var(--surface))] dark:bg-black/70 p-4 text-sm text-[rgb(var(--text-secondary))] dark:text-slate-100 transition-all',
              open ? 'max-h-[520px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
            )}
            aria-hidden={!open}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-tertiary))] dark:text-slate-400">{rightPanelTitle}</h3>
            <div>{rightPanel}</div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
