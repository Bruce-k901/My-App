"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = string | { label: string; value: string };
type SelectProps = {
  label?: string;
  value?: string;
  options?: Option[]; // Made optional with default
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function Select({
  label,
  value,
  options = [],
  onValueChange,
  placeholder = "Select...",
  className,
  disabled
}: SelectProps) {
  const getLabel = (opt: Option) => (typeof opt === "string" ? opt : opt.label);
  const getValue = (opt: Option) => (typeof opt === "string" ? opt : opt.value);

  // Safety check: ensure options is always an array
  const safeOptions = options || [];

  // ALWAYS use internal state to maintain controlled behavior
  // This prevents the "switching from uncontrolled to controlled" warning
  // by ensuring the component is always controlled from mount
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    value !== undefined && value !== null && value !== '' ? String(value) : undefined
  );

  // Sync internal state with prop changes
  React.useEffect(() => {
    const newValue = value !== undefined && value !== null && value !== '' ? String(value) : undefined;
    setInternalValue(newValue);
  }, [value]);

  // Handle value change - update internal state and notify parent
  const handleValueChange = React.useCallback((newValue: string) => {
    setInternalValue(newValue);
    onValueChange(newValue);
  }, [onValueChange]);
  
  return (
    <div className={cn("relative", className)}>
      {label && <label className="block text-xs text-[rgb(var(--text-secondary))] dark:text-slate-400 mb-1">{label}</label>}
      
      <SelectPrimitive.Root
        value={internalValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            // Input-like base styles for consistency
            "w-full h-10 rounded-md px-4 text-left text-theme-primary dark:text-white relative",
            "bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50",
            "transition-all duration-150 ease-in-out",
            "hover:border-blue-400 dark:hover:border-blue-500/70 hover:bg-theme-button-hover dark:hover:bg-theme-button-hover hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]",
            "focus:border-blue-500 dark:focus:border-blue-500 focus:shadow-[0_0_14px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_14px_rgba(59,130,246,0.4)] focus:ring-0 focus:outline-none",
            "data-[state=open]:border-blue-500 dark:data-[state=open]:border-blue-500 data-[state=open]:shadow-[0_0_14px_rgba(59,130,246,0.3)] dark:data-[state=open]:shadow-[0_0_14px_rgba(59,130,246,0.4)]",
            disabled && "opacity-50 cursor-not-allowed",
            "flex items-center justify-between"
          )}
          aria-label="Select"
        >
          <SelectPrimitive.Value 
            placeholder={placeholder}
            className={cn("text-sm", !value && "text-theme-tertiary dark:text-white/40")}
          />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 text-theme-secondary dark:text-white/70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="relative z-[10000] max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-theme dark:border-blue-500/30 bg-[rgb(var(--surface-elevated))] dark:bg-[#14161c]/95 backdrop-blur-md shadow-[0_0_14px_rgba(59,130,246,0.2)] dark:shadow-[0_0_14px_rgba(59,130,246,0.3)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            position="popper"
            sideOffset={6}
          >
            <SelectPrimitive.Viewport className="p-1">
              {safeOptions
                .filter((opt) => {
                  // Filter out any options with empty string values
                  // Radix UI Select doesn't allow empty string values for Select.Item
                  const val = getValue(opt);
                  return val !== undefined && val !== null && val !== "";
                })
                .map((opt, index) => {
                  const val = getValue(opt);
                  const lbl = getLabel(opt);
                  // Use value as key, but fallback to index if value is undefined/null/empty
                  const key = val || `option-${index}`;
                  return (
                    <SelectPrimitive.Item
                      key={key}
                      value={val}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none",
                      "text-theme-primary dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] focus:bg-black/[0.05] dark:focus:bg-white/[0.06]",
                      "data-[state=checked]:bg-black/[0.08] dark:data-[state=checked]:bg-white/[0.08]"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{lbl}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}