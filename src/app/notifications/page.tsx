"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast, ToastProvider } from "@/components/ui/ToastProvider";

type Notification = {
  id: string;
  company_id: string;
  site_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  severity: "info" | "warning" | "critical" | string;
  read: boolean;
  recipient_role: "staff" | "manager" | "admin" | string;
  created_at: string;
  status?: string;
};

function severityBadge(sev?: string) {
  switch (sev) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function typeIcon(t?: string) {
  switch (t) {
    case "incident":
      return "⚠️";
    case "task":
      return "🧩";
    case "temperature":
      return "🧊";
    case "maintenance":
      return "🔧";
    case "digest":
      return "📰";
    default:
      return "🔔";
  }
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function NotificationsInner() {
  const { companyId, siteId, role } = useAppContext();
  const { showToast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const limit = useMemo(() => 50, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        // Note: Removed .eq("status", "active") as the status column doesn't exist in the database
        .order("created_at", { ascending: false })
        .limit(limit);
      // For non-admin roles, prefer site-scoped view if available
      if (siteId && role !== "Admin") q = q.eq("site_id", siteId);
      const { data } = await q;
      if (!mounted) return;
      setItems((data || []) as Notification[]);
      setLoading(false);
    };
    load();

    // Realtime subscription for inserts
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const note = payload.new as Notification;
          if (note.company_id !== companyId) return;
          setItems((prev) => [note, ...prev].slice(0, limit));
          showToast(`${note.title}: ${note.message}`, note.severity === "critical" ? "error" : note.severity === "warning" ? "warning" : "info");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      mounted = false;
    };
  }, [companyId, siteId, role, limit, showToast]);

  const markSeen = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  return (
    <section className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">Back to Dashboard</Link>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-800 rounded border border-neutral-800 bg-[#0f1220]">
          {items.slice(0, limit).map((n) => (
            <li key={n.id} className="p-4 flex items-start gap-3">
              <div className="text-xl leading-none">{typeIcon(n.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${severityBadge(n.severity)}`}>{n.severity}</span>
                  {!n.read && <span className="text-xs px-2 py-0.5 rounded bg-magenta-500/20 text-magenta-300">new</span>}
                  <span className="ml-auto text-xs text-slate-500">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1 whitespace-pre-line">{n.message}</p>
                <div className="mt-2 flex items-center gap-3">
                  {!n.read && (
                    <button onClick={() => markSeen(n.id)} className="text-xs text-slate-300 hover:text-white underline">
                      Mark as read
                    </button>
                  )}
                  {n.link && (
                    <Link href={n.link} className="text-xs text-magenta-300 hover:text-magenta-200 underline">
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <ToastProvider>
        <NotificationsInner />
      </ToastProvider>
    </AppProvider>
  );
}