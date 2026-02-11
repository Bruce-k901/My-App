"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, AlertTriangle, Shield, Loader2 } from '@/components/ui/icons';
import ReportMetricCard from "../ReportMetricCard";
import ReportEmptyState from "../ReportEmptyState";

interface AssetPerformance {
  total: number;
  needingService: number;
  overdue: number;
  underWarranty: number;
  byCategory: Record<string, number>;
}

interface Props {
  companyId: string;
  siteId: string | null;
}

export default function AssetPerformanceSection({ companyId, siteId }: Props) {
  const [performance, setPerformance] = useState<AssetPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("assets")
          .select("id, category, next_service_date, warranty_end, site_id")
          .eq("company_id", companyId)
          .eq("archived", false);

        if (siteId && siteId !== "all") {
          query = query.eq("site_id", siteId);
        }

        const { data: assets, error } = await query;
        if (error) throw error;

        const now = new Date();
        const perf: AssetPerformance = {
          total: assets?.length || 0,
          needingService: 0,
          overdue: 0,
          underWarranty: 0,
          byCategory: {},
        };

        assets?.forEach((asset) => {
          const category = asset.category || "Uncategorized";
          perf.byCategory[category] = (perf.byCategory[category] || 0) + 1;

          if (asset.next_service_date) {
            const days = Math.ceil(
              (new Date(asset.next_service_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days <= 30 && days >= 0) perf.needingService++;
            else if (days < 0) perf.overdue++;
          }

          if (asset.warranty_end && now <= new Date(asset.warranty_end)) {
            perf.underWarranty++;
          }
        });

        setPerformance(perf);
      } catch (error) {
        console.error("Error loading asset performance:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-gray-500 dark:text-white/60">Loading asset performance...</span>
      </div>
    );
  }

  if (!performance) return <ReportEmptyState icon={Package} message="No asset data available" />;

  const healthScore =
    performance.total > 0
      ? Math.round(
          ((performance.total - performance.overdue - performance.needingService) / performance.total) * 100
        )
      : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Assets" value={performance.total} icon={Package} color="blue" />
        <ReportMetricCard
          label="Service Due"
          value={performance.needingService}
          icon={AlertTriangle}
          color={performance.needingService > 0 ? "yellow" : "gray"}
        />
        <ReportMetricCard
          label="Overdue"
          value={performance.overdue}
          icon={AlertTriangle}
          color={performance.overdue > 0 ? "red" : "gray"}
        />
        <ReportMetricCard label="Under Warranty" value={performance.underWarranty} icon={Shield} color="green" />
      </div>

      {/* Health Score */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Asset Health Score</h3>
          <span
            className={`text-2xl font-bold ${
              healthScore >= 80 ? "text-green-400" : healthScore >= 60 ? "text-yellow-400" : "text-red-400"
            }`}
          >
            {healthScore}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              healthScore >= 80 ? "bg-green-500" : healthScore >= 60 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(performance.byCategory).length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assets by Category</h3>
          <div className="space-y-3">
            {Object.entries(performance.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-white/80">{category}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                      <div
                        className="bg-teamly h-2 rounded-full"
                        style={{ width: `${(count / performance.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-900 dark:text-white font-semibold w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
