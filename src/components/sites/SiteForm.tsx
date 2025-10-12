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
    // NEW: operating schedule + closures to match expanded view
    days_open: {
      monday: { open: false, from: "", to: "" },
      tuesday: { open: false, from: "", to: "" },
      wednesday: { open: false, from: "", to: "" },
      thursday: { open: false, from: "", to: "" },
      friday: { open: false, from: "", to: "" },
      saturday: { open: false, from: "", to: "" },
      sunday: { open: false, from: "", to: "" },
    },
    yearly_closures: [] as any[],
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
        // NEW: hydrate from existing record if present
        days_open: initial.days_open || {
          monday: { open: false, from: "", to: "" },
          tuesday: { open: false, from: "", to: "" },
          wednesday: { open: false, from: "", to: "" },
          thursday: { open: false, from: "", to: "" },
          friday: { open: false, from: "", to: "" },
          saturday: { open: false, from: "", to: "" },
          sunday: { open: false, from: "", to: "" },
        },
        yearly_closures: Array.isArray(initial.yearly_closures)
          ? initial.yearly_closures
          : (() => { try { return JSON.parse(initial.yearly_closures || "[]"); } catch { return []; } })(),
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

          {/* Operating schedule (per-day) */}
          <div className="space-y-3 border-t border-white/[0.08] pt-4 mt-2">
            <h3 className="text-sm font-semibold text-white">Operating Schedule (per-day)</h3>
            {([
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ] as const).map((day) => {
              const label: Record<typeof day, string> = {
                monday: "Monday",
                tuesday: "Tuesday",
                wednesday: "Wednesday",
                thursday: "Thursday",
                friday: "Friday",
                saturday: "Saturday",
                sunday: "Sunday",
              } as any;
              const val = (form.days_open as any)[day] || { open: false, from: "", to: "" };
              const fromHM = splitHM(val.from);
              const toHM = splitHM(val.to);
              const disabled = !val.open;
              return (
                <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(val.open)}
                      onChange={(e) => {
                        const next = { ...(form.days_open as any) };
                        next[day] = { ...val, open: e.target.checked };
                        setForm({ ...form, days_open: next });
                      }}
                    />
                    <span className="text-sm text-slate-300">Open on {label[day]}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">From</span>
                    <select
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-2 py-2 text-white"
                      value={fromHM.h}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = { ...(form.days_open as any) };
                        const h = e.target.value;
                        const m = fromHM.m || "00";
                        next[day] = { ...val, from: `${h}:${m}` };
                        setForm({ ...form, days_open: next });
                      }}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-2 py-2 text-white"
                      value={fromHM.m}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = { ...(form.days_open as any) };
                        const h = fromHM.h || "00";
                        const m = e.target.value;
                        next[day] = { ...val, from: `${h}:${m}` };
                        setForm({ ...form, days_open: next });
                      }}
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">To</span>
                    <select
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-2 py-2 text-white"
                      value={toHM.h}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = { ...(form.days_open as any) };
                        const h = e.target.value;
                        const m = toHM.m || "00";
                        next[day] = { ...val, to: `${h}:${m}` };
                        setForm({ ...form, days_open: next });
                      }}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-2 py-2 text-white"
                      value={toHM.m}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = { ...(form.days_open as any) };
                        const h = toHM.h || "00";
                        const m = e.target.value;
                        next[day] = { ...val, to: `${h}:${m}` };
                        setForm({ ...form, days_open: next });
                      }}
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Yearly closures */}
          <div className="space-y-3 border-t border-white/[0.08] pt-4">
            <h3 className="text-sm font-semibold text-white">Yearly Closures</h3>
            <div className="space-y-2">
              {(form.yearly_closures as any[]).map((c, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-300">Closure Date</span>
                    <input
                      type="date"
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                      value={(c?.date as string) || ""}
                      onChange={(e) => {
                        const next = [...(form.yearly_closures as any[])];
                        next[idx] = { ...c, date: e.target.value };
                        setForm({ ...form, yearly_closures: next });
                      }}
                    />
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-sm text-slate-300">Reason</span>
                    <input
                      className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
                      value={(c?.reason as string) || ""}
                      onChange={(e) => {
                        const next = [...(form.yearly_closures as any[])];
                        next[idx] = { ...c, reason: e.target.value };
                        setForm({ ...form, yearly_closures: next });
                      }}
                    />
                  </label>
                  <div>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm hover:bg-white/[0.14]"
                      onClick={() => {
                        const next = [...(form.yearly_closures as any[])];
                        next.splice(idx, 1);
                        setForm({ ...form, yearly_closures: next });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-white/[0.08] border border-white/[0.12] text-white text-sm hover:bg-white/[0.14]"
                onClick={() => setForm({ ...form, yearly_closures: ([...((form.yearly_closures as any[]) || []), { date: "", reason: "" }]) })}
              >
                Add Closure
              </button>
            </div>
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

// Helpers used by schedule UI (matching expanded view behavior)
const splitHM = (val?: string) => {
  const [h, m] = (val || "").split(":");
  return { h: h || "", m: m || "" };
};
const roundToQuarter = (value: string) => {
  if (!value) return value;
  const [hhStr, mmStr] = value.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  let rounded = Math.round(mm / 15) * 15;
  let newHour = hh;
  if (rounded === 60) { newHour = (hh + 1) % 24; rounded = 0; }
  const h = String(newHour).padStart(2, "0");
  const m = String(rounded).padStart(2, "0");
  return `${h}:${m}`;
};
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];