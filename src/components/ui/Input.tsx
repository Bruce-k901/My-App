import React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "flex h-10 w-full rounded-lg bg-theme-surface-elevated dark:bg-theme-surface-elevated border border-blue-300 dark:border-blue-500/50 text-theme-primary text-sm px-3 py-2",
          "placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:focus-visible:border-blue-500",
          "hover:bg-theme-button-hover dark:hover:bg-theme-button-hover hover:border-blue-400 dark:hover:border-blue-500/70 transition-colors",
          className,
        )}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;
