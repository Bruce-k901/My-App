"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

type AlertRow = { id: string; title?: string; message?: string; severity?: string; created_at: string };

export default function AlertsFeed() {
  const { companyId } = useAppContext();
  const [open, setOpen] = useState(true);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const since = useMemo(() => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let q = supabase
          .from("notifications")
          .select("id,title,message,severity,created_at,company_id")
          .gte("created_at", since)
          .in("severity", ["critical", "warning"]) // Show both critical and warning alerts
          .order("created_at", { ascending: false })
          .limit(50);
        if (companyId) q = q.eq("company_id", companyId);
        const { data, error } = await q;
        if (error) throw error;
        const arr: AlertRow[] = (data || []).map((d: any) => ({ id: d.id, title: d.title, message: d.message, severity: d.severity, created_at: d.created_at }));
        if (mounted) setAlerts(arr);
      } catch (e: any) {
        setError(e?.message || "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel("dashboard-alerts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [companyId, since]);

  return (
    <section className="bg-[#0b0d13]/80 border border-white/[0.06] rounded-2xl p-5 shadow-[0_0_12px_rgba(236,72,153,0.05)] fade-in-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold">Alerts Feed</h3>
          {alerts.length > 0 && <span className="blink-dot" aria-label="Active alerts" />}
        </div>
        <button
          className="text-sm px-3 py-1 rounded-full border border-white/20 text-slate-300 hover:bg-white/10"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          {loading && <p className="text-sm text-slate-400">Loading...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && alerts.length === 0 ? (
            <p className="text-sm text-slate-400">No live alerts.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-300">
              {alerts.map((a) => (
                <li key={a.id} className="border-b border-white/10 pb-2 hover-glow rounded-md px-2 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.title || "Critical Alert"}</span>
                    <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{a.message || ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}