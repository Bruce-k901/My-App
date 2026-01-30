import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_id: string;
  site_id?: string;
  app_role: string;
  position_title?: string;
  boh_foh?: string;
  last_login?: string;
  pin_code?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

// Enhanced session manager with better error handling
export class SessionManager {
  private static instance: SessionManager;
  private authState: AuthState = {
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    this.initializeAuth();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private async initializeAuth() {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        this.updateState({ error: error.message, loading: false });
        return;
      }

      if (session?.user) {
        await this.handleUserSession(session);
      } else {
        this.updateState({ loading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          await this.handleUserSession(session);
        } else {
          this.updateState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null,
          });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateState({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
    }
  }

  private async handleUserSession(session: Session) {
    try {
      const profile = await this.fetchUserProfile(session.user.id);
      
      this.updateState({
        user: session.user,
        session,
        profile,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error handling user session:', error);
      this.updateState({
        user: session.user,
        session,
        profile: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load profile',
      });
    }
  }

  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          company_id,
          site_id,
          app_role,
          position_title,
          boh_foh,
          last_login,
          pin_code
        `)
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      return null;
    }
  }

  private updateState(updates: Partial<AuthState>) {
    this.authState = { ...this.authState, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AuthState {
    return { ...this.authState };
  }

  public async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        return false;
      }

      if (data.session) {
        await this.handleUserSession(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Unexpected error refreshing session:', error);
      return false;
    }
  }

  public async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  public isAuthenticated(): boolean {
    return !!this.authState.user && !!this.authState.session;
  }

  public hasRole(role: string): boolean {
    return this.authState.profile?.app_role === role;
  }

  public hasAnyRole(roles: string[]): boolean {
    const userRole = (this.authState.profile?.app_role || '').toLowerCase();
    return roles.map(r => r.toLowerCase()).includes(userRole);
  }

  public getCompanyId(): string | null {
    return this.authState.profile?.company_id || null;
  }

  public getSiteId(): string | null {
    return this.authState.profile?.site_id || null;
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
