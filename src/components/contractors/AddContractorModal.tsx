"use client";

import { useEffect, useState } from "react";
import ContractorForm, { ContractorFormValue } from "./ContractorForm";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (c: any) => void;
  sites?: string[];
  initial?: (Partial<ContractorFormValue> & { id?: string });
};

export default function AddContractorModal({ open, onClose, onSaved, sites = [], initial }: Props) {
  const [form, setForm] = useState<ContractorFormValue>({
    category: "",
    name: "",
    email: "",
    phone: "",
    ooh: "",
    sites: [],
    hourly_rate: "",
    callout_fee: "",
    notes: "",
  });
  const { companyId } = useAppContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        category: initial?.category || prev.category || "",
        name: initial?.name || prev.name || "",
        email: initial?.email || prev.email || "",
        phone: initial?.phone || prev.phone || "",
        ooh: initial?.ooh || prev.ooh || "",
        sites: initial?.sites || prev.sites || [],
        hourly_rate: initial?.hourly_rate ?? prev.hourly_rate ?? "",
        callout_fee: initial?.callout_fee ?? prev.callout_fee ?? "",
        notes: initial?.notes || prev.notes || "",
      }));
    } else {
      setForm({
        category: "",
        name: "",
        email: "",
        phone: "",
        ooh: "",
        sites: [],
        hourly_rate: "",
        callout_fee: "",
        notes: "",
      });
    }
  }, [open, initial]);

  if (!open) return null;

  const save = async () => {
    setError(null);
    const name = (form.name || "").trim();
    const category = (form.category || "").trim();
    if (!name || !category) {
      setError("Category and Name are required.");
      return;
    }
    if (!companyId) {
      setError("Missing company context.");
      return;
    }

    try {
      const payload = {
        id: initial?.id,
        contractor_name: name,
        category,
        contact_name: (form as any).contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        emergency_phone: form.ooh || null,
        notes: form.notes || null,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
        callout_fee: form.callout_fee ? Number(form.callout_fee) : null,
        company_id: companyId,
      } as any;

      const { error: upsertErr } = await supabase
        .from("maintenance_contractors")
        .upsert(payload)
        .select("*");
      if (upsertErr) throw upsertErr;

      onSaved?.(payload);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save contractor");
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">{initial ? "Edit Contractor" : "Add Contractor"}</h2>
          <button className="text-slate-300 hover:text-white" onClick={onClose}>×</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <ContractorForm value={form} onChange={setForm} sites={sites} />
        </div>
        <div className="mt-4 sticky bottom-0 bg-slate-900 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400">
            {!form.name.trim() || !((form.category || "").trim()) ? "Enter Category and Name to enable save." : null}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] text-sm" onClick={onClose}>Cancel</button>
            <button
              className="px-3 py-1.5 rounded bg-pink-500/20 border border-pink-500/40 text-pink-300 hover:bg-pink-500/30 text-sm"
              onClick={save}
              disabled={!form.name.trim() || !((form.category || "").trim())}
            >
              Save & Close
            </button>
          </div>
        </div>
        {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
      </div>
    </div>
  );
}