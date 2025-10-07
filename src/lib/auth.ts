import { supabase } from "@/lib/supabase";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function handlePostLogin(userId: string, router: AppRouterInstance) {
  try {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("company_id, site_id, role")
      .eq("id", userId)
      .single();
    if (pErr || !profile) {
      router.replace("/setup/company");
      return;
    }

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("setup_status")
      .eq("id", profile.company_id)
      .single();
    if (cErr || !company) {
      router.replace("/setup/company");
      return;
    }

    if (company.setup_status !== "active") {
      const next = company.setup_status === "new"
        ? "/setup/sites"
        : company.setup_status === "sites_added"
        ? "/setup/team"
        : company.setup_status === "team_added"
        ? "/setup/checklists"
        : company.setup_status === "checklists_added"
        ? "/setup/equipment"
        : company.setup_status === "equipment_added"
        ? "/setup/summary"
        : "/setup/sites";
      router.replace(next);
    } else {
      router.replace("/dashboard");
    }
  } catch (_e) {
    router.replace("/login");
  }
}