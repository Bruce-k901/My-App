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
          bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5
          border-l-4 ${colors.border}
          hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all duration-200
          hover:shadow-lg dark:hover:shadow-none
        `}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className={`text-lg font-semibold ${colors.text}`}>{name}</h3>
          <ArrowRight className="w-4 h-4 text-gray-400 dark:text-white/40 group-hover:text-gray-600 dark:group-hover:text-white/70 transition-colors" />
        </div>
        <p className="text-xs text-gray-500 dark:text-white/40 mb-4">{MODULE_ICONS[moduleId]}</p>

        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 text-gray-400 dark:text-white/40 animate-spin" />
            <span className="text-sm text-gray-400 dark:text-white/40">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div className="text-xs text-gray-500 dark:text-white/40">{metric.label}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{metric.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
