"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export default function Checkbox({ checked, onCheckedChange, disabled, className, label }: CheckboxProps) {
  return (
    <label className={cn("inline-flex items-center gap-2 select-none cursor-pointer", className)}>
      <span
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => !disabled && onCheckedChange(!checked)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") onCheckedChange(!checked);
        }}
        className={cn(
          "inline-flex items-center justify-center h-5 w-5 rounded-sm border",
          checked ? "bg-[#D37E91]/60 border-[#D37E91]" : "bg-gray-200 dark:bg-white/5 border-gray-300 dark:border-white/20",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 10.5L8.5 14L15 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-gray-900 dark:text-white/90">{label}</span>}
    </label>
  );
}