import React from "react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  variant?: "primary" | "ghost" | "destructive" | "secondary" | "outline";
  fullWidth?: boolean;
  loading?: boolean;
  asChild?: boolean;
};

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth,
  loading,
  disabled,
  asChild = false,
  ...props
}: ButtonProps) {
  const base = cn(
    "inline-flex items-center justify-center",
    "h-11 rounded-[0.6rem] px-6 text-sm font-medium",
    "transition-all duration-150 ease-in-out active:scale-95",
    "disabled:opacity-40"
  );

  const variants = {
    primary: cn(
      "bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.1] text-theme-primary dark:text-white",
      "hover:bg-theme-button-hover dark:hover:bg-white/[0.12] hover:border-theme-hover dark:hover:border-white/[0.25]",
      "shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_14px_rgba(236,72,153,0.25)]",
      "transition-all duration-150 ease-in-out backdrop-blur-md"
    ),
    ghost: cn(
      "text-theme-primary dark:text-white bg-transparent border border-theme dark:border-white/[0.1]",
      "hover:bg-theme-button dark:hover:bg-white/[0.05]"
    ),
    destructive: cn(
      "text-white bg-[#EF4444]/90 hover:bg-[#EF4444]",
      "dark:bg-[#EF4444]/90 dark:hover:bg-[#EF4444]"
    ),
    secondary: cn(
      "bg-transparent text-pink-600 dark:text-[#EC4899] border border-pink-600 dark:border-[#EC4899]",
      "hover:shadow-[0_0_12px_rgba(236,72,153,0.7)]",
      "transition-all duration-200 ease-in-out backdrop-blur-md"
    ),
    outline: cn(
      "bg-transparent text-theme-primary dark:text-white border border-theme-hover dark:border-white/[0.2]",
      "hover:border-[#EC4899]/50 hover:bg-theme-button dark:hover:bg-white/[0.05]",
      "transition-all duration-150 ease-in-out backdrop-blur-md"
    ),
  } as const;

  const content = loading ? (
    <>
      <Spinner />
      <span className="ml-2">Loading...</span>
    </>
  ) : (
    children
  );

  const buttonClasses = cn(base, variants[variant], fullWidth && "w-full", className);

  // If asChild is true, clone the child element and apply button classes
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement;
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        ...(child.props as any),
        ...props,
        className: cn(buttonClasses, (child.props as any).className),
        disabled: disabled || loading,
      } as any);
    }
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={buttonClasses}
    >
      {content}
    </button>
  );
}

export default Button;
