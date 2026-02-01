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
        "w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm",
        "focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50",
        "hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-gray-400 dark:hover:border-neutral-500 transition-colors",
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
    <option value={value} className="bg-white dark:bg-neutral-900 text-gray-900 dark:text-white" {...props}>
      {children}
    </option>
  );
}

