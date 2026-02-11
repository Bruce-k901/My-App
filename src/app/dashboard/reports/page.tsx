"use client";

import { BarChart3 } from '@/components/ui/icons';
import { useEnabledModules } from "@/hooks/dashboard/useEnabledModules";
import { useReportFilters } from "@/components/reports/hooks/useReportFilters";
import { useReportHubData } from "@/components/reports/hooks/useReportHubData";
import ReportFiltersBar from "@/components/reports/ReportFiltersBar";
import ReportHubCard from "@/components/reports/ReportHubCard";
import { ModuleId } from "@/types/dashboard";

const REPORT_MODULES: { moduleId: ModuleId; href: string }[] = [
  { moduleId: "checkly", href: "/dashboard/reports/checkly" },
  { moduleId: "stockly", href: "/dashboard/reports/stockly" },
  { moduleId: "teamly", href: "/dashboard/reports/teamly" },
  { moduleId: "planly", href: "/dashboard/reports/planly" },
  { moduleId: "assetly", href: "/dashboard/reports/assetly" },
];

export default function ReportsHubPage() {
  const { enabledModules, loading: modulesLoading } = useEnabledModules();
  const { dateRange, siteId } = useReportFilters();
  const hubData = useReportHubData(enabledModules, dateRange, siteId);

  const visibleModules = REPORT_MODULES.filter((m) => enabledModules.includes(m.moduleId));

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-teamly/20 border border-teamly/30">
            <BarChart3 className="w-5 h-5 text-teamly" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-white/50">
              Drill down into performance across all modules
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ReportFiltersBar />

      {/* Module Cards */}
      {modulesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleModules.map((m) => (
            <ReportHubCard
              key={m.moduleId}
              moduleId={m.moduleId}
              href={m.href}
              metrics={hubData[m.moduleId].metrics}
              loading={hubData[m.moduleId].loading}
            />
          ))}
        </div>
      )}

      {/* Quick Info */}
      {!modulesLoading && visibleModules.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-300 dark:text-white/30 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-white/50">No modules enabled. Enable modules in your company settings.</p>
        </div>
      )}
    </div>
  );
}
