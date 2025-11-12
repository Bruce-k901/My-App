'use client';

import { cn } from '@/lib/utils';

/**
 * StickyFooterNav props:
 * { onBack?: () => void; onNext?: () => void; onSave?: () => void; disableNext?: boolean; nextLabel?: string }
 */
export function StickyFooterNav({
  onBack,
  onNext,
  onSave,
  disableNext,
  nextLabel = 'Next',
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  disableNext?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/75 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
              onBack
                ? 'border-orange-400/70 text-orange-100 hover:border-orange-300 hover:text-white'
                : 'cursor-not-allowed border-neutral-800 text-neutral-600'
            )}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!onSave}
            className={cn(
              'rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              onSave ? 'hover:border-white/30 hover:text-white' : 'cursor-not-allowed border-neutral-800 text-neutral-600'
            )}
          >
            Save
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={disableNext || !onNext}
          className={cn(
            'rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
            !disableNext && onNext
              ? 'border-pink-400/70 bg-pink-500/20 text-pink-100 hover:border-pink-300 hover:text-white'
              : 'cursor-not-allowed border-neutral-800 text-neutral-600'
          )}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
