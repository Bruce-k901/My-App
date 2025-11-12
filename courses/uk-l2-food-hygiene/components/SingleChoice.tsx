'use client';

import { useState } from 'react';

/**
 * SingleChoice props:
 * { stem: string; options: string[]; correctIndex: number; onDone: (pickedIndex: number) => void }
 */
export function SingleChoice({
  stem,
  options,
  correctIndex,
  onDone,
}: {
  stem: string;
  options: string[];
  correctIndex: number;
  onDone: (pickedIndex: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelect = (index: number) => {
    setSelected(index);
    const isCorrect = index === correctIndex;
    setFeedback(isCorrect ? 'Correct! Great work.' : 'Not quite. Review the content and try again.');
    onDone(index);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-white">{stem}</p>
      <div className="space-y-2" role="radiogroup" aria-label={stem}>
        {options.map((option, index) => {
          const isActive = selected === index;
          const isCorrect = index === correctIndex;
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm transition focus-within:outline-none focus-within:ring-2 focus-within:ring-pink-400 ${
                isActive
                  ? isCorrect
                    ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                    : 'border-red-400/70 bg-red-500/10 text-red-100'
                  : 'border-white/15 bg-black/60 text-slate-200 hover:border-white/30'
              }`}
            >
              <span className="flex-1">{option}</span>
              <input
                type="radio"
                name="single-choice"
                className="h-4 w-4"
                checked={isActive}
                onChange={() => handleSelect(index)}
              />
            </label>
          );
        })}
      </div>
      {feedback ? <p className="text-sm text-slate-200">{feedback}</p> : null}
    </div>
  );
}
