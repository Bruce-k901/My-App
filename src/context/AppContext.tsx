'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  company_id: string | null;
  site_id: string | null;
  role: string;
  // Optional enriched fields when available
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface AppContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authLoading?: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  authLoading: true,
  error: null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Initialize auth - runs ONCE on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = 
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!mounted) return;

        setSession(currentSession);

        // Only fetch profile if we have a session
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Run only once!

  // Temporary debug: observe session user and metadata
  useEffect(() => {
    const currentUser = session?.user as any;
    if (currentUser) {
      console.log('🔍 Current user:', currentUser);
      console.log('🔍 User metadata:', currentUser?.user_metadata);
      console.log('🔍 Company ID in metadata:', currentUser?.user_metadata?.company_id);
    }
  }, [session]);

  // Fetch profile - ONLY profile, nothing else
  const fetchProfile = async (userId: string) => {
    if (isFetching) {
      console.log('Already fetching profile, skipping...');
      return;
    }

    setIsFetching(true);
    
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (data) {
        console.log('Profile fetched from Supabase:', data);
        setProfile(data);
      }
      setError(null);
    } catch (err: any) {
      const message = (err && (err.message || err.error_description))
        || (typeof err === 'string' ? err : '')
        || (() => { try { return JSON.stringify(err); } catch { return 'Unknown profile error'; } })();

      // Fallback: if profiles RLS policy loops, synthesize a minimal profile from auth session
      if (typeof message === 'string' && message.toLowerCase().includes('infinite recursion')) {
        console.warn('Profiles RLS recursion detected, using session fallback profile');
        const sUser = session?.user as any;
        const email = sUser?.email || '';
        const fallback: Profile = {
          id: userId,
          email,
          full_name: sUser?.user_metadata?.full_name || email.split('@')[0] || null,
          company_id: sUser?.user_metadata?.company_id ?? null,
          site_id: sUser?.user_metadata?.site_id ?? null,
          role: sUser?.user_metadata?.app_role || sUser?.user_metadata?.role || sUser?.app_metadata?.role || 'Staff',
          avatar_url: sUser?.user_metadata?.avatar_url ?? null,
          created_at: sUser?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        console.log('Fallback profile created:', fallback);
        setProfile(fallback);
        setError(null);
      } else {
        console.error('Error fetching profile:', message);
        setError(message);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const value = {
    user: session?.user || null,
    session,
    profile,
    loading,
    authLoading: loading,
    error,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useUser() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useUser must be used within AppProvider');
  }
  return context;
}

// Legacy compatibility - keep for existing components
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  
  // Map to legacy interface for compatibility
  return {
    loading: context.loading,
    authLoading: context.loading,
    session: context.session,
    user: context.user,
    userId: context.user?.id || null,
    email: context.profile?.email || context.user?.email || null,
    role: context.profile?.role || (context.session?.user as any)?.user_metadata?.role || (context.session?.user as any)?.app_metadata?.role || null,
    companyId: context.profile?.company_id || (context.session?.user as any)?.user_metadata?.company_id || null,
    company: null, // Will be fetched separately if needed
    profile: context.profile,
    siteId: context.profile?.site_id || (context.session?.user as any)?.user_metadata?.site_id || null,
    site: null, // Will be fetched separately if needed
    sites: [],
    sitesCount: 0,
    tasks: [],
    incidents: [],
    temperatureLogs: [],
    assets: [],
    contractors: [],
    error: context.error,
    requiresSetup: false,
    refresh: async () => {
      // Simple refresh - just reload the page
      window.location.reload();
    },
    setCompany: () => {},
  };
}