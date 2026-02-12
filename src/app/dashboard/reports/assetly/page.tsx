"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { useReportFilters } from "@/components/reports/hooks/useReportFilters";
import ReportPageHeader from "@/components/reports/ReportPageHeader";
import ReportFiltersBar from "@/components/reports/ReportFiltersBar";
import ReportMetricCard from "@/components/reports/ReportMetricCard";
import ReportEmptyState from "@/components/reports/ReportEmptyState";
import { supabase } from "@/lib/supabase";
import {
  Wrench,
  Shield,
  AlertTriangle,
  Phone,
  Users,
  Loader2,
  CheckCircle2,
  Clock,
} from '@/components/ui/icons';
import { format } from "date-fns";

type Tab = "overview" | "ppm" | "callouts";

const tabs: { id: Tab; label: string; icon: typeof Wrench }[] = [
  { id: "overview", label: "Asset Overview", icon: Wrench },
  { id: "ppm", label: "PPM Compliance", icon: Shield },
  { id: "callouts", label: "Callout History", icon: Phone },
];

export default function AssetlyReportsPage() {
  const { companyId } = useAppContext();
  const { dateRange, siteId } = useReportFilters();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <ReportPageHeader title="Assetly Reports" subtitle="Asset health, PPM compliance, and callout history" />
      <ReportFiltersBar />

      <div className="flex gap-1 sm:gap-2 border-b border-theme overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-cyan-500 text-module-fg" : "border-transparent text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === "overview" && companyId && (
          <AssetOverviewSection companyId={companyId} siteId={siteId} />
        )}
        {activeTab === "ppm" && companyId && (
          <PPMComplianceSection companyId={companyId} siteId={siteId} />
        )}
        {activeTab === "callouts" && companyId && (
          <CalloutHistorySection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}

function AssetOverviewSection({ companyId, siteId }: { companyId: string; siteId: string | null }) {
  const [data, setData] = useState<{
    total: number;
    needingService: number;
    overdue: number;
    underWarranty: number;
    healthScore: number;
    byCategory: Array<{ category: string; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("assets")
          .select("id, category, next_service_date, warranty_end")
          .eq("company_id", companyId)
          .eq("archived", false);

        if (siteId && siteId !== "all") query = query.eq("site_id", siteId);

        const { data: assets, error } = await query;
        if (error) {
          console.debug("Assets query error (handled):", error.code || error.message);
          setData({ total: 0, needingService: 0, overdue: 0, underWarranty: 0, healthScore: 100, byCategory: [] });
          return;
        }

        const now = new Date();
        const result = { total: assets?.length || 0, needingService: 0, overdue: 0, underWarranty: 0, healthScore: 100, byCategory: [] as Array<{ category: string; count: number }> };
        const catMap = new Map<string, number>();

        assets?.forEach((a) => {
          const cat = a.category || "Uncategorized";
          catMap.set(cat, (catMap.get(cat) || 0) + 1);

          if (a.next_service_date) {
            const days = Math.ceil((new Date(a.next_service_date).getTime() - now.getTime()) / 86400000);
            if (days <= 30 && days >= 0) result.needingService++;
            else if (days < 0) result.overdue++;
          }
          if (a.warranty_end && now <= new Date(a.warranty_end)) result.underWarranty++;
        });

        result.healthScore = result.total > 0
          ? Math.round(((result.total - result.overdue - result.needingService) / result.total) * 100)
          : 100;

        result.byCategory = Array.from(catMap.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count);

        setData(result);
      } catch (error) {
        console.error("Error loading assets:", error);
        setData({ total: 0, needingService: 0, overdue: 0, underWarranty: 0, healthScore: 100, byCategory: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-module-fg animate-spin" />
        <span className="ml-3 text-theme-tertiary">Loading asset data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={Wrench} message="No asset data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Assets" value={data.total} icon={Wrench} color="cyan" />
        <ReportMetricCard label="Service Due" value={data.needingService} icon={Clock} color={data.needingService > 0 ? "yellow" : "gray"} />
        <ReportMetricCard label="Overdue" value={data.overdue} icon={AlertTriangle} color={data.overdue > 0 ? "red" : "gray"} />
        <ReportMetricCard label="Under Warranty" value={data.underWarranty} icon={Shield} color="green" />
      </div>

      {/* Health Score */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">Asset Health Score</h3>
          <span className={`text-2xl font-bold ${data.healthScore >= 80 ? "text-green-400" : data.healthScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
            {data.healthScore}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${data.healthScore >= 80 ? "bg-green-500" : data.healthScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${data.healthScore}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {data.byCategory.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Assets by Category</h3>
          <div className="space-y-3">
            {data.byCategory.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <span className="text-theme-secondary">{cat.category}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(cat.count / data.total) * 100}%` }} />
                  </div>
                  <span className="text-theme-primary font-semibold w-12 text-right">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PPMComplianceSection({ companyId, siteId }: { companyId: string; siteId: string | null }) {
  const [data, setData] = useState<{
    total: number;
    overdue: number;
    upcoming: number;
    completed: number;
    complianceRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("ppm_schedules")
          .select("id, next_due_date, last_completed_date, status")
          .eq("company_id", companyId);

        if (siteId && siteId !== "all") query = query.eq("site_id", siteId);

        const { data: schedules, error } = await query;
        if (error) {
          console.debug("PPM query error (handled):", error.code || error.message);
          setData({ total: 0, overdue: 0, upcoming: 0, completed: 0, complianceRate: 100 });
          return;
        }

        const now = new Date();
        const thirtyDays = new Date(Date.now() + 30 * 86400000);
        const result = { total: schedules?.length || 0, overdue: 0, upcoming: 0, completed: 0, complianceRate: 100 };

        schedules?.forEach((s: any) => {
          if (s.status === "completed") {
            result.completed++;
          } else if (s.next_due_date) {
            const due = new Date(s.next_due_date);
            if (due < now) result.overdue++;
            else if (due <= thirtyDays) result.upcoming++;
          }
        });

        result.complianceRate = result.total > 0
          ? Math.round(((result.total - result.overdue) / result.total) * 100)
          : 100;

        setData(result);
      } catch (error) {
        console.error("Error loading PPM:", error);
        setData({ total: 0, overdue: 0, upcoming: 0, completed: 0, complianceRate: 100 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-module-fg animate-spin" />
        <span className="ml-3 text-theme-tertiary">Loading PPM data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={Shield} message="No PPM data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Schedules" value={data.total} icon={Shield} color="cyan" />
        <ReportMetricCard label="Overdue" value={data.overdue} icon={AlertTriangle} color={data.overdue > 0 ? "red" : "gray"} />
        <ReportMetricCard label="Due (30d)" value={data.upcoming} icon={Clock} color={data.upcoming > 0 ? "yellow" : "gray"} />
        <ReportMetricCard label="Completed" value={data.completed} icon={CheckCircle2} color="green" />
      </div>

      {/* Compliance Rate */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">PPM Compliance Rate</h3>
          <span className={`text-3xl font-bold ${data.complianceRate >= 90 ? "text-green-400" : data.complianceRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
            {data.complianceRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${data.complianceRate >= 90 ? "bg-green-500" : data.complianceRate >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${data.complianceRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CalloutHistorySection({
  companyId,
  siteId,
  dateRange,
}: {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}) {
  const [data, setData] = useState<{
    total: number;
    open: number;
    resolved: number;
    byContractor: Array<{ name: string; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("callouts")
          .select("id, status, contractors(name)")
          .eq("company_id", companyId)
          .gte("created_at", dateRange.start)
          .lte("created_at", dateRange.end);

        if (siteId && siteId !== "all") query = query.eq("site_id", siteId);

        const { data: callouts, error } = await query;
        if (error) {
          console.debug("Callouts query error (handled):", error.code || error.message);
          setData({ total: 0, open: 0, resolved: 0, byContractor: [] });
          return;
        }

        const result = { total: callouts?.length || 0, open: 0, resolved: 0, byContractor: [] as Array<{ name: string; count: number }> };
        const contractorMap = new Map<string, number>();

        callouts?.forEach((c: any) => {
          if (["open", "reopened"].includes(c.status)) result.open++;
          else result.resolved++;

          const name = c.contractors?.name || "Unassigned";
          contractorMap.set(name, (contractorMap.get(name) || 0) + 1);
        });

        result.byContractor = Array.from(contractorMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setData(result);
      } catch (error) {
        console.error("Error loading callouts:", error);
        setData({ total: 0, open: 0, resolved: 0, byContractor: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId, dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-module-fg animate-spin" />
        <span className="ml-3 text-theme-tertiary">Loading callout data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={Phone} message="No callout data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportMetricCard label="Total Callouts" value={data.total} icon={Phone} color="cyan" />
        <ReportMetricCard label="Open" value={data.open} icon={AlertTriangle} color={data.open > 0 ? "red" : "gray"} />
        <ReportMetricCard label="Resolved" value={data.resolved} icon={CheckCircle2} color="green" />
      </div>

      {/* Contractor Breakdown */}
      {data.byContractor.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Callouts by Contractor</h3>
          <div className="space-y-3">
            {data.byContractor.map((contractor) => (
              <div key={contractor.name} className="flex items-center justify-between">
                <span className="text-theme-secondary">{contractor.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(contractor.count / data.total) * 100}%` }} />
                  </div>
                  <span className="text-theme-primary font-semibold w-12 text-right">{contractor.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
