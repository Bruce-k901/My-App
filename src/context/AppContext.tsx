'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
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
  // Standardized fields required by app pages
  companyId: string | null;
  siteId: string | null;
  role: string | null;
  loading: boolean;
  // Legacy/additional fields
  authLoading?: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType>({
  user: null,
  session: null,
  profile: null,
  companyId: null,
  siteId: null,
  role: null,
  loading: true,
  authLoading: true,
  error: null,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Initialize auth - runs ONCE on mount
  useEffect(() => {
    // Skip auth checks completely on public auth pages to avoid redirect loops
    if (isAuthPage) {
      setLoading(false);
      return;
    }
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
          const p = await fetchProfile(currentSession.user.id);
          if (p) setProfile(p);
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
          const p = await fetchProfile(newSession.user.id);
          if (p) setProfile(p);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isAuthPage]); // Re-evaluate if route changes

  // Temporary debug: observe session user and metadata
  useEffect(() => {
    const currentUser = session?.user as any;
    if (currentUser) {
      console.log('🔍 Current user:', currentUser);
      console.log('🔍 User metadata:', currentUser?.user_metadata);
      console.log('🔍 Company ID in metadata:', currentUser?.user_metadata?.company_id);
    }
  }, [session]);

  // Fetch profile by either id or auth_user_id, return the profile; caller sets state
  const fetchProfile = async (userId: string) => {
    if (isFetching) {
      console.log('Already fetching profile, skipping...');
      return null;
    }

    setIsFetching(true);
    try {
      console.log('[AppContext] Fetching profile for user:', userId);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .limit(1);

      if (error) {
        console.error('[AppContext] Profile fetch error:', error);
        if (
          typeof error.message === 'string' &&
          (error.message.includes('infinite recursion') || error.message.includes('policy'))
        ) {
          console.warn('[AppContext] Using session fallback due to:', error.message);
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const fallback = {
              id: user.id,
              email: user.email || '',
              full_name: (user as any)?.user_metadata?.full_name || user.email?.split('@')[0] || '',
              company_id: (user as any)?.user_metadata?.company_id || null,
              site_id: (user as any)?.user_metadata?.site_id || null,
              role: (user as any)?.user_metadata?.app_role || (user as any)?.user_metadata?.role || 'Staff',
              created_at: (user as any)?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: (user as any)?.user_metadata?.avatar_url ?? null,
            } as Profile;
            console.log('[AppContext] Using fallback profile:', fallback);
            return fallback;
          }
        }
        throw error;
      }

      if (!profiles || profiles.length === 0) {
        console.warn('[AppContext] No profile found for user:', userId);
        throw new Error('No profile found');
      }

      const profile = profiles[0] as Profile;
      console.log('[AppContext] Profile fetched successfully:', {
        email: (profile as any).email,
        company_id: profile.company_id,
        app_role: (profile as any).app_role || profile.role,
      });
      setError(null);
      return profile;
    } catch (err) {
      console.error('[AppContext] Error in fetchProfile:', err);
      setError((err as any)?.message || 'Profile fetch failed');
      return null;
    } finally {
      setIsFetching(false);
    }
  };

  const currentUser = session?.user || null;
  const derivedCompanyId = profile?.company_id ?? (currentUser as any)?.user_metadata?.company_id ?? null;
  const derivedSiteId = profile?.site_id ?? (currentUser as any)?.user_metadata?.site_id ?? null;
  const derivedRole = profile?.role
    ?? (currentUser as any)?.user_metadata?.app_role
    ?? (currentUser as any)?.user_metadata?.role
    ?? (currentUser as any)?.app_metadata?.role
    ?? null;

  const value: AppContextType = {
    user: currentUser,
    session,
    profile,
    companyId: derivedCompanyId,
    siteId: derivedSiteId,
    role: derivedRole,
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