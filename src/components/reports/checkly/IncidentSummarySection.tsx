"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Shield, Loader2 } from '@/components/ui/icons';
import { startOfDay, endOfDay } from "date-fns";
import ReportMetricCard from "../ReportMetricCard";
import ReportEmptyState from "../ReportEmptyState";

interface IncidentSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  riddor: number;
  bySite: Array<{ siteId: string; siteName: string; count: number }>;
}

interface Props {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}

export default function IncidentSummarySection({ companyId, siteId, dateRange }: Props) {
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        const start = startOfDay(new Date(dateRange.start)).toISOString();
        const end = endOfDay(new Date(dateRange.end)).toISOString();

        let query = supabase
          .from("incidents")
          .select("id, severity, riddor_reportable, site_id")
          .gte("created_at", start)
          .lte("created_at", end)
          .eq("company_id", companyId);

        if (siteId && siteId !== "all") {
          query = query.eq("site_id", siteId);
        }

        const { data: incidents, error } = await query;
        if (error) throw error;

        // Fetch site names
        const siteIds = [...new Set((incidents || []).map((i) => i.site_id).filter(Boolean))];
        const siteNameMap = new Map<string, string>();
        if (siteIds.length > 0) {
          const { data: sites } = await supabase.from("sites").select("id, name").in("id", siteIds);
          sites?.forEach((s) => siteNameMap.set(s.id, s.name));
        }

        const result: IncidentSummary = { total: incidents?.length || 0, critical: 0, high: 0, medium: 0, low: 0, riddor: 0, bySite: [] };
        const siteMap = new Map<string, { name: string; count: number }>();

        incidents?.forEach((inc) => {
          if (inc.severity === "critical") result.critical++;
          else if (inc.severity === "high") result.high++;
          else if (inc.severity === "medium") result.medium++;
          else if (inc.severity === "low") result.low++;
          if (inc.riddor_reportable) result.riddor++;

          const sid = inc.site_id || "unknown";
          if (!siteMap.has(sid)) siteMap.set(sid, { name: siteNameMap.get(sid) || "Unknown Site", count: 0 });
          siteMap.get(sid)!.count++;
        });

        result.bySite = Array.from(siteMap.entries()).map(([id, data]) => ({
          siteId: id,
          siteName: data.name,
          count: data.count,
        }));

        setSummary(result);
      } catch (error: any) {
        console.error("Error loading incident summary:", error);
        setSummary({ total: 0, critical: 0, high: 0, medium: 0, low: 0, riddor: 0, bySite: [] });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [companyId, siteId, dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-theme-tertiary">Loading incident summary...</span>
      </div>
    );
  }

  if (!summary) return <ReportEmptyState icon={AlertTriangle} message="No incident data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ReportMetricCard label="Total Incidents" value={summary.total} icon={AlertTriangle} color="blue" />
        <ReportMetricCard label="Critical" value={summary.critical} icon={AlertTriangle} color={summary.critical > 0 ? "red" : "gray"} />
        <ReportMetricCard label="High" value={summary.high} icon={AlertTriangle} color={summary.high > 0 ? "orange" : "gray"} />
        <ReportMetricCard label="Medium" value={summary.medium} icon={AlertTriangle} color="yellow" />
        <ReportMetricCard label="RIDDOR" value={summary.riddor} icon={Shield} color={summary.riddor > 0 ? "red" : "gray"} />
      </div>

      {/* Site Breakdown */}
      {summary.bySite.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Incidents by Site</h3>
          <div className="space-y-3">
            {summary.bySite
              .sort((a, b) => b.count - a.count)
              .map((site) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-theme-secondary">{site.siteName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(site.count / summary.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-theme-primary font-semibold w-12 text-right">{site.count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
