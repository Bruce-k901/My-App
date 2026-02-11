import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fullWidth?: boolean;
  className?: string;
}

export default function LinkButton({
  href,
  children,
  variant = "primary",
  fullWidth = false,
  className,
}: LinkButtonProps) {
  const base = cn(
    "inline-flex items-center justify-center",
    "h-11 rounded-[0.6rem] px-6 text-sm font-medium",
    "transition-all duration-150 ease-in-out active:scale-95",
  );

  const variants = {
    primary: cn(
      "bg-white/[0.06] border border-white/[0.1] text-white",
      "hover:bg-white/[0.12] hover:border-white/[0.25]",
      "shadow-[0_0_10px_rgba(211, 126, 145,0.15)] hover:shadow-[0_0_14px_rgba(211, 126, 145,0.25)]",
      "transition-all duration-150 ease-in-out backdrop-blur-md",
    ),
    secondary: cn(
      "bg-transparent text-[#D37E91] border border-[#D37E91]",
      "hover:shadow-[0_0_12px_rgba(211, 126, 145,0.7)]",
      "transition-all duration-200 ease-in-out backdrop-blur-md"
    ),
    outline:
      "border border-white/[0.1] text-white hover:bg-white/[0.05]",
    ghost: "text-white bg-transparent border border-white/[0.1] hover:bg-white/[0.05]",
  } as const;

  return (
    <Link
      href={href}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
    >
      {children}
    </Link>
  );
}
