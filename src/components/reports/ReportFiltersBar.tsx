"use client";

import { Calendar } from '@/components/ui/icons';
import SiteSelector from "@/components/ui/SiteSelector";
import { useReportFilters } from "./hooks/useReportFilters";

export default function ReportFiltersBar() {
  const { dateRange, setDateRange, quickRange, setQuickRange, siteId, setSiteId } = useReportFilters();

  const quickRanges: { id: "week" | "month" | "quarter"; label: string }[] = [
    { id: "week", label: "7d" },
    { id: "month", label: "30d" },
    { id: "quarter", label: "90d" },
  ];

  return (
    <div className="bg-theme-surface border border-theme rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-theme-tertiary" />
        <div className="flex gap-1">
          {quickRanges.map((r) => (
            <button
              key={r.id}
              onClick={() => setQuickRange(r.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                quickRange === r.id
                  ? "bg-teamly/20 text-teamly border border-teamly/30"
                  : "bg-gray-100 dark:bg-white/[0.05] text-theme-tertiary border border-theme hover:bg-gray-200 dark:hover:bg-white/[0.08]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="px-2.5 py-1.5 bg-theme-button border border-theme rounded-lg text-theme-primary text-xs focus:outline-none focus:ring-2 focus:ring-teamly/50"
        />
        <span className="text-theme-tertiary text-xs">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="px-2.5 py-1.5 bg-theme-button border border-theme rounded-lg text-theme-primary text-xs focus:outline-none focus:ring-2 focus:ring-teamly/50"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-theme-tertiary">Site:</span>
        <SiteSelector
          value={siteId || ""}
          onChange={(id) => setSiteId(id)}
          placeholder="All Sites (Company-wide)"
          className="min-w-[180px] text-xs"
        />
      </div>
    </div>
  );
}
