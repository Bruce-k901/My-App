import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton Supabase client with enhanced session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "supabase-auth-token", // custom key to avoid collisions
    flowType: "pkce", // Use PKCE flow for better security
    debug: process.env.NODE_ENV === "development", // Enable debug logs in development
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web',
    },
  },
});

// Enhanced session recovery and error handling
if (typeof window !== "undefined") {
  // Add global error handler for auth errors
  supabase.auth.onAuthStateChange(async (event, _session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      // Clear any cached data
      localStorage.removeItem('supabase-auth-token');
    }
  });

  // Handle refresh token errors gracefully
  const originalRefreshSession = supabase.auth.refreshSession;
  supabase.auth.refreshSession = async function(currentSession?: { refresh_token: string }) {
    try {
      const result = await originalRefreshSession.call(this, currentSession);
      if (result.error) {
        console.warn('Token refresh failed:', result.error.message);
        // If refresh fails, try to get a fresh session
        if (result.error.message.includes('Invalid Refresh Token') || 
            result.error.message.includes('Refresh Token Not Found')) {
          console.log('Attempting session recovery...');
          // Clear the invalid token
          await this.signOut();
          // Redirect to login if we're not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
      return result;
    } catch (error) {
      console.error('Session refresh error:', error);
      // Fallback: clear session and redirect to login
      await this.signOut();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw error;
    }
  };

  // Expose for debugging (remove later if you like)
  (window as any).supabase = supabase;
}

export default supabase;
