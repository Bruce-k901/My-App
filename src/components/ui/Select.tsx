"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = {
  label?: string;
  value: string;
  options: string[];
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function Select({ label, value, options, onValueChange, placeholder = "Select…", className, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = value || "";

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          // Input-like base styles for consistency
          "w-full h-11 rounded-md px-4 text-left text-white",
          "bg-white/[0.03] border border-white/[0.15]",
          "transition-all duration-150 ease-in-out",
          "hover:border-white/25 hover:bg-white/[0.05] hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]",
          "focus:border-pink-500 focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("text-sm", !selected && "text-white/40")}>{selected || placeholder}</span>
        <span className="float-right text-white/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-white/[0.12] bg-[#14161c]/95 backdrop-blur-md shadow-[0_0_14px_rgba(236,72,153,0.25)]">
          <ul role="listbox" className="max-h-56 overflow-auto py-1">
            {options.map((opt) => {
              const isActive = opt === value;
              return (
                <li key={opt} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm",
                      "text-white hover:bg-white/[0.06]",
                      isActive && "bg-white/[0.08]",
                    )}
                    onClick={() => {
                      onValueChange(opt);
                      setOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}