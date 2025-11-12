import React, { useMemo, useState } from "react";

type Props = {
  min?: number; // default 0
  max?: number; // default 100
  value?: number; // controlled starting value
  safeColdMax?: number; // default 5
  hotHoldMin?: number; // default 63
  onDone?: (withinSafe: boolean, value: number) => void;
};

export default function TemperatureDial({
  min = 0,
  max = 100,
  value = 20,
  safeColdMax = 5,
  hotHoldMin = 63,
  onDone
}: Props) {
  const [v, setV] = useState(value);
  const withinSafe = v <= safeColdMax || v >= hotHoldMin;
  const arc = ((v - min) / (max - min)) * 270; // 270deg sweep

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 max-w-md">
      <div className="text-sm text-neutral-300 mb-2">Adjust to a safe temperature</div>
      <div className="relative w-64 h-40 mx-auto">
        <svg viewBox="0 0 200 140" className="w-full h-full">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path d="M20,120 A80,80 0 1,1 180,120" fill="none" stroke="url(#grad)" strokeWidth="14" strokeLinecap="round" />
          <g transform={`rotate(${arc - 135} 100 120)`}>
            <line x1="100" y1="120" x2="100" y2="40" stroke={withinSafe ? "#10b981" : "#ef4444"} strokeWidth="6" strokeLinecap="round" />
          </g>
          <text x="100" y="130" textAnchor="middle" fill="#e5e7eb" fontSize="14">{v}°C</text>
        </svg>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(parseInt(e.target.value, 10))}
        className="mt-3 w-full"
      />
      <div className={`mt-2 text-sm ${withinSafe ? "text-emerald-400" : "text-rose-400"}`}>
        {withinSafe ? "Within safe range" : "Unsafe. Aim ≤ 5°C or ≥ 63°C"}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white"
          onClick={() => onDone?.(withinSafe, v)}
        >
          Check
        </button>
      </div>
    </div>
  );
}