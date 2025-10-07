"use client";
import React from "react";

export default function TaskGroupHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center px-3 py-2">
      <div className="w-1.5 h-5 rounded" style={{ backgroundColor: color }} />
      <p className="ml-2 text-xs uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}