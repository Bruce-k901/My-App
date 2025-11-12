import React, { useState } from "react";

type Option = { label: string; result: string };
type Props = {
  title: string;
  stem: string;
  options: Option[]; // first correct by convention optional
  correctIndex?: number; // default 1 if not provided, else explicit
  onDone?: (pickedIndex: number, correct: boolean) => void;
};

export default function BranchScenario({ title, stem, options, correctIndex = 1, onDone }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === correctIndex;

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 max-w-2xl">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="mb-3 text-neutral-300">{stem}</p>
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`text-left px-3 py-2 rounded-lg border ${picked===i ? "border-emerald-400" : "border-neutral-700"} hover:border-neutral-500`}
            onClick={() => setPicked(i)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`mt-3 p-3 rounded-lg ${correct ? "bg-emerald-900/40 text-emerald-300" : "bg-rose-900/40 text-rose-300"}`}>
          {options[picked].result}
        </div>
      )}
      <div className="mt-3">
        <button
          className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white"
          onClick={() => picked !== null && onDone?.(picked, correct)}
          disabled={picked === null}
        >
          Continue
        </button>
      </div>
    </div>
  );
}