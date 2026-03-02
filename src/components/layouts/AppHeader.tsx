"use client";

import { useEffect, useMemo, useState } from "react";
import SharedHeaderBase from "./SharedHeaderBase";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | string;
  type: string;
  link?: string | null;
  created_at: string;
  read: boolean;
  company_id: string;
  site_id: string | null;
  status?: string;
};

function sevBadge(sev?: string) {
  switch (sev) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-amber-300";
    default:
      return "text-blue-300";
  }
}

function NotificationBell() {
  const { companyId, siteId, role, userId } = useAppContext();
  const [unseen, setUnseen] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const [latest, setLatest] = useState<Notification[]>([]);
  const limit = useMemo(() => 10, []);
  const [svEnabled, setSvEnabled] = useState<boolean>(false);

  const playNotify = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 200);
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!companyId) return;
      let base = supabase
        .from("notifications")
        .select("*")
        .eq("company_id", companyId)
        // Note: Removed .eq("status", "active") as the status column doesn't exist in the database
        .order("created_at", { ascending: false });
      if (siteId && role !== "Admin") base = base.eq("site_id", siteId);
      const [{ data: unseenRes }, { data: latestRes }] = await Promise.all([
        base.eq("read", false).select("id"),
        base.limit(limit),
      ]);
      if (!mounted) return;
      setUnseen(((unseenRes as any)?.length ?? 0) as number);
      setLatest((latestRes || []) as Notification[]);
    };
    load();

    // Load sound/vibration preference
    (async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from("profile_settings")
          .select("sound_vibration")
          .eq("profile_id", userId)
          .limit(1);
        const v = data?.[0]?.sound_vibration ?? false;
        setSvEnabled(Boolean(v));
      } catch {}
    })();

    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const note = payload.new as Notification;
        if (note.company_id !== companyId) return;
        setLatest((prev) => [note, ...prev].slice(0, limit));
        setUnseen((c) => c + 1);
        if (svEnabled) {
          playNotify();
          if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
            try { (navigator as any).vibrate([50, 30, 50]); } catch {}
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const note = payload.new as Notification;
        if (note.company_id !== companyId) return;
        if (note.read) setUnseen((c) => Math.max(0, c - 1));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      mounted = false;
    };
  }, [companyId, siteId, role, limit]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-theme-primary hover:text-magenta-400 transition"
        aria-label="Notifications"
      >
        🔔
        {unseen > 0 && (
          <span className="absolute -top-1 -right-2 text-[10px] px-1.5 py-0.5 rounded bg-magenta-500 text-white">
            {unseen}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0f1220] border border-black/10 dark:border-neutral-800 rounded shadow-lg z-50">
          <div className="px-3 py-2 flex items-center justify-between border-b border-black/10 dark:border-neutral-800">
            <span className="text-sm text-theme-secondary">Notifications</span>
            <Link href="/notifications" className="text-xs text-magenta-300 hover:text-magenta-200">View all</Link>
          </div>
          <ul className="max-h-80 overflow-auto">
            {latest.length === 0 ? (
              <li className="p-3 text-sm text-theme-tertiary">No recent notifications.</li>
            ) : (
              latest.map((n) => (
                <li key={n.id} className="p-3 border-b border-black/10 dark:border-neutral-800 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${sevBadge(n.severity)}`}>{n.type}</span>
                    <span className="text-xs text-theme-tertiary ml-auto">{new Date(n.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-theme-tertiary truncate">{n.message}</div>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-magenta-300 hover:text-magenta-200 underline">
                      Open
                    </Link>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AppHeader() {
  const { company } = useAppContext();
  return (
    <SharedHeaderBase
      logoSrc={company?.logo_url || undefined}
      logoAlt={company?.name ? `${company.name} logo` : undefined}
    >
      <Link href="/dashboard" className="text-theme-primary hover:text-magenta-400 transition">
        Dashboard
      </Link>
      <Link href="/assets" className="text-theme-primary hover:text-magenta-400 transition">
        Assets
      </Link>
      <Link href="/reports" className="text-theme-primary hover:text-magenta-400 transition">
        Reports
      </Link>
      <Link href="/settings" className="text-theme-primary hover:text-magenta-400 transition">
        Settings
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <Link href="/account" className="btn-gradient text-sm font-semibold">
          Account
        </Link>
        <Link href="/logout" className="text-theme-tertiary hover:text-theme-primary text-sm">
          Logout
        </Link>
      </div>
    </SharedHeaderBase>
  );
}
