"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useReportFilters } from "@/components/reports/hooks/useReportFilters";
import ReportPageHeader from "@/components/reports/ReportPageHeader";
import ReportFiltersBar from "@/components/reports/ReportFiltersBar";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import {
  Shield,
  Package,
  ClipboardCheck,
  Thermometer,
  AlertTriangle,
} from '@/components/ui/icons';
import AssetPerformanceSection from "@/components/reports/checkly/AssetPerformanceSection";
import TaskPerformanceSection from "@/components/reports/checkly/TaskPerformanceSection";
import TemperatureComplianceSection from "@/components/reports/checkly/TemperatureComplianceSection";
import IncidentSummarySection from "@/components/reports/checkly/IncidentSummarySection";

type Tab = "compliance" | "assets" | "tasks" | "temperature" | "incidents";

const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "assets", label: "Assets", icon: Package },
  { id: "tasks", label: "Tasks", icon: ClipboardCheck },
  { id: "temperature", label: "Temperature", icon: Thermometer },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
];

export default function ChecklyReportsPage() {
  const { companyId } = useAppContext();
  const { dateRange, siteId } = useReportFilters();
  const [activeTab, setActiveTab] = useState<Tab>("compliance");

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <ReportPageHeader
        title="Checkly Reports"
        subtitle="Compliance, tasks, temperature monitoring, and incidents"
      />

      <ReportFiltersBar />

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-theme overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                ${
                  isActive
                    ? "border-teamly text-teamly"
                    : "border-transparent text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "compliance" && companyId && (
          <MetricsGrid tenantId={companyId} siteId={siteId || undefined} />
        )}
        {activeTab === "assets" && companyId && (
          <AssetPerformanceSection companyId={companyId} siteId={siteId} />
        )}
        {activeTab === "tasks" && companyId && (
          <TaskPerformanceSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
        {activeTab === "temperature" && companyId && (
          <TemperatureComplianceSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
        {activeTab === "incidents" && companyId && (
          <IncidentSummarySection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}
