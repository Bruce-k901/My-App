"use client";

import { useState } from "react";

type Contractor = {
  id: string;
  name: string;
  category: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  ooh?: string;
  hourly_rate?: number;
  callout_fee?: number;
  notes?: string;
};

export default function ContractorCard({
  contractor,
  onEdit,
}: {
  contractor: Contractor;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-controls={`contractor-details-${contractor.id}`}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(!open);
        }
      }}
      className="rounded-xl bg-slate-900 border border-slate-800 p-4 transition-colors hover:bg-slate-900/95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold">{contractor.name}</div>
          <div className="text-slate-400 text-sm">{contractor.category || "—"}</div>
        </div>
        <span
          aria-hidden
          className={`text-slate-400 ml-3 transform transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </div>

      <div
        id={`contractor-details-${contractor.id}`}
        aria-hidden={!open}
        className={`mt-3 space-y-2 text-sm overflow-hidden transition-all duration-300 ease-in-out ${open ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0 pointer-events-none"}`}
      >
          <div className="flex justify-end">
            <button
              className="px-3 py-1 rounded bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
            >
              Edit
            </button>
          </div>

          <Field label="Contact" value={contractor.contact_name} />
          <LinkField label="Email" value={contractor.email} type="email" />
          <LinkField label="Phone" value={contractor.phone} type="phone" />
          <LinkField label="OOH Contact" value={contractor.ooh} type="phone" />
          <Field label="Hourly Rate" value={formatMoney(contractor.hourly_rate)} />
          <Field label="Callout Fee" value={formatMoney(contractor.callout_fee)} />
          {contractor.notes && <Field label="Notes" value={contractor.notes} />}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="text-white">{value ?? "—"}</p>
    </div>
  );
}

function LinkField({ label, value, type }: { label: string; value?: string | null; type: "email" | "phone" }) {
  const trimmed = (value || "").trim();
  const href = type === "email" ? `mailto:${trimmed}` : `tel:${trimmed}`;
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      {trimmed ? (
        <a
          href={href}
          className="text-pink-300 hover:text-pink-200 underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 rounded-sm"
        >
          {trimmed}
        </a>
      ) : (
        <p className="text-white">—</p>
      )}
    </div>
  );
}

function formatMoney(n?: number) {
  if (typeof n !== "number" || isNaN(n)) return "—";
  return `£${n.toFixed(2)}`;
}

// ✅ Purpose:
// Displays all the real fields your DB has.
// Edit button opens the modal pre-filled.
// No phantom “region/specialty” nonsense.