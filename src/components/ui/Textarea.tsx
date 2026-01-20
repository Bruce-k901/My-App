import React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export default function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        "flex min-h-[80px] w-full rounded-lg bg-theme-button dark:bg-white/[0.06] border border-theme dark:border-white/[0.12] text-theme-primary dark:text-white text-sm px-3 py-2",
        "placeholder:text-theme-tertiary dark:placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50",
        "hover:bg-theme-button-hover dark:hover:bg-white/[0.08] hover:border-theme-hover dark:hover:border-white/20 transition-colors resize-none",
        className,
      )}
    />
  );
}

