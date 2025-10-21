"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SiteFormNew from "@/components/sites/SiteFormNew";
import SiteToolbar from "@/components/sites/SiteToolbar";
import SiteAccordion from "@/components/sites/SiteAccordion";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

interface Site {
    id: string;
    name: string;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    postcode?: string | null;
    gm_user_id?: string | null;
    region?: string | null;
    status?: string | null;
    company_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    profiles?: {
      id: string;
      full_name: string | null;
      phone_number: string | null;
      email: string | null;
    } | null;
  }

export default function OrganizationSitesPage() {
  const { profile, loading: ctxLoading } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [gmList, setGmList] = useState<Array<{id: string, full_name: string, email: string, role?: string, position_title?: string, site_id?: string, company_id: string}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      setUserId(userRes?.user?.id || null);
    })();
  }, []);

  const fetchSites = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const [siteRes, gmRes] = await Promise.all([
        supabase
          .from("sites")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email, app_role, position_title, site_id, company_id")
          .eq("company_id", profile.company_id)
          .or("position_title.ilike.%manager%,role.ilike.%manager%")
      ]);

      if (siteRes.error) throw siteRes.error;
      if (gmRes.error) throw gmRes.error;

      setSites(siteRes.data as Site[]);
      setGmList(gmRes.data || []);
    } catch (err: any) {
      console.error("Error fetching sites or GMs:", err);
      setError("Failed to load sites or managers");
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (!profile?.company_id) return;
    fetchSites();
  }, [profile?.company_id, ctxLoading, fetchSites]);

  useEffect(() => {
    if (!ctxLoading && !profile?.company_id) {
      setLoading(false);
      setError("No company context detected. Please sign in or complete setup.");
    }
  }, [ctxLoading, profile?.company_id]);

  const handleSaved = async () => {
    setShowAddModal(false);
    setEditing(null);
    await fetchSites();
  };

  // Debug logs
  console.log("Sites:", sites);
  console.log("GM List:", gmList);

  return (
    <OrgContentWrapper
      title="Sites"
      actions={
        <SiteToolbar 
          inline 
          sites={sites} 
          companyId={profile?.company_id || ""} 
          onRefresh={fetchSites} 
          showBack={false}
          onAddSite={() => setShowAddModal(true)}
        />
      }
    >
      {error && (
        <div className="rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {ctxLoading || loading ? (
        <div className="text-slate-400">Loading sites…</div>
      ) : sites.length === 0 ? (
        <p className="text-gray-400">No sites yet. Add one to get started.</p>
      ) : (
        <SiteAccordion sites={sites} gmList={gmList} onRefresh={fetchSites} />
      )}

      {/* Add Site Modal - rendered at page level for proper centering */}
      {showAddModal && (
        <SiteFormNew
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={handleSaved}
          initial={editing || null}
          companyId={profile?.company_id || ""}
          gmList={gmList}
        />
      )}
    </OrgContentWrapper>
  );
}