"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SiteForm from "@/components/sites/SiteForm";
import SiteToolbar from "@/components/sites/SiteToolbar";
import SiteAccordion from "@/components/sites/SiteAccordion";
import OrgContentWrapper from "@/components/layouts/OrgContentWrapper";

type Site = {
  id?: string;
  company_id: string;
  name: string;
  site_code?: string | null;
  site_type?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  region?: string | null;
  floor_area?: number | null;
  opening_date?: string | null;
  status?: string | null;
  created_by?: string | null;
};

export default function OrganizationSitesPage() {
  const { profile, loading: ctxLoading } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
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
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching sites:", error);
      setError("Failed to load sites");
      setSites([]);
    } else {
      setSites((data as Site[]) || []);
    }
    setLoading(false);
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
    setFormOpen(false);
    setEditing(null);
    await fetchSites();
  };

  return (
    <OrgContentWrapper
      title="Sites"
      actions={
        <SiteToolbar inline sites={sites} companyId={profile?.company_id || ""} onRefresh={fetchSites} showBack={false} />
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
        <SiteAccordion sites={sites} onRefresh={fetchSites} />
      )}

      {formOpen && (
        <SiteForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          initial={editing || null}
          companyId={profile?.company_id || ""}
          userId={userId || undefined}
        />
      )}
    </OrgContentWrapper>
  );
}