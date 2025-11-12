import React, { useState } from "react";

type Props = {
  steps: string[]; // correct order, length 6 ideally
  onDone?: (correct: boolean) => void;
};

export default function HandwashSequencer({ steps, onDone }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const all = Array.from(new Set([...picked, ...steps]));
  const remaining = steps.filter(s => !picked.includes(s));

  function toggle(s: string) {
    setPicked(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  function check() {
    const ok = JSON.stringify(picked) === JSON.stringify(steps);
    onDone?.(ok);
  }

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60">
      <h3 className="text-lg mb-2">Order the 6 steps to wash hands effectively</h3>
      <div className="text-sm text-neutral-300 mb-2">Click steps in order. Click again to undo.</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {all.map(s => (
          <button
            key={s}
            onClick={() => toggle(s)}
            className={`px-3 py-1 rounded-full border ${picked.includes(s) ? "bg-emerald-200 text-black" : "border-neutral-700 text-neutral-200"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="text-sm text-neutral-400 mb-2">Current: {picked.length ? picked.join(" → ") : "none"}</div>
      <button className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white" onClick={check}>Check</button>
    </div>
  );
}