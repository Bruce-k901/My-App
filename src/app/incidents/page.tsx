"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import Link from "next/link";

type Incident = {
  id: string;
  company_id: string;
  site_id: string;
  reported_by: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | string;
  status: "open" | "resolved" | string;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  photo_url: string | null;
  created_at: string;
};

function Badge({ status }: { status: string }) {
  const color = status === "resolved" ? "bg-green-100 text-green-700" : status === "open" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700";
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{status}</span>;
}

function Sev({ severity }: { severity: string }) {
  const color = severity === "high" ? "bg-red-100 text-red-700" : severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{severity}</span>;
}

function IncidentsList() {
  const { companyId, siteId, userId, role } = useAppContext();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("open");
  const [severity, setSeverity] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const filtersDesc = useMemo(() => {
    const parts = [status !== "all" ? `status=${status}` : null, severity !== "all" ? `severity=${severity}` : null, startDate ? `from=${startDate}` : null, endDate ? `to=${endDate}` : null].filter(Boolean);
    return parts.join(", ");
  }, [status, severity, startDate, endDate]);

  const fetchIncidents = async () => {
    try {
      if (!companyId) return;
      setLoading(true);
      let q = supabase.from("incidents").select("*").eq("company_id", companyId);
      if (siteId && role !== "admin") q = q.eq("site_id", siteId);
      if (status && status !== "all") q = q.eq("status", status);
      if (severity && severity !== "all") q = q.eq("severity", severity);
      if (startDate) q = q.gte("created_at", `${startDate}T00:00:00Z`);
      if (endDate) q = q.lte("created_at", `${endDate}T23:59:59Z`);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      setIncidents((data ?? []) as Incident[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Realtime subscriptions for inserts and updates
    const channel = supabase
      .channel("incident-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incidents" }, (payload) => {
        // Basic notify and refresh
        try { console.log("New incident:", payload.new); } catch {}
        fetchIncidents();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "incidents" }, (payload) => {
        try { console.log("Incident updated:", payload.new); } catch {}
        fetchIncidents();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, siteId, status, severity, startDate, endDate]);

  const assignToMe = async (incidentId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("incidents")
      .update({ assigned_to: userId })
      .eq("id", incidentId);
    if (error) alert(`Assign error: ${error.message}`);
  };

  const resolveIncident = async (incidentId: string) => {
    const resolution_notes = notesDraft[incidentId] ?? "";
    const { error } = await supabase
      .from("incidents")
      .update({ status: "resolved", resolution_notes, resolved_at: new Date().toISOString() })
      .eq("id", incidentId);
    if (error) alert(`Resolve error: ${error.message}`);
    setNotesDraft((d) => ({ ...d, [incidentId]: "" }));
  };

  const signedUrlFor = async (path: string) => {
    if (!path) return null;
    const { data, error } = await supabase.storage.from("incident_photos").createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Active Incidents</h1>
        <Link href="/incidents/new" className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">Add New Report</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select className="w-full border rounded px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Severity</label>
          <select className="w-full border rounded px-2 py-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2">Filters: {filtersDesc || "none"}</p>
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-3">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : incidents.length === 0 ? (
        <div className="text-gray-600">No incidents found.</div>
      ) : (
        <ul className="space-y-3">
          {incidents.map((it) => (
            <li key={it.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.type}</div>
                <div className="flex items-center gap-2">
                  <Badge status={it.status} />
                  <Sev severity={it.severity} />
                </div>
              </div>
              <div className="text-sm text-gray-700 mt-1">{it.description}</div>
              <div className="text-xs text-gray-500 mt-1">Reported: {new Date(it.created_at).toLocaleString()}</div>
              <div className="mt-2 flex items-center gap-3">
                {it.photo_url ? (
                  <AsyncThumb path={it.photo_url} />
                ) : null}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button className="border px-3 py-1 rounded" onClick={() => assignToMe(it.id)}>Assign to me</button>
                {it.status !== "resolved" && (
                  <>
                    <input
                      className="border rounded px-2 py-1 text-sm"
                      placeholder="Resolution notes"
                      value={notesDraft[it.id] ?? ""}
                      onChange={(e) => setNotesDraft((d) => ({ ...d, [it.id]: e.target.value }))}
                    />
                    <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={() => resolveIncident(it.id)}>Mark Resolved</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AsyncThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.storage.from("incident_photos").createSignedUrl(path, 60 * 60);
      if (!error && data?.signedUrl && mounted) setUrl(data.signedUrl);
    })();
    return () => { mounted = false; };
  }, [path]);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
      <img src={url} alt="attachment" className="w-12 h-12 object-cover rounded border" />
      <span className="text-sm underline">View Photo</span>
    </a>
  );
}

export default function Page() {
  return (
    <AppContextProvider>
      <IncidentsList />
    </AppContextProvider>
  );
}