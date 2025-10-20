"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import dynamic from "next/dynamic";
import { getUserContext } from "@/lib/userContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";

const StaffDashboard = dynamic(() => import("@/components/dashboard/StaffDashboard"), { ssr: false });
const ManagerDashboard = dynamic(() => import("@/components/dashboard/ManagerDashboard"), { ssr: false });
const AdminDashboard = dynamic(() => import("@/components/dashboard/AdminDashboard"), { ssr: false });

type Preload = Record<string, any>;

async function preloadData(role: string, companyId: string, siteId?: string | null): Promise<Preload> {
  switch (role) {
    case "staff": {
      const [{ data: tasks }, { data: incidents }, { data: temperature }] = await Promise.all([
        supabase.from("tasks").select("*").eq("site_id", siteId ?? ""),
        supabase.from("incidents").select("*").eq("site_id", siteId ?? ""),
        supabase.from("temperature_logs").select("*").eq("site_id", siteId ?? ""),
      ]);
      return { tasks: tasks ?? [], incidents: incidents ?? [], temperature: temperature ?? [] };
    }
    case "manager": {
      const [{ data: siteTasks }, { data: maintenance }] = await Promise.all([
        supabase.from("tasks").select("*").eq("site_id", siteId ?? ""),
        supabase.from("maintenance_logs").select("*").eq("site_id", siteId ?? ""),
      ]);
      return { siteTasks: siteTasks ?? [], maintenance: maintenance ?? [] };
    }
    case "admin": {
      const [{ data: sites }, { data: reports }] = await Promise.all([
        supabase.from("sites").select("id, name").eq("company_id", companyId),
        supabase.from("incidents").select("*").eq("company_id", companyId),
      ]);
      return { sites: sites ?? [], reports: reports ?? [] };
    }
    default:
      return {};
  }
}

export default function DashboardRouter() {
  const router = useRouter();
  const { showToast } = useToast();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string>("staff");
  const [preload, setPreload] = useState<Preload>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { profile, company, site } = await getUserContext();
        // Setup pages have been retired - skip setup status checks
        setRole(profile.app_role || "staff");
        const data = await preloadData(profile.app_role, company.id, site?.id ?? null);
        if (!alive) return;
        setPreload(data);
        setReady(true);
      } catch (e: any) {
        const msg = e?.message || "Failed to load dashboard";
        showToast(msg, "error");
        router.replace("/login");
      }
    })();
    return () => { alive = false; };
  }, [router, showToast]);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  if (!isRoleGuardEnabled()) {
    // With role guard disabled, default to Admin dashboard for full access
    return <AdminDashboard /> as any;
  }
  if (role === "Manager") return <ManagerDashboard /> as any;
  if (role === "Admin") return <AdminDashboard /> as any;
  return <StaffDashboard /> as any;
}