import React from "react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  variant?: "primary" | "ghost" | "destructive" | "secondary";
  fullWidth?: boolean;
  loading?: boolean;
};

export default function Button({ children, className, variant = "primary", fullWidth, loading, disabled, ...props }: ButtonProps) {
  const base = cn(
    "inline-flex items-center justify-center",
    "h-11 rounded-[0.6rem] px-6 text-sm font-medium",
    "transition-all duration-150 ease-in-out active:scale-95",
    "disabled:opacity-40",
  );

  const variants = {
    primary: cn(
      "bg-white/[0.06] border border-white/[0.1] text-white",
      "hover:bg-white/[0.12] hover:border-white/[0.25]",
      "shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_14px_rgba(236,72,153,0.25)]",
      "transition-all duration-150 ease-in-out backdrop-blur-md",
    ),
    ghost: "text-white bg-transparent border border-white/[0.1] hover:bg-white/[0.05]",
    destructive: "text-white bg-[#EF4444]/90 hover:bg-[#EF4444]",
    secondary: cn(
      "bg-checkly-magenta text-white",
      "hover:bg-pink-600",
      "border border-transparent",
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

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
    >
      {content}
    </button>
  );
}
