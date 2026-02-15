"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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

  const loadUserData = useCallback(async () => {
    try {
      console.log("🔄 Loading user data...");
      
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Session error:", sessionError);
        setState(s => ({ 
          ...s, 
          loading: false, 
          error: `Session error: ${sessionError.message}` 
        }));
        return;
      }
      
      if (!session?.user) {
        console.log("ℹ️ No session found");
        setState(s => ({ 
          ...s, 
          loading: false,
          session: null,
          user: null
        }));
        return;
      }

      console.log("✅ Session found:", session.user.email);
      setState(s => ({ ...s, session, user: session.user }));

      // Get profile with timeout
      const profilePromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Profile query timeout")), 5000)
      );

      const { data: profile, error: profileError } = await Promise.race([
        profilePromise,
        profileTimeout
      ]) as any;

      if (profileError) {
        console.error("❌ Profile error:", profileError);
        // Continue without profile data
      } else {
        console.log("✅ Profile loaded:", profile);
        setState(s => ({ ...s, profile }));
      }

      // Get company if we have company_id
      const companyId = profile?.company_id || session.user.app_metadata?.company_id;
      
      if (companyId) {
        console.log("🔄 Loading company data...");
        
        // Use API route to bypass RLS
        let company = null;
        let companyError = null;
        try {
          const response = await fetch(`/api/company/get?id=${companyId}`);
          if (response.ok) {
            company = await response.json();
          } else {
            const errorText = await response.text();
            companyError = new Error(`API route failed: ${errorText}`);
          }
        } catch (apiError) {
          companyError = apiError instanceof Error ? apiError : new Error('Unknown API error');
        }
        
        if (companyError) {
          console.error("❌ Company error:", companyError);
        } else {
          console.log("✅ Company loaded:", company.name);
          setState(s => ({ ...s, company }));
        }
      }

      // Set final state
      setState(s => ({
        ...s,
        loading: false,
        userId: session.user.id,
        email: session.user.email,
        role: profile?.app_role || session.user.app_metadata?.role || null,
        companyId: profile?.company_id || session.user.app_metadata?.company_id || null,
        siteId: profile?.site_id || session.user.user_metadata?.site_id || null,
        error: null
      }));

      console.log("✅ User data loaded successfully");
      
    } catch (error) {
      console.error("❌ Error loading user data:", error);
      setState(s => ({ 
        ...s, 
        loading: false, 
        error: `Failed to load user data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;
    
    console.log("🔧 Setting up auth listener...");
    
    const initializeAuth = async () => {
      try {
        await loadUserData();
        
        if (!isMounted) return;
        
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return;
          
          console.log("🔐 Auth state change:", event, session?.user?.email);
          
          if (session?.user) {
            console.log("✅ Session exists, reloading data...");
            await loadUserData();
          } else {
            console.log("❌ No session, resetting state...");
            setState(s => ({
              ...s,
              loading: false,
              session: null,
              user: null,
              userId: null,
              email: null,
              role: null,
              companyId: null,
              company: null,
              profile: null,
              siteId: null,
              site: null,
              error: null
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
  }, [loadUserData]);

  const setCompanyCtx = useCallback((_company: any | null) => {
    setState((s) => ({ ...s, company: _company }));
  }, []);

  const value = useMemo(
    () => ({ ...state, refresh: loadUserData, setCompany: setCompanyCtx }),
    [state, loadUserData, setCompanyCtx]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
}
