"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import SiteFormNew from "@/components/sites/SiteFormNew";
import SiteToolbar from "@/components/sites/SiteToolbar";
import SiteCard from "@/components/sites/SiteCard";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";

interface Site {
  id: string;
  name: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  gm_user_id?: string | null;
  gm_name?: string | null;
  gm_phone?: string | null;
  gm_email?: string | null;
  region?: string | null;
  status?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export default function OrganizationSitesPage() {
  // === ALL HOOKS MUST BE CALLED UNCONDITIONALLY ===
  
  // 1. Context hooks
  const { loading: ctxLoading, profile } = useAppContext();
  
  // 2. State hooks
  const [sites, setSites] = useState<Site[]>([]);
  const [gmList, setGmList] = useState<Array<{id: string, full_name: string, email: string, phone?: string | null}>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Site | null>(null);
  const [activeSite, setActiveSite] = useState<Site | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 3. Effect hooks - MUST BE CALLED EVERY RENDER
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      setUserId(userRes?.user?.id || null);
    })();
  }, []);

  const fetchGMList = useCallback(async () => {
    if (!profile?.company_id) return;

    try {
      // Fetch all GMs for the company from profiles table
      const { data: gmsData, error: gmsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number")
        .eq("company_id", profile.company_id)
        .eq("app_role", "Manager")
        .order("full_name");

      if (gmsError) {
        console.error("Error fetching GM list:", gmsError);
        return;
      }

      // Transform the data to match expected format
      const transformedGMs = (gmsData || []).map(gm => ({
        id: gm.id,
        full_name: gm.full_name,
        email: gm.email,
        phone: gm.phone_number
      }));

      setGmList(transformedGMs);
    } catch (err: any) {
      console.error("Error in fetchGMList:", err);
    }
  }, [profile?.company_id]);

  const fetchSites = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      // First, fetch sites with planned closures (no GM profile join)
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select(`
          id,
          name,
          address_line1,
          address_line2,
          city,
          postcode,
          gm_user_id,
          region,
          status,
          company_id,
          created_at,
          updated_at,
          operating_schedule,
          planned_closures:site_closures (
            id,
            is_active,
            closure_start,
            closure_end,
            notes
          )
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (sitesError) {
        console.error("Error fetching sites:", sitesError);
        const errorMessage = sitesError.message || sitesError.code || "Failed to load sites";
        setError(`Failed to load sites: ${errorMessage}`);
        setSites([]);
        setLoading(false);
        return;
      }
      
      // Ensure we have data
      if (!sitesData) {
        console.warn("No sites data returned");
        setSites([]);
        setLoading(false);
        return;
      }

      // Then fetch GM data separately from gm_index
      const gmIds = sitesData?.map(s => s.gm_user_id).filter(Boolean) || [];
      let gmMap = new Map();

      if (gmIds.length > 0) {
        const { data: gmsData, error: gmsError } = await supabase
          .from("gm_index")
          .select("id, full_name, email, phone")
          .in("id", gmIds);

        if (!gmsError && gmsData) {
          console.log("GM data fetched from gm_index:", gmsData);
          gmMap = new Map(gmsData.map(g => [g.id, g]));
        } else {
          console.log("No GM data found or error:", gmsError);
        }
      }

      // Enrich sites with GM data
      const enrichedSites = sitesData?.map(site => {
        const gmProfile = gmMap.get(site.gm_user_id) || null;
        console.log(`Site ${site.name} (${site.id}): gm_user_id=${site.gm_user_id}, gm_profile=`, gmProfile);
        return {
          ...site,
          gm_profile: gmProfile,
        };
      }) || [];

      setSites(enrichedSites);
      setLoading(false);
    } catch (err: any) {
      console.error("Error in fetchSites:", err);
      const errorMessage = err?.message || err?.code || "Failed to load sites";
      setError(`Failed to load sites: ${errorMessage}`);
      setSites([]);
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchSites();
    fetchGMList();
  }, [fetchSites, fetchGMList]);

  useEffect(() => {
    if (!ctxLoading && !profile?.company_id) {
      setLoading(false);
      setError("No company context detected. Please sign in or complete setup.");
    }
  }, [ctxLoading, profile?.company_id]);

  // Early returns ONLY AFTER all hooks
  if (ctxLoading) {
    console.log('Context loading:', ctxLoading, 'Profile:', profile);
    return <div className="text-slate-400">Loading context...</div>;
  }

  const handleSaved = async () => {
    setFormOpen(false);
    setEditing(null);
    await fetchSites();
    await fetchGMList();
  };

  // Filter sites based on search term
  const filteredSites = sites.filter(site => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      site.name?.toLowerCase().includes(searchLower) ||
      site.address_line1?.toLowerCase().includes(searchLower) ||
      site.city?.toLowerCase().includes(searchLower) ||
      site.postcode?.toLowerCase().includes(searchLower) ||
      site.gm_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <EntityPageLayout
      title="Sites"
      onSearch={setSearchTerm}
      searchPlaceholder="Search sites..."
      customActions={
        <SiteToolbar 
          inline 
          sites={sites} 
          companyId={profile?.company_id || ""} 
          onRefresh={fetchSites} 
          showBack={false}
          onAddSite={() => setFormOpen(true)}
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
      ) : filteredSites.length === 0 ? (
        searchTerm ? (
          <p className="text-gray-400">No sites found matching "{searchTerm}".</p>
        ) : (
          <p className="text-gray-400">No sites yet. Add one to get started.</p>
        )
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredSites.map((site) => (
            <SiteCard 
              key={site.id} 
              site={site} 
              onEdit={(site) => setActiveSite(site as Site)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <SiteFormNew
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          initial={editing || null}
          companyId={profile?.company_id || ""}
          gmList={gmList}
        />
      )}

      {activeSite && (
        <SiteFormNew
          open={true}
          initial={activeSite}
          onClose={() => setActiveSite(null)}
          onSaved={() => {
            setActiveSite(null);
            fetchSites();
            fetchGMList();
          }}
          companyId={profile?.company_id || ""}
          gmList={gmList}
        />
      )}
    </EntityPageLayout>
  );
}