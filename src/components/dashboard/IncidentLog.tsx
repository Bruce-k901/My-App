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
  investigation_notes?: string;
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
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "investigating" | "resolved" | "closed">("open");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { companyId, siteId } = useAppContext();

  async function loadIncidents() {
    setLoading(true);
    setError(null);
    try {
      if (!companyId) {
        setError("No company ID available");
        setIncidents([]);
        return;
      }

      // Map status filter to database values
      let statusQuery: string[] | null = null;
      if (statusFilter !== "all") {
        // Map "under review" to "investigating" for backward compatibility
        const dbStatus = statusFilter === "under review" ? "investigating" : statusFilter;
        statusQuery = [dbStatus];
      }

      // Fetch incidents with proper status filtering
      let query = supabase
        .from("incidents")
        .select(`
          id,
          title,
          description,
          investigation_notes,
          status,
          created_at,
          reported_date,
          site_id,
          company_id
        `)
        .eq("company_id", companyId);
      
      // Apply incident type filter if not "all"
      if (activeTab !== "all") {
        // Map tab keys to incident_type values
        const incidentTypeMap: Record<string, string> = {
          food_poisoning: "food_poisoning",
          accident: "accident",
          complaint: "customer_complaint"
        };
        const incidentType = incidentTypeMap[activeTab];
        if (incidentType) {
          query = query.eq("incident_type", incidentType);
        }
      }
      
      // Apply status filter
      if (statusQuery) {
        query = query.in("status", statusQuery);
      }
      
      // Apply site filter if available
      if (siteId) {
        query = query.eq("site_id", siteId);
      }
      
      query = query.order("reported_date", { ascending: false }).order("created_at", { ascending: false }).limit(20);
        
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch sites separately to avoid relationship issues
      const siteIds = [...new Set((data || []).map((item: any) => item.site_id).filter(Boolean))];
      let sitesMap = new Map<string, { name: string }>();
      
      if (siteIds.length > 0) {
        const { data: sitesData, error: sitesError } = await supabase
          .from("sites")
          .select("id, name")
          .in("id", siteIds);
        
        if (!sitesError && sitesData) {
          sitesMap = new Map(sitesData.map((s: any) => [s.id, { name: s.name }]));
        }
      }
      
      // Transform data to include site name
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        sites: item.site_id ? (sitesMap.get(item.site_id) || { name: 'Unknown Site' }) : { name: 'Unknown Site' }
      }));
      setIncidents(formattedData as Incident[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!companyId) return;
    loadIncidents();
    
    // Realtime subscription: reload when incidents change
    const channel = supabase
      .channel("dashboard-incidents-log")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "incidents",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("New incident inserted, reloading...");
          loadIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "incidents",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("Incident updated, reloading...");
          loadIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "staff_sickness_records",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("New staff sickness record inserted, reloading...");
          loadIncidents();
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "staff_sickness_records",
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        () => {
          console.log("Staff sickness record updated, reloading...");
          loadIncidents();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, companyId, siteId, statusFilter]);

  return (
    <div className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)] text-white fade-in-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-magenta-400" />
          <h2 className="text-lg font-semibold">Incident Log</h2>
          {incidents.some((i) => i.status === "open" || i.status === "investigating") && (
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
        {(["all", "open", "investigating", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              statusFilter === s 
                ? "text-white bg-magenta-500/20 border-magenta-500/50 shadow-[0_0_8px_rgba(236,72,153,0.3)]" 
                : "text-slate-300 border-white/20 hover:bg-white/5 hover:border-white/30"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}
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
                <th className="text-left py-2">Investigation Notes</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents
                .filter((i) => {
                  if (statusFilter === "all") return true;
                  // Map "under review" to "investigating" for display
                  const dbStatus = i.status === "investigating" ? "investigating" : i.status;
                  const filterStatus = statusFilter === "under review" ? "investigating" : statusFilter;
                  return dbStatus === filterStatus;
                })
                .map((i) => (
                <tr key={i.id} className="border-b border-white/[0.05] hover:bg-white/[0.05]">
                  <td className="py-2 text-white/80">
                    {format(new Date((i as any).reported_date || i.created_at), "d MMM yyyy")}
                  </td>
                  <td className="py-2 text-white/80">{i.sites?.name || "—"}</td>
                  <td className="py-2 text-white/80">
                    {(i as any).title || i.description || "—"}
                  </td>
                  <td className="py-2 text-white/60">{i.investigation_notes || "—"}</td>
                  <td className="py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        i.status === "open"
                          ? "bg-red-500/20 text-red-400"
                          : i.status === "investigating"
                          ? "bg-amber-500/20 text-amber-400"
                          : i.status === "resolved"
                          ? "bg-green-500/20 text-green-400"
                          : i.status === "closed"
                          ? "bg-gray-500/20 text-gray-400"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {i.status === "investigating" ? "Under Review" : i.status.charAt(0).toUpperCase() + i.status.slice(1)}
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