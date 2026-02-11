import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// Pure helper function to get current session without redirects
export async function getUserSession(): Promise<{ session: Session | null; error: any }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (error) {
    return { session: null, error };
  }
}

// Pure helper function to get user profile without redirects
export async function getUserProfile(userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
      .eq("id", userId)
      .single();
    return { profile, error };
  } catch (error) {
    return { profile: null, error };
  }
}

// Simplified post-login handler — reads user's preferred landing page
// Falls back to /dashboard if no preference is set
export function redirectToDashboard(router: any) {
  let landingPage = '/dashboard';
  try {
    const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
    if (prefs.landing_page && typeof prefs.landing_page === 'string') {
      landingPage = prefs.landing_page;
    }
  } catch {
    // ignore parse errors
  }
  router.replace(landingPage);
}