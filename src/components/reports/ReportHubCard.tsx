"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from '@/components/ui/icons';
import { ModuleId, MODULE_COLORS, MODULE_NAMES } from "@/types/dashboard";

interface HubMetric {
  label: string;
  value: string | number;
}

interface ReportHubCardProps {
  moduleId: ModuleId;
  metrics: HubMetric[];
  href: string;
  loading?: boolean;
}

const MODULE_ICONS: Record<ModuleId, string> = {
  checkly: "Compliance & Checks",
  stockly: "Inventory & Stock",
  teamly: "People & HR",
  planly: "Production & Orders",
  assetly: "Assets & Maintenance",
  msgly: "Messaging",
};

export default function ReportHubCard({ moduleId, metrics, href, loading }: ReportHubCardProps) {
  const colors = MODULE_COLORS[moduleId];
  const name = MODULE_NAMES[moduleId];

  return (
    <Link href={href} className="block group">
      <div
        className={`
          bg-theme-surface border border-theme rounded-xl p-5
          border-l-4 ${colors.border}
          hover:bg-theme-hover transition-all duration-200
          hover:shadow-lg dark:hover:shadow-none
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-lg font-semibold ${colors.text}`}>{name}</h3>
          <ArrowRight className="w-4 h-4 text-theme-tertiary group-hover:text-theme-secondary dark:group-hover:text-theme-secondary transition-colors" />
        </div>
        <p className="text-xs text-theme-tertiary mb-4">{MODULE_ICONS[moduleId]}</p>

        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 text-theme-tertiary animate-spin" />
            <span className="text-sm text-theme-tertiary">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="text-xs text-theme-tertiary">{metric.label}</div>
                <div className="text-sm font-semibold text-theme-primary">{metric.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
