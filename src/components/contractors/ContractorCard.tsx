'use client';

import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import EntityCard from '@/components/ui/EntityCard';
import CardChevron from '@/components/ui/CardChevron';

type Contractor = {
  id: string;
  name: string;
  category?: string;
  category_name?: string;
  category_id?: string | null;
  contact_name?: string;
  email?: string;
  phone?: string;
  ooh?: string;
  hourly_rate?: number;
  callout_fee?: number;
  notes?: string;
  site_names?: string[];
  site_count?: number;
  postcode?: string;
  region?: string;
};

export default function ContractorCard({
  contractor,
  onEdit,
}: {
  contractor: Contractor;
  onEdit?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const subtitle = [
    contractor.category_name,
    contractor.phone,
    contractor.email,
    contractor.postcode
  ].filter(Boolean).join(" • ");

  return (
    <EntityCard
      title={
        <div>
          <div className="text-lg font-semibold">{contractor.name}</div>
          <div className="text-sm text-gray-400">{subtitle}</div>
        </div>
      }
      rightActions={
        <div className="flex items-center gap-2">
          <CardChevron isOpen={open} onToggle={() => setOpen(!open)} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="hidden md:inline-flex px-3 py-1.5 rounded-md border border-white/10 text-xs text-white/80 hover:bg-white/[0.08] transition"
          >
            Edit
          </button>
        </div>
      }
    >
        {open && (
          <div className="mt-3 text-sm text-gray-300 border-t border-white/[0.1] pt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* column 1 */}
            <div className="space-y-3">
              <Field label="Category" value={contractor.category_name} />
              <Field label="Postcode" value={contractor.postcode} />
              <Field
                label="Region Covered"
                value={contractor.region}
              />
              <LinkField label="Email" value={contractor.email} type="email" />
              <LinkField label="Phone" value={contractor.phone} type="phone" />
              <LinkField label="OOH Contact" value={contractor.ooh} type="phone" />
            </div>

            {/* column 2 */}
            <div className="space-y-3">
              <Field label="Hourly Rate" value={formatMoney(contractor.hourly_rate)} />
              <Field label="Callout Fee" value={formatMoney(contractor.callout_fee)} />
              {contractor.notes && (
                <div>
                  <p className="text-slate-400 text-sm">Notes</p>
                  <p className="text-white text-sm line-clamp-3">{contractor.notes}</p>
                </div>
              )}
            </div>

            {/* sites */}
            {Array.isArray(contractor.site_names) && contractor.site_names.length > 0 && (
              <div className="md:col-span-2">
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  Sites Serviced
                  {typeof contractor.site_count === 'number' && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-200">
                      {contractor.site_count} Sites
                    </span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {contractor.site_names.map((name, idx) => (
                    <span
                      key={`${name}-${idx}`}
                      className="px-2 py-0.5 text-xs rounded-full bg-white/[0.06] border border-white/[0.1] text-white/90"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* mobile edit */}
            <div className="flex justify-end mt-4 md:hidden md:col-span-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="px-3 py-1.5 rounded-md border border-white/10 text-xs text-white/80 hover:bg-white/[0.08] transition"
              >
                Edit
              </button>
            </div>
          </div>
        )}
    </EntityCard>
  );
}

/* helpers */

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-white text-sm">{value ?? '—'}</p>
    </div>
  );
}

function LinkField({
  label,
  value,
  type,
}: {
  label: string;
  value?: string | null;
  type: 'email' | 'phone';
}) {
  const trimmed = (value || '').trim();
  const href = type === 'email' ? `mailto:${trimmed}` : `tel:${trimmed}`;
  return (
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      {trimmed ? (
        <a
          href={href}
          className="text-pink-300 hover:text-pink-200 underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/50 rounded-sm text-sm"
        >
          {trimmed}
        </a>
      ) : (
        <p className="text-white text-sm">—</p>
      )}
    </div>
  );
}

function formatMoney(n?: number) {
  if (typeof n !== 'number' || isNaN(n)) return '—';
  return `£${n.toFixed(2)}`;
}
