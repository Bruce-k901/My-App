"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { ChevronUp } from "lucide-react";
import { fetchLocationFromPostcode, isValidPostcodeForLookup } from "@/lib/locationLookup";
import CheckboxCustom from "@/components/ui/CheckboxCustom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SiteGMManager from "./SiteGMManager";

type SiteFormBaseProps = {
  mode: "new" | "edit";
  initialData?: any;
  onClose: () => void;
  onSaved?: () => void;
  companyId: string;
  gmList?: Array<{id: string, full_name: string, email: string, phone?: string | null}>;
  onDelete?: () => void;
};

type FormData = {
  id?: string;
  name: string;
  address_line1: string;
  address2?: string;
  postcode: string;
  city?: string;
  region?: string;
  status: string;
  general_manager: string;
  gm_user_id?: string;
  gm_phone?: string;
  gm_email?: string;
  gm_name?: string;
  operating_schedule: {
    [key: string]: {
      active: boolean;
      open: {
        hh: string;
        mm: string;
      };
      close: {
        hh: string;
        mm: string;
      };
    };
  };
  planned_closures: Array<{
    id?: string;
    start: string;
    end: string;
    notes: string;
  }>;
  _copiedDays?: { [key: string]: boolean };
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SiteFormBase({ mode, initialData, onClose, onSaved, companyId, gmList: propGmList, onDelete }: SiteFormBaseProps) {
  const { showToast } = useToast();
  const [operatingScheduleOpen, setOperatingScheduleOpen] = useState(mode === "new");
  const [loading, setLoading] = useState(false);
  const [gmList, setGmList] = useState<Array<{
    [x: string]: any;id: string, full_name: string, email: string, role?: string | null, position_title?: string | null, site_id?: string | null, phone?: string | null
}>>(propGmList || []);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newClosure, setNewClosure] = useState({ start: "", end: "" });
  
  // GM expansion state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState("");

  // Debug logging for gmList prop
  console.log("gmList prop in SiteFormBase:", propGmList?.length, propGmList?.[0]);

  // Default schedule setup as specified in the brief
  const defaultSchedule = {
    Monday:    { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Tuesday:   { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Wednesday: { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Thursday:  { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Friday:    { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Saturday:  { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
    Sunday:    { active: true, open: { hh: "", mm: "" }, close: { hh: "", mm: "" } },
  };

  const [formData, setFormData] = useState<FormData>(() => {
    // if editing a site with existing schedule
    if (initialData?.operating_schedule && Object.keys(initialData.operating_schedule).length > 0) {
      return {
        ...initialData,
        operating_schedule: { ...defaultSchedule, ...initialData.operating_schedule },
        planned_closures: initialData?.planned_closures ?? [],
      };
    }

    // if creating a new site
    return {
      ...initialData,
      operating_schedule: defaultSchedule,
      planned_closures: initialData?.planned_closures ?? [],
    };
  });

  // Defensive useEffect as backup to ensure defaults on mount
  useEffect(() => {
    if (!formData.operating_schedule || Object.keys(formData.operating_schedule).length === 0) {
      setFormData(prev => ({ ...prev, operating_schedule: defaultSchedule }));
    }
    if (!Array.isArray(formData.planned_closures)) {
      setFormData(prev => ({ ...prev, planned_closures: [] }));
    }
  }, []);

  // Fetch closures when opening the Edit modal
  useEffect(() => {
    if (!initialData?.id) return;

    const loadClosures = async () => {
      const { data, error } = await supabase
        .from("site_closures")
        .select("id, closure_start, closure_end, notes")
        .eq("site_id", initialData.id)
        .eq("is_active", true)
        .order("closure_start", { ascending: true });

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          planned_closures: data.map(d => ({
            id: d.id,
            start: d.closure_start,
            end: d.closure_end,
            notes: d.notes || "",
          })),
        }));
      }
    };

    loadClosures();
  }, [initialData?.id]);

  // Defensive useEffect for planned closures hydration
  useEffect(() => {
    if (initialData?.planned_closures && Array.isArray(initialData.planned_closures)) {
      setFormData(prev => ({
        ...prev,
        planned_closures: initialData.planned_closures,
      }));
    }
  }, [initialData]);

  // Data loading effect for edit mode
  useEffect(() => {
    const loadData = async () => {
      if (mode === "edit" && initialData?.id) {
        setLoading(true);
        try {
          // Fetch site data
          const { data: site, error: siteError } = await supabase
            .from("sites")
            .select("*")
            .eq("id", initialData.id)
            .single();

          if (siteError) {
            showToast(`Failed to load site data: ${siteError.message}`, "error");
            return;
          }

          // Fetch planned closures
          const { data, error } = await supabase 
            .from("site_closures") 
            .select("id, closure_start, closure_end, notes") 
            .eq("site_id", initialData.id) 
            .eq("is_active", true)
            .order("closure_start", { ascending: true }); 
          
          if (!error && data) { 
            setFormData(prev => ({ 
              ...prev, 
              planned_closures: data.map(d => ({ 
                id: d.id,
                start: d.closure_start, 
                end: d.closure_end, 
                notes: d.notes || "", 
              })), 
            })); 
          }

          // Update form data with fetched data
          if (site) {
            // Create default schedule for fallback
            const defaultSchedule = WEEKDAYS.reduce((acc, day) => {
              acc[day] = {
                active: true,
                open: { hh: "", mm: "" },
                close: { hh: "", mm: "" }
              };
              return acc;
            }, {} as FormData["operating_schedule"]);

            // Merge existing schedule with defaults for missing days
            let mergedSchedule = { ...defaultSchedule };
            if (site.operating_schedule) {
              WEEKDAYS.forEach(day => {
                if (site.operating_schedule[day]) {
                  // If day exists in database, use it but ensure it has the correct structure
                  const existingDay = site.operating_schedule[day];
                  mergedSchedule[day] = {
                    active: existingDay.active !== undefined ? existingDay.active : (existingDay.open !== undefined ? existingDay.open : true),
                    open: {
                      hh: existingDay.open?.hh || existingDay.openHour || "",
                      mm: existingDay.open?.mm || existingDay.openMinute || ""
                    },
                    close: {
                      hh: existingDay.close?.hh || existingDay.closeHour || "",
                      mm: existingDay.close?.mm || existingDay.closeMinute || ""
                    }
                  };
                }
              });
            }

            setFormData(prev => ({
              ...prev,
              id: site.id,
              name: site.name || "",
              address_line1: site.address_line1 || "",
              address2: site.address2 || "",
              postcode: site.postcode || "",
              city: site.city || "",
              region: site.region || "",
              status: site.status || "active",
              gm_user_id: site.gm_user_id || "",
              operating_schedule: mergedSchedule
            }));
          }
        } catch (error) {
          console.error("Error loading site data:", error);
          showToast("Failed to load site data", "error");
        } finally {
          setLoading(false);
        }
      }


    };

    loadData();
  }, [mode, initialData?.id, showToast, companyId]);

  // Set GM list from props
  useEffect(() => {
    if (propGmList?.length) setGmList(propGmList);
  }, [propGmList]);

  useEffect(() => {
    if (initialData && gmList?.length) {
      // Match by gm_user_id from the site data
      const gm = gmList.find(g => g.id === initialData.gm_user_id);

      if (gm) {
        setFormData(prev => ({
          ...prev,
          gm_user_id: gm.id,
          gm_name: gm.full_name ?? "",
          gm_email: gm.email ?? "",
          gm_phone: gm.phone ?? "",
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          gm_user_id: "",
          gm_name: "",
          gm_email: "",
          gm_phone: "",
        }));
      }
    }
  }, [initialData, gmList]);

  // Helper functions for operating schedule
  const isEmpty = (dayObj: FormData["operating_schedule"][string]) => {
    return (
      !dayObj.open.hh &&
      !dayObj.open.mm &&
      !dayObj.close.hh &&
      !dayObj.close.mm
    );
  };

  const allTimesFilled = (dayObj: FormData["operating_schedule"][string]) => {
    return (
      dayObj.open.hh && dayObj.open.mm && dayObj.close.hh && dayObj.close.mm
    );
  };

  // Normalize schedule keys to prevent duplicate day entries with different casing
  const normalizeScheduleKeys = (schedule: any) => {
    const result: any = {};
    for (const [key, value] of Object.entries(schedule)) {
      const day = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
      if (!result[day]) result[day] = value;
    }
    return result;
  };

  // Handle time changes with auto-fill propagation
  const handleTimeChange = (day: string, field: { group: 'open' | 'close', unit: 'hh' | 'mm' }, value: string) => {
    const updatedSchedule = { ...formData.operating_schedule };
    
    updatedSchedule[day][field.group][field.unit] = value;

    // If this is the first complete open/close pair for a day,
    // and other active days have empty times, copy them over.
    if (field.group === "close" && field.unit === "mm" && allTimesFilled(updatedSchedule[day])) {
      let copiedCount = 0;
      for (const d in updatedSchedule) {
        if (updatedSchedule[d].active && d !== day && isEmpty(updatedSchedule[d])) {
          updatedSchedule[d] = {
            ...updatedSchedule[d],
            open: { ...updatedSchedule[day].open },
            close: { ...updatedSchedule[day].close }
          };
          copiedCount++;
        }
      }
      
      // Show toast message for auto-fill only if times were copied
      if (copiedCount > 0) {
        showToast("Hours copied to all open days.", "success");
      }
    }

    setFormData({ ...formData, operating_schedule: updatedSchedule });
  };

  const handleGMChange = (gmId: string) => {
    const selectedGM = gmList.find(gm => gm.id === gmId);
    if (selectedGM) {
      setFormData(prev => ({
        ...prev,
        gm_user_id: selectedGM.id,
        gm_phone: selectedGM.phone ?? "",
        gm_email: selectedGM.email ?? ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        gm_user_id: "",
        gm_phone: "",
        gm_email: ""
      }));
    }
  };

  const handleUpdate = async () => {
    if (!selectedGM || !initialData?.id) return;
    
    setLoading(true);
    try {
      // Call the update_gm_link RPC to sync with database
      const { error } = await supabase.rpc("update_gm_link", {
        site_id: initialData.id,
        gm_id: selectedGM,
      });

      if (error) {
        throw error;
      }

      // After successful RPC call, update form data with selected GM details
      const selectedGMData = gmList.find(gm => gm.id === selectedGM);
      if (selectedGMData) {
        setFormData(prev => ({
          ...prev,
          gm_user_id: selectedGMData.id,
          gm_name: selectedGMData.full_name,
          gm_email: selectedGMData.email,
          gm_phone: selectedGMData.phone ?? "",
        }));
      }
        
      showToast("GM updated successfully", "success");
      setIsOpen(false); // Collapse the expansion zone
      setSelectedGM(""); // Reset selection
    } catch (error) {
      console.error("Error updating GM:", error);
      showToast("Failed to update GM", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Fixed handleScheduleChange function as specified in the brief
  const handleScheduleChange = (day: string, type: string, field: string, value: string) => {
    setFormData(prev => {
      const updated = structuredClone(prev.operating_schedule);
      (updated[day] as any)[type][field] = value;

      const current = updated[day];
      const isComplete =
        current.open.hh &&
        current.open.mm &&
        current.close.hh &&
        current.close.mm;

      // track per-day completion to avoid early copy
      const copiedDays = prev._copiedDays || {};

      if (isComplete && !copiedDays[day]) {
        for (const key in updated) {
          if (
            key !== day &&
            updated[key].active &&
            !updated[key].open.hh &&
            !updated[key].open.mm &&
            !updated[key].close.hh &&
            !updated[key].close.mm
          ) {
            updated[key].open = { ...current.open };
            updated[key].close = { ...current.close };
          }
        }

        // Move toast outside of setState using setTimeout to avoid render-time state mutation
        setTimeout(() => {
          showToast("Copied hours to all active days", "success");
        }, 0);

        return {
          ...prev,
          operating_schedule: updated,
          _copiedDays: { ...copiedDays, [day]: true },
        };
      }

      return { ...prev, operating_schedule: updated };
    });
  };

  // Separate function for checkbox changes as specified in the brief
  const handleCheckboxChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      operating_schedule: {
        ...prev.operating_schedule,
        [day]: {
          ...prev.operating_schedule[day],
          active: checked,
        },
      },
    }));
  };

  const handleAddClosure = () => {
    if (!newClosure.start || !newClosure.end) return;
    setFormData(prev => ({
      ...prev,
      planned_closures: [
        ...(Array.isArray(prev.planned_closures) ? prev.planned_closures : []),
        { start: newClosure.start, end: newClosure.end, notes: "" },
      ],
    }));
    setNewClosure({ start: "", end: "" });
  };

  const handleDeleteClosure = async (index: number, closureId?: string) => {
    // Instantly remove from view
    setFormData(prev => ({
      ...prev,
      planned_closures: prev.planned_closures.filter((_, i) => i !== index),
    }));

    // If closure has an ID (exists in database), soft delete it
    if (closureId) {
      try {
        await supabase
          .from("site_closures")
          .update({ is_active: false })
          .eq("id", closureId);
      } catch (error) {
        console.error("Error soft deleting closure:", error);
      }
    }
  };

  // Auto-populate city and region from postcode
  useEffect(() => {
    if (formData.postcode && isValidPostcodeForLookup(formData.postcode)) {
      fetchLocationFromPostcode(formData.postcode).then((res) => {
        if (res.city || res.region) {
          setFormData((prev) => ({
            ...prev,
            city: res.city,
            region: res.region,
          }));
          showToast("City and region auto-filled", "success");
        }
      });
    }
  }, [formData.postcode, showToast]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Site name is required", "error");
      return;
    }

    if (!formData.address_line1?.trim()) {
      showToast("Address Line 1 is required", "error");
      return;
    }

    if (!formData.postcode?.trim()) {
      showToast("Postcode is required", "error");
      return;
    }

    setLoading(true);
    try {
      // Normalize the operating schedule to prevent duplicate day entries
      const cleanedSchedule = normalizeScheduleKeys(formData.operating_schedule);

      // Prepare site data for upsert (without planned_closures)
      const siteData = {
        ...(formData.id && { id: formData.id }), // Include ID only if editing
        company_id: companyId,
        name: formData.name.trim(),
        address_line1: formData.address_line1.trim(),
        address_line2: formData.address2?.trim() || null,
        postcode: formData.postcode.trim(),
        city: formData.city?.trim() || null,
        region: formData.region?.trim() || null,
        status: formData.status,
        gm_user_id: formData.gm_user_id ? formData.gm_user_id.trim() : null,
        operating_schedule: cleanedSchedule
      };

      // Upsert site data
      const { data: siteResult, error: siteError } = await supabase
        .from("sites")
        .upsert(siteData, { onConflict: "id" })
        .select()
        .single();

      if (siteError) {
        showToast(`Save failed: ${siteError.message}`, "error");
        return;
      }

      // 1️⃣ After site upsert succeeds and returns the site ID
      const siteId = siteResult.id;

      // 2️⃣ Filter only active closures
      const activeClosures = (formData.planned_closures || []).filter(c => c.start && c.end);

      // 3️⃣ If any closures exist, insert them
      if (activeClosures.length > 0) {
        const closuresToInsert = activeClosures.map(c => ({
          site_id: siteId,
          closure_start: c.start,
          closure_end: c.end,
          notes: c.notes || "",
          is_active: true,
        }));

        const { error: closureError } = await supabase
          .from("site_closures")
          .insert(closuresToInsert);

        if (closureError) {
          console.error("Error inserting planned closures:", closureError);
        } else {
          console.log(`Inserted ${closuresToInsert.length} closures for site ${siteId}`);
        }
      }

      showToast(`Site ${mode === "edit" ? "updated" : "created"} successfully`, "success");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving site:", error);
      showToast("Failed to save site", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative z-[10000] bg-neutral-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-semibold text-white">
            {mode === "new" ? "Add New Site" : "Edit Site"}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* A. Core Details */}
          <section>
            <h3 className="text-xl font-semibold mb-3 text-white">Core Details</h3>
            
            {/* Two-column responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Site Name and Postcode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Site Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter site name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Postcode <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postcode?.toUpperCase() || ""}
                  onChange={(e) => {
                    const uppercaseValue = e.target.value.toUpperCase();
                    setFormData({ ...formData, postcode: uppercaseValue });
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter postcode"
                  required
                />
              </div>

              {/* Row 2: Address Line 1 and Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Address Line 1 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address_line1 || ""}
                  onChange={(e) => handleInputChange("address_line1", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter address line 1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.address2 || ""}
                  onChange={(e) => handleInputChange("address2", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter address line 2 (optional)"
                />
              </div>

              {/* Row 3: City and Region (auto-filled, read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  readOnly
                  className="bg-neutral-900 cursor-not-allowed w-full border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  placeholder="Auto-filled from postcode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
                <input
                  type="text"
                  value={formData.region || ""}
                  readOnly
                  className="bg-neutral-900 cursor-not-allowed w-full border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                  placeholder="Auto-filled from postcode"
                />
              </div>

              {/* Row 4: Status and empty placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
              <div /> {/* Empty placeholder to maintain grid */}
            </div>
          </section>

          {/* Management Contact */}
          <section className="mt-6 border-t border-neutral-800 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-white">Management Contact</h3>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="px-3 py-1.5 border border-pink-500 text-pink-500 hover:bg-pink-500/10 rounded-md text-sm transition-colors"
              >
                Update GM
              </button>
            </div>
            
            {/* Management Contact Section */}
            <div className="flex flex-col w-full">
              {/* Row 1 – static GM info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">General Manager</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.gm_name || ""}
                    placeholder="No GM assigned"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">GM Phone</label>
                  <input
                  type="tel"
                  readOnly
                  value={formData.gm_phone || ""}
                  placeholder="No phone"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">GM Email</label>
                  <input
                    type="email"
                    readOnly
                    value={formData.gm_email || ""}
                    placeholder="No email"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Row 2 – reserved expansion zone */}
              <div
                id="gmExpandZone"
                className={`transition-all duration-300 overflow-hidden ${
                  isOpen ? "max-h-40 mt-3 pt-3 border-t border-white/10" : "max-h-0"
                }`}
              >
                {/* The UpdateGM UI */}
                {isOpen && (
                  <SiteGMManager 
                    site={{ id: formData.id || "", name: formData.name, company_id: companyId }}
                    companyId={companyId}
                    onSaved={() => {
                      // Refresh the form data after GM assignment
                      if (onSaved) onSaved();
                      setIsOpen(false);
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Operating Schedule */}
          <section className="mt-6 border-t border-neutral-800 pt-6">
            {mode === "edit" ? (
              <div>
                <h3 className="text-xl font-semibold mb-3 text-white">Operating Schedule</h3>
                <div className="border border-neutral-800 rounded-xl p-4">
                  <div className="space-y-2">
                    {WEEKDAYS.map((day, index) => {
                      const dayData = formData.operating_schedule[day];
                      const dayLabel = WEEKDAY_LABELS[index];
                      
                      return (
                        <div 
                          key={day} 
                          className={`flex items-center gap-4 py-1.5 px-3 bg-neutral-800 rounded-lg transition-opacity ${
                            !dayData.active ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <CheckboxCustom
                              checked={dayData.active}
                              onChange={(checked: boolean) => handleCheckboxChange(day, checked)}
                              size={16}
                            />
                            <span className="text-white text-sm font-medium">{dayLabel}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Open:</span>
                            <select
                              value={dayData.open.hh}
                              onChange={(e) => handleScheduleChange(day, "open", "hh", e.target.value)}
                              disabled={!dayData.active}
                              className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">HH</option>
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={String(i).padStart(2, "0")}>
                                  {String(i).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                            <select
                              value={dayData.open.mm}
                              onChange={(e) => handleScheduleChange(day, "open", "mm", e.target.value)}
                              disabled={!dayData.active}
                              className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">MM</option>
                              {[0, 15, 30, 45].map((minute) => (
                                <option key={minute} value={String(minute).padStart(2, "0")}>
                                  {String(minute).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                            
                            <span className="text-gray-400 text-sm mx-2">Close:</span>
                            <select
                              value={dayData.close.hh}
                              onChange={(e) => handleScheduleChange(day, "close", "hh", e.target.value)}
                              disabled={!dayData.active}
                              className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">HH</option>
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={String(i).padStart(2, "0")}>
                                  {String(i).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                            <select
                              value={dayData.close.mm}
                              onChange={(e) => handleScheduleChange(day, "close", "mm", e.target.value)}
                              disabled={!dayData.active}
                              className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">MM</option>
                              {[0, 15, 30, 45].map((minute) => (
                                <option key={minute} value={String(minute).padStart(2, "0")}>
                                  {String(minute).padStart(2, "0")}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setOperatingScheduleOpen(!operatingScheduleOpen)}
                  className="flex items-center justify-between w-full text-left text-xl font-semibold text-white mb-3 hover:text-pink-400 transition-colors"
                >
                  Operating Schedule
                  <span className={`transform transition-transform ${operatingScheduleOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {operatingScheduleOpen && (
                  <div className="border border-neutral-800 rounded-xl p-4">
                    <div className="space-y-2">
                      {WEEKDAYS.map((day, index) => {
                        const dayData = formData.operating_schedule[day];
                        const dayLabel = WEEKDAY_LABELS[index];
                        
                        return (
                          <div 
                            key={day} 
                            className={`flex items-center gap-4 py-1.5 px-3 bg-neutral-800 rounded-lg transition-opacity ${
                              !dayData.active ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <CheckboxCustom
                                checked={dayData.active}
                                onChange={(checked: boolean) => handleCheckboxChange(day, checked)}
                                size={16}
                              />
                              <span className="text-white text-sm font-medium">{dayLabel}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">Open:</span>
                              <select
                                value={dayData.open.hh}
                                onChange={(e) => handleScheduleChange(day, "open", "hh", e.target.value)}
                                disabled={!dayData.active}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">HH</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                              <select
                                  value={dayData.open.mm}
                                  onChange={(e) => handleScheduleChange(day, "open", "mm", e.target.value)}
                                  disabled={!dayData.active}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">MM</option>
                                  {[0, 15, 30, 45].map((minute) => (
                                    <option key={minute} value={String(minute).padStart(2, "0")}>
                                      {String(minute).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                              
                              <span className="text-gray-400 text-sm mx-2">Close:</span>
                              <select
                                value={dayData.close.hh}
                                onChange={(e) => handleScheduleChange(day, "close", "hh", e.target.value)}
                                disabled={!dayData.active}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">HH</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                              <select
                                  value={dayData.close.mm}
                                  onChange={(e) => handleScheduleChange(day, "close", "mm", e.target.value)}
                                  disabled={!dayData.active}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">MM</option>
                                  {[0, 15, 30, 45].map((minute) => (
                                    <option key={minute} value={String(minute).padStart(2, "0")}>
                                      {String(minute).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* D. Planned Closures */}
          <section className="mt-6 border-t border-neutral-800 pt-6">
            <h3 className="text-xl font-semibold text-white mb-4">Planned Closures</h3>
            
            <div className="flex gap-2 items-center mb-3">
              <DatePicker
                selected={newClosure.start ? new Date(newClosure.start) : null}
                onChange={(date) => setNewClosure(prev => ({
                  ...prev,
                  start: date?.toISOString().split("T")[0] || ""
                }))}
                placeholderText="Start date"
                className="bg-neutral-900 border border-neutral-700 text-white p-2 rounded-md"
                popperClassName="z-50"
                calendarClassName="bg-neutral-800 text-white rounded-md shadow-lg"
              />

              <DatePicker
                selected={newClosure.end ? new Date(newClosure.end) : null}
                onChange={(date) => setNewClosure(prev => ({
                  ...prev,
                  end: date?.toISOString().split("T")[0] || ""
                }))}
                minDate={newClosure.start ? new Date(newClosure.start) : undefined}
                openToDate={newClosure.start ? new Date(newClosure.start) : undefined}
                placeholderText="End date"
                className="bg-neutral-900 border border-neutral-700 text-white p-2 rounded-md"
                popperClassName="z-50"
                calendarClassName="bg-neutral-800 text-white rounded-md shadow-lg"
              />

              <button
                type="button"
                onClick={handleAddClosure}
                disabled={!newClosure.start || !newClosure.end}
                className="px-4 py-2 border-2 border-green-500 text-green-500 hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Confirm
              </button>
            </div>

            {formData.planned_closures?.length > 0 ? (
              <div className="space-y-2">
                {formData.planned_closures.map((closure, i) => (
                  <div key={i} className="flex justify-between items-center border border-neutral-700 rounded-md p-2">
                    <span className="text-sm text-white">
                      {new Date(closure.start).toLocaleDateString()} → {new Date(closure.end).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteClosure(i, closure.id)}
                      className="px-3 py-1 text-xs border border-red-500 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 text-sm">No planned closures yet.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 flex justify-between">
          {/* Delete button - only show in edit mode */}
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-6 py-2 text-red-400 border border-red-400 rounded-lg hover:shadow-lg hover:shadow-red-400/50 hover:border-red-300 transition-all duration-200"
              disabled={loading}
            >
              Delete Site
            </button>
          )}
          
          {/* Right side buttons */}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-white border border-white rounded-lg hover:shadow-lg hover:shadow-white/50 hover:border-white/80 transition-all duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 border border-pink-600 text-pink-600 rounded-lg hover:shadow-lg hover:shadow-pink-600/50 hover:border-pink-500 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}