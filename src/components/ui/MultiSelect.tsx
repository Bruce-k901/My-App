"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Option = string | { label: string; value: string };

type MultiSelectProps = {
  label?: string;
  value: string[];
  options: Option[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function MultiSelect({ 
  label, 
  value = [], 
  options, 
  onChange, 
  placeholder = "Select options…", 
  className, 
  disabled 
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  // Ensure value is always an array to prevent controlled/uncontrolled warnings
  const safeValue = React.useMemo(() => Array.isArray(value) ? value : [], [value]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const getLabel = (opt: Option) => (typeof opt === "string" ? opt : opt.label);
  const getValue = (opt: Option) => (typeof opt === "string" ? opt : opt.value);

  const toggleOption = (optionValue: string) => {
    const newValue = safeValue.includes(optionValue)
      ? safeValue.filter(v => v !== optionValue)
      : [...safeValue, optionValue];
    onChange(newValue);
  };

  const removeOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(safeValue.filter(v => v !== optionValue));
  };

  const selectedLabels = safeValue.map(val => {
    const option = options.find(opt => getValue(opt) === val);
    return option ? getLabel(option) : val;
  });

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && <label className="block text-xs text-gray-900 dark:text-white/50 mb-1">{label}</label>}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "w-full min-h-[44px] rounded-md px-4 py-2 text-left",
          "bg-gray-100 dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.1]",
          "text-gray-900 dark:text-white",
          "transition-all duration-150 ease-in-out",
          "hover:border-blue-400 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.07] hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]",
          "focus:border-blue-500 dark:focus:border-blue-500 focus:shadow-[0_0_14px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {safeValue.length === 0 ? (
              <span className="text-sm text-gray-400 dark:text-white/40">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map((label, index) => (
                  <span
                    key={safeValue[index]}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 rounded border border-blue-300 dark:border-blue-500/30"
                  >
                    {label}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeOption(e, safeValue[index])}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          removeOption(e, safeValue[index]);
                        }
                      }}
                      className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-gray-600 dark:text-white/70 ml-2">▾</span>
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-md border border-gray-300 dark:border-white/[0.1] bg-white dark:bg-[#14161c]/95 backdrop-blur-md shadow-lg dark:shadow-[0_0_14px_rgba(236,72,153,0.25)]">
          <ul role="listbox" className="max-h-96 overflow-auto py-1">
            {options.map((opt) => {
              const val = getValue(opt);
              const lbl = getLabel(opt);
              const isSelected = safeValue.includes(val);
              return (
                <li key={val} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                      "text-gray-900 dark:text-white",
                      "hover:bg-blue-50 dark:hover:bg-white/[0.06]",
                      isSelected && "bg-blue-100 dark:bg-white/[0.08]",
                    )}
                    onClick={() => toggleOption(val)}
                  >
                    <div className={cn(
                      "w-4 h-4 border border-gray-300 dark:border-white/30 rounded flex items-center justify-center",
                      isSelected && "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500"
                    )}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {lbl}
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