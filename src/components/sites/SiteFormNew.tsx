"use client";

import SiteFormBase from "./SiteFormBase";

type SiteFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: any;
  companyId: string;
  gmList?: Array<{id: string, full_name: string, email: string, phone?: string | null}>;
};

export default function SiteFormNew({ open, onClose, onSaved, initial, companyId, gmList }: SiteFormProps) {
  if (!open) return null;

  return (
    <SiteFormBase
      mode={initial ? "edit" : "new"}
      initialData={initial}
      onClose={onClose}
      onSaved={onSaved}
      companyId={companyId}
      gmList={gmList}
    />
  );
}
