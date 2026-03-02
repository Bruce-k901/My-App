"use client";

import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessagingWidget } from "./MessagingWidget";

export default function ManagerDashboard() {
  const { loading, tasks, assets, incidents, siteId } = useAppContext();
  const [summary, setSummary] = useState<{ site_id: string; completed: number; total: number }[]>([]);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  useEffect(() => {
    const fetchSummary = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("site_id,status")
        .eq("due_date", today);
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
  }, [today]);
  if (loading) return <Loading />;

  return (
    <section className="px-6 py-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {!siteId && <SetupPrompt />}

      <MessagingWidget />

      <Widget title="EHO Compliance Pack">
        <p className="text-theme-secondary text-sm mb-3">
          One click, full compliance export for your site and date range.
        </p>
        <Link href="/compliance/eho-pack" className="btn-gradient text-sm inline-block">
          Generate EHO Pack
        </Link>
      </Widget>

      <Widget title="Today’s Task Compliance">
        {summary.length === 0 ? (
          <Empty text="No tasks for today across your managed site(s)." />
        ) : (
          <ul className="text-sm text-theme-secondary space-y-2">
            {summary.map((s) => {
              const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;
              return (
                <li key={s.site_id} className="flex justify-between">
                  <span>Site {s.site_id.slice(0, 8)}…</span>
                  <span className="text-theme-tertiary">{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </Widget>

      <Widget title="Team Task Summary">
        {tasks.length === 0 ? (
          <Empty text="No team tasks found for this period." />
        ) : (
          <ul className="text-sm text-theme-secondary space-y-2">
            {tasks.slice(0, 6).map((t: any) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.name ?? t.title ?? `Task #${t.id}`}</span>
                <span className="text-theme-tertiary">{t.status ?? "open"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="Maintenance Preview">
        {assets.length === 0 ? (
          <Empty text="No assets registered for your site(s)." />
        ) : (
          <ul className="text-sm text-theme-secondary space-y-2">
            {assets.slice(0, 6).map((a: any) => (
              <li key={a.id} className="flex justify-between">
                <span>{a.name ?? `Asset #${a.id}`}</span>
                <span className="text-theme-tertiary">{a.status ?? "unknown"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>

      <Widget title="Incidents">
        {incidents.length === 0 ? (
          <Empty text="No open incidents." />
        ) : (
          <ul className="text-sm text-theme-secondary space-y-2">
            {incidents.slice(0, 6).map((i: any) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.type ?? `Incident #${i.id}`}</span>
                <span className="text-theme-tertiary">{i.status ?? "open"}</span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </section>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(211, 126, 145,0.12)]">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-theme-tertiary text-sm">{text}</p>;
}

function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-theme-tertiary">Loading dashboard…</p>
    </div>
  );
}

function SetupPrompt() {
  return (
    <div className="md:col-span-2 rounded-xl border border-neutral-800 bg-[#141823] p-4">
      <p className="text-theme-secondary text-sm">
        No site assigned to your account yet. Assign users to a site to enable task and incident
        visibility.
      </p>
    </div>
  );
}