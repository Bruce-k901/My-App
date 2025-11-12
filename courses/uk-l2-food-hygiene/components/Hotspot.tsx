'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Hotspot props:
 * { image: string; spots: { x: number; y: number; label: string }[]; prompt: string; onDone: (correct: boolean) => void }
 */
export function Hotspot({
  image,
  spots,
  prompt,
  onDone,
}: {
  image: string;
  spots: { x: number; y: number; label: string }[];
  prompt: string;
  onDone: (correct: boolean) => void;
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) => {
    setRevealed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      const allRevealed = spots.every((spot) => next[spot.label]);
      if (allRevealed) {
        onDone(true);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-white">{prompt}</p>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80">
        <Image src={image} alt="" width={800} height={450} className="h-auto w-full object-contain" />
        {spots.map((spot) => (
          <button
            key={spot.label}
            type="button"
            onClick={() => toggle(spot.label)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${
              revealed[spot.label]
                ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                : 'border-pink-400/70 bg-pink-500/30 text-pink-100'
            }`}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
          >
            {spot.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-300">Tap each hotspot to reveal more information.</p>
    </div>
  );
}
