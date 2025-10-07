import React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export default function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn("px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", className)}
    >
      {children}
    </button>
  );
}
