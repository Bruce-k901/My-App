"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AppProvider, useAppContext } from "@/context/AppContext";

type Incident = {
  id: string;
  site_id: string;
  severity: string;
  created_at: string;
};

type Bucket = { [siteId: string]: { [month: string]: number } };

function Chart() {
  const { companyId } = useAppContext();
  const [severity, setSeverity] = useState<string>("all");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [data, setData] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      let q = supabase.from("incidents").select("id, site_id, severity, created_at").eq("company_id", companyId);
      if (severity && severity !== "all") q = q.eq("severity", severity);
      if (start) q = q.gte("created_at", `${start}T00:00:00Z`);
      if (end) q = q.lte("created_at", `${end}T23:59:59Z`);
      q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      setData(data ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
     
  }, [companyId, severity, start, end]);

  const buckets: Bucket = useMemo(() => {
    const map: Bucket = {};
    for (const it of data) {
      const month = new Date(it.created_at).toISOString().slice(0, 7); // YYYY-MM
      map[it.site_id] ||= {};
      map[it.site_id][month] ||= 0;
      map[it.site_id][month] += 1;
    }
    return map;
  }, [data]);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const s of Object.keys(buckets)) {
      for (const m of Object.keys(buckets[s])) set.add(m);
    }
    return Array.from(set).sort();
  }, [buckets]);

  const sites = Object.keys(buckets);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-xl font-semibold mb-4">Incidents per Site per Month</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
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
          <input type="date" className="w-full border rounded px-2 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-3">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : sites.length === 0 ? (
        <div className="text-theme-secondary">No incident data for selected filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Site</th>
                {months.map((m) => (
                  <th key={m} className="border px-2 py-1 text-left">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s}>
                  <td className="border px-2 py-1">{s}</td>
                  {months.map((m) => {
                    const count = buckets[s][m] ?? 0;
                    return (
                      <td key={`${s}-${m}`} className="border px-2 py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 bg-blue-500" style={{ width: `${Math.min(count * 12, 200)}px` }} />
                          <span className="text-sm">{count}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Chart />
    </AppProvider>
  );
}