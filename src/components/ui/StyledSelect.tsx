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
        "w-full bg-neutral-900 border border-neutral-600 rounded-lg px-3 py-2 text-white text-sm",
        "focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50",
        "hover:bg-neutral-800 hover:border-neutral-500 transition-colors",
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
    <option value={value} className="bg-neutral-900 text-white" {...props}>
      {children}
    </option>
  );
}

