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
  const { loading: authLoading, companyId } = useAppContext();
  
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
    if (!companyId) return;

    try {
      // Fetch all GMs for the company from profiles table
      const { data: gmsData, error: gmsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number")
        .eq("company_id", companyId)
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
  }, [companyId]);

  const fetchSites = useCallback(async () => {
    if (!companyId) return;
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
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (sitesError) {
        console.error("Error fetching sites:", sitesError);
        setError("Failed to load sites");
        setSites([]);
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
    } catch (err: any) {
      console.error("Error in fetchSites:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (authLoading) return;
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchSites();
    fetchGMList();
  }, [authLoading, companyId, fetchSites, fetchGMList]);

  useEffect(() => {
    if (!authLoading && !companyId) {
      setLoading(false);
    }
  }, [authLoading, companyId]);

  // Early returns ONLY AFTER all hooks
  if (authLoading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  if (!companyId) {
    return (
      <div className="p-8">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">
            Company Setup Required
          </h2>
          <p className="text-white/80 mb-4">
            Please complete your company setup to access this page.
          </p>
          <a 
            href="/dashboard/business" 
            className="inline-block px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
          >
            Complete Setup
          </a>
        </div>
      </div>
    );
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
          companyId={companyId || ""} 
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
        <div className="space-y-4">
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
          companyId={companyId || ""}
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
          companyId={companyId || ""}
          gmList={gmList}
        />
      )}
    </EntityPageLayout>
  );
}