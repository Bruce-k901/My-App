"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = string | { label: string; value: string };
type SelectProps = {
  label?: string;
  value: string;
  options: Option[];
  onValueChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function Select({ 
  label, 
  value, 
  options, 
  onValueChange, 
  placeholder = "Select...", 
  className, 
  disabled 
}: SelectProps) {
  const getLabel = (opt: Option) => (typeof opt === "string" ? opt : opt.label);
  const getValue = (opt: Option) => (typeof opt === "string" ? opt : opt.value);

  return (
    <div className={cn("relative", className)}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            // Input-like base styles for consistency
            "w-full h-11 rounded-md px-4 text-left text-white relative",
            "bg-white/[0.05] border border-white/[0.1]",
            "transition-all duration-150 ease-in-out",
            "hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]",
            "focus:border-pink-500 focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none",
            "data-[state=open]:border-pink-500 data-[state=open]:shadow-[0_0_14px_rgba(236,72,153,0.4)]",
            disabled && "opacity-50 cursor-not-allowed",
            "flex items-center justify-between"
          )}
          aria-label="Select"
        >
          <SelectPrimitive.Value 
            placeholder={placeholder}
            className={cn("text-sm", !value && "text-white/40")}
          />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 text-white/70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-white/[0.1] bg-[#14161c]/95 backdrop-blur-md shadow-[0_0_14px_rgba(236,72,153,0.25)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            position="popper"
            sideOffset={6}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((opt) => {
                const val = getValue(opt);
                const lbl = getLabel(opt);
                return (
                  <SelectPrimitive.Item
                    key={val}
                    value={val}
                    className={cn(
                      "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none",
                      "text-white hover:bg-white/[0.06] focus:bg-white/[0.06]",
                      "data-[state=checked]:bg-white/[0.08]"
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