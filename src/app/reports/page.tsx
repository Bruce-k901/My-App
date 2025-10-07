"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  task_id: string;
  site_id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
};

export default function ReportsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [siteFilter, setSiteFilter] = useState<string>("");

  const since = useMemo(() => `${date}T00:00:00.000Z`, [date]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("task_events")
        .select("id,task_id,site_id,user_id,action,details,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (siteFilter) query = query.eq("site_id", siteFilter);
      const { data, error } = await query;
      setLoading(false);
      if (error) return;
      if (mounted) setEvents((data || []) as any);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [since, siteFilter]);

  return (
    <section className="px-6 py-8 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Task Audit Events</h1>
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-slate-300">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 text-sm rounded bg-[#0f1220] border border-neutral-800 p-2 text-slate-200"
          />
        </label>
        <label className="text-sm text-slate-300">
          Site ID
          <input
            type="text"
            value={siteFilter}
            placeholder="Optional: filter by site_id"
            onChange={(e) => setSiteFilter(e.target.value)}
            className="ml-2 text-sm rounded bg-[#0f1220] border border-neutral-800 p-2 text-slate-200 w-64"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500 text-sm">No events found for the selected date.</p>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4">
          <ul className="divide-y divide-neutral-800">
            {events.map((e) => (
              <li key={e.id} className="py-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                <span className="text-slate-400">{new Date(e.created_at).toLocaleString()}</span>
                <span className="text-slate-300">Action: {e.action}</span>
                <span className="text-slate-300">Task: {e.task_id.slice(0, 8)}…</span>
                <span className="text-slate-300">Site: {e.site_id.slice(0, 8)}…</span>
                <span className="text-slate-300">User: {e.user_id.slice(0, 8)}…</span>
                <span className="text-slate-500 break-words">Details: {safeStringify(e.details)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function safeStringify(v: any) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return "";
  }
}