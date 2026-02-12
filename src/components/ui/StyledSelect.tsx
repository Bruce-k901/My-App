// Reusable styled select component for dark theme with white text
import React from 'react';
import { cn } from '@/lib/utils';

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export default function StyledSelect({ className, children, ...props }: StyledSelectProps) {
  return (
    <select
      {...props}
      className={cn(
        "w-full bg-theme-surface border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-theme-primary text-sm",
        "focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50 focus:border-[#D37E91]/50",
        "hover:bg-theme-surface-elevated dark:hover:bg-neutral-800 hover:border-gray-400 dark:hover:border-neutral-500 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </select>
  );
}

// Styled option component
export function StyledOption({ value, children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option value={value} className="bg-theme-surface text-theme-primary" {...props}>
      {children}
    </option>
  );
}

