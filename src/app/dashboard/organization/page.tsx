"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { isRoleGuardEnabled } from "@/lib/featureFlags";
import { supabase } from "@/lib/supabase";
import BusinessDetailsTab from "@/components/organisation/BusinessDetailsTab";
import SitesList from "@/components/organisation/SitesList";
import ContractorsTable from "@/components/organisation/ContractorsTable";
import DocumentsPoliciesSection from "@/components/organisation/DocumentsPoliciesSection";

type TabKey = "business" | "sites" | "contractors" | "documents";

const TABS: { key: TabKey; label: string }[] = [
  { key: "business", label: "Business Details" },
  { key: "sites", label: "Sites" },
  { key: "contractors", label: "Contractors" },
  { key: "documents", label: "Documents/Policies" },
];

export default function OrganizationPage() {
  const [active, setActive] = useState<TabKey>("business");
  const { role, company, setCompany, profile } = useAppContext();
  const [companyLoadError, setCompanyLoadError] = useState<string | null>(null);
  const [companyChecked, setCompanyChecked] = useState<boolean>(false);

  useEffect(() => {
    // Default to first tab on load
    setActive("business");
  }, []);

  // Ensure company data reloads after login/refresh; prefer profile.company_id when available
  const fetchCompanyData = useCallback(async () => {
    setCompanyChecked(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setCompanyChecked(true);
        return;
      }

      const { data: profileRow, error: profErr } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profErr) {
        // Not fatal; continue with created_by match
        console.warn("Profile lookup error:", profErr.message);
      }

      const { data, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .or(`created_by.eq.${user.id},id.eq.${profileRow?.company_id || ""}`)
        .limit(1);

      if (compErr) {
        setCompanyLoadError(compErr.message ?? "Failed to load company");
      } else {
        const row = Array.isArray(data) ? data[0] : (data as any);
        if (row) setCompany(row);
        // If no row, don't surface an error; user may not have a company yet
        setCompanyLoadError(null);
      }
    } catch (e: any) {
      setCompanyLoadError(e?.message ?? "Failed to load company");
    } finally {
      setCompanyChecked(true);
    }
  }, [setCompany]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  if (isRoleGuardEnabled() && role && role !== "admin" && role !== "owner") {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 text-white">
        <h1 className="text-2xl font-semibold mb-2">Access Restricted</h1>
        <p className="text-slate-300">This page is only available to Admins and Owners.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-white">
      <h1 className="text-2xl font-semibold mb-4">Organization Settings</h1>

      {/* Company Load Status */}
      {companyLoadError && (
        <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-red-300">Company load failed: {companyLoadError}</p>
              <p className="text-xs text-red-200/80">If you recently saved, check RLS policies on companies and that your user owns/created the record.</p>
            </div>
            <button onClick={fetchCompanyData} className="px-3 py-1.5 rounded bg-white/[0.12] border border-white/[0.2] text-white text-sm hover:bg-white/[0.16]">
              Retry
            </button>
          </div>
        </div>
      )}
      {!company && companyChecked && !companyLoadError && (
        <div className="mb-4 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
          <p className="text-sm text-slate-300">No company data found yet. Use Business Details to create your company.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 rounded-xl border transition-all ${
                isActive
                  ? "bg-white/[0.12] border-white/[0.2] text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]"
                  : "bg-white/[0.06] border-white/[0.1] text-white/80 hover:bg-white/[0.1] hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
        {active === "business" && <BusinessDetailsTab />}
        {active === "sites" && <SitesList />}
        {active === "contractors" && <ContractorsTable />}
        {active === "documents" && <DocumentsPoliciesSection />}
      </div>
    </div>
  );
}