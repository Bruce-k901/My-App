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

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      
      // Enhanced JWT claims debugging
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 JWT Claims Debug:", {
          email: session?.user?.email,
          user_id: session?.user?.id,
          app_metadata: session?.user?.app_metadata,
          user_metadata: session?.user?.user_metadata,
          role_from_app_metadata: session?.user?.app_metadata?.role,
          company_id_from_app_metadata: session?.user?.app_metadata?.company_id,
          full_token_structure: session?.user
        });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setLoading(false);
      
      // Enhanced JWT claims debugging
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Initial JWT Claims Debug:", {
          email: data.session?.user?.email,
          user_id: data.session?.user?.id,
          app_metadata: data.session?.user?.app_metadata,
          user_metadata: data.session?.user?.user_metadata,
          role_from_app_metadata: data.session?.user?.app_metadata?.role,
          company_id_from_app_metadata: data.session?.user?.app_metadata?.company_id,
          full_token_structure: data.session?.user
        });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Extract company_id and role from user metadata
  const companyId = user?.app_metadata?.company_id || null;
  const role = user?.app_metadata?.role || null;

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