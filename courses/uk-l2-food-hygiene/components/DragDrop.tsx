'use client';

import { useMemo, useState } from 'react';

/**
 * DragDrop props:
 * { pairs: [string,string][]; prompt: string; onDone: (correct: boolean) => void }
 */
export function DragDrop({
  pairs,
  prompt,
  onDone,
}: {
  pairs: [string, string][];
  prompt: string;
  onDone: (correct: boolean) => void;
}) {
  const options = useMemo(() => Array.from(new Set(pairs.map(([, right]) => right))), [pairs]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const evaluate = () => {
    const correct = pairs.every(([left, right]) => answers[left] === right);
    setFeedback(correct ? 'All matches look good!' : 'Some matches need attention. Adjust and try again.');
    onDone(correct);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-white">{prompt}</p>
      <div className="space-y-4">
        {pairs.map(([left]) => (
          <label key={left} className="block rounded-xl border border-white/15 bg-black/60 p-4 text-sm text-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{left}</span>
            <select
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              value={answers[left] ?? ''}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  [left]: event.target.value,
                }))
              }
            >
              <option value="" disabled>
                Select match…
              </option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={evaluate}
        className="rounded-xl border border-pink-400/70 bg-pink-500/20 px-4 py-2 text-sm font-semibold text-pink-100 transition hover:border-pink-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
      >
        Check matches
      </button>
      {feedback ? <p className="text-sm text-slate-200">{feedback}</p> : null}
    </div>
  );
}
