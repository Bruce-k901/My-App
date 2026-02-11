"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import GlassCard from "@/components/ui/GlassCard";

function formatToday() {
  // Use a fixed locale to avoid SSR/client hydration mismatches
  const d = new Date();
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function PersistentHeader() {
  const router = useRouter();
  const { email, role, company } = useAppContext();

  const greeting = useMemo(() => {
    const name = company?.contact_name || (email ? email.split("@")[0] : "");
    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
    return roleLabel ? `${roleLabel} — ${name}` : name;
  }, [company?.contact_name, email, role]);

  const today = useMemo(() => formatToday(), []);

  const go = (href: string) => {
    router.prefetch(href);
    router.push(href);
  };

  return (
    <GlassCard className="flex items-center justify-between">
      <div>
        <p className="text-xs text-white/60">Today</p>
        <div className="flex items-end gap-3">
          <h1 className="text-xl md:text-2xl font-semibold">Welcome{greeting ? `, ${greeting}` : ""}</h1>
          <span className="text-sm text-white/50">{today}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => go("/tasks")}
          className="px-3 py-2 rounded-md text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white hover:shadow-[0_0_10px_rgba(211, 126, 145,0.25)]"
        >
          View Tasks
        </button>
        <button
          onClick={() => go("/notifications")}
          className="px-3 py-2 rounded-md text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white hover:shadow-[0_0_10px_rgba(211, 126, 145,0.25)]"
        >
          Notifications
        </button>
        <button
          onClick={() => go("/reports")}
          className="px-3 py-2 rounded-md text-sm bg-white/[0.08] hover:bg-white/[0.12] text-white hover:shadow-[0_0_10px_rgba(211, 126, 145,0.25)]"
        >
          Reports
        </button>
      </div>
    </GlassCard>
  );
}