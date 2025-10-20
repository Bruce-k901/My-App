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
        "flex h-10 w-full rounded-md bg-neutral-900 border border-neutral-800 text-white text-sm px-3 py-2",
        "placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-500 focus-visible:border-pink-500",
        className,
      )}
    />
  );
}
