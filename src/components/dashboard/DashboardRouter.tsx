"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import dynamic from "next/dynamic";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";

const StaffDashboard = dynamic(() => import("@/components/dashboard/StaffDashboard"), { ssr: false });
const ManagerDashboard = dynamic(() => import("@/components/dashboard/ManagerDashboard"), { ssr: false });
const AdminDashboard = dynamic(() => import("@/components/dashboard/AdminDashboard"), { ssr: false });

type Preload = Record<string, any>;

async function preloadData(role: string, companyId: string, siteId?: string | null): Promise<Preload> {
  if (!companyId) {
    throw new Error("Company ID is required for data preloading");
  }

  switch (role) {
    case "Staff": {
      if (!siteId) {
        throw new Error("Site ID is required for Staff role");
      }
      const [{ data: tasks }, { data: incidents }, { data: temperature }] = await Promise.all([
        supabase.from("tasks").select("*").eq("company_id", companyId).eq("site_id", siteId),
        supabase.from("incidents").select("*").eq("company_id", companyId).eq("site_id", siteId),
        supabase.from("temperature_logs").select("*").eq("company_id", companyId).eq("site_id", siteId),
      ]);
      return { tasks: tasks ?? [], incidents: incidents ?? [], temperature: temperature ?? [] };
    }
    case "Manager": {
      if (!siteId) {
        throw new Error("Site ID is required for Manager role");
      }
      const [{ data: siteTasks }, { data: maintenance }] = await Promise.all([
        supabase.from("tasks").select("*").eq("company_id", companyId).eq("site_id", siteId),
        supabase.from("maintenance_logs").select("*").eq("company_id", companyId).eq("site_id", siteId),
      ]);
      return { siteTasks: siteTasks ?? [], maintenance: maintenance ?? [] };
    }
    case "Admin": {
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
  const { loading, profile, company, site, role, session } = useAppContext();
  const [ready, setReady] = useState(false);
  const [preload, setPreload] = useState<Preload>({});

  useEffect(() => {
    console.log('🔍 DashboardRouter - loading:', loading, 'profile:', !!profile, 'company:', !!company, 'session:', session);
    
    // Hydration guard: treat undefined session as "still loading"
    if (session === undefined) {
      console.log('🔍 DashboardRouter - session still undefined, waiting for hydration');
      return;
    }
    
    // Definitive redirect only when we know session is null (logged out)
    if (!loading && session === null) {
      console.log('🔍 DashboardRouter - no session, redirecting to login');
      router.replace("/login");
      return;
    }

    // If we have a session, do not block on profile/company — allow dashboard to render
    if (!loading && session) {
      if (company?.id) {
        preloadData(role || "Staff", company.id, site?.id ?? null).then(setPreload);
      }
      setReady(true);
    }
  }, [loading, profile, company, site, role, session, router, showToast]);

  if (!ready || session === undefined) {
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