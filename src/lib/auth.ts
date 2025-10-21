import { supabase } from "@/lib/supabase";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function handlePostLogin(userId: string, router: AppRouterInstance) {
  try {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
      .eq("id", userId)
      .single();
    if (pErr || !profile) {
      router.replace("/dashboard");
      return;
    }

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("setup_status")
      .eq("id", profile.company_id)
      .single();
    if (cErr || !company) {
      router.replace("/dashboard");
      return;
    }

    // Setup pages have been retired - always go to dashboard
    router.replace("/dashboard");
  } catch (_e) {
    router.replace("/login");
  }
}