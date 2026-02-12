"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Thermometer, TrendingUp, AlertTriangle, Loader2 } from '@/components/ui/icons';
import { startOfDay, endOfDay } from "date-fns";
import ReportMetricCard from "../ReportMetricCard";
import ReportEmptyState from "../ReportEmptyState";

interface TemperatureCompliance {
  totalReadings: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  breaches: number;
  avgTemperature: number;
  bySite: Array<{ siteId: string; siteName: string; complianceRate: number; breaches: number }>;
}

interface Props {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}

export default function TemperatureComplianceSection({ companyId, siteId, dateRange }: Props) {
  const [compliance, setCompliance] = useState<TemperatureCompliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        const start = startOfDay(new Date(dateRange.start)).toISOString();
        const end = endOfDay(new Date(dateRange.end)).toISOString();

        let query = supabase
          .from("temperature_logs")
          .select("id, reading, status, site_id")
          .eq("company_id", companyId)
          .gte("recorded_at", start)
          .lte("recorded_at", end);

        if (siteId && siteId !== "all") {
          query = query.eq("site_id", siteId);
        } else {
          const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
          if (sites && sites.length > 0) query = query.in("site_id", sites.map((s) => s.id));
          else {
            setCompliance({ totalReadings: 0, compliant: 0, nonCompliant: 0, complianceRate: 0, breaches: 0, avgTemperature: 0, bySite: [] });
            setLoading(false);
            return;
          }
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        // Fetch site names
        const siteIds = [...new Set((logs || []).map((l) => l.site_id).filter(Boolean))];
        const siteNameMap = new Map<string, string>();
        if (siteIds.length > 0) {
          const { data: sites } = await supabase.from("sites").select("id, name").in("id", siteIds);
          sites?.forEach((s) => siteNameMap.set(s.id, s.name));
        }

        const result: TemperatureCompliance = {
          totalReadings: logs?.length || 0,
          compliant: 0,
          nonCompliant: 0,
          complianceRate: 0,
          breaches: 0,
          avgTemperature: 0,
          bySite: [],
        };

        const siteMap = new Map<string, { name: string; compliant: number; total: number; breaches: number }>();

        logs?.forEach((log) => {
          const sid = log.site_id || "unknown";
          const isCompliant = log.status === "ok" || log.status === "compliant";

          if (!siteMap.has(sid)) {
            siteMap.set(sid, { name: siteNameMap.get(sid) || "Unknown Site", compliant: 0, total: 0, breaches: 0 });
          }
          const siteData = siteMap.get(sid)!;
          siteData.total++;

          if (isCompliant) {
            result.compliant++;
            siteData.compliant++;
          } else {
            result.nonCompliant++;
            result.breaches++;
            siteData.breaches++;
          }
        });

        result.complianceRate = result.totalReadings > 0 ? Math.round((result.compliant / result.totalReadings) * 100) : 0;

        const temps = logs?.map((l) => l.reading).filter(Boolean) as number[];
        result.avgTemperature = temps.length > 0 ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : 0;

        result.bySite = Array.from(siteMap.entries()).map(([id, data]) => ({
          siteId: id,
          siteName: data.name,
          complianceRate: data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0,
          breaches: data.breaches,
        }));

        setCompliance(result);
      } catch (error: any) {
        console.error("Error loading temperature compliance:", error);
        setCompliance({ totalReadings: 0, compliant: 0, nonCompliant: 0, complianceRate: 0, breaches: 0, avgTemperature: 0, bySite: [] });
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
        <span className="ml-3 text-theme-tertiary">Loading temperature compliance...</span>
      </div>
    );
  }

  if (!compliance) return <ReportEmptyState icon={Thermometer} message="No temperature data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Readings" value={compliance.totalReadings} icon={Thermometer} color="blue" />
        <ReportMetricCard label="Compliant" value={compliance.compliant} icon={TrendingUp} color="green" />
        <ReportMetricCard label="Breaches" value={compliance.breaches} icon={AlertTriangle} color={compliance.breaches > 0 ? "red" : "gray"} />
        <ReportMetricCard label="Avg Temperature" value={`${compliance.avgTemperature}°C`} icon={Thermometer} color="blue" />
      </div>

      {/* Compliance Rate */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">Temperature Compliance Rate</h3>
          <span
            className={`text-3xl font-bold ${
              compliance.complianceRate >= 95 ? "text-green-400" : compliance.complianceRate >= 85 ? "text-yellow-400" : "text-red-400"
            }`}
          >
            {compliance.complianceRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              compliance.complianceRate >= 95 ? "bg-green-500" : compliance.complianceRate >= 85 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${compliance.complianceRate}%` }}
          />
        </div>
      </div>

      {/* Site Breakdown */}
      {compliance.bySite.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Compliance by Site</h3>
          <div className="space-y-3">
            {compliance.bySite
              .sort((a, b) => b.complianceRate - a.complianceRate)
              .map((site) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-theme-secondary">{site.siteName}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          site.complianceRate >= 95 ? "text-green-400" : site.complianceRate >= 85 ? "text-yellow-400" : "text-red-400"
                        }`}
                      >
                        {site.complianceRate}%
                      </div>
                      {site.breaches > 0 && <div className="text-xs text-red-400">{site.breaches} breaches</div>}
                    </div>
                    <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          site.complianceRate >= 95 ? "bg-green-500" : site.complianceRate >= 85 ? "bg-yellow-400" : "bg-red-500"
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
