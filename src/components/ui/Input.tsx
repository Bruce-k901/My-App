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
        "flex h-10 w-full rounded-lg bg-white/[0.06] border border-white/[0.12] text-white text-sm px-3 py-2",
        "placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50",
        "hover:bg-white/[0.08] hover:border-white/20 transition-colors",
        className,
      )}
    />
  );
}
