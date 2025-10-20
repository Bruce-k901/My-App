"use client";

import { useState, useEffect, memo } from "react";
import EntityCard from "@/components/ui/EntityCard";
import CardChevron from "@/components/ui/CardChevron";
import { Pencil, Mail, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Site = Record<string, any>;

interface SiteCardProps {
  site: Site;
  onEdit?: (site: Site) => void;
}

function SiteCard({ site, onEdit }: SiteCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gm, setGm] = useState<{
    full_name: string;
    phone: string;
    email: string;
  } | null>(null);

  const toggleCard = () => setIsOpen((prev) => !prev);

  // Fetch GM data silently from gm_index
  useEffect(() => {
    const fetchGM = async () => {
      if (!site?.id) return;

      const { data, error } = await supabase
        .from("gm_index")
        .select("id, full_name, email, phone, home_site, position_title")
        .eq("home_site", site.id)
        .ilike("position_title", "%general%manager%"); // case-insensitive match for "General Manager"

      if (error) {
        console.error("GM fetch error:", error.message);
      } else if (data && data.length > 0) {
        const gm = data[0]; // take the first matching GM
        console.log("GM found:", gm);
        setGm({
          id: gm.id,
          full_name: gm.full_name,
          email: gm.email ?? "",
          phone: gm.phone ?? "",
          home_site: gm.home_site
        });
      } else {
        console.log(`No GM found for site: ${site.name}`);
        setGm(null);
      }
    };
    fetchGM();
  }, [site?.id]);

  return (
    <EntityCard
      title={
        <div className="flex justify-between items-center w-full">
          {/* Left side - Site info */}
          <div className="header-left">
            <div className="text-lg font-semibold">{site.name}</div>
            <div className="text-sm text-gray-400">
              {[site.address_line1, site.address_line2, site.city]
                .filter(Boolean)
                .join(", ")}
              {site.postcode ? ` • ${site.postcode.toUpperCase()}` : ""}
            </div>
          </div>

          {/* GM Info Container (Invisible Box) */}
          <div className="gm-info-container flex items-center gap-2" style={{
            visibility: gm ? 'visible' : 'hidden',
            minWidth: '120px'
          }}>
            {gm && (
              <>
                <span className="gm-name text-sm font-medium text-gray-400">{gm.full_name}</span>
                <a
                  href={`mailto:${gm.email}`}
                  className="gm-email text-sm text-gray-400 hover:text-magenta-400 hover:shadow-[0_0_6px_#EC4899] transition-all duration-200 no-underline cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {gm.email}
                </a>
                <a
                  href={`tel:${gm.phone}`}
                  className="gm-phone text-sm text-gray-400 hover:text-magenta-400 hover:shadow-[0_0_6px_#EC4899] transition-all duration-200 no-underline cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {gm.phone}
                </a>
              </>
            )}
          </div>
        </div>
      }
      onHeaderClick={toggleCard}
      rightActions={
        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <CardChevron isOpen={isOpen} onToggle={toggleCard} />
        </div>
      }
    >
      {isOpen && (
        <div className="mt-3 text-sm text-gray-300 pt-2">
          <div className="mb-1">Region: {site.region || "—"}</div>
          <div className="mb-1">City: {site.city || "—"}</div>

          {/* GM Information in expanded view */}
          {gm && (
            <div className="mb-3">
              <div className="font-semibold text-gray-200">General Manager</div>
              <div className="mt-1 text-gray-300">
                <div>{gm.full_name}</div>
                {gm.phone && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone size={14} className="text-gray-500" />
                    <span>{gm.phone}</span>
                  </div>
                )}
                {gm.email && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail size={14} className="text-gray-500" />
                    <span>{gm.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {site.operating_schedule && typeof site.operating_schedule === "object" ? (
            <div className="mb-3">
              <div className="font-semibold text-gray-200">Operating Schedule</div>
              <table className="mt-1 w-auto border-collapse text-gray-300">
                <tbody>
                  {Object.entries(site.operating_schedule).map(([day, info]) => {
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
                      <tr key={day} className={!active ? "text-gray-500" : ""}>
                        <td className="pr-6 capitalize">{day}:</td>
                        <td className="tabular-nums">
                          {active ? (
                            <>
                              {open} <span className="px-1 text-gray-500">→</span> {close}
                            </>
                          ) : (
                            "Closed"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500">No operating schedule</div>
          )}

          {Array.isArray(site.planned_closures) && site.planned_closures.length > 0 ? (
            <div className="mb-3">
              <div className="font-semibold text-gray-200 mt-2">Planned Closures</div>
              <ul className="list-disc ml-5 mt-1">
                {site.planned_closures
                  .filter((c: any) => c.is_active)
                  .map((c: any) => (
                    <li key={c.id}>
                      {c.closure_start} → {c.closure_end}
                      {c.notes && ` — ${c.notes}`}
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <div className="text-gray-500">No planned closures</div>
          )}

          <div className="flex justify-end pt-3">
            <button
              onClick={(e) => {
                e.stopPropagation(); // don't collapse card
                onEdit?.(site);
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

export default memo(SiteCard);