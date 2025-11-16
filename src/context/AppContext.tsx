"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AppContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  companyId: string | null;
  company: any | null;
  siteId: string | null;
  role: string | null;
  userId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setCompany: (company: any | null) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  session: null,
  profile: null,
  companyId: null,
  company: null,
  siteId: null,
  role: null,
  userId: null,
  loading: true,
  signOut: async () => {},
  setCompany: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setCompany(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      console.log('🔍 AppContext fetchProfile:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .single();
      
      if (error) {
        console.error('❌ AppContext profile error:', error);
        throw error;
      }
      
      console.log('✅ AppContext profile loaded:', { 
        id: data?.id, 
        company_id: data?.company_id,
        email: data?.email 
      });
      setProfile(data);
      
      // Load company data if profile has company_id
      if (data?.company_id) {
        console.log('🔄 AppContext loading company:', data.company_id);
        
        // Try direct ID lookup first
        let { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', data.company_id)
          .maybeSingle();
        
        // If that fails, try created_by
        if (companyError || !companyData) {
          console.log('⚠️ Direct lookup failed, trying created_by:', companyError);
          const { data: createdData, error: createdError } = await supabase
            .from('companies')
            .select('*')
            .eq('created_by', userId)
            .maybeSingle();
          
          if (!createdError && createdData) {
            companyData = createdData;
            companyError = null;
            console.log('✅ AppContext company found via created_by:', createdData.name);
          }
        }
        
        if (!companyError && companyData && companyData.id) {
          console.log('✅ AppContext company loaded:', companyData.name);
          setCompany(companyData);
        } else {
          console.error('❌ AppContext company error:', companyError);
          console.log('Company data:', companyData);
        }
      } else {
        console.warn('⚠️ AppContext profile has no company_id');
      }
    } catch (error: any) {
      console.error('❌ AppContext fetchProfile error:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error: error,
      });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const value = {
    user,
    session,
    profile,
    companyId: profile?.company_id || user?.user_metadata?.company_id || null,
    company,
    siteId: profile?.site_id || user?.user_metadata?.site_id || null,
    role: profile?.app_role || user?.user_metadata?.app_role || 'Staff',
    userId: user?.id || null,
    loading,
    signOut,
    setCompany,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}