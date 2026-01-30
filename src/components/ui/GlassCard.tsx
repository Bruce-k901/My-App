import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  const base = cn(
    "w-full max-w-md",
    "py-6 px-4 sm:py-8 sm:px-6",
    "rounded-2xl backdrop-blur-md",
    // Cards & Containers tokens per docs/UI-Style-Guide.md - Theme-aware
    "bg-theme-surface-elevated dark:bg-white/[0.03] border border-theme-hover dark:border-white/[0.2]",
    // Unified glow behaviour
    "shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.25)]",
    "transition-all duration-200 ease-in-out",
  );
  return <div className={cn(base, className)}>{children}</div>;
}