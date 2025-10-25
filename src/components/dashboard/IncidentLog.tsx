"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ClipboardList, AlertTriangle, ThumbsDown, Activity } from "lucide-react";
import { format } from "date-fns";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Incident = {
  id: string;
  description: string;
  resolution_notes?: string;
  status: string;
  created_at: string;
  sites?: {
    name: string;
  };
};

const tabs = [
  { key: "food_poisoning", label: "Food Poisoning", icon: AlertTriangle },
  { key: "accident", label: "Accidents & Injuries", icon: Activity },
  { key: "complaint", label: "Customer Complaints", icon: ThumbsDown },
];

export default function IncidentLog() {
  const [activeTab, setActiveTab] = useState("food_poisoning");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "under review" | "resolved">("open");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Remove: const supabase = createClientComponentClient();
  const { companyId } = useAppContext();

  async function loadIncidents() {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("incidents")
        .select(`
          id,
          description,
          resolution_notes,
          status,
          created_at,
          sites!inner(name)
        `)
        .eq("type", activeTab)
        .order("created_at", { ascending: false })
        .limit(10);
      if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      const formattedData = (data || []).map(item => ({
        ...item,
        sites: item.sites?.[0] || { name: 'Unknown Site' }
      }));
      setIncidents(formattedData as Incident[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
    // Realtime subscription: reload when incident_reports change
    const channel = supabase
      .channel("dashboard-incident-reports")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incident_reports" },
        () => loadIncidents()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incident_reports" },
        () => loadIncidents()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, companyId, supabase]);

  return (
    <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)] text-white fade-in-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-magenta-400" />
          <h2 className="text-lg font-semibold">Incident Log</h2>
          {incidents.some((i) => i.status === "open" || i.status === "under review") && (
            <span className="blink-dot" aria-label="Active incidents" />
          )}
        </div>
        <button className="px-3 py-1.5 rounded-md bg-white/[0.08] border border-white/[0.1] text-white/80 hover:bg-white/[0.15] transition-all text-sm">
          Log New Incident
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.1] mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "text-magenta-400 border-b-2 border-magenta-400"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-3 mb-4">
        {["all", "open", "under review", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`text-xs px-2 py-1 rounded-full border border-white/20 ${
              statusFilter === s ? "text-white bg-black/20" : "text-slate-300 hover:bg-black/10"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {error && (
        <div className="text-sm text-red-400">
          <p>{error}</p>
          <button
            className="mt-2 px-3 py-1 rounded-md bg-white/[0.08] border border-white/[0.1] text-white/80 hover:bg-white/[0.15] transition-all text-sm"
            onClick={() => loadIncidents()}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !incidents.length ? (
        <div className="py-6 text-center text-white/60">No incidents recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-white/[0.1] text-white/60">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Site</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Resolution Notes</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents
                .filter((i) => (statusFilter === "all" ? true : i.status === statusFilter))
                .map((i) => (
                <tr key={i.id} className="border-b border-white/[0.05] hover:bg-white/[0.05]">
                  <td className="py-2 text-white/80">{format(new Date(i.created_at), "d MMM yyyy")}</td>
                  <td className="py-2 text-white/80">{i.sites?.name || "—"}</td>
                  <td className="py-2 text-white/80">{i.description}</td>
                  <td className="py-2 text-white/60">{i.resolution_notes || "—"}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        i.status === "open"
                          ? "bg-red-500/20 text-red-400"
                          : i.status === "under review"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}