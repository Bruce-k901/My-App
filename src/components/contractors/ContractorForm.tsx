"use client";

import React from "react";

export type ContractorFormValue = {
  category?: string;
  name: string;
  email?: string;
  phone?: string;
  ooh?: string;
  sites: string[];
  hourly_rate?: string | number;
  callout_fee?: string | number;
  notes?: string;
};

type Props = {
  value: ContractorFormValue;
  onChange: (next: ContractorFormValue) => void;
  sites?: string[];
};

export default function ContractorForm({ value, onChange, sites = [] }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Field label="Category" required>
        <input
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.category || ""}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        />
      </Field>
      <Field label="Name" required>
        <input
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.email || ""}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <input
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.phone || ""}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </Field>
      <Field label="OOH contact">
        <input
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.ooh || ""}
          onChange={(e) => onChange({ ...value, ooh: e.target.value })}
        />
      </Field>
  <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-300">Sites serviced</span>
        <div className="flex flex-wrap gap-2">
          {sites.map((s) => {
            const active = value.sites.includes(s);
            const base = "px-3 py-1.5 rounded-full text-xs border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50";
            const onClasses = "bg-white/[0.12] border-white/[0.2] text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.25)]";
            const offClasses = "bg-white/[0.06] border-white/[0.1] text-white/90 hover:bg-white/[0.1]";
            return (
              <button
                key={s}
                type="button"
                className={`${base} ${active ? onClasses : offClasses}`}
                onClick={() => {
                  const next = new Set(value.sites);
                  if (active) next.delete(s); else next.add(s);
                  onChange({ ...value, sites: Array.from(next) });
                }}
                aria-pressed={active}
                aria-label={`Toggle services for ${s}`}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const nextEl = (e.currentTarget.nextElementSibling as HTMLElement | null);
                    nextEl?.focus();
                  } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prevEl = (e.currentTarget.previousElementSibling as HTMLElement | null);
                    prevEl?.focus();
                  }
                  // Space/Enter naturally trigger onClick on buttons; no need to handle here.
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">Toggle to enable services per site.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Hourly rate (£)">
          <input
            type="number"
            step="0.01"
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={String(value.hourly_rate || "")}
            onChange={(e) => onChange({ ...value, hourly_rate: e.target.value })}
          />
        </Field>
        <Field label="Callout fee (£)">
          <input
            type="number"
            step="0.01"
            className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
            value={String(value.callout_fee || "")}
            onChange={(e) => onChange({ ...value, callout_fee: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          rows={3}
          className="bg-white/[0.06] border border-white/[0.1] rounded px-3 py-2 text-white"
          value={value.notes || ""}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-300">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}