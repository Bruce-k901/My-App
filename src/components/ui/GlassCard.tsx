import * as React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  const base = cn(
    "w-full max-w-md py-8 px-6",
    "rounded-2xl backdrop-blur-lg",
    // Cards & Containers tokens per docs/UI-Style-Guide.md
    "bg-white/[0.05] border border-white/[0.1]",
    // Unified glow behaviour
    "shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(236,72,153,0.25)]",
    "transition-all duration-200 ease-in-out",
  );
  return <div className={cn(base, className)}>{children}</div>;
}