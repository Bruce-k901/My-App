"use client";

import { ComponentType } from "react";

interface ReportMetricCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "yellow" | "red" | "orange" | "gray" | "fuchsia" | "emerald" | "cyan" | "teal";
}

const colorClasses: Record<string, { iconBg: string; valueText: string }> = {
  blue: { iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30", valueText: "text-blue-400" },
  green: { iconBg: "bg-green-500/20 text-green-400 border-green-500/30", valueText: "text-green-400" },
  yellow: { iconBg: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", valueText: "text-yellow-400" },
  red: { iconBg: "bg-red-500/20 text-red-400 border-red-500/30", valueText: "text-red-400" },
  orange: { iconBg: "bg-orange-500/20 text-orange-400 border-orange-500/30", valueText: "text-orange-400" },
  gray: { iconBg: "bg-gray-100 dark:bg-white/5 text-theme-tertiary border-theme", valueText: "text-theme-tertiary" },
  fuchsia: { iconBg: "bg-teamly/20 text-teamly border-teamly/30", valueText: "text-teamly" },
  emerald: { iconBg: "bg-module-fg/20 text-module-fg border-module-fg/30", valueText: "text-module-fg" },
  cyan: { iconBg: "bg-module-fg/20 text-module-fg border-module-fg/30", valueText: "text-module-fg" },
  teal: { iconBg: "bg-module-fg/20 text-module-fg border-module-fg/30", valueText: "text-module-fg" },
};

export default function ReportMetricCard({ label, value, icon: Icon, color = "blue" }: ReportMetricCardProps) {
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg border ${classes.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-theme-secondary">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${classes.valueText}`}>{value}</div>
    </div>
  );
}
