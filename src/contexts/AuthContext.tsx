"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  role: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Optimized function to fetch profile data from database
  const fetchProfileData = async (userId: string) => {
    try {
      // Try direct query first, fall back to API route if RLS blocks it (406 error)
      let profile = null;
      let error = null;
      
      const result = await supabase
        .from("profiles")
        .select("company_id, app_role")
        .eq("id", userId)
        .single();
      
      profile = result.data;
      error = result.error;
      
      // If we get a 406 error, fall back to API route
      if (error && (error.code === 'PGRST116' || error.message?.includes('406') || (error as any).status === 406)) {
        console.warn('⚠️ Direct profile query blocked by RLS (406), using API route fallback');
        try {
          const apiResponse = await fetch(`/api/profile/get?userId=${userId}`);
          if (apiResponse.ok) {
            const fullProfile = await apiResponse.json();
            profile = { company_id: fullProfile.company_id, app_role: fullProfile.app_role };
            error = null;
          } else {
            const errorText = await apiResponse.text();
            error = new Error(`API route failed: ${errorText}`);
          }
        } catch (apiError) {
          error = apiError instanceof Error ? apiError : new Error('API route error');
        }
      }

      if (error) {
        console.error("Error fetching profile:", error);
        setCompanyId(null);
        setRole(null);
        return;
      }

      setCompanyId(profile?.company_id || null);
      setRole(profile?.app_role || null);

      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Profile Data Fetched:", {
          userId,
          company_id: profile?.company_id,
          app_role: profile?.app_role
        });
      }
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      setCompanyId(null);
      setRole(null);
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user?.id) {
        // Fetch profile data from database instead of relying on JWT metadata
        await fetchProfileData(session.user.id);
      } else {
        setCompanyId(null);
        setRole(null);
      }
      
      setLoading(false);
      
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Auth State Change:", {
          email: session?.user?.email,
          user_id: session?.user?.id,
          event: _event
        });
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      
      if (data.session?.user?.id) {
        // Fetch profile data from database instead of relying on JWT metadata
        await fetchProfileData(data.session.user.id);
      } else {
        setCompanyId(null);
        setRole(null);
      }
      
      setLoading(false);
      
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Initial Session:", {
          email: data.session?.user?.email,
          user_id: data.session?.user?.id
        });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    loading,
    companyId,
    role,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};