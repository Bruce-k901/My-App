"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
} from '@/components/ui/icons';
import { format, startOfDay, endOfDay } from "date-fns";
import ReportMetricCard from "../ReportMetricCard";
import ReportEmptyState from "../ReportEmptyState";

interface TaskPerformance {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  failed: number;
  completionRate: number;
  byCategory: Record<string, { total: number; completed: number; rate: number }>;
  trend: Array<{ date: string; completed: number; total: number; rate: number }>;
}

interface Props {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}

export default function TaskPerformanceSection({ companyId, siteId, dateRange }: Props) {
  const [performance, setPerformance] = useState<TaskPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("checklist_tasks")
          .select(`id, status, due_date, completed_at, template: task_templates(category, name)`)
          .gte("due_date", dateRange.start)
          .lte("due_date", dateRange.end);

        if (siteId && siteId !== "all") {
          query = query.eq("site_id", siteId);
        } else {
          const { data: sites } = await supabase.from("sites").select("id").eq("company_id", companyId);
          if (sites && sites.length > 0) query = query.in("site_id", sites.map((s) => s.id));
        }

        const { data: tasks, error } = await query;
        if (error) throw error;

        const perf: TaskPerformance = {
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

        tasks?.forEach((task) => {
          const category = (task.template as any)?.category || "Uncategorized";
          if (!perf.byCategory[category]) perf.byCategory[category] = { total: 0, completed: 0, rate: 0 };
          perf.byCategory[category].total++;

          const taskDate = task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : null;
          if (taskDate) {
            const entry = trendMap.get(taskDate) || { completed: 0, total: 0 };
            entry.total++;
            trendMap.set(taskDate, entry);
          }

          if (task.status === "completed") {
            perf.completed++;
            perf.byCategory[category].completed++;
            if (taskDate) trendMap.get(taskDate)!.completed++;
          } else if (task.status === "pending") {
            perf.pending++;
            if (task.due_date && new Date(task.due_date) < now) perf.overdue++;
          } else if (task.status === "failed") {
            perf.failed++;
          }
        });

        Object.values(perf.byCategory).forEach((cat) => {
          cat.rate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
        });

        perf.completionRate = perf.total > 0 ? Math.round((perf.completed / perf.total) * 100) : 0;

        perf.trend = Array.from(trendMap.entries())
          .map(([date, data]) => ({
            date,
            completed: data.completed,
            total: data.total,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setPerformance(perf);
      } catch (error) {
        console.error("Error loading task performance:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [companyId, siteId, dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-gray-500 dark:text-white/60">Loading task performance...</span>
      </div>
    );
  }

  if (!performance) return <ReportEmptyState icon={ClipboardCheck} message="No task data available for the selected period" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ReportMetricCard label="Total Tasks" value={performance.total} icon={ClipboardCheck} color="blue" />
        <ReportMetricCard label="Completed" value={performance.completed} icon={TrendingUp} color="green" />
        <ReportMetricCard label="Pending" value={performance.pending} icon={AlertTriangle} color="yellow" />
        <ReportMetricCard label="Overdue" value={performance.overdue} icon={AlertTriangle} color="red" />
        <ReportMetricCard label="Failed" value={performance.failed} icon={TrendingDown} color="red" />
      </div>

      {/* Completion Rate */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Completion Rate</h3>
          <span
            className={`text-3xl font-bold ${
              performance.completionRate >= 90
                ? "text-green-400"
                : performance.completionRate >= 70
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {performance.completionRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              performance.completionRate >= 90
                ? "bg-green-500"
                : performance.completionRate >= 70
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${performance.completionRate}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(performance.byCategory).length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Category</h3>
          <div className="space-y-4">
            {Object.entries(performance.byCategory)
              .sort((a, b) => b[1].rate - a[1].rate)
              .map(([category, data]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 dark:text-white/80 font-medium">{category}</span>
                    <span
                      className={`text-sm font-semibold ${
                        data.rate >= 90 ? "text-green-400" : data.rate >= 70 ? "text-yellow-400" : "text-red-400"
                      }`}
                    >
                      {data.rate}% ({data.completed}/{data.total})
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        data.rate >= 90 ? "bg-green-500" : data.rate >= 70 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trend */}
      {performance.trend.length > 0 && (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completion Trend</h3>
          <div className="space-y-2">
            {performance.trend.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-white/60 w-24">{format(new Date(day.date), "MMM dd")}</span>
                <div className="flex-1 bg-gray-100 dark:bg-white/[0.05] rounded-full h-6 relative">
                  <div
                    className={`h-6 rounded-full ${
                      day.rate >= 90 ? "bg-green-500" : day.rate >= 70 ? "bg-yellow-500" : "bg-red-500"
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
