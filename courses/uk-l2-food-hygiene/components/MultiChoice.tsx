'use client';

import { useState } from 'react';

/**
 * MultiChoice props:
 * { stem: string; options: string[]; correctIndices: number[]; onDone: (picked: number[]) => void }
 */
export function MultiChoice({
  stem,
  options,
  correctIndices,
  onDone,
}: {
  stem: string;
  options: string[];
  correctIndices: number[];
  onDone: (picked: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const evaluate = () => {
    const answers = Array.from(selected).sort();
    const expected = [...correctIndices].sort();
    const isCorrect = answers.length === expected.length && answers.every((value, idx) => value === expected[idx]);
    setFeedback(
      isCorrect ? 'Correct set selected. Nicely done!' : 'Some selections are off. Adjust and submit again.'
    );
    onDone(Array.from(selected));
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-white">{stem}</p>
      <div className="space-y-2" role="group" aria-label={stem}>
        {options.map((option, index) => {
          const isChecked = selected.has(index);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition focus-within:outline-none focus-within:ring-2 focus-within:ring-pink-400 ${
                isChecked
                  ? 'border-pink-400/70 bg-pink-500/10 text-pink-100'
                  : 'border-white/15 bg-black/60 text-slate-200 hover:border-white/30'
              }`}
            >
              <span className="flex-1">{option}</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isChecked}
                onChange={() => toggle(index)}
              />
            </label>
          );
        })}
      </div>
      <div>
        <button
          type="button"
          onClick={evaluate}
          className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        >
          Check answers
        </button>
      </div>
      {feedback ? <p className="text-sm text-slate-200">{feedback}</p> : null}
    </div>
  );
}
