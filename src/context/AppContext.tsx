"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Role = "staff" | "manager" | "admin" | null;

interface AppContextValue {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: Role;
  companyId: string | null;
  company: any | null;
  siteId: string | null;
  site: any | null;
  tasks: any[];
  incidents: any[];
  temperatureLogs: any[];
  assets: any[];
  error: string | null;
  requiresSetup: boolean;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AppContextValue>({
    loading: true,
    userId: null,
    email: null,
    role: null,
    companyId: null,
    company: null,
    siteId: null,
    site: null,
    tasks: [],
    incidents: [],
    temperatureLogs: [],
    assets: [],
    error: null,
    requiresSetup: false,
    refresh: async () => {},
  });

  const fetchAll = useCallback(async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          router.replace("/login");
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        const userId = session.user.id;
        const email = session.user.email ?? null;

        // Try to load role/site/company from profiles; fallback to user metadata
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, role, site_id, company_id")
          .eq("id", userId)
          .limit(1);

        let role: Role = null;
        let siteId: string | null = null;
        let companyId: string | null = null;
        if (!profilesErr && profiles && profiles.length > 0) {
          const p = profiles[0] as any;
          role = (p.role as Role) ?? null;
          siteId = (p.site_id as string) ?? null;
          companyId = (p.company_id as string) ?? null;
        } else {
          // fallback to auth user metadata
          role = (session.user.app_metadata?.role as Role) ?? null;
          siteId = (session.user.user_metadata?.site_id as string) ?? null;
          companyId = (session.user.app_metadata?.company_id as string) ?? null;
        }

        // Load company and current site
        let company: any | null = null;
        let site: any | null = null;
        let sitesCount = 0;
        if (companyId) {
          const { data: companyRes } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyId)
            .limit(1);
          company = companyRes?.[0] ?? null;

          const { count: scount } = await supabase
            .from("sites")
            .select("id", { count: "exact" })
            .eq("company_id", companyId);
          sitesCount = scount ?? 0;
        }
        if (siteId) {
          const { data: siteRes } = await supabase
            .from("sites")
            .select("*")
            .eq("id", siteId)
            .limit(1);
          site = siteRes?.[0] ?? null;
        }

        // Only preload once company is active
        let tasksRes: any = { data: [] };
        let incidentsRes: any = { data: [] };
        let tempsRes: any = { data: [] };
        let assetsRes: any = { data: [] };
        const isActive = company?.active === true;
        if (isActive) {
          const filters = siteId ? { site_id: siteId } : {};
          [tasksRes, incidentsRes, tempsRes, assetsRes] = await Promise.all([
            supabase.from("tasks").select("*").match(filters).limit(20),
            supabase.from("incidents").select("*").match(filters).limit(20),
            supabase
              .from("temperature_logs")
              .select("*")
              .match(filters)
              .order("recorded_at", { ascending: false })
              .limit(20),
            supabase.from("assets").select("*").match(filters).limit(20),
          ]);
        }

        const requiresSetup = role === "admin" && (!companyId || sitesCount === 0 || company?.setup_status !== "active");

        const nextState: AppContextValue = {
          loading: false,
          userId,
          email,
          role,
          companyId,
          company,
          siteId,
          site,
          tasks: tasksRes.data ?? [],
          incidents: incidentsRes.data ?? [],
          temperatureLogs: tempsRes.data ?? [],
          assets: assetsRes.data ?? [],
          error:
            tasksRes.error?.message ||
            incidentsRes.error?.message ||
            tempsRes.error?.message ||
            assetsRes.error?.message ||
            null,
          requiresSetup,
          refresh: fetchAll,
        };
        setState(nextState);
      } catch (e: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message ?? "Unexpected error loading context",
        }));
      }
  }, [router]);

  useEffect(() => {
    fetchAll();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      sub?.subscription.unsubscribe();
    };
  }, [fetchAll, router]);

  const value = useMemo(() => state, [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
}