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
  Users,
  Clock,
  GraduationCap,
  CalendarOff,
  AlertTriangle,
  Loader2,
} from '@/components/ui/icons';
import { format } from "date-fns";

type Tab = "attendance" | "training" | "leave";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "attendance", label: "Attendance & Shifts", icon: Clock },
  { id: "training", label: "Training Compliance", icon: GraduationCap },
  { id: "leave", label: "Leave Overview", icon: CalendarOff },
];

interface ShiftSummary {
  totalShifts: number;
  uniqueStaff: number;
  bySite: Array<{ siteId: string; siteName: string; count: number }>;
}

interface TrainingSummary {
  totalRecords: number;
  expiringSoon: number;
  expired: number;
  valid: number;
  expiringList: Array<{ name: string; course: string; expiryDate: string }>;
}

interface LeaveSummary {
  pending: number;
  approved: number;
  rejected: number;
  totalDays: number;
}

export default function TeamlyReportsPage() {
  const { companyId } = useAppContext();
  const { dateRange, siteId } = useReportFilters();
  const [activeTab, setActiveTab] = useState<Tab>("attendance");

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <ReportPageHeader title="Teamly Reports" subtitle="People, attendance, training compliance, and leave" />
      <ReportFiltersBar />

      <div className="flex gap-1 sm:gap-2 border-b border-theme overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-3 md:px-4 py-2 sm:py-3 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-blue-500 text-blue-400" : "border-transparent text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === "attendance" && companyId && (
          <AttendanceSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
        {activeTab === "training" && companyId && (
          <TrainingSection companyId={companyId} siteId={siteId} />
        )}
        {activeTab === "leave" && companyId && (
          <LeaveSection companyId={companyId} siteId={siteId} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}

function AttendanceSection({
  companyId,
  siteId,
  dateRange,
}: {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}) {
  const [data, setData] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // schedule_shifts table not yet created — return empty to avoid 404
        setData({ totalShifts: 0, uniqueStaff: 0, bySite: [] });
      } catch (error) {
        console.error("Error loading attendance:", error);
        setData({ totalShifts: 0, uniqueStaff: 0, bySite: [] });
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
        <span className="ml-3 text-theme-tertiary">Loading attendance data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={Clock} message="No attendance data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportMetricCard label="Total Shifts" value={data.totalShifts} icon={Clock} color="blue" />
        <ReportMetricCard label="Unique Staff" value={data.uniqueStaff} icon={Users} color="blue" />
        <ReportMetricCard label="Sites Active" value={data.bySite.length} icon={Users} color="green" />
      </div>

      {data.bySite.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Shifts by Site</h3>
          <div className="space-y-3">
            {data.bySite
              .sort((a, b) => b.count - a.count)
              .map((site) => (
                <div key={site.siteId} className="flex items-center justify-between">
                  <span className="text-theme-secondary">{site.siteName}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 dark:bg-white/[0.05] rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(site.count / data.totalShifts) * 100}%` }}
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

function TrainingSection({ companyId, siteId }: { companyId: string; siteId: string | null }) {
  const [data, setData] = useState<TrainingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("training_records")
          .select("id, expiry_date, course_id, profile:profiles!training_records_profile_id_fkey(full_name), course:training_courses!training_records_course_id_fkey(name)")
          .eq("company_id", companyId);

        if (siteId && siteId !== "all") query = query.eq("site_id", siteId);

        const { data: records, error } = await query;
        if (error) {
          console.debug("Training query error (handled):", error.code || error.message);
          setData({ totalRecords: 0, expiringSoon: 0, expired: 0, valid: 0, expiringList: [] });
          return;
        }

        const now = new Date();
        const thirtyDays = new Date(Date.now() + 30 * 86400000);
        const summary: TrainingSummary = { totalRecords: records?.length || 0, expiringSoon: 0, expired: 0, valid: 0, expiringList: [] };

        records?.forEach((r: any) => {
          if (!r.expiry_date) {
            summary.valid++;
            return;
          }
          const expiry = new Date(r.expiry_date);
          if (expiry < now) {
            summary.expired++;
          } else if (expiry <= thirtyDays) {
            summary.expiringSoon++;
            summary.expiringList.push({
              name: (r as any).profile?.full_name || "Unknown",
              course: (r as any).course?.name || "Unknown Course",
              expiryDate: format(expiry, "dd MMM yyyy"),
            });
          } else {
            summary.valid++;
          }
        });

        summary.expiringList.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
        setData(summary);
      } catch (error) {
        console.error("Error loading training:", error);
        setData({ totalRecords: 0, expiringSoon: 0, expired: 0, valid: 0, expiringList: [] });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <div className="bg-theme-surface border border-theme rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="ml-3 text-theme-tertiary">Loading training data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={GraduationCap} message="No training data available" />;

  const complianceRate = data.totalRecords > 0 ? Math.round((data.valid / data.totalRecords) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Total Records" value={data.totalRecords} icon={GraduationCap} color="blue" />
        <ReportMetricCard label="Valid" value={data.valid} icon={GraduationCap} color="green" />
        <ReportMetricCard label="Expiring (30d)" value={data.expiringSoon} icon={AlertTriangle} color={data.expiringSoon > 0 ? "yellow" : "gray"} />
        <ReportMetricCard label="Expired" value={data.expired} icon={AlertTriangle} color={data.expired > 0 ? "red" : "gray"} />
      </div>

      {/* Compliance Rate */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-theme-primary">Training Compliance Rate</h3>
          <span className={`text-3xl font-bold ${complianceRate >= 90 ? "text-green-400" : complianceRate >= 70 ? "text-yellow-400" : "text-red-400"}`}>
            {complianceRate}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-white/[0.05] rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${complianceRate >= 90 ? "bg-green-500" : complianceRate >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${complianceRate}%` }}
          />
        </div>
      </div>

      {/* Expiring List */}
      {data.expiringList.length > 0 && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">Expiring Within 30 Days</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left py-2 text-theme-tertiary font-medium">Staff Member</th>
                  <th className="text-left py-2 text-theme-tertiary font-medium">Course</th>
                  <th className="text-right py-2 text-theme-tertiary font-medium">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {data.expiringList.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-white/[0.04]">
                    <td className="py-2 text-theme-secondary">{item.name}</td>
                    <td className="py-2 text-theme-secondary">{item.course}</td>
                    <td className="py-2 text-right text-yellow-400">{item.expiryDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaveSection({
  companyId,
  siteId,
  dateRange,
}: {
  companyId: string;
  siteId: string | null;
  dateRange: { start: string; end: string };
}) {
  const [data, setData] = useState<LeaveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("leave_requests")
          .select("id, status, total_days")
          .eq("company_id", companyId)
          .gte("start_date", dateRange.start)
          .lte("start_date", dateRange.end);

        if (siteId && siteId !== "all") query = query.eq("site_id", siteId);

        const { data: requests, error } = await query;
        if (error) {
          console.debug("Leave query error (handled):", error.code || error.message);
          setData({ pending: 0, approved: 0, rejected: 0, totalDays: 0 });
          return;
        }

        const summary: LeaveSummary = { pending: 0, approved: 0, rejected: 0, totalDays: 0 };
        requests?.forEach((r: any) => {
          if (r.status === "pending") summary.pending++;
          else if (r.status === "approved") {
            summary.approved++;
            summary.totalDays += r.total_days || 0;
          } else if (r.status === "declined") summary.rejected++;
        });

        setData(summary);
      } catch (error) {
        console.error("Error loading leave:", error);
        setData({ pending: 0, approved: 0, rejected: 0, totalDays: 0 });
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
        <span className="ml-3 text-theme-tertiary">Loading leave data...</span>
      </div>
    );
  }

  if (!data) return <ReportEmptyState icon={CalendarOff} message="No leave data available" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportMetricCard label="Pending" value={data.pending} icon={Clock} color={data.pending > 0 ? "yellow" : "gray"} />
        <ReportMetricCard label="Approved" value={data.approved} icon={CalendarOff} color="green" />
        <ReportMetricCard label="Rejected" value={data.rejected} icon={CalendarOff} color="red" />
        <ReportMetricCard label="Total Days Off" value={data.totalDays} icon={CalendarOff} color="blue" />
      </div>
    </div>
  );
}
