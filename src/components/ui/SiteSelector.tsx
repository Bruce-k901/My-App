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
  onChange: (siteId: string | null) => void;
  placeholder?: string;
  className?: string;
};

export default function SiteSelector({ 
  value, 
  onChange, 
  placeholder = "All Sites",
  className = ""
}: SiteSelectorProps) {
  const { profile } = useAppContext();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSites = async () => {
      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name");

        if (!error && data) {
          setSites(data);
        }
      } catch (error) {
        console.error("Error loading sites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, [profile?.company_id]);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={`
        h-11 px-3 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white
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