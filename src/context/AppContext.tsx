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
      
      if (!userId) {
        console.warn('⚠️ AppContext fetchProfile: No userId provided');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle(); // Use maybeSingle instead of single to handle "no rows" gracefully
      
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
          // No rows returned - user doesn't have a profile yet
          console.warn('⚠️ No profile found for user:', userId);
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
      if (!data) {
        console.warn('⚠️ AppContext: No profile data returned for user:', userId);
        setProfile(null);
        setLoading(false);
        return;
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
          console.log('⚠️ Direct lookup failed, trying created_by:', {
            error: companyError?.message || companyError?.code,
            hasData: !!companyData
          });
          const { data: createdData, error: createdError } = await supabase
            .from('companies')
            .select('*')
            .eq('created_by', userId)
            .maybeSingle();
          
          if (!createdError && createdData) {
            companyData = createdData;
            companyError = null;
            console.log('✅ AppContext company found via created_by:', createdData.name);
          } else if (createdError) {
            console.error('❌ AppContext: Error fetching company via created_by:', {
              message: createdError.message,
              code: createdError.code,
              details: createdError.details
            });
          }
        }
        
        if (!companyError && companyData && companyData.id) {
          console.log('✅ AppContext company loaded:', companyData.name);
          setCompany(companyData);
        } else {
          console.warn('⚠️ AppContext: No company found', {
            hasError: !!companyError,
            errorMessage: companyError?.message,
            errorCode: companyError?.code,
            hasData: !!companyData,
            company_id: data.company_id
          });
          setCompany(null);
        }
      } else {
        console.log('ℹ️ AppContext: No company_id in profile');
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