"use client";

import { useEffect, useState, useCallback } from "react";
import EntityPageLayout from "@/components/layouts/EntityPageLayout";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import SiteToolbar from "@/components/sites/SiteToolbar";
import SiteAccordion from "@/components/sites/SiteAccordion";
import SiteFormNew from "@/components/sites/SiteFormNew";

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

export default function SitesPage() {
  const { profile, loading: ctxLoading } = useAppContext();
  const { showToast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [gmList, setGmList] = useState<Array<{id: string, full_name: string, email: string, phone?: string, home_site_id?: string, company_id?: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  console.log("🔥 SITES PAGE - showAddModal state:", showAddModal);
  console.log("🔍 DEBUG - profile:", profile);
  console.log("🔍 DEBUG - profile.company_id:", profile?.company_id);
  console.log("🔍 DEBUG - ctxLoading:", ctxLoading);
  
  const fetchSites = useCallback(async () => {
    console.log("🔍 DEBUG - fetchSites called with profile.company_id:", profile?.company_id);
    if (!profile?.company_id) {
      console.log("❌ DEBUG - No company_id found, returning early");
      return;
    }
    setLoading(true);
    setError(null);
    
    // Log the company_id values for comparison
    const queryCompanyId = profile.company_id;
    console.log('companyId in context:', profile?.company_id);
    console.log('companyId used in query:', queryCompanyId);
    
    // Fetch sites and GM list in parallel
    const [sitesResult, gmResult] = await Promise.all([
      supabase
        .from("sites")
        .select("*")
        .eq("company_id", queryCompanyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("gm_index")
        .select("id, full_name, email, phone, home_site_id, company_id")
        .eq("company_id", queryCompanyId)
        .order("full_name", { ascending: true })
    ]);
    
    // Add the exact logging requested
    console.log('sites data:', sitesResult.data, 'error:', sitesResult.error);
    
    if (sitesResult.error) {
      console.error("Error fetching sites:", sitesResult.error);
      setError("Failed to load sites");
      setSites([]);
    } else {
      setSites((sitesResult.data as Site[]) || []);
    }
    
    if (gmResult.error) {
      console.error("Error fetching GMs:", gmResult.error);
      showToast("Failed to load General Managers", "error");
      return;
    } else {
      // Map GM data from gm_index table
      const gmList = (gmResult.data || []).map((gm) => ({
        id: String(gm.id),
        full_name: gm.full_name,
        email: gm.email,
        phone: gm.phone,
        home_site_id: gm.home_site_id,
        company_id: gm.company_id,
      }));
      setGmList(gmList);
    }
    
    setLoading(false);
  }, [profile?.company_id]);

  useEffect(() => {
    console.log("🔍 DEBUG - useEffect triggered with:", { ctxLoading, profile });
    if (!ctxLoading && profile?.company_id) {
      console.log("✅ DEBUG - Calling fetchSites with company_id:", profile.company_id);
      fetchSites();
    } else if (!ctxLoading && !profile?.company_id) {
      console.log("❌ DEBUG - No company_id found. Profile:", profile);
      setLoading(false);
      setError("No company context detected. Please sign in or complete setup.");
    }
  }, [ctxLoading, profile?.company_id, fetchSites]);

  const q = query.toLowerCase().trim();
  const filteredSites = q
    ? sites.filter((s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q)
      )
    : sites;

  // Create handlers for upload/download that use SiteToolbar logic
  const handleDownload = () => {
    try {
      const fields = [
        "name",
        "address_line1",
        "address_line2",
        "city",
        "postcode",
        "gm_user_id",
        "region","status","days_open","opening_time_from",
        "opening_time_to","closing_time_from","closing_time_to"
      ];

      const rows = (filteredSites || []).map((site: any) => {
        const row: Record<string, any> = {};
        fields.forEach((field) => {
          row[field] = site[field] || "";
        });
        return row;
      });

      const csv = [
        fields.join(","),
        ...rows.map((row) => fields.map((f) => `"${(row[f] || "").toString().replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "sites.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleUpload = () => {
    // Create a file input element and trigger it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Handle CSV upload logic here - for now just log
      console.log("Upload file:", file.name);
    };
    input.click();
  };

  return (
    <EntityPageLayout
      title="Sites"
      searchPlaceholder="Search"
      onSearch={(v) => setQuery(v)}
      onAdd={() => {
        console.log("🔥 SITES PAGE - EntityPageLayout onAdd triggered");
        setShowAddModal(true);
      }}
      onDownload={handleDownload}
      onUpload={handleUpload}
    >

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Main content */}
      {ctxLoading || loading ? (
        <div className="text-slate-400">Loading sites…</div>
      ) : filteredSites.length === 0 ? (
        <p className="text-gray-400 p-6">No sites yet. Add one to get started.</p>
      ) : (
        <SiteAccordion sites={filteredSites} gmList={gmList} onRefresh={fetchSites} />
      )}

      {/* Add Site Modal - rendered at page level for proper centering */}
      {showAddModal && (
        <SiteFormNew
          open={showAddModal}
          onClose={() => {
            console.log("🔥 SITES PAGE - Modal onClose triggered");
            setShowAddModal(false);
          }}
          onSaved={() => {
            console.log("🔥 SITES PAGE - Modal onSaved triggered");
            setShowAddModal(false);
            fetchSites();
          }}
          initial={null}
          companyId={profile?.company_id || ""}
        />
      )}
    </EntityPageLayout>
  );
}
