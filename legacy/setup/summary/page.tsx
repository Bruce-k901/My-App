"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SetupLayout from "@/components/setup/SetupLayout";
import { useToast } from "@/components/ui/ToastProvider";

export default function SummarySetupPage() {
  return (
    <AppContextProvider>
      <SetupLayout stepLabel="Summary">
        <SummaryContent />
      </SetupLayout>
    </AppContextProvider>
  );
}

function SummaryContent() {
  const router = useRouter();
  const { companyId, company, refresh } = useAppContext();
  const { showToast } = useToast();
  const [sites, setSites] = useState<any[]>([]);
  const [siteBreakdown, setSiteBreakdown] = useState<any[]>([]);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [checklistCount, setChecklistCount] = useState<number>(0);
  const [assetCount, setAssetCount] = useState<number>(0);
  const [unassignedTeamCount, setUnassignedTeamCount] = useState<number>(0);
  const [unassignedAssetsCount, setUnassignedAssetsCount] = useState<number>(0);
  const [templateCount, setTemplateCount] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!companyId) return;
      let sitesData: any[] = [];
      try {
        const { data } = await supabase.from("sites").select("id,name").eq("company_id", companyId);
        sitesData = data || [];
        setSites(sitesData);
      } catch {}
      try {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id,site_id")
          .eq("company_id", companyId);
        const team = Array.isArray(profilesData) ? profilesData : [];
        setTeamCount(team.length);
        setUnassignedTeamCount(team.filter((p: any) => !p.site_id).length);
      } catch {}
      let listsData: any[] = [];
      try {
        // Prefer per-site table if present
        const { data } = await supabase
          .from("site_checklists")
          .select("id,site_id")
          .eq("company_id", companyId);
        listsData = Array.isArray(data) ? data : [];
        setChecklistCount(listsData.length);
      } catch {
        try {
          const { data } = await supabase
            .from("checklists")
            .select("id,site_id")
            .eq("company_id", companyId);
          listsData = Array.isArray(data) ? data : [];
          setChecklistCount(listsData.length);
        } catch {
          try {
            const { data } = await supabase
              .from("checklist_templates")
              .select("id")
              .eq("company_id", companyId);
            const count = Array.isArray(data) ? data.length : 0;
            setChecklistCount(count);
            setTemplateCount(count);
          } catch {}
        }
      }
      try {
        const { data: assetsData } = await supabase
          .from("assets")
          .select("id,site_id")
          .eq("company_id", companyId);
        const assetsArr = Array.isArray(assetsData) ? assetsData : [];
        setAssetCount(assetsArr.length);
        setUnassignedAssetsCount(assetsArr.filter((a: any) => !a.site_id).length);

        // Build per-site breakdown
        const teamBySite: Record<string, number> = {};
        const listsBySite: Record<string, number> = {};
        const assetsBySite: Record<string, number> = {};
        (assetsData || []).forEach((a: any) => {
          if (a.site_id) assetsBySite[a.site_id] = (assetsBySite[a.site_id] || 0) + 1;
        });
        // We may not have checklists per-site; count if site_id exists
        (listsData || []).forEach((c: any) => {
          if (c.site_id) listsBySite[c.site_id] = (listsBySite[c.site_id] || 0) + 1;
        });
        // Fetch profiles again to ensure scope (already loaded above)
        try {
          const { data: profilesAgain } = await supabase
            .from("profiles")
            .select("id, email, company_id, site_id, app_role, position_title, boh_foh, last_login, pin_code")
            .eq("company_id", companyId);
          (profilesAgain || []).forEach((p: any) => {
            if (p.site_id) teamBySite[p.site_id] = (teamBySite[p.site_id] || 0) + 1;
          });
        } catch {}
        const breakdown = (sitesData || []).map((s: any) => ({
          site_id: s.id,
          site_name: s.name,
          team: teamBySite[s.id] || 0,
          checklists: listsBySite[s.id] || 0,
          assets: assetsBySite[s.id] || 0,
        }));
        setSiteBreakdown(breakdown);
      } catch {}
    })();
  }, [companyId]);

  const activate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ active: true, setup_status: "active" })
        .eq("id", companyId);
      if (error) throw error;
      showToast("Company activated.", "success");
      await refresh();
      router.replace("/dashboard");
    } catch (err: any) {
      showToast(err?.message ?? "Failed to activate dashboard", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!companyId) {
    return (
      <div className="px-6 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-3">Setup Summary</h1>
          <p className="text-slate-300">Create your company first.</p>
          <Link href="/setup" className="btn-gradient mt-4 inline-block">Create Company</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-3">Setup Summary</h1>
        <p className="text-slate-300 mb-6">Review before activating the company dashboard.</p>

        <ul className="space-y-2 text-sm text-slate-300">
          <li>Company info ✅ {company?.name ?? "—"}</li>
          <li>Sites ✅ {sites.length}</li>
          <li>Team ✅ {teamCount}</li>
          <li>Checklists ✅ {checklistCount}</li>
          <li>Equipment ✅ {assetCount}</li>
          {unassignedTeamCount > 0 && <li>Unassigned team ⚠️ {unassignedTeamCount}</li>}
          {unassignedAssetsCount > 0 && <li>Unassigned assets ⚠️ {unassignedAssetsCount}</li>}
          {templateCount > 0 && <li>Templates available 📋 {templateCount}</li>}
        </ul>

        {siteBreakdown.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Per-Site Breakdown</h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0f1220]">
                  <tr className="text-slate-400">
                    <th className="text-left p-2">Site</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-left p-2">Checklists</th>
                    <th className="text-left p-2">Assets</th>
                  </tr>
                </thead>
                <tbody>
                  {siteBreakdown.map((row) => (
                    <tr key={row.site_id} className="border-t border-neutral-800">
                      <td className="p-2">{row.site_name}</td>
                      <td className="p-2">{row.team}</td>
                      <td className="p-2">{row.checklists}</td>
                      <td className="p-2">{row.assets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button disabled={busy} onClick={activate} className="btn-gradient">Activate Dashboard</button>
          <Link href="/dashboard" className="btn-glass">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}