"use client";

import React from "react";
import GlassCard from "@/components/ui/GlassCard";

export interface KPI {
  title: string;
  value: number | string;
  accent?: "magenta" | "blue" | "green";
}

export default function KPIStats({ items }: { items: KPI[] }) {
  const accentToClass = (accent?: KPI["accent"]) => {
    switch (accent) {
      case "magenta":
        return "text-magenta-400";
      case "blue":
        return "text-blue-400";
      case "green":
        return "text-green-400";
      default:
        return "text-theme-primary";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((kpi) => (
        <GlassCard key={kpi.title} className="text-left">
          <p className="text-sm text-theme-tertiary mb-1">{kpi.title}</p>
          <p className={`text-2xl font-bold ${accentToClass(kpi.accent)}`}>{kpi.value}</p>
        </GlassCard>
      ))}
    </div>
  );
}