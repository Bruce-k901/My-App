import React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  variant?: "default" | "destructive" | "secondary";
  className?: string;
  children: React.ReactNode;
};

export function Badge({ variant = "default", className, children }: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border";
  
  const variants = {
    default: "bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400",
    destructive: "bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400",
 secondary:"bg-gray-50 dark:bg-theme-surface-elevated0/20 border-gray-200 dark:border-gray-500/30 text-theme-secondary",
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)}>
      {children}
    </span>
  );
}

export default Badge;
