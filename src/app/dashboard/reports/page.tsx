"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import SiteSelector from "@/components/ui/SiteSelector";
import { 
  Shield, 
  Package, 
  ClipboardCheck, 
  Thermometer, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Loader2
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface AssetPerformance {
  total: number;
  needingService: number;
  overdue: number;
  underWarranty: number;
  byCategory: Record<string, number>;
  serviceCost: number;
}

interface TaskPerformance {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  failed: number;
  completionRate: number;
  byCategory: Record<string, {
    total: number;
    completed: number;
    rate: number;
  }>;
  trend: Array<{
    date: string;
    completed: number;
    total: number;
    rate: number;
  }>;
}

interface TemperatureCompliance {
  totalReadings: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  breaches: number;
  avgTemperature: number;
  bySite: Array<{
    siteId: string;
    siteName: string;
    complianceRate: number;
    breaches: number;
  }>;
}

interface IncidentSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  riddor: number;
  bySite: Array<{
    siteId: string;
    siteName: string;
    count: number;
  }>;
}

export default function ReportsPage() {
  const { companyId, siteId: contextSiteId } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(contextSiteId || null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [activeTab, setActiveTab] = useState<"compliance" | "assets" | "tasks" | "temperature" | "incidents">("compliance");
  
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance | null>(null);
  const [taskPerformance, setTaskPerformance] = useState<TaskPerformance | null>(null);
  const [temperatureCompliance, setTemperatureCompliance] = useState<TemperatureCompliance | null>(null);
  const [incidentSummary, setIncidentSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState({
    assets: false,
    tasks: false,
    temperature: false,
    incidents: false,
  });

  // Load asset performance
  useEffect(() => {
    if (!companyId || activeTab !== "assets") return;
    
    const loadAssetPerformance = async () => {
      setLoading(prev => ({ ...prev, assets: true }));
      try {
        let query = supabase
          .from("assets")
          .select("id, category, next_service_date, warranty_end, site_id")
          .eq("company_id", companyId)
          .eq("archived", false);
        
        if (selectedSiteId) {
          query = query.eq("site_id", selectedSiteId);
        }
        
        const { data: assets, error } = await query;
        if (error) throw error;

        const now = new Date();
        const performance: AssetPerformance = {
          total: assets?.length || 0,
          needingService: 0,
          overdue: 0,
          underWarranty: 0,
          byCategory: {},
          serviceCost: 0,
        };

        assets?.forEach(asset => {
          // Category breakdown
          const category = asset.category || "Uncategorized";
          performance.byCategory[category] = (performance.byCategory[category] || 0) + 1;

          // Service status
          if (asset.next_service_date) {
            const serviceDate = new Date(asset.next_service_date);
            const daysUntilService = Math.ceil((serviceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntilService <= 30 && daysUntilService >= 0) {
              performance.needingService++;
            } else if (daysUntilService < 0) {
              performance.overdue++;
            }
          }

          // Warranty status
          if (asset.warranty_end) {
            const warrantyEndDate = new Date(asset.warranty_end);
            if (now <= warrantyEndDate) {
              performance.underWarranty++;
            }
          }
        });

        setAssetPerformance(performance);
      } catch (error) {
        console.error("Error loading asset performance:", error);
      } finally {
        setLoading(prev => ({ ...prev, assets: false }));
      }
    };

    loadAssetPerformance();
  }, [companyId, selectedSiteId, activeTab]);

  // Load task performance
  useEffect(() => {
    if (!companyId || activeTab !== "tasks") return;

    const loadTaskPerformance = async () => {
      setLoading(prev => ({ ...prev, tasks: true }));
      try {
        const startDate = startOfDay(new Date(dateRange.start)).toISOString();
        const endDate = endOfDay(new Date(dateRange.end)).toISOString();

        let query = supabase
          .from("checklist_tasks")
          .select(`
            id,
            status,
            due_date,
            completed_at,
            template: task_templates(category, name)
          `)
          .gte("due_date", dateRange.start)
          .lte("due_date", dateRange.end);

        if (selectedSiteId) {
          query = query.eq("site_id", selectedSiteId);
        } else {
          // Filter by company sites
          const { data: sites } = await supabase
            .from("sites")
            .select("id")
            .eq("company_id", companyId);
          
          if (sites && sites.length > 0) {
            query = query.in("site_id", sites.map(s => s.id));
          }
        }

        const { data: tasks, error } = await query;
        if (error) throw error;

        const performance: TaskPerformance = {
          total: tasks?.length || 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          failed: 0,
          completionRate: 0,
          byCategory: {},
          trend: [],
        };

        const now = new Date();
        const trendMap = new Map<string, { completed: number; total: number }>();

        tasks?.forEach(task => {
          const category = (task.template as any)?.category || "Uncategorized";
          if (!performance.byCategory[category]) {
            performance.byCategory[category] = { total: 0, completed: 0, rate: 0 };
          }
          performance.byCategory[category].total++;

          const taskDate = task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : null;
          if (taskDate) {
            const trendEntry = trendMap.get(taskDate) || { completed: 0, total: 0 };
            trendEntry.total++;
            trendMap.set(taskDate, trendEntry);
          }

          if (task.status === "completed") {
            performance.completed++;
            performance.byCategory[category].completed++;
            if (taskDate) {
              const trendEntry = trendMap.get(taskDate)!;
              trendEntry.completed++;
            }
          } else if (task.status === "pending") {
            performance.pending++;
            if (task.due_date && new Date(task.due_date) < now) {
              performance.overdue++;
            }
          } else if (task.status === "failed") {
            performance.failed++;
          }
        });

        // Calculate completion rates
        Object.keys(performance.byCategory).forEach(cat => {
          const catData = performance.byCategory[cat];
          catData.rate = catData.total > 0 ? Math.round((catData.completed / catData.total) * 100) : 0;
        });

        performance.completionRate = performance.total > 0 
          ? Math.round((performance.completed / performance.total) * 100) 
          : 0;

        // Build trend array
        performance.trend = Array.from(trendMap.entries())
          .map(([date, data]) => ({
            date,
            completed: data.completed,
            total: data.total,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setTaskPerformance(performance);
      } catch (error) {
        console.error("Error loading task performance:", error);
      } finally {
        setLoading(prev => ({ ...prev, tasks: false }));
      }
    };

    loadTaskPerformance();
  }, [companyId, selectedSiteId, dateRange, activeTab]);

  // Load temperature compliance
  useEffect(() => {
    if (!companyId || activeTab !== "temperature") return;

    const loadTemperatureCompliance = async () => {
      setLoading(prev => ({ ...prev, temperature: true }));
      try {
        const startDate = startOfDay(new Date(dateRange.start)).toISOString();
        const endDate = endOfDay(new Date(dateRange.end)).toISOString();

        // Build query with company_id filter
        let query = supabase
          .from("temperature_logs")
          .select("id, reading, status, site_id")
          .eq("company_id", companyId)
          .gte("recorded_at", startDate)
          .lte("recorded_at", endDate);

        if (selectedSiteId) {
          query = query.eq("site_id", selectedSiteId);
        } else {
          // Get all company sites for filtering
          const { data: sites } = await supabase
            .from("sites")
            .select("id")
            .eq("company_id", companyId);
          
          if (sites && sites.length > 0) {
            query = query.in("site_id", sites.map(s => s.id));
          } else {
            // No sites found, return empty data
            setTemperatureCompliance({
              totalReadings: 0,
              compliant: 0,
              nonCompliant: 0,
              complianceRate: 0,
              breaches: 0,
              avgTemperature: 0,
              bySite: [],
            });
            setLoading(prev => ({ ...prev, temperature: false }));
            return;
          }
        }

        const { data: logs, error } = await query;
        if (error) {
          console.error("Temperature logs query error:", error);
          throw error;
        }

        // Fetch site names separately
        const siteIds = [...new Set((logs || []).map(log => log.site_id).filter(Boolean))];
        const siteNameMap = new Map<string, string>();
        
        if (siteIds.length > 0) {
          const { data: sites, error: sitesError } = await supabase
            .from("sites")
            .select("id, name")
            .in("id", siteIds);
          
          if (sitesError) {
            console.error("Sites query error:", sitesError);
          } else if (sites) {
            sites.forEach(site => {
              siteNameMap.set(site.id, site.name);
            });
          }
        }

        const compliance: TemperatureCompliance = {
          totalReadings: logs?.length || 0,
          compliant: 0,
          nonCompliant: 0,
          complianceRate: 0,
          breaches: 0,
          avgTemperature: 0,
          bySite: [],
        };

        const siteMap = new Map<string, { name: string; compliant: number; total: number; breaches: number; temps: number[] }>();

        logs?.forEach(log => {
          const siteId = log.site_id || "unknown";
          const siteName = siteNameMap.get(siteId) || "Unknown Site";
          const isCompliant = log.status === "ok" || log.status === "compliant";
          
          if (!siteMap.has(siteId)) {
            siteMap.set(siteId, { name: siteName, compliant: 0, total: 0, breaches: 0, temps: [] });
          }
          
          const siteData = siteMap.get(siteId)!;
          siteData.total++;
          siteData.temps.push(log.reading || 0);
          
          if (isCompliant) {
            compliance.compliant++;
            siteData.compliant++;
          } else {
            compliance.nonCompliant++;
            compliance.breaches++;
            siteData.breaches++;
          }
        });

        compliance.complianceRate = compliance.totalReadings > 0
          ? Math.round((compliance.compliant / compliance.totalReadings) * 100)
          : 0;

        const allTemps = logs?.map(l => l.reading).filter(Boolean) as number[];
        compliance.avgTemperature = allTemps.length > 0
          ? Math.round(allTemps.reduce((a, b) => a + b, 0) / allTemps.length * 10) / 10
          : 0;

        compliance.bySite = Array.from(siteMap.entries()).map(([siteId, data]) => ({
          siteId,
          siteName: data.name,
          complianceRate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
          breaches: data.breaches,
        }));

        setTemperatureCompliance(compliance);
      } catch (error: any) {
        console.error("Error loading temperature compliance:", error);
        console.error("Error details:", {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        });
        // Set empty state on error
        setTemperatureCompliance({
          totalReadings: 0,
          compliant: 0,
          nonCompliant: 0,
          complianceRate: 0,
          breaches: 0,
          avgTemperature: 0,
          bySite: [],
        });
      } finally {
        setLoading(prev => ({ ...prev, temperature: false }));
      }
    };

    loadTemperatureCompliance();
  }, [companyId, selectedSiteId, dateRange, activeTab]);

  // Load incident summary
  useEffect(() => {
    if (!companyId || activeTab !== "incidents") return;

    const loadIncidentSummary = async () => {
      setLoading(prev => ({ ...prev, incidents: true }));
      try {
        const startDate = startOfDay(new Date(dateRange.start)).toISOString();
        const endDate = endOfDay(new Date(dateRange.end)).toISOString();

        // Try to fetch incidents with site join first, fallback to separate query if needed
        let query = supabase
          .from("incidents")
          .select(`
            id,
            severity,
            riddor_reportable,
            site_id,
            sites(name)
          `)
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .eq("company_id", companyId);

        if (selectedSiteId) {
          query = query.eq("site_id", selectedSiteId);
        }

        const { data: incidents, error } = await query;
        
        if (error) {
          // If join query fails, try without join and fetch sites separately
          console.warn("Incident query with join failed, trying fallback:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });

          // Fallback: fetch incidents without join
          let fallbackQuery = supabase
            .from("incidents")
            .select("id, severity, riddor_reportable, site_id")
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .eq("company_id", companyId);

          if (selectedSiteId) {
            fallbackQuery = fallbackQuery.eq("site_id", selectedSiteId);
          }

          const { data: fallbackIncidents, error: fallbackError } = await fallbackQuery;
          
          if (fallbackError) {
            console.error("Fallback incident query also failed:", {
              message: fallbackError.message,
              details: fallbackError.details,
              hint: fallbackError.hint,
              code: fallbackError.code,
            });
            throw fallbackError;
          }

          // Fetch site names separately
          const siteIds = [...new Set((fallbackIncidents || []).map((inc: any) => inc.site_id).filter(Boolean))];
          const siteNameMap = new Map<string, string>();
          
          if (siteIds.length > 0) {
            const { data: sites, error: sitesError } = await supabase
              .from("sites")
              .select("id, name")
              .in("id", siteIds);
            
            if (sitesError) {
              console.warn("Error fetching site names:", sitesError);
            } else if (sites) {
              sites.forEach(site => {
                siteNameMap.set(site.id, site.name);
              });
            }
          }

          // Process fallback data
          const summary: IncidentSummary = {
            total: fallbackIncidents?.length || 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            riddor: 0,
            bySite: [],
          };

          const siteMap = new Map<string, { name: string; count: number }>();

          fallbackIncidents?.forEach((incident: any) => {
            // Severity counts
            if (incident.severity === "critical") summary.critical++;
            else if (incident.severity === "high") summary.high++;
            else if (incident.severity === "medium") summary.medium++;
            else if (incident.severity === "low") summary.low++;

            if (incident.riddor_reportable) summary.riddor++;

            // Site breakdown
            const siteId = incident.site_id || "unknown";
            const siteName = siteNameMap.get(siteId) || "Unknown Site";
            if (!siteMap.has(siteId)) {
              siteMap.set(siteId, { name: siteName, count: 0 });
            }
            siteMap.get(siteId)!.count++;
          });

          summary.bySite = Array.from(siteMap.entries()).map(([siteId, data]) => ({
            siteId,
            siteName: data.name,
            count: data.count,
          }));

          setIncidentSummary(summary);
          return;
        }

        // Process data from successful join query
        const summary: IncidentSummary = {
          total: incidents?.length || 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          riddor: 0,
          bySite: [],
        };

        const siteMap = new Map<string, { name: string; count: number }>();

        incidents?.forEach((incident: any) => {
          // Severity counts
          if (incident.severity === "critical") summary.critical++;
          else if (incident.severity === "high") summary.high++;
          else if (incident.severity === "medium") summary.medium++;
          else if (incident.severity === "low") summary.low++;

          if (incident.riddor_reportable) summary.riddor++;

          // Site breakdown
          const siteId = incident.site_id || "unknown";
          const siteName = (incident.sites as any)?.name || "Unknown Site";
          if (!siteMap.has(siteId)) {
            siteMap.set(siteId, { name: siteName, count: 0 });
          }
          siteMap.get(siteId)!.count++;
        });

        summary.bySite = Array.from(siteMap.entries()).map(([siteId, data]) => ({
          siteId,
          siteName: data.name,
          count: data.count,
        }));

        setIncidentSummary(summary);
      } catch (error: any) {
        console.error("Error loading incident summary:", {
          message: error?.message || "Unknown error",
          details: error?.details || null,
          hint: error?.hint || null,
          code: error?.code || null,
          error: error,
        });
        // Set empty state on error
        setIncidentSummary({
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          riddor: 0,
          bySite: [],
        });
      } finally {
        setLoading(prev => ({ ...prev, incidents: false }));
      }
    };

    loadIncidentSummary();
  }, [companyId, selectedSiteId, dateRange, activeTab]);

  const tabs = [
    { id: "compliance" as const, label: "Compliance", icon: Shield },
    { id: "assets" as const, label: "Assets", icon: Package },
    { id: "tasks" as const, label: "Tasks", icon: ClipboardCheck },
    { id: "temperature" as const, label: "Temperature", icon: Thermometer },
    { id: "incidents" as const, label: "Incidents", icon: AlertTriangle },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
          <p className="text-sm sm:text-base text-white/60">Drill down into compliance, assets, and operational performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/[0.1] rounded-lg text-white text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 touch-manipulation">
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/60 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-white/60">Date Range:</span>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:flex-initial">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 touch-manipulation"
          />
          <span className="text-white/60 text-xs sm:text-sm">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 touch-manipulation"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <span className="text-xs sm:text-sm text-white/60">Site:</span>
          <SiteSelector
            value={selectedSiteId || ""}
            onChange={(id) => setSelectedSiteId(id)}
            placeholder="All Sites"
            className="flex-1 sm:flex-initial min-w-[200px]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-white/[0.1] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                min-h-[44px] px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap touch-manipulation
                ${isActive
                  ? "border-pink-500 text-pink-400"
                  : "border-transparent text-white/60 hover:text-white/80 active:text-white"
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === "compliance" && companyId && (
          <MetricsGrid tenantId={companyId} siteId={selectedSiteId || undefined} />
        )}

        {activeTab === "assets" && (
          <AssetPerformanceSection 
            performance={assetPerformance} 
            loading={loading.assets}
          />
        )}

        {activeTab === "tasks" && (
          <TaskPerformanceSection 
            performance={taskPerformance} 
            loading={loading.tasks}
          />
        )}

        {activeTab === "temperature" && (
          <TemperatureComplianceSection 
            compliance={temperatureCompliance} 
            loading={loading.temperature}
          />
        )}

        {activeTab === "incidents" && (
          <IncidentSummarySection 
            summary={incidentSummary} 
            loading={loading.incidents}
          />
        )}
      </div>
    </div>
  );
}

// Asset Performance Component
function AssetPerformanceSection({ 
  performance, 
  loading 
}: { 
  performance: AssetPerformance | null; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
        <span className="ml-3 text-white/60">Loading asset performance...</span>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
        <Package className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/60">No asset data available for the selected period</p>
      </div>
    );
  }

  const healthScore = performance.total > 0
    ? Math.round(((performance.total - performance.overdue - performance.needingService) / performance.total) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Assets"
          value={performance.total}
          icon={Package}
          color="blue"
        />
        <MetricCard
          label="Service Due"
          value={performance.needingService}
          icon={AlertTriangle}
          color={performance.needingService > 0 ? "yellow" : "gray"}
        />
        <MetricCard
          label="Overdue"
          value={performance.overdue}
          icon={AlertTriangle}
          color={performance.overdue > 0 ? "red" : "gray"}
        />
        <MetricCard
          label="Under Warranty"
          value={performance.underWarranty}
          icon={Shield}
          color="green"
        />
      </div>

      {/* Health Score */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Asset Health Score</h3>
          <span className={`text-2xl font-bold ${
            healthScore >= 80 ? "text-green-400" :
            healthScore >= 60 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            {healthScore}%
          </span>
        </div>
        <div className="w-full bg-white/[0.05] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              healthScore >= 80 ? "bg-green-500" :
              healthScore >= 60 ? "bg-yellow-500" :
              "bg-red-500"
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(performance.byCategory).length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Assets by Category</h3>
          <div className="space-y-3">
            {Object.entries(performance.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-white/80">{category}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-white/[0.05] rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full"
                        style={{ width: `${(count / performance.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Task Performance Component
function TaskPerformanceSection({ 
  performance, 
  loading 
}: { 
  performance: TaskPerformance | null; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
        <span className="ml-3 text-white/60">Loading task performance...</span>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
        <ClipboardCheck className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/60">No task data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="Total Tasks"
          value={performance.total}
          icon={ClipboardCheck}
          color="blue"
        />
        <MetricCard
          label="Completed"
          value={performance.completed}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          label="Pending"
          value={performance.pending}
          icon={AlertTriangle}
          color="yellow"
        />
        <MetricCard
          label="Overdue"
          value={performance.overdue}
          icon={AlertTriangle}
          color="red"
        />
        <MetricCard
          label="Failed"
          value={performance.failed}
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* Completion Rate */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Overall Completion Rate</h3>
          <span className={`text-3xl font-bold ${
            performance.completionRate >= 90 ? "text-green-400" :
            performance.completionRate >= 70 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            {performance.completionRate}%
          </span>
        </div>
        <div className="w-full bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              performance.completionRate >= 90 ? "bg-green-500" :
              performance.completionRate >= 70 ? "bg-yellow-500" :
              "bg-red-500"
            }`}
            style={{ width: `${performance.completionRate}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(performance.byCategory).length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance by Category</h3>
          <div className="space-y-4">
            {Object.entries(performance.byCategory)
              .sort((a, b) => b[1].rate - a[1].rate)
              .map(([category, data]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 font-medium">{category}</span>
                    <span className={`text-sm font-semibold ${
                      data.rate >= 90 ? "text-green-400" :
                      data.rate >= 70 ? "text-yellow-400" :
                      "text-red-400"
                    }`}>
                      {data.rate}% ({data.completed}/{data.total})
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.rate >= 90 ? "bg-green-500" :
                        data.rate >= 70 ? "bg-yellow-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {performance.trend.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Completion Trend</h3>
          <div className="space-y-2">
            {performance.trend.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-sm text-white/60 w-24">{format(new Date(day.date), "MMM dd")}</span>
                <div className="flex-1 bg-white/[0.05] rounded-full h-6 relative">
                  <div
                    className={`h-6 rounded-full ${
                      day.rate >= 90 ? "bg-green-500" :
                      day.rate >= 70 ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${day.rate}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {day.rate}% ({day.completed}/{day.total})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Temperature Compliance Component
function TemperatureComplianceSection({ 
  compliance, 
  loading 
}: { 
  compliance: TemperatureCompliance | null; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
        <span className="ml-3 text-white/60">Loading temperature compliance...</span>
      </div>
    );
  }

  if (!compliance) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
        <Thermometer className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/60">No temperature data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Readings"
          value={compliance.totalReadings}
          icon={Thermometer}
          color="blue"
        />
        <MetricCard
          label="Compliant"
          value={compliance.compliant}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          label="Breaches"
          value={compliance.breaches}
          icon={AlertTriangle}
          color={compliance.breaches > 0 ? "red" : "gray"}
        />
        <MetricCard
          label="Avg Temperature"
          value={`${compliance.avgTemperature}°C`}
          icon={Thermometer}
          color="blue"
        />
      </div>

      {/* Compliance Rate */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Temperature Compliance Rate</h3>
          <span className={`text-3xl font-bold ${
            compliance.complianceRate >= 95 ? "text-green-400" :
            compliance.complianceRate >= 85 ? "text-yellow-400" :
            "text-red-400"
          }`}>
            {compliance.complianceRate}%
          </span>
        </div>
        <div className="w-full bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              compliance.complianceRate >= 95 ? "bg-green-500" :
              compliance.complianceRate >= 85 ? "bg-yellow-500" :
              "bg-red-500"
            }`}
            style={{ width: `${compliance.complianceRate}%` }}
          />
        </div>
      </div>

      {/* Site Breakdown */}
      {compliance.bySite.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Compliance by Site</h3>
          <div className="space-y-3">
            {compliance.bySite
              .sort((a, b) => b.complianceRate - a.complianceRate)
              .map((site) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-white/80">{site.siteName}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        site.complianceRate >= 95 ? "text-green-400" :
                        site.complianceRate >= 85 ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {site.complianceRate}%
                      </div>
                      {site.breaches > 0 && (
                        <div className="text-xs text-red-400">{site.breaches} breaches</div>
                      )}
                    </div>
                    <div className="w-32 bg-white/[0.05] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          site.complianceRate >= 95 ? "bg-green-500" :
                          site.complianceRate >= 85 ? "bg-yellow-400" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${site.complianceRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Incident Summary Component
function IncidentSummarySection({ 
  summary, 
  loading 
}: { 
  summary: IncidentSummary | null; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
        <span className="ml-3 text-white/60">Loading incident summary...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/60">No incident data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          label="Total Incidents"
          value={summary.total}
          icon={AlertTriangle}
          color="blue"
        />
        <MetricCard
          label="Critical"
          value={summary.critical}
          icon={AlertTriangle}
          color={summary.critical > 0 ? "red" : "gray"}
        />
        <MetricCard
          label="High"
          value={summary.high}
          icon={AlertTriangle}
          color={summary.high > 0 ? "orange" : "gray"}
        />
        <MetricCard
          label="Medium"
          value={summary.medium}
          icon={AlertTriangle}
          color="yellow"
        />
        <MetricCard
          label="RIDDOR"
          value={summary.riddor}
          icon={Shield}
          color={summary.riddor > 0 ? "red" : "gray"}
        />
      </div>

      {/* Site Breakdown */}
      {summary.bySite.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Incidents by Site</h3>
          <div className="space-y-3">
            {summary.bySite
              .sort((a, b) => b.count - a.count)
              .map((site) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-white/80">{site.siteName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-white/[0.05] rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(site.count / summary.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold w-12 text-right">{site.count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Metric Card Component
function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ComponentType<{ className?: string }>; 
  color: "blue" | "green" | "yellow" | "red" | "orange" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    gray: "bg-white/5 text-white/60 border-white/10",
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${
        color === "gray" ? "text-white/60" : 
        color === "blue" ? "text-blue-400" :
        color === "green" ? "text-green-400" :
        color === "yellow" ? "text-yellow-400" :
        color === "red" ? "text-red-400" :
        "text-orange-400"
      }`}>
        {value}
      </div>
    </div>
  );
}
