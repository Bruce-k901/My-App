'use client';

import { useState } from 'react';
import { Phone, Mail, Pencil } from 'lucide-react';
import EntityCard from '@/components/ui/EntityCard';
import CardHeader from '@/components/ui/CardHeader';
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
  ooh_phone?: string;
  hourly_rate?: number;
  callout_fee?: number;
  notes?: string;
  site_names?: string[];
  site_count?: number;
  postcode?: string;
  region?: string;
  website?: string;
};

export default function ContractorCard({
  contractor,
  onEdit,
}: {
  contractor: Contractor;
  onEdit?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCard = () => setIsOpen((prev) => !prev);

  // Create subtitle for line 2: Region (left) + Email/Phone (right)
  const createSubtitle = () => {
    const leftSide = contractor.region || "—";
    const rightSide = [contractor.email, contractor.phone].filter(Boolean).join(" • ");
    return rightSide ? `${leftSide} • ${rightSide}` : leftSide;
  };

  return (
    <EntityCard
      title={
        <CardHeader
          title={contractor.name}
          subtitle={createSubtitle()}
          showChevron={false}
          onToggle={toggleCard}
          expanded={isOpen}
        />
      }
      onHeaderClick={toggleCard}
      rightActions={
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          {/* Category name (faded) */}
          <span className="text-sm text-gray-400 mr-2">
            {contractor.category || "—"}
          </span>
          <CardChevron 
            isOpen={isOpen} 
            onToggle={toggleCard}
          />
        </div>
      }
    >
      {isOpen && (
        <div className="mt-3 text-sm text-gray-300 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* column 1 */}
            <div className="space-y-3">
              <Field label="Category" value={contractor.category} />
              <LinkField label="Email" value={contractor.email} type="email" />
              <LinkField label="Phone" value={contractor.phone} type="phone" />
              <LinkField label="OOH Contact" value={contractor.ooh_phone} type="phone" showPlaceholder={true} />
              <Field label="Website" value={contractor.website} />
              {contractor.notes && (
                <div>
                  <p className="text-slate-400 text-sm">Notes</p>
                  <p className="text-white text-sm line-clamp-3">{contractor.notes}</p>
                </div>
              )}
            </div>

            {/* column 2 */}
            <div className="space-y-3">
              <Field label="Postcode" value={contractor.postcode} />
              <Field
                label="Region Covered"
                value={contractor.region}
              />
              <Field label="Hourly Rate" value={formatMoney(contractor.hourly_rate)} />
              <Field label="Callout Fee" value={formatMoney(contractor.callout_fee)} />
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
                <div className="mt-1 flex flex-wrap gap-1">
                  {contractor.site_names.map((siteName, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-200"
                    >
                      {siteName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit button in expanded view */}
          <div className="mt-4 pt-3 border-t border-white/[0.1] flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="
                p-2 rounded
                border border-pink-500 text-pink-500
                hover:shadow-[0_0_6px_#ec4899]
                transition
              "
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}
    </EntityCard>
  );
}

// Helper components
function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-white text-sm">{value}</p>
    </div>
  );
}

function LinkField({ label, value, type, showPlaceholder = false }: { label: string; value?: string | null; type: 'email' | 'phone'; showPlaceholder?: boolean }) {
  const icon = type === 'email' ? <Mail size={14} /> : <Phone size={14} />;
  
  if (!value) {
    if (!showPlaceholder) return null;
    return (
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <div className="text-gray-500 text-sm italic flex items-center gap-2">
          {icon}
          Not provided
        </div>
      </div>
    );
  }
  
  const href = type === 'email' ? `mailto:${value}` : `tel:${value}`;
  
  return (
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <a 
        href={href}
        className="text-white text-sm hover:text-pink-400 transition flex items-center gap-2"
      >
        {icon}
        {value}
      </a>
    </div>
  );
}

function formatMoney(amount?: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return `£${amount.toFixed(2)}`;
}
