"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import DatePicker from "react-datepicker";
import SiteFormBase from "./SiteFormBase";
import EntityCard from "@/components/ui/EntityCard";
import CardChevron from "@/components/ui/CardChevron";

type Site = Record<string, any>;

type SiteAccordionProps = {
  sites: Site[];
  gmList?: any[]; // allow it to be optional for now
  onRefresh?: () => void;
  companyId?: string;
};

export default function SiteAccordion({ sites, gmList, onRefresh, companyId }: SiteAccordionProps) {
  return (
    <div className="space-y-2">
      {(sites || []).map((site) => (
        <AccordionItem key={site.id ?? `${(site.name || site.site_name || "site")}-${Math.random()}` } site={site} onRefresh={onRefresh} companyId={companyId} />
      ))}
    </div>
  );
}

function AccordionItem({ site, onRefresh, companyId }: { site: Site; onRefresh?: () => void; companyId?: string }) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [gm, setGm] = useState<{full_name: string, phone: string, email: string} | null>(null);

  // Fetch GM data client-side for this specific site
  useEffect(() => {
    const fetchGM = async () => {
      if (!site?.gm_user_id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", site.gm_user_id)
        .single();
      if (!error && data) {
        setGm(data);
      }
    };
    fetchGM();
  }, [site?.gm_user_id]);

  const title = site.name || site.site_name || "Untitled site";

  // Build subtitle with GM info
  const subtitle = [
    site.address_line1,
    site.city,
    site.postcode,
    gm ? gm.full_name : (site.gm_user_id ? "Loading GM..." : "GM not assigned")
  ].filter(Boolean).join(" • ");

  const handleDelete = async () => {
    if (!site.id) {
      showToast({ title: "Delete failed", description: "Missing site id", type: "error" });
      return;
    }
    if (!confirm("Delete this site?")) return;
    const { error } = await supabase.from("sites").delete().eq("id", site.id);
    if (error) {
      showToast({ title: "Delete failed", description: error.message || "Unable to delete", type: "error" });
    } else {
      showToast({ title: "Site deleted", description: "The site was removed successfully.", type: "success" });
      onRefresh?.();
    }
  };

  const handleEditClick = () => {
    setEditModalOpen(true);
  };

  const handleModalClose = () => {
    setEditModalOpen(false);
  };

  const handleModalSaved = () => {
    onRefresh?.();
    setEditModalOpen(false);
  };

  // Build address string
  const addressParts = [site.address_line1, site.address_line2, site.city].filter(Boolean);
  const addressString = addressParts.join(', ');
  
  // Build GM string
  const gmString = site.gm_name
          ? `${site.gm_name}${site.gm_phone ? ` (${site.gm_phone})` : ' (No phone)'}` 
    : 'GM not assigned';

  return (
    <>
      <EntityCard
        title={
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-sm text-gray-400">{subtitle}</div>
          </div>
        }
        rightActions={
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("🔥 ACCORDION ITEM - Edit button clicked for site:", site.name);
                handleEditClick();
              }}
              className="px-3 py-1.5 bg-[#D37E91]/25 hover:bg-[#D37E91]/35 border border-[#D37E91]/40 text-[#D37E91] rounded-md text-sm"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("🔥 ACCORDION ITEM - Delete button clicked for site:", site.name);
                handleDelete();
              }}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded-md text-sm"
            >
              Delete
            </button>
            <CardChevron isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} />
          </div>
        }
      >
        {isOpen && (
          <div className="mt-3 text-sm text-gray-300 border-t border-white/[0.1] pt-2">
            {/* Site Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Address</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  {site.address_line1 && <div>{site.address_line1}</div>}
                  {site.address_line2 && <div>{site.address_line2}</div>}
                  <div>
                    {site.city && <span>{site.city}</span>}
                    {site.city && site.postcode && <span>, </span>}
                    {site.postcode && <span>{site.postcode}</span>}
                  </div>
                  {site.region && <div>{site.region}</div>}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Contact Information</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  {gm ? (
                    <>
                      <div><span className="text-gray-500">General Manager:</span> {gm.full_name}</div>
                      <div><span className="text-gray-500">Phone:</span> {gm.phone}</div>
                      <div><span className="text-gray-500">Email:</span> {gm.email}</div>
                    </>
                  ) : site.gm_user_id ? (
                    <div className="text-gray-500">Loading GM information...</div>
                  ) : (
                    <div className="text-gray-500">No GM assigned</div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Site Details</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  {site.region && <div><span className="text-gray-500">Region:</span> {site.region}</div>}
                  {site.status && <div><span className="text-gray-500">Status:</span> {site.status}</div>}
            </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Operating Hours</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  {site.days_open && <div><span className="text-gray-500">Days Open:</span> {site.days_open}</div>}
                  {(site.opening_time_from || site.opening_time_to) && (
                    <div>
                      <span className="text-gray-500">Hours:</span> {site.opening_time_from || "N/A"} - {site.opening_time_to || "N/A"}
                    </div>
                  )}
                  {site.yearly_closures && <div><span className="text-gray-500">Yearly Closures:</span> {site.yearly_closures}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </EntityCard>

      {editModalOpen && (
        <SiteFormBase
          mode="edit"
          initialData={{...site, gm_name: gm?.full_name, gm_phone: gm?.phone, gm_email: gm?.email}}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          companyId={companyId || site.company_id}
        />
      )}
    </>
  );
}