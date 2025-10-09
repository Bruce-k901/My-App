import React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export default function Input({ className, ...props }: InputProps) {
  return (
    <input
      {...props}
      className={cn(
        // Global input glow tokens
        "w-full h-11 rounded-md px-4 text-white placeholder:text-white/40",
        "bg-white/[0.03] border border-white/[0.15]",
        "transition-all duration-150 ease-in-out",
        "hover:border-white/25 hover:bg-white/[0.05] hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]",
        "focus:border-pink-500 focus:shadow-[0_0_14px_rgba(236,72,153,0.4)] focus:ring-0 focus:outline-none",
        className,
      )}
    />
  );
}
