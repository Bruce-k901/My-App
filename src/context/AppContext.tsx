"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

type Role = "Staff" | "Manager" | "Admin" | "Owner" | null;

interface AppContextValue {
  loading: boolean;
  session: any | null | undefined;
  user?: any;
  userId?: string | null;
  email?: string | null;
  role?: Role;
  companyId?: string | null;
  company: any | null;
  profile: any | null;
  siteId?: string | null;
  site: any | null;
  sites?: any[];
  sitesCount?: number;
  tasks: any[];
  incidents: any[];
  temperatureLogs: any[];
  assets: any[];
  contractors?: any[];
  error?: string | null;
  requiresSetup?: boolean;
  refresh: () => Promise<void>;
  setCompany: (company: any | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AppContextValue>({
    loading: true,
    session: undefined,
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
      console.log("🔄 fetchAll starting...");
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log("❌ No session found in fetchAll");
        setState(s => ({ 
          ...s, 
          loading: false, 
          session: null, 
          user: null,
          error: sessionError?.message || "No session found"
        }));
        return;
      }

      console.log("✅ Session found:", session.user?.email);

      const userId = session.user.id;
      const email = session.user.email;

      // Get user profile with better error handling
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      let role = null;
      let siteId = null;
      let companyId = null;

      if (profileError) {
        console.error("❌ Profile error:", profileError);
        // Don't return here - try to continue with auth metadata
      } else if (profiles && profiles.length > 0) {
        const p = profiles[0];
        role = p.app_role;
        siteId = p.site_id;
        companyId = p.company_id;
        console.log("✅ Profile loaded:", { role, siteId, companyId });
      }

      // Fallback to auth metadata if no profile or profile failed
      if (!role || !companyId) {
        role = role || session.user.app_metadata?.role;
        companyId = companyId || session.user.app_metadata?.company_id;
        siteId = siteId || session.user.user_metadata?.site_id;
        console.log("⚠️ Using auth metadata fallback:", { role, companyId, siteId });
      }

      if (!companyId) {
        console.log("❌ No company ID found");
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: "No company ID found. Please contact support." 
        }));
        return;
      }

      // Fetch basic data with better error handling
      let company = null;
      let site = null;
      let sitesCount = 0;

      // Get company - don't fail if this errors
      const { data: companyRes, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .limit(1);
      
      if (companyError) {
        console.error("❌ Company error:", companyError);
        // Continue without company data
      } else {
        company = companyRes?.[0];
        console.log("✅ Company loaded:", company?.name);
      }

      // Get sites count - don't fail if this errors
      const { count, error: sitesCountError } = await supabase
        .from("sites")
        .select("id", { count: "exact" })
        .eq("company_id", companyId);
      
      if (sitesCountError) {
        console.error("❌ Sites count error:", sitesCountError);
      } else {
        sitesCount = count ?? 0;
        console.log("✅ Sites count:", sitesCount);
      }

      // Get current site if user has one - don't fail if this errors
      if (siteId) {
        const { data: siteRes, error: siteError } = await supabase
          .from("sites")
          .select("*")
          .eq("id", siteId)
          .limit(1);
        
        if (siteError) {
          console.error("❌ Site error:", siteError);
        } else {
          site = siteRes?.[0];
          console.log("✅ Site loaded:", site?.name);
        }
      }

      // Determine if setup is required
      const requiresSetup = role === "Admin" && (!companyId || sitesCount === 0 || company?.setup_status !== "active");

      // Set basic state - always succeed even if some data is missing
      const nextState: AppContextValue = {
        loading: false,
        session,
        user: session.user,
        userId,
        email,
        role,
        companyId,
        company,
        profile: { id: userId, role, site_id: siteId, company_id: companyId, email },
        siteId,
        site,
        sites: [],
        sitesCount,
        tasks: [],
        incidents: [],
        temperatureLogs: [],
        assets: [],
        contractors: [],
        error: null,
        requiresSetup,
        refresh: async () => {},
        setCompany: () => {},
      };

      setState(nextState);
      console.log("✅ fetchAll completed successfully");
      
    } catch (e: any) {
      console.error("❌ fetchAll failed:", e);
      setState(s => ({ 
        ...s, 
        loading: false, 
        error: `Unexpected error: ${e.message}` 
      }));
    }
  }, []);

  // TEST INDIVIDUAL QUERIES FUNCTION
  const testQueriesIndividually = async () => {
    console.log("🧪 Testing queries individually...");
    
    const testPromises = [
      { name: 'sites', fn: () => supabase.from('sites').select('id').limit(1) },
      { name: 'profiles', fn: () => supabase.from('profiles').select('id').limit(1) },
      { name: 'contractors', fn: () => supabase.from('contractors').select('id').limit(1) },
      { name: 'assets', fn: () => supabase.from('assets').select('id').limit(1) },
    ];
    
    for (const test of testPromises) {
      console.log(`🧪 Testing ${test.name}...`);
      const start = Date.now();
      try {
        const { data, error } = await test.fn();
        console.log(`✅ ${test.name}: ${Date.now() - start}ms`, error ? 'ERROR' : 'SUCCESS');
        if (error) console.error(`   ${test.name} error:`, error);
      } catch (err) {
        console.error(`❌ ${test.name} crashed:`, err);
      }
    }
  };

  // MINIMAL FETCHALL WITHOUT REACT STATE
  const fetchAllMinimal = async () => {
    console.log("🧠 fetchAllMinimal starting...");
    
    // Get current session to extract company_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("❌ No session for minimal test");
      return;
    }

    const userId = session.user.id;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .limit(1);
    
    const company_id = profiles?.[0]?.company_id;
    if (!company_id) {
      console.log("❌ No company_id for minimal test");
      return;
    }
    
    const promises = [
      supabase.from('sites').select('id').eq('company_id', company_id),
      supabase.from('profiles').select('id').eq('company_id', company_id),
      supabase.from('contractors').select('id').eq('company_id', company_id),
      supabase.from('assets').select('id').eq('company_id', company_id),
    ];
    
    console.log("🧠 Promises created, awaiting...");
    const results = await Promise.all(promises);
    console.log("🧠 All promises resolved");
    
    results.forEach((result, index) => {
      const names = ['sites', 'profiles', 'contractors', 'assets'];
      console.log(`📊 ${names[index]}:`, result.error ? 'ERROR' : `${result.data?.length} rows`);
    });
  };

  // Expose test functions to window for manual testing
  useEffect(() => {
    (window as any).testQueriesIndividually = testQueriesIndividually;
    (window as any).fetchAllMinimal = fetchAllMinimal;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;
    
    console.log("🔧 Setting up auth listener...");
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error("❌ Initial session error:", error);
          setState(s => ({ 
            ...s, 
            loading: false, 
            error: `Session error: ${error.message}` 
          }));
          return;
        }
        
        if (session?.user) {
          console.log("✅ Initial session found:", session.user.email);
          setState(s => ({ ...s, session }));
          await fetchAll();
        } else {
          console.log("ℹ️ No initial session");
          setState(s => ({ ...s, loading: false }));
        }
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;
          
          console.log("🔐 Auth state change:", event, session?.user?.email);
          
          setState(s => ({ ...s, session }));
          
          if (session?.user) {
            console.log("✅ Session exists, calling fetchAll...");
            await fetchAll();
          } else {
            console.log("❌ No session, resetting state...");
            setState(s => ({
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
        
        authSubscription = subscription;
        
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        if (isMounted) {
          setState(s => ({ 
            ...s, 
            loading: false, 
            error: `Auth initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }));
        }
      }
    };
    
    initializeAuth();
    
    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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