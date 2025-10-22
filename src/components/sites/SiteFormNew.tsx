"use client";

console.log("⚙️ RENDERING SiteFormNew (expected)");

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import SiteFormBase from "./SiteFormBase";

type SiteFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: any;
  companyId: string;
  gmList?: Array<{id: string, full_name: string, email: string, role?: string | null, position_title?: string | null, company_id?: string | null, site_id?: string | null, phone?: string | null}>;
};

export default function SiteFormNew({ open, onClose, onSaved, initial, companyId, gmList }: SiteFormProps) {
  console.log("🔥 SITEFORMNEW - Component called with props:", { open, companyId, initial });
  
  const [gmListState, setGmListState] = useState<Array<{id: any; full_name: any; email: any; phone: any; home_site: any; position_title: any;}>>([]);

  useEffect(() => {
    if (!open || !companyId) return;

    const loadGMList = async () => {
      console.log("GM fetch triggered, companyId:", companyId);
      const { data, error } = await supabase
        .from("gm_index")
        .select("id, full_name, email, phone, home_site, position_title")
        .eq("company_id", companyId);

      if (error) console.error("GM fetch error:", error);
      else {
        console.log("GM list loaded:", data?.length, "data:", data);
        setGmListState(data || []);
      }
    };

    loadGMList();
  }, [open, companyId]);

  console.log("🔥 SITEFORMNEW - gmListState current:", gmListState);
  
  if (!open) {
    console.log("🔥 SITEFORMNEW - Not rendering because open=false");
    return null;
  }

  console.log("🔥 SITEFORMNEW - Rendering SiteFormBase because open=true");

  return (
    <SiteFormBase
      mode="new"
      initialData={initial}
      onClose={onClose}
      onSaved={onSaved}
      companyId={companyId}
      gmList={gmListState}
    />
  );
}
