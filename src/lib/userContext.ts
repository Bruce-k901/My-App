import { supabase } from "@/lib/supabase";

type Profile = { company_id: string; site_id: string | null; role: string };
type Company = { id: string; name: string; setup_status: string };
type Site = { id: string; name: string; timezone?: string | null } | null;

export async function getUserContext(): Promise<{ profile: Profile; company: Company; site: Site }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes?.user?.id) throw new Error("No authenticated user");
  const userId = userRes.user.id;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("company_id, site_id, role")
    .eq("id", userId)
    .single();
  if (pErr || !profile) throw new Error("Profile not found");

  const { data: company, error: cErr } = await supabase
    .from("companies")
    .select("id, name, setup_status")
    .eq("id", profile.company_id)
    .single();
  if (cErr || !company) throw new Error("Company not found");

  let site: Site = null;
  if (profile.site_id) {
    const { data: s, error: sErr } = await supabase
      .from("sites")
      .select("id, name, timezone")
      .eq("id", profile.site_id)
      .single();
    if (!sErr) site = s;
  }

  return { profile, company, site };
}