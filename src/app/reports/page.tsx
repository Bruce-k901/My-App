"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

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
  const { companyId } = useAppContext();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Use client-safe date initialization to prevent hydration mismatch
  const [date, setDate] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new Date().toISOString().split("T")[0];
  });
  
  // Initialize date after hydration
  useEffect(() => {
    if (!date && typeof window !== 'undefined') {
      setDate(new Date().toISOString().split("T")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once after mount
  const [siteFilter, setSiteFilter] = useState<string>("");

  const since = useMemo(() => `${date}T00:00:00.000Z`, [date]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        setEvents([]);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("task_events")
          .select("id,task_id,site_id,user_id,action,details,created_at")
          .eq("company_id", companyId) // CRITICAL: Filter by company_id
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200);
        if (siteFilter) query = query.eq("site_id", siteFilter);
        const { data, error } = await query;
        
        if (error) {
          console.error('Error loading reports:', error);
          setError(error.message || 'Failed to load reports');
          if (mounted) setEvents([]);
          return;
        }
        
        if (mounted) setEvents((data || []) as any);
      } catch (err: any) {
        console.error('Exception loading reports:', err);
        setError(err?.message || 'Failed to load reports');
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [since, siteFilter, companyId]);

  return (
    <EntityPageLayout title="Reports" searchPlaceholder="Search">
      <section className="px-6 py-4 max-w-6xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">Task Audit Events</h2>
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
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-400 text-sm">Error: {error}</p>
          </div>
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
    </EntityPageLayout>
  );
}

function safeStringify(v: any) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return "";
  }
}