'use client';

import { useState } from 'react';

/**
 * Reorder props:
 * { steps: string[]; prompt: string; onDone: (correct: boolean) => void }
 */
export function Reorder({
  steps,
  prompt,
  onDone,
}: {
  steps: string[];
  prompt: string;
  onDone: (correct: boolean) => void;
}) {
  const [order, setOrder] = useState<string[]>(steps);
  const [feedback, setFeedback] = useState<string | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const evaluate = () => {
    const isCorrect = order.every((value, index) => value === steps[index]);
    setFeedback(isCorrect ? 'Steps are in the right sequence.' : 'Something is out of order. Adjust and submit again.');
    onDone(isCorrect);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-white">{prompt}</p>
      <ol className="space-y-2">
        {order.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-slate-100"
          >
            <div className="flex flex-1 items-center gap-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-500/20 text-xs font-semibold text-pink-100">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200 transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                aria-label={`Move ${step} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200 transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                aria-label={`Move ${step} down`}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={evaluate}
        className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
      >
        Check order
      </button>
      {feedback ? <p className="text-sm text-slate-200">{feedback}</p> : null}
    </div>
  );
}
