"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";

type Site = {
  id?: string;
  name: string;
  nickname?: string;
  address?: string;
  active: boolean;
  company_id?: string;
};

type SiteFormProps = {
  site?: Site | null;
  companyId: string;
  onSaved: () => void;
  onCancel: () => void;
};

export default function SiteForm({ site, companyId, onSaved, onCancel }: SiteFormProps) {
  const [name, setName] = useState(site?.name || "");
  const [nickname, setNickname] = useState(site?.nickname || "");
  const [address, setAddress] = useState(site?.address || "");
  const [active, setActive] = useState<boolean>(site?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill nickname from name if nickname is blank
  useEffect(() => {
    if (!nickname || nickname.trim() === "") {
      setNickname(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      if (site?.id) {
        const { error: uErr } = await supabase
          .from("sites")
          .update({ name, nickname: nickname || name, address, active })
          .eq("id", site.id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase
          .from("sites")
          .insert({ name, nickname: nickname || name, address, active, company_id: companyId });
        if (iErr) throw iErr;
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save site");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-200 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Street Branch" />
        </div>
        <div>
          <label className="block text-sm text-slate-200 mb-1">Nickname</label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Main Street" />
        </div>
        <div>
          <label className="block text-sm text-slate-200 mb-1">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
        </div>
        <div>
          <Switch checked={active} onChange={setActive} label="Active" />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={"px-4 py-2 rounded-md text-white border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-lg"}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className={"px-4 py-2 rounded-md text-slate-200 border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-lg"}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}