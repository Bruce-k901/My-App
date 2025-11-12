import React, { useState } from "react";

type Spot = { x: number; y: number; label: string };
type Props = {
  image: string; // path to SVG or PNG
  spots: Spot[]; // coords 0..1
  prompt: string;
  onDone?: (foundAll: boolean) => void;
};

export default function HotspotRoom({ image, spots, prompt, onDone }: Props) {
  const [found, setFound] = useState<boolean[]>(Array(spots.length).fill(false));

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = (e.target as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // naive hit test radius 4%
    const idx = spots.findIndex((s, i) => !found[i] && Math.hypot(s.x - x, s.y - y) < 0.04);
    if (idx >= 0) {
      const copy = found.slice();
      copy[idx] = true;
      setFound(copy);
      if (copy.every(Boolean)) onDone?.(true);
    }
  }

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60">
      <div className="text-sm text-neutral-300 mb-2">{prompt}</div>
      <div className="relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden border border-neutral-800" onClick={handleClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="scene" className="w-full h-full object-cover" />
        {spots.map((s, i) => (
          <div key={i}
            className={`absolute w-6 h-6 rounded-full ${found[i] ? "bg-emerald-400" : "bg-rose-500/70"}`}
            style={{ left: `${s.x*100}%`, top: `${s.y*100}%`, transform: "translate(-50%, -50%)" }}
            title={found[i] ? s.label : "Find risk"}
          />
        ))}
      </div>
      <div className="mt-2 text-sm text-neutral-400">{found.filter(Boolean).length} / {spots.length} found</div>
    </div>
  );
}