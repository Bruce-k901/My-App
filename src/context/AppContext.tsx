"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
  setSelectedSite: (siteId: string | null) => void;
  selectedSiteId: string | null;
  /** True when a platform admin is viewing as another company */
  isViewingAs: boolean;
  /** The company ID being viewed as (null when not in View As mode) */
  viewingAsCompanyId: string | null;
  /** True when the current user has is_platform_admin flag */
  isPlatformAdmin: boolean;
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
  setSelectedSite: () => {},
  selectedSiteId: null,
  isViewingAs: false,
  viewingAsCompanyId: null,
  isPlatformAdmin: false,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [viewingAsCompanyId, setViewingAsCompanyId] = useState<string | null>(null);
  // Global selected site - persists in localStorage and overrides profile.site_id
  const [selectedSiteId, setSelectedSiteIdState] = useState<string | null>(null);
  // Track whether site selection has been initialized (prevents re-init when user selects "All Sites" / null)
  const siteInitializedRef = useRef(false);
  // Prevent duplicate fetchProfile calls (getSession + onAuthStateChange both fire on mount)
  const profileLoadedForRef = useRef<string | null>(null);

  // Load selected site from localStorage on mount
  useEffect(() => {
    if (!isMounted) return;
    try {
      const stored = localStorage.getItem('selectedSiteId');
      if (stored) {
        setSelectedSiteIdState(stored);
        siteInitializedRef.current = true;
      }
    } catch (error) {
      console.warn('Failed to load selected site from localStorage:', error);
    }
  }, [isMounted]);

  // Initialize selected site from user preferences, then profile, if not already set
  useEffect(() => {
    if (!isMounted || !profile || siteInitializedRef.current) return;
    let defaultSite: string | null = null;
    // Check user preferences for default_site_id first
    try {
      const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
      if (prefs.default_site_id) {
        defaultSite = prefs.default_site_id;
      }
    } catch { /* ignore */ }
    // Fall back to profile home_site or site_id
    if (!defaultSite) {
      defaultSite = profile.home_site || profile.site_id || null;
    }
    if (defaultSite) {
      setSelectedSiteIdState(defaultSite);
    }
    siteInitializedRef.current = true;
  }, [profile, isMounted]);

  // Persist selected site to localStorage when it changes
  useEffect(() => {
    if (!isMounted) return;
    try {
      if (selectedSiteId) {
        localStorage.setItem('selectedSiteId', selectedSiteId);
      } else {
        localStorage.removeItem('selectedSiteId');
      }
    } catch (error) {
      console.warn('Failed to save selected site to localStorage:', error);
    }
  }, [selectedSiteId, isMounted]);

  // Function to set selected site (memoized to prevent re-render loops in consumers)
  const setSelectedSite = useCallback((siteId: string | null) => {
    siteInitializedRef.current = true;
    setSelectedSiteIdState(siteId);
    console.log('🏢 [AppContext] Selected site changed:', siteId);
  }, []);

  useEffect(() => {
    setIsMounted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        profileLoadedForRef.current = session.user.id;
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setCompany(null);
        setLoading(false);
        profileLoadedForRef.current = null;
        setViewingAsCompanyId(null);
        try { sessionStorage.removeItem('admin_viewing_as_company'); } catch {}
        return;
      }

      // Token refresh — session/cookies already updated above, no profile re-fetch needed
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // Deduplicate: getSession() already handles the initial load on mount
      // INITIAL_SESSION and SIGNED_IN both fire on page load alongside getSession()
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && profileLoadedForRef.current === session.user.id) {
        return;
      }

      profileLoadedForRef.current = session.user.id;
      fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check for admin "View As" mode
  useEffect(() => {
    // Only check sessionStorage on client side after mount
    if (!isMounted) return;

    const checkViewAsMode = () => {
      const viewingAs = sessionStorage.getItem('admin_viewing_as_company');
      if (viewingAs) {
        try {
          const { id } = JSON.parse(viewingAs);
          setViewingAsCompanyId(id);
          // console.log('👁️ Admin viewing as company:', id);
          
          // Fetch the company data for the viewed company
          fetchCompanyById(id);
        } catch (error) {
          console.error('Error parsing admin_viewing_as_company:', error);
          sessionStorage.removeItem('admin_viewing_as_company');
          setViewingAsCompanyId(null);
        }
      } else {
        // If sessionStorage is cleared, reset viewingAsCompanyId
        setViewingAsCompanyId(null);
      }
    };

    // Check on mount
    checkViewAsMode();

    // Listen for storage changes (e.g., when admin exits "View As" from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_viewing_as_company') {
        checkViewAsMode();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isMounted]);

  // Reload user's own company when exiting "View As" mode
  useEffect(() => {
    if (!viewingAsCompanyId) {
      // View As mode is not active
      if (profile?.company_id) {
        // User has a company - reload it if it's different from current company
        if (company?.id !== profile.company_id) {
          // console.log('🔄 Reloading user\'s own company after exiting View As mode');
          fetchCompanyById(profile.company_id);
        }
      } else {
        // User has no company - clear company state
        if (company) {
          // console.log('🔄 Clearing company state (user has no company)');
          setCompany(null);
        }
      }
    }
  }, [viewingAsCompanyId, profile?.company_id]);

  // Track failed company fetches to prevent infinite loops
  const failedCompanyFetches = React.useRef<Set<string>>(new Set());

  async function fetchCompanyById(companyId: string) {
    // Prevent infinite loops - if we've already failed to fetch this company, don't try again
    if (failedCompanyFetches.current.has(companyId)) {
      console.debug('⚠️ AppContext: Skipping fetch for company (already failed):', companyId);
      return;
    }

    try {
      // console.log('🔄 AppContext loading company (View As):', companyId);
      
      // Always use API route to bypass RLS
      let companyData = null;
      let companyError = null;
      
      try {
        const response = await fetch(`/api/company/get?id=${companyId}`);
        if (response.ok) {
          companyData = await response.json();
        } else {
          const errorText = await response.text();
          companyError = new Error(`API route failed: ${errorText}`);
        }
      } catch (apiError) {
        console.error('API route error:', apiError);
        companyError = apiError instanceof Error ? apiError : new Error('Unknown API error');
      }
      
      if (!companyError && companyData && companyData.id) {
        // console.log('✅ AppContext company loaded (View As):', companyData.name);
        setCompany(companyData);
        // Remove from failed set if we succeeded
        failedCompanyFetches.current.delete(companyId);
      } else {
        // Mark as failed to prevent infinite retries
        failedCompanyFetches.current.add(companyId);
        console.warn('⚠️ AppContext: No company found for View As', {
          hasError: !!companyError,
          errorMessage: companyError?.message,
          errorCode: companyError?.code,
          hasData: !!companyData,
          company_id: companyId
        });
        setCompany(null);
      }
    } catch (error) {
      console.error('❌ AppContext fetchCompanyById error:', error);
      setCompany(null);
    }
  }

  async function fetchProfile(userId: string) {
    try {
      // console.log('🔍 AppContext fetchProfile:', userId);
      setLoading(true); // Set loading to true when starting to fetch
      
      if (!userId) {
        console.warn('⚠️ AppContext fetchProfile: No userId provided');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Try direct Supabase query first, but fall back to API route if RLS blocks it
      // This handles cases where RLS policies prevent direct access (e.g., 406 errors)
      let data = null;
      let error = null;
      
      try {
        // Try RPC function first (bypasses RLS, no recursion)
        const rpcResult = await supabase.rpc('get_own_profile');
        if (rpcResult.data && !rpcResult.error) {
          // Function returns JSONB, so data is the object directly
          const profileData = typeof rpcResult.data === 'object' && !Array.isArray(rpcResult.data) 
            ? rpcResult.data 
            : (Array.isArray(rpcResult.data) && rpcResult.data.length > 0 ? rpcResult.data[0] : null);
          
          if (profileData && Object.keys(profileData).length > 0) {
            data = profileData;
            error = null;
            // console.log('✅ Profile loaded via RPC function');
          } else {
            // Fallback to direct query
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            data = result.data;
            error = result.error;
          }
        } else {
          // RPC failed, fallback to direct query
          console.warn('RPC function failed, using direct query:', rpcResult.error);
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          data = result.data;
          error = result.error;
        }
        
        // If we get a 406 error (RLS blocking), fall back to API route
        // Check for various 406 error indicators
        const is406Error = error && (
          error.code === 'PGRST116' || 
          error.message?.includes('406') || 
          (error as any).status === 406 ||
          error.message?.includes('Not Acceptable') ||
          error.message?.includes('row-level security')
        );
        
        if (is406Error) {
          console.warn('⚠️ AppContext: Direct profile query blocked by RLS (406), using API route fallback');
          
          try {
            const apiResponse = await fetch(`/api/profile/get?userId=${userId}`);
            if (apiResponse.ok) {
              data = await apiResponse.json();
              error = null; // Clear error since API route succeeded
              // console.log('✅ Profile loaded via API route fallback');
            } else {
              const errorText = await apiResponse.text();
              error = new Error(`API route failed: ${errorText}`);
              console.error('❌ API route fallback also failed:', errorText);
            }
          } catch (apiError) {
            error = apiError instanceof Error ? apiError : new Error('API route error');
            console.error('❌ API route fallback exception:', apiError);
          }
        }
      } catch (queryError) {
        error = queryError instanceof Error ? queryError : new Error('Query error');
      }
      
      // DEBUG: Log profile query result
      // console.log('Profile query result (AppContext):', { 
      //   data, 
      //   error, 
      //   userId,
      //   hasData: !!data,
      //   hasError: !!error,
      //   errorCode: error?.code,
      //   errorMessage: error?.message,
      // });
      
      // If we got null data but no error, it might be RLS blocking silently
      // Try API route fallback
      if (!data && !error) {
        console.warn('⚠️ AppContext: Profile query returned null data with no error - might be RLS blocking silently, trying API route');
        try {
          const apiResponse = await fetch(`/api/profile/get?userId=${userId}`);
          if (apiResponse.ok) {
            data = await apiResponse.json();
            // console.log('✅ Profile loaded via API route (null data fallback)');
          } else {
            const errorText = await apiResponse.text();
            console.error('❌ API route failed:', errorText);
            error = new Error(`API route failed: ${errorText}`);
          }
        } catch (apiError) {
          console.error('❌ API route exception:', apiError);
          error = apiError instanceof Error ? apiError : new Error('API route error');
        }
      }
      
      if (error) {
        // Check if error is truly empty
        const errorKeys = error ? Object.keys(error) : [];
        const errorOwnProps = error ? Object.getOwnPropertyNames(error) : [];
        const isEmpty = errorKeys.length === 0 && errorOwnProps.length === 0;
        
        // Extract error information - handle empty objects
        let errorMessage = 'Unknown error';
        let errorCode = null;
        let errorDetails = null;
        let errorHint = null;
        
        if (isEmpty) {
          // Error object is truly empty
          errorMessage = 'Empty error object from Supabase query';
          console.error('❌ AppContext profile error: Empty error object detected', {
            userId,
            errorType: typeof error,
            errorValue: error,
            query: 'profiles.select(*).or(...).maybeSingle()'
          });
        } else {
          // Try to get error properties
          try {
            errorMessage = error.message || error.msg || String(error) || 'Unknown error';
            errorCode = error.code || null;
            errorDetails = error.details || null;
            errorHint = error.hint || null;
            
            // If message is still generic, try String conversion
            if (errorMessage === 'Unknown error' || errorMessage === '[object Object]') {
              try {
                const errorStr = String(error);
                if (errorStr !== '[object Object]' && errorStr !== '{}') {
                  errorMessage = errorStr;
                } else {
                  errorMessage = 'Error object could not be converted to string';
                }
              } catch (e) {
                errorMessage = 'Could not extract error information';
              }
            }
          } catch (e) {
            errorMessage = `Error extraction failed: ${String(e)}`;
          }
          
          // Build error info object
          const errorInfo: Record<string, any> = {
            message: errorMessage,
            userId: userId
          };
          
          if (errorCode) errorInfo.code = errorCode;
          if (errorDetails) errorInfo.details = errorDetails;
          if (errorHint) errorInfo.hint = errorHint;
          
          // Add key information
          if (errorKeys.length > 0) {
            errorInfo.keys = errorKeys;
            const errorValues: Record<string, any> = {};
            errorKeys.forEach(key => {
              try {
                const value = (error as any)[key];
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
                  errorValues[key] = value;
                } else if (typeof value === 'object') {
                  errorValues[key] = '[object]';
                } else {
                  errorValues[key] = typeof value;
                }
              } catch (e) {
                errorValues[key] = '[unable to access]';
              }
            });
            errorInfo.values = errorValues;
          }
          
          if (errorOwnProps.length > errorKeys.length) {
            errorInfo.ownPropertyNames = errorOwnProps.filter(k => !errorKeys.includes(k));
          }
          
          console.error('❌ AppContext profile error:', errorInfo);
          
          // Try to serialize the full error
          try {
            const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
            if (serialized && serialized !== '{}' && serialized !== 'null') {
              console.error('Full error object:', serialized);
            }
          } catch (e) {
            console.error('Could not serialize error');
          }
        }
        
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          // No rows returned - user doesn't have a profile yet (expected during first signup)
          console.debug('No profile found for user (will be created by auth callback):', userId);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // Handle 406 errors (RLS or table doesn't exist) - expected during first signup
        if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.debug('Profile query returned 406 (RLS or table issue, expected during first signup):', userId);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // For other errors, still set loading to false but don't throw
        // This prevents the app from crashing
        console.error('Profile fetch failed, continuing without profile');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Handle case where data is null (no profile found)
      // This is expected during first signup before profile is created
      if (!data) {
        console.debug('No profile data returned for user (expected during first signup):', userId);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // console.log('✅ AppContext profile loaded:', { 
      //   id: data?.id, 
      //   company_id: data?.company_id,
      //   email: data?.email 
      // });
      setProfile(data);
      
      // Check if admin is viewing as another company
      const viewingAs = sessionStorage.getItem('admin_viewing_as_company');
      if (viewingAs) {
        try {
          const { id } = JSON.parse(viewingAs);
          setViewingAsCompanyId(id);
          // console.log('👁️ Admin viewing as company (from fetchProfile):', id);
          // Don't load user's own company - the viewingAsCompanyId useEffect will load the viewed company
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing admin_viewing_as_company in fetchProfile:', error);
        }
      }
      
      // Load company data from user_companies primary company (only if not in View As mode)
      if (data?.id && !viewingAsCompanyId) {
        try {
          // First, try to load primary company from user_companies
          // Use simple query if table exists, otherwise fallback to profile.company_id
          const { data: primaryCompany, error: userCompaniesError } = await supabase
            .from('user_companies')
            .select(`
              company_id,
              companies (
                id,
                name
              )
            `)
            .eq('profile_id', data.id)
            .eq('is_primary', true)
            .maybeSingle();
          
          let companyData = null;
          
          // If 404 (table doesn't exist) or other error, skip user_companies and use fallback
          const isTableNotFound = userCompaniesError && (
            userCompaniesError.code === 'PGRST116' ||
            userCompaniesError.code === '42P01' || // relation does not exist
            userCompaniesError.message?.includes('404') ||
            userCompaniesError.message?.includes('relation') ||
            userCompaniesError.message?.includes('does not exist') ||
            (userCompaniesError as any)?.status === 404
          );
          
          // Silently handle table not found (migration not run yet)
          if (isTableNotFound) {
            console.debug('⚠️ user_companies table not found, falling back to profile.company_id');
          }
          
          if (!isTableNotFound && !userCompaniesError && primaryCompany) {
            const company = Array.isArray(primaryCompany.companies) 
              ? primaryCompany.companies[0] 
              : primaryCompany.companies;
            
            if (company && company.id) {
              companyData = { id: company.id, name: company.name };
            }
          }
          
          // Fallback to profile.company_id using API route (existing logic)
          if (!companyData && data.company_id) {
            try {
              const response = await fetch(`/api/company/get?id=${data.company_id}`);
              if (response.ok) {
                companyData = await response.json();
              } else {
                // Try with userId as fallback
                const fallbackResponse = await fetch(`/api/company/get?userId=${userId}`);
                if (fallbackResponse.ok) {
                  companyData = await fallbackResponse.json();
                }
              }
            } catch (apiError) {
              console.error('API route error:', apiError);
            }
          }
          
          if (companyData && companyData.id) {
            setCompany(companyData);
          } else {
            setCompany(null);
          }
        } catch (error) {
          console.error('Error loading primary company:', error);
          // Final fallback: try API route with profile.company_id
          if (data.company_id) {
            try {
              const response = await fetch(`/api/company/get?id=${data.company_id}`);
              if (response.ok) {
                const companyData = await response.json();
                if (companyData && companyData.id) {
                  setCompany(companyData);
                } else {
                  setCompany(null);
                }
              } else {
                setCompany(null);
              }
            } catch (apiError) {
              console.error('Fallback API route error:', apiError);
              setCompany(null);
            }
          } else {
            setCompany(null);
          }
        }
      } else {
        // No profile id or in View As mode
        setCompany(null);
      }
      
      setLoading(false);
    } catch (error: any) {
      // Catch any unexpected errors - handle empty objects
      let errorMessage = 'Unknown error';
      let errorCode = null;
      let errorDetails = null;
      let errorHint = null;
      let errorStack = null;
      
      // Try to extract error information
      try {
        if (error) {
          errorMessage = error.message || error.msg || error.toString() || 'Unknown error';
          errorCode = error.code || null;
          errorDetails = error.details || null;
          errorHint = error.hint || null;
          errorStack = error.stack || null;
          
          // If message is still generic, try String conversion
          if (errorMessage === 'Unknown error' || errorMessage === '[object Object]') {
            try {
              const errorStr = String(error);
              if (errorStr !== '[object Object]') {
                errorMessage = errorStr;
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (e) {
        errorMessage = 'Could not extract error information';
      }
      
      // Build comprehensive error info
      const errorInfo: Record<string, any> = {
        message: errorMessage,
        userId: userId,
        errorType: typeof error,
        isNull: error === null,
        isUndefined: error === undefined
      };
      
      if (errorCode) errorInfo.code = errorCode;
      if (errorDetails) errorInfo.details = errorDetails;
      if (errorHint) errorInfo.hint = errorHint;
      if (errorStack) errorInfo.stack = errorStack;
      
      // Try to enumerate error properties
      try {
        if (error && typeof error === 'object') {
          const errorKeys = Object.keys(error);
          const errorOwnKeys = Object.getOwnPropertyNames(error);
          
          if (errorKeys.length > 0) {
            errorInfo.enumerableKeys = errorKeys;
            const errorValues: Record<string, any> = {};
            errorKeys.forEach(key => {
              try {
                const value = (error as any)[key];
                // Only include primitive values or short strings
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
                  errorValues[key] = value;
                } else if (typeof value === 'object') {
                  errorValues[key] = '[object]';
                } else {
                  errorValues[key] = typeof value;
                }
              } catch (e) {
                errorValues[key] = '[unable to access]';
              }
            });
            errorInfo.enumerableValues = errorValues;
          } else {
            errorInfo.note = 'Error object has no enumerable keys';
          }
          
          if (errorOwnKeys.length > errorKeys.length) {
            errorInfo.ownPropertyNames = errorOwnKeys.filter(k => !errorKeys.includes(k));
          }
        }
      } catch (e) {
        errorInfo.enumerationError = String(e);
      }
      
      console.error('❌ AppContext fetchProfile exception:', errorInfo);
      
      // Try to stringify the error object for better debugging
      try {
        if (error) {
          const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
          if (serialized && serialized !== '{}' && serialized !== 'null') {
            console.error('Full error object:', serialized);
          } else {
            console.error('Error object serializes to empty/null');
            // Try alternative serialization
            try {
              const altSerialized = JSON.stringify(error, null, 2);
              if (altSerialized && altSerialized !== '{}') {
                console.error('Alternative serialization:', altSerialized);
              }
            } catch (e) {
              console.error('Alternative serialization failed');
            }
          }
        } else {
          console.error('Error is null or undefined');
        }
      } catch (stringifyError) {
        console.error('Could not stringify error:', stringifyError);
        console.error('Error type:', typeof error);
        if (error && typeof error === 'object') {
          try {
            console.error('Error constructor:', error.constructor?.name);
            console.error('Error prototype:', Object.getPrototypeOf(error)?.constructor?.name);
          } catch (e) {
            console.error('Could not inspect error prototype');
          }
        }
      }
      
      // Set state to prevent infinite loading
      setProfile(null);
      setCompany(null);
      setLoading(false);
    }
  }

  async function signOut() {
    // Clear state on logout
    siteInitializedRef.current = false;
    profileLoadedForRef.current = null;
    setSelectedSiteIdState(null);
    setViewingAsCompanyId(null);
    try {
      localStorage.removeItem('selectedSiteId');
      sessionStorage.removeItem('admin_viewing_as_company');
    } catch (error) {
      console.warn('Failed to clear storage on logout:', error);
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // siteId: Use selectedSiteId if set (from header selector), otherwise fall back to profile.site_id
  // When selectedSiteId is null it means "All Sites" was chosen, so siteId should be null (no filter)
  // Only fall back to profile.site_id when site selection hasn't been initialized yet
  const effectiveSiteId = siteInitializedRef.current
    ? selectedSiteId
    : (profile?.site_id || user?.user_metadata?.site_id || null);

  const value = {
    user,
    session,
    profile,
    // Use viewingAsCompanyId if admin is viewing as another company, then active company, then profile fallback
    companyId: viewingAsCompanyId || company?.id || profile?.company_id || user?.user_metadata?.company_id || null,
    company,
    // Use selected site from header if available, otherwise use profile's site_id
    siteId: effectiveSiteId,
    role: profile?.app_role || user?.user_metadata?.app_role || 'Staff',
    userId: user?.id || null,
    loading,
    signOut,
    setCompany,
    setSelectedSite,
    selectedSiteId,
    isViewingAs: !!viewingAsCompanyId,
    viewingAsCompanyId: viewingAsCompanyId || null,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}