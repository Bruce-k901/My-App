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

// Simplified post-login handler that only redirects to dashboard
// No error handling redirects - let AuthContext handle session management
export function redirectToDashboard(router: any) {
  router.replace("/dashboard");
}