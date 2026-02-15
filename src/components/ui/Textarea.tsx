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
 "flex min-h-[80px] w-full rounded-lg bg-theme-button border border-theme text-theme-primary text-sm px-3 py-2",
        "placeholder:text-theme-tertiary dark:placeholder:text-theme-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D37E91]/50 focus-visible:border-[#D37E91]/50",
        "hover:bg-theme-button-hover hover:border-theme-hover dark:hover:border-white/20 transition-colors resize-none",
        className,
      )}
    />
  );
}

