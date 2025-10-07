"use client";

import { useEffect, useMemo, useState } from "react";
import SetupLayout from "@/components/setup/SetupLayout";
import TeamInviteForm from "@/components/setup/TeamInviteForm";
import TeamTable from "@/components/setup/TeamTable";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Site = { id: string; name: string };
type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "staff" | "manager" | "admin";
  site_id: string | null;
  active?: boolean;
};

export default function TeamSetupPage() {
  return (
    <AppContextProvider>
      <SetupLayout stepLabel="Add your team — Step 3 of 5">
        <TeamContent />
      </SetupLayout>
    </AppContextProvider>
  );
}

function TeamContent() {
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: sitesRes, error: sitesErr }, { data: teamRes, error: teamErr }] = await Promise.all([
        supabase.from("sites").select("id, name").eq("company_id", companyId),
        supabase.from("profiles").select("*").eq("company_id", companyId).neq("role", "admin"),
      ]);
      if (sitesErr) throw sitesErr;
      if (teamErr) throw teamErr;
      setSites((sitesRes as any) ?? []);
      setTeam((teamRes as any) ?? []);
    } catch (err: any) {
      showToast({ title: "Load failed", description: err?.message ?? "Failed to load team/sites", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const perSiteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sites) counts[s.id] = 0;
    for (const m of team) {
      if (m.site_id && m.active !== false) {
        counts[m.site_id] = (counts[m.site_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [sites, team]);

  const allSitesHaveUsers = useMemo(() => {
    if (!sites.length) return false;
    return sites.every((s) => (perSiteCounts[s.id] ?? 0) >= 1);
  }, [sites, perSiteCounts]);

  const onInvited = (profile: any) => {
    setTeam((t) => [profile, ...t]);
  };

  const goNext = async () => {
    if (!companyId) return;
    if (!allSitesHaveUsers) {
      showToast({ title: "Assign users", description: "Assign at least one user to each site.", type: "warning" });
      return;
    }
    try {
      const res = await fetch("/api/company/setup-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, status: "team_added" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      router.push("/setup/checklists");
    } catch (err: any) {
      showToast({ title: "Next failed", description: err?.message ?? "Failed to advance setup", type: "error" });
    }
  };

  if (!companyId) {
    return (
      <div className="border border-neutral-800 rounded-md p-4">
        <p className="text-slate-300">No company detected. Create a company first.</p>
        <Link href="/setup" className="btn-gradient mt-4 inline-block">Go to Setup</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Invite team members</h2>
        <TeamInviteForm companyId={companyId} sites={sites} onInvited={onInvited} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Current team</h2>
        <TeamTable
          team={team}
          sites={sites}
          onUpdated={(member) => setTeam((t) => t.map((m) => (m.id === member.id ? (member as any) : m)))}
          onRemoved={(id) => setTeam((t) => t.filter((m) => m.id !== id))}
        />
        {!allSitesHaveUsers && (
          <p className="text-yellow-400 text-sm">Assign at least one active user to each site to continue.</p>
        )}
      </section>

      <section className="flex items-center justify-between pt-2">
        <Link href="/setup/sites" className="text-sm text-slate-300 hover:underline">Back</Link>
        <button className="btn-gradient" onClick={goNext} disabled={!allSitesHaveUsers || loading}>
          Next
        </button>
      </section>
    </div>
  );
}