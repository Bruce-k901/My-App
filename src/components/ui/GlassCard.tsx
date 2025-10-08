import * as React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  variant?: "light" | "dark" | "brand";
  className?: string;
}

export default function GlassCard({
  children,
  variant = "dark",
  className = "",
}: GlassCardProps) {
  const base =
    "w-full max-w-md p-8 rounded-2xl shadow-xl backdrop-blur-md transition-colors duration-300";
  const variants = {
    light: "bg-white/10 border border-white/20 hover:bg-white/15",
    dark: "bg-black/25 border border-white/10 hover:bg-black/30",
    brand:
      "bg-gradient-to-b from-magenta-500/10 to-blue-500/10 border border-magenta-500/20",
  } as const;

  return <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>;
}