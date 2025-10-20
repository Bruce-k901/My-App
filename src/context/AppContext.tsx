"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

type Role = "staff" | "manager" | "admin" | "owner" | null;

interface AppContextValue {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: Role;
  companyId: string | null;
  company: any | null;
  profile: any | null;
  siteId: string | null;
  site: any | null;
  tasks: any[];
  incidents: any[];
  temperatureLogs: any[];
  assets: any[];
  error: string | null;
  requiresSetup: boolean;
  refresh: () => Promise<void>;
  setCompany: (company: any | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppContextValue>({
    loading: true,
    userId: null,
    email: null,
    role: null,
    companyId: null,
    company: null,
    profile: null,
    siteId: null,
    site: null,
    tasks: [],
    incidents: [],
    temperatureLogs: [],
    assets: [],
    error: null,
    requiresSetup: false,
    refresh: async () => {},
    setCompany: () => {},
  });

  const fetchAll = useCallback(async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // Handle session errors gracefully
        if (sessionError) {
          console.warn('Session error:', sessionError.message);
          if (sessionError.message.includes('Invalid Refresh Token') || 
              sessionError.message.includes('Refresh Token Not Found')) {
            console.log('Invalid refresh token detected, clearing session...');
            await supabase.auth.signOut();
            setState((s) => ({ ...s, loading: false, error: 'Session expired. Please log in again.' }));
            return;
          }
        }
        
        const session = sessionData?.session;
        if (!session) {
          // Do not redirect here; server-side middleware gates protected routes.
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        const userId = session.user.id;
        const email = session.user.email ?? null;

        // Try to load role/site/company from profiles; fallback to user metadata
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, email, company_id, site_id, role, position_title, boh_foh, last_login, pin_code")
          .eq("id", userId)
          .limit(1);

        let role: Role = null;
        let siteId: string | null = null;
        let companyId: string | null = null;
        console.log("🔍 DEBUG AppContext - profiles query result:", { profilesErr, profiles });
        if (!profilesErr && profiles && profiles.length > 0) {
          const p = profiles[0] as any;
          role = (p.role as Role) ?? null;
          siteId = (p.site_id as string) ?? null;
          companyId = (p.company_id as string) ?? null;
          console.log("🔍 DEBUG AppContext - from profiles table:", { role, siteId, companyId });
        } else {
          // fallback to auth user metadata
          role = (session.user.app_metadata?.role as Role) ?? null;
          siteId = (session.user.user_metadata?.site_id as string) ?? null;
          companyId = (session.user.app_metadata?.company_id as string) ?? null;
          console.log("🔍 DEBUG AppContext - from auth metadata:", { role, siteId, companyId });
        }

        // Fallback: if companyId is missing, try owner company by user_id
        console.log("🔍 DEBUG AppContext - before owner company fallback, companyId:", companyId);
        if (!companyId) {
          try {
            const { data: ownerCompanies } = await supabase
              .from("companies")
              .select("id,setup_status")
              .eq("user_id", userId)
              .limit(1);
            const ownerCompany = ownerCompanies?.[0] ?? null;
            console.log("🔍 DEBUG AppContext - owner company query result:", ownerCompanies);
            companyId = (ownerCompany?.id as string | undefined) ?? companyId;
            console.log("🔍 DEBUG AppContext - after owner company fallback, companyId:", companyId);
          } catch {}
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
            // Let RLS policies handle asset filtering - no frontend filters
            supabase.from("assets_redundant").select("*").limit(20),
          ]);
        }

        const requiresSetup = role === "admin" && (!companyId || sitesCount === 0 || company?.setup_status !== "active");

        console.log("🔍 DEBUG AppContext - final values before setState:", { 
          userId, email, role, companyId, siteId, 
          profileObject: { id: userId, role, site_id: siteId, company_id: companyId, email }
        });

        const nextState: AppContextValue = {
          loading: false,
          userId,
          email,
          role,
          companyId,
          company,
          profile: { id: userId, role, site_id: siteId, company_id: companyId, email },
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
          setCompany: state.setCompany,
        };
        setState(nextState);
      } catch (e: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message ?? "Unexpected error loading context",
        }));
      }
  }, [router, pathname, state.setCompany]);

  useEffect(() => {
    fetchAll();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-fetch context on auth changes; rely on middleware for redirects.
      if (session) {
        fetchAll();
      } else {
        setState((s) => ({
          ...s,
          loading: false,
          userId: null,
          email: null,
          role: null,
          companyId: null,
          company: null,
          profile: null,
          siteId: null,
          site: null,
          tasks: [],
          incidents: [],
          temperatureLogs: [],
          assets: [],
          error: null,
          requiresSetup: false,
        }));
      }
    });
    return () => {
      sub?.subscription.unsubscribe();
    };
  }, [fetchAll]);

  const setCompanyCtx = useCallback((_company: any | null) => {
    setState((s) => ({ ...s, company: _company }));
  }, []);

  const value = useMemo(
    () => ({ ...state, refresh: fetchAll, setCompany: setCompanyCtx }),
    [state, fetchAll, setCompanyCtx]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
}