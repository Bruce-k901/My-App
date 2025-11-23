"use client";

import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessagingWidget } from "./MessagingWidget";

export default function AdminDashboard() {
  const { loading, tasks, incidents, assets, companyId } = useAppContext();
  const [summary, setSummary] = useState<{ site_id: string; completed: number; total: number }[]>([]);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  useEffect(() => {
    const fetchSummary = async () => {
      const query = supabase
        .from("tasks")
        .select("site_id,status")
        .eq("due_date", today);
      // If company scope is available, limit to company
      const { data, error } = companyId ? await query.eq("company_id", companyId) : await query;
      if (error) return;
      const map = new Map<string, { completed: number; total: number }>();
      for (const t of data || []) {
        const key = (t as any).site_id as string;
        const prev = map.get(key) || { completed: 0, total: 0 };
        prev.total += 1;
        if ((t as any).status === "completed") prev.completed += 1;
        map.set(key, prev);
      }
      const arr: { site_id: string; completed: number; total: number }[] = [];
      for (const [sid, v] of map.entries()) arr.push({ site_id: sid, completed: v.completed, total: v.total });
      setSummary(arr);
    };
    fetchSummary();
  }, [today, companyId]);
  if (loading) return <Loading />;

  return (
    <section className="px-6 py-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <MessagingWidget />

      <Widget title="EHO Compliance Pack">
        <p className="text-slate-300 text-sm mb-3">
          One click, full compliance export across selected sites and dates.
        </p>
        <Link href="/compliance/eho-pack" className="btn-gradient text-sm inline-block">
          Generate EHO Pack
        </Link>
      </Widget>

      <Widget title="Multi-Site Overview">
        <p className="text-slate-300 text-sm">Summary of sites and active issues.</p>
        <ul className="text-sm text-slate-300 space-y-2 mt-2">
          <li className="flex justify-between"><span>Sites</span><span className="text-slate-500">—</span></li>
          <li className="flex justify-between"><span>Open incidents</span><span className="text-slate-500">{incidents.length}</span></li>
          <li className="flex justify-between"><span>Registered assets</span><span className="text-slate-500">{assets.length}</span></li>
        </ul>
      </Widget>

      <Widget title="Today’s Task Compliance">
        {summary.length === 0 ? (
          <Empty text="No tasks for today across your sites." />
        ) : (
          <ul className="text-sm text-slate-300 space-y-2">
            {summary.map((s) => {
              const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <li key={s.site_id} className="flex justify-between">
                  <span>Site {s.site_id.slice(0, 8)}…</span>
                  <span className="text-slate-500">{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </Widget>

      <Widget title="Cross-Site Alerts">
        {incidents.length === 0 ? (
          <Empty text="No open incidents across sites." />
        ) : (
          <ul className="text-sm text-slate-300 space-y-2">
            {incidents.slice(0, 6).map((i: any) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.type ?? `Incident #${i.id}`}</span>
                <span className="text-slate-500">{i.status ?? "open"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="Downtime Report">
        <p className="text-slate-300 text-sm">Recent downtime events.</p>
        <div className="mt-3 h-24 rounded bg-[#191c26] border border-neutral-800" />
      </Widget>
    </section>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-slate-500 text-sm">{text}</p>;
}

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-slate-400">Loading dashboard…</p>
    </div>
  );
}