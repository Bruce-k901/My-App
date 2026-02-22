"use client";

import { useState, memo } from "react";
import EntityCard from "@/components/ui/EntityCard";
import CardHeader from "@/components/ui/CardHeader";
import CardChevron from "@/components/ui/CardChevron";
import { Pencil, Mail, Phone } from '@/components/ui/icons';

type Site = Record<string, any>;

interface SiteCardProps {
  site: Site;
  onEdit?: (site: Site) => void;
}

function SiteCard({ site, onEdit }: SiteCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleCard = () => setIsOpen((prev) => !prev);

  // Use GM data from enriched site prop instead of fetching independently
  const gm = site.gm_profile || null;

  // Create subtitle with address and contact details
  // Mobile: Show address only, GM details in expanded view
  const createSubtitle = () => {
    const addressParts = [site.address_line1, site.address_line2, site.city]
      .filter(Boolean)
      .join(", ");
    const address = site.postcode ? `${addressParts} • ${site.postcode.toUpperCase()}` : addressParts;

    // On mobile, don't show GM details in subtitle (too cluttered)
    // They'll be shown in the expanded view instead
    return address;
  };

  return (
    <EntityCard
      title={
        <CardHeader
          title={site.name}
          subtitle={createSubtitle()}
          showChevron={false}
          onToggle={toggleCard}
          expanded={isOpen}
        />
      }
      onHeaderClick={toggleCard}
      rightActions={
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <CardChevron
            isOpen={isOpen}
            onToggle={toggleCard}
          />
        </div>
      }
    >
      {isOpen && (
        <div className="mt-3 text-sm text-theme-secondary pt-2 px-1">
          {/* Mobile: Stack fields vertically, Desktop: Keep horizontal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-3">
            <div>
              <span className="text-theme-tertiary text-xs uppercase tracking-wide">Region</span>
              <div className="text-theme-primary mt-0.5">{site.region || "—"}</div>
            </div>
            <div>
              <span className="text-theme-tertiary text-xs uppercase tracking-wide">City</span>
              <div className="text-theme-primary mt-0.5">{site.city || "—"}</div>
            </div>
          </div>

          {/* GM Information in expanded view */}
          {gm && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.05]">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">General Manager</div>
              <div className="mt-1 text-theme-secondary space-y-1.5">
                <div className="text-theme-primary font-medium">{gm.full_name}</div>
                {gm.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-theme-tertiary flex-shrink-0" />
                    <a
                      href={`tel:${gm.phone}`}
                      className="hover:text-[#D37E91] transition-colors break-all"
                    >
                      {gm.phone}
                    </a>
                  </div>
                )}
                {gm.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-theme-tertiary flex-shrink-0" />
                    <a
                      href={`mailto:${gm.email}`}
                      className="hover:text-[#D37E91] transition-colors break-all text-xs md:text-sm"
                    >
                      {gm.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {site.operating_schedule && typeof site.operating_schedule === "object" ? (
            <div className="mb-4">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">Operating Schedule</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[200px] border-collapse text-theme-secondary">
                  <tbody>
                    {(() => {
                      const weekdayOrder = [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ];

                      const orderedSchedule = Object.entries(site.operating_schedule).sort(
                        ([dayA], [dayB]) => weekdayOrder.indexOf(dayA) - weekdayOrder.indexOf(dayB)
                      );

                      return orderedSchedule.map(([day, info]) => {
                        if (!info || typeof info !== "object") return null;

                        const formatTime = (obj: any) => {
                          if (!obj || typeof obj !== "object") return "—";
                          const { hh, mm } = obj;
                          if (hh == null || mm == null) return "—";
                          return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
                        };

                        const infoTyped = info as any;
                        const open = formatTime(infoTyped.open);
                        const close = formatTime(infoTyped.close);
                        const active = infoTyped.active ?? true;

                        return (
                          <tr key={day} className={!active ? "text-theme-tertiary" : ""}>
                            <td className="pr-3 md:pr-6 py-1 capitalize text-xs md:text-sm">{day}:</td>
                            <td className="tabular-nums text-xs md:text-sm">
                              {active ? (
                                <>
                                  {open} <span className="px-1 text-theme-tertiary">→</span> {close}
                                </>
                              ) : (
                                "Closed"
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-theme-tertiary text-sm mb-4">No operating schedule</div>
          )}

          {Array.isArray(site.planned_closures) && site.planned_closures.length > 0 ? (
            <div className="mb-4">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">Planned Closures</div>
              <ul className="list-disc ml-5 mt-1 space-y-1 text-xs md:text-sm">
                {site.planned_closures
                  .filter((c: any) => c.is_active)
                  .map((c: any) => (
                    <li key={c.id} className="break-words">
                      <span className="text-theme-secondary">{c.closure_start} → {c.closure_end}</span>
                      {c.notes && <span className="text-theme-tertiary"> — {c.notes}</span>}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <div className="text-theme-tertiary text-sm mb-4">No planned closures</div>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-white/[0.05]">
            <button
              onClick={(e) => {
                e.stopPropagation(); // don't collapse card
                onEdit?.(site);
              }}
              className="
                p-2 md:p-2 rounded
                border border-[#D37E91] text-[#D37E91]
                hover:shadow-[0_0_6px_#D37E91]
                transition
                active:scale-95
              "
              aria-label="Edit site"
            >
              <Pencil size={16} />
            </button>
          </div>
        </div>
      )}
    </EntityCard>
  );
}

export default memo(SiteCard);
