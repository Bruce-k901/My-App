"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export default function Switch({ checked, onChange, disabled, className, label }: SwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", className)}>
      {label && <span className="text-sm text-theme-primary">{label}</span>}
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") onChange(!checked);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          "bg-white/10 backdrop-blur-lg border border-white/20",
          checked ? "bg-blue-500/50" : "bg-white/10",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          )}
        />
      </span>
    </label>
  );
}