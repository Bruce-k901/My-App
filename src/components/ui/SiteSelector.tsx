"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

type Site = {
  id: string;
  name: string;
};

type SiteSelectorProps = {
  value?: string | null;
  onChange?: (siteId: string | null) => void;
  placeholder?: string;
  className?: string;
  onSitesLoaded?: () => void;
  useGlobalContext?: boolean; // If true, uses AppContext's selectedSiteId and setSelectedSite
};

export default function SiteSelector({ 
  value, 
  onChange, 
  placeholder = "All Sites",
  className = "",
  onSitesLoaded,
  useGlobalContext = false
}: SiteSelectorProps) {
  const { profile, selectedSiteId, setSelectedSite, siteId: contextSiteId, company, companyId } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Use global context if enabled
  const effectiveValue = useGlobalContext ? (selectedSiteId || contextSiteId) : value;
  const effectiveOnChange = useGlobalContext 
    ? (siteId: string | null) => {
        setSelectedSite(siteId);
        if (onChange) onChange(siteId);
      }
    : onChange || (() => {});

  useEffect(() => {
    const loadSites = async () => {
      // Use selected company if available, otherwise fall back to profile.company_id
      const effectiveCompanyId = company?.id || companyId || profile?.company_id;
      
      if (!effectiveCompanyId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", effectiveCompanyId)
          .order("name");

        if (!error && data) {
          setSites(data);
          console.log('🏢 [SiteSelector] Sites loaded:', data.length, 'sites for company', effectiveCompanyId);
          if (onSitesLoaded) {
            onSitesLoaded();
          }
        } else if (error) {
          console.error("Error loading sites:", error);
        }
      } catch (error) {
        console.error("Error loading sites:", error);
      } finally {
        setLoading(false);
        // Call onSitesLoaded even if there was an error, so the parent knows loading is complete
        if (onSitesLoaded) {
          onSitesLoaded();
        }
      }
    };

    loadSites();
  }, [company?.id, companyId, profile?.company_id]);

  return (
    <select
      value={effectiveValue || ""}
      onChange={(e) => effectiveOnChange(e.target.value || null)}
      className={`
        h-10 px-3 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white
        focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50
        hover:bg-white/[0.08] transition-colors
        ${className}
      `}
      disabled={loading}
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {sites.map((site) => (
        <option key={site.id} value={site.id} className="bg-gray-800 text-white">
          {site.name}
        </option>
      ))}
    </select>
  );
}