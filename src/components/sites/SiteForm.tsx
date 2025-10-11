"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: any | null;
  companyId: string;
  userId?: string;
};

const SITE_TYPES = ["Production", "Retail", "Kiosk", "Warehouse", "Office"] as const;
const COUNTRIES = ["United Kingdom", "United States", "France", "Germany", "Italy", "Spain", "Australia"] as const;

export default function SiteForm({ open, onClose, onSaved, initial, companyId, userId }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    site_code: "",
    site_type: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    region: "",
    floor_area: undefined as number | undefined,
    opening_date: "",
    status: "active",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        site_code: initial.site_code || "",
        site_type: initial.site_type || "",
        address_line1: initial.address_line1 || "",
        address_line2: initial.address_line2 || "",
        city: initial.city || "",
        postcode: initial.postcode || "",
        country: initial.country || "United Kingdom",
        contact_name: initial.contact_name || "",
        contact_email: initial.contact_email || "",
        contact_phone: initial.contact_phone || "",
        region: initial.region || "",
        floor_area: initial.floor_area ?? undefined,
        opening_date: initial.opening_date || "",
        status: initial.status || "active",
      });
    } else {
      setForm((prev: any) => ({ ...prev, status: "active" }));
    }
  }, [initial]);

  const isEdit = useMemo(() => Boolean(initial?.id), [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
    const payload = {
      ...form,
      company_id: companyId,
      created_by: userId || null,
    };

    let error: any = null;
    if (isEdit) {
      const { error: err } = await supabase
        .from("sites")
        .update(payload)
        .eq("id", initial.id)
        .eq("company_id", companyId)
        .select(); // array-based to avoid single-row errors under RLS
      error = err;
    } else {
      const { error: err } = await supabase
        .from("sites")
        .insert(payload)
        .select(); // array-based; representation may be empty if RLS restricts select
      error = err;
    }

    if (error) {
      showToast({ title: "Save failed", description: error.message || "Unable to save site", type: "error" });
      setSaving(false);
      return;
    }
    showToast({ title: "Saved successfully", description: "Site details have been saved.", type: "success" });
    setSaving(false);
    onSaved();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#14161d] border border-white/[0.12] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{isEdit ? "Edit Site" : "Add Site"}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-sm">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Name</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Site Code</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.site_code}
                onChange={(e) => setForm({ ...form, site_code: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Type</span>
              <select
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.site_type}
                onChange={(e) => setForm({ ...form, site_type: e.target.value })}
              >
                <option value="">Select type</option>
                {SITE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Region</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">City</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Postcode</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm text-slate-300">Address Line 1</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm text-slate-300">Address Line 2</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Country</span>
              <select
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Opening Date</span>
              <input
                type="date"
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.opening_date || ""}
                onChange={(e) => setForm({ ...form, opening_date: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Floor Area (m²)</span>
              <input
                type="number"
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.floor_area ?? ""}
                onChange={(e) => setForm({ ...form, floor_area: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Status</span>
              <select
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Contact Name</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Contact Email</span>
              <input
                type="email"
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Contact Phone</span>
              <input
                className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm hover:bg-white/[0.14]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-white/[0.12] border border-white/[0.2] text-white text-sm hover:bg-white/[0.16]"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Site"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}