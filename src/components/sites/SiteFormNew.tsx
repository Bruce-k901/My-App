"use client";

console.log("⚙️ RENDERING SiteFormNew (expected)");

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
  console.log("🔥 SITEFORMNEW - gmList received:", gmList?.length, gmList);
  
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
      gmList={gmList}
    />
  );
}
