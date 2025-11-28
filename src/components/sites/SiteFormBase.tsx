"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { updateGM } from "@/lib/updateGM";
import { ChevronUp } from "lucide-react";
import { getLocationFromPostcode, isValidPostcodeForLookup } from "@/lib/locationLookup";
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

export default function SiteFormBase({ mode, initialData, onClose, onSaved, companyId, gmList, onDelete }: SiteFormBaseProps) {
  console.log("� Rendered", "SiteFormBase");
  console.log("�🔥 Received gmList prop:", gmList);
  const [operatingScheduleOpen, setOperatingScheduleOpen] = useState(mode === "new");
  const [loading, setLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newClosure, setNewClosure] = useState({ start: "", end: "" });
  
  // GM expansion state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState("");
  const [gmEditMode, setGmEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debug logging for gmList prop
  console.log("🔥 Received gmList prop:", gmList);

  // GM fetch function
  const loadGMForSite = async (siteId: string) => {
    console.log("Loading GM for site:", siteId);
    const { data, error } = await supabase
      .from("gm_index")
      .select("id, full_name, email, phone, home_site, position_title")
      .eq("home_site", siteId)
      .ilike("position_title", "%general%manager%");

    console.log("GM query result:", { data, error, siteId });

    if (error) {
      console.error("GM fetch error:", error);
      return;
    }

    if (data && data.length > 0) {
      const gm = data[0];
      console.log("GM loaded into modal:", gm);
      setFormData(prev => {
        console.log("After GM load, formData.gm_name:", gm.full_name);
        return {
          ...prev,
          gm_user_id: gm.id,
          gm_name: gm.full_name || "",
          gm_email: gm.email || "",
          gm_phone: gm.phone || ""
        };
      });
    } else {
      console.log("No GM found for site:", siteId, "Data:", data);
    }
  };

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
        // Initialize GM fields to empty strings to prevent undefined issues
        gm_name: initialData?.gm_name || "",
        gm_email: initialData?.gm_email || "",
        gm_phone: initialData?.gm_phone || "",
        gm_user_id: initialData?.gm_user_id || "",
      };
    }

    // if creating a new site
    return {
      ...initialData,
      operating_schedule: defaultSchedule,
      planned_closures: initialData?.planned_closures ?? [],
      // Initialize GM fields to empty strings to prevent undefined issues
      gm_name: initialData?.gm_name || "",
      gm_email: initialData?.gm_email || "",
      gm_phone: initialData?.gm_phone || "",
      gm_user_id: initialData?.gm_user_id || "",
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

  // Set GM data from initialData when form initializes
  useEffect(() => {
    if (initialData?.gm_profile) {
      console.log("Setting GM data from initialData:", initialData.gm_profile);
      setFormData(prev => ({
        ...prev,
        gm_user_id: initialData.gm_profile.id,
        gm_name: initialData.gm_profile.full_name || "",
        gm_email: initialData.gm_profile.email || "",
        gm_phone: initialData.gm_profile.phone || ""
      }));
    } else if (initialData?.gm_user_id) {
      // Fallback: if we have gm_user_id but no gm_profile, clear the GM fields
      console.log("No gm_profile found, clearing GM fields");
      setFormData(prev => ({
        ...prev,
        gm_user_id: "",
        gm_name: "",
        gm_email: "",
        gm_phone: ""
      }));
    }
  }, [initialData?.gm_profile, initialData?.gm_user_id]);

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
            console.error(`Failed to load site data: ${siteError.message}`);
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

            console.log("After site load:", site);
            
            // Debug logs to check GM lookup logic
            console.log("initialData.gm_user_id:", initialData?.gm_user_id);
            console.log("gmList:", gmList);
            
            // GM data is now handled by useEffect above
          }
        } catch (error) {
          console.error("Error loading site data:", error);
        } finally {
          setLoading(false);
        }
      }


    };

    loadData();
  }, [mode, initialData?.id, companyId]);

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
      
      // Log message for auto-fill only if times were copied
      if (copiedCount > 0) {
        console.log("Hours copied to all open days.");
      }
    }

    setFormData({ ...formData, operating_schedule: updatedSchedule });
  };

  const handleGMChange = (gmId: string) => {
    const selectedGM = gmList?.find(gm => gm.id === gmId);
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

  const handleSaveAndSync = async () => {
    try {
      setIsSaving(true);

      console.log("Save button clicked", formData.id, formData.gm_user_id);
      console.log("Saving GM", formData.id, formData.gm_user_id);
      
      if (formData.gm_user_id && formData.id) {
        await updateGM(formData.id, formData.gm_user_id);
      }

      console.log("GM saved and synced");
      setGmEditMode(false);
      onSaved?.();
    } catch (err) {
      console.error("Error updating GM:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to save GM: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-populate schedule: Copy from Monday (or first active day) to all other active days
  const handleScheduleChange = (day: string, type: string, field: string, value: string) => {
    setFormData(prev => {
      const updated = structuredClone(prev.operating_schedule);
      (updated[day] as any)[type][field] = value;

      // Find the source day to copy from (Monday first, then first active day)
      const findSourceDay = () => {
        // Check Monday first if it's active and has complete times
        if (updated.Monday?.active && 
            updated.Monday.open.hh && updated.Monday.open.mm &&
            updated.Monday.close.hh && updated.Monday.close.mm) {
          return 'Monday';
        }
        
        // If Monday not available, find the first active day with complete times
        for (const weekday of WEEKDAYS) {
          if (updated[weekday]?.active &&
              updated[weekday].open.hh && updated[weekday].open.mm &&
              updated[weekday].close.hh && updated[weekday].close.mm) {
            return weekday;
          }
        }
        
        return null;
      };

      const sourceDay = findSourceDay();

      // Auto-populate: Copy from source day to all other active days that are empty
      if (sourceDay) {
        const sourceTimes = updated[sourceDay];
        let copiedCount = 0;

        for (const weekday of WEEKDAYS) {
          // Skip the source day itself
          if (weekday === sourceDay) continue;
          
          // Only copy to active days that are empty
          if (updated[weekday]?.active &&
              !updated[weekday].open.hh && !updated[weekday].open.mm &&
              !updated[weekday].close.hh && !updated[weekday].close.mm) {
            updated[weekday].open = { ...sourceTimes.open };
            updated[weekday].close = { ...sourceTimes.close };
            copiedCount++;
          }
        }

        if (copiedCount > 0) {
          setTimeout(() => {
            console.log(`Copied ${sourceDay} times to ${copiedCount} other active day(s)`);
          }, 0);
        }
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
      const { city, region } = getLocationFromPostcode(formData.postcode);
      if (city && region) {
        setFormData((prev) => ({
          ...prev,
          city,
          region,
        }));
        console.log("City and region auto-filled");
      }
    }
  }, [formData.postcode]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      console.error("Site name is required");
      return;
    }

    if (!formData.address_line1?.trim()) {
      console.error("Address Line 1 is required");
      return;
    }

    if (!formData.postcode?.trim()) {
      console.error("Postcode is required");
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
        city: formData.city && typeof formData.city === 'string' ? formData.city.trim() : null,
        region: formData.region && typeof formData.region === 'string' ? formData.region.trim() : null,
        status: formData.status,
        gm_user_id: formData.gm_user_id ? formData.gm_user_id.trim() : null,
        operating_schedule: cleanedSchedule
      };

      console.log("Saving site data:", formData.city, formData.region);

      // Upsert site data
      const { data: siteResult, error: siteError } = await supabase
        .from("sites")
        .upsert(siteData, { onConflict: "id" })
        .select()
        .single();

      if (siteError) {
        console.error(`Save failed: ${siteError.message}`);
        return;
      }

      // 1️⃣ After site upsert succeeds and returns the site ID
      const siteId = siteResult.id;

      // Update subscription site count
      if (companyId) {
        try {
          const { updateSubscriptionSiteCount } = await import("@/lib/subscriptions");
          await updateSubscriptionSiteCount(companyId);
        } catch (err) {
          console.error("Failed to update subscription site count:", err);
          // Don't fail the site save if this fails
        }
      }

      // 2️⃣ When editing, delete existing closures first to avoid duplicates
      if (mode === "edit" && siteId) {
        const { error: deleteError } = await supabase
          .from("site_closures")
          .delete()
          .eq("site_id", siteId);

        if (deleteError) {
          console.error("Error deleting existing closures:", deleteError);
          // Continue anyway - might be a new site or no existing closures
        }
      }

      // 3️⃣ Filter only active closures
      const activeClosures = (formData.planned_closures || []).filter(c => c.start && c.end);

      // 4️⃣ If any closures exist, insert them
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
          console.error("Error details:", JSON.stringify(closureError, null, 2));
          console.error("Closures to insert:", closuresToInsert);
        } else {
          console.log(`Inserted ${closuresToInsert.length} closures for site ${siteId}`);
        }
      } else if (mode === "edit" && siteId) {
        // If no closures in form, ensure all are deleted (already done above)
        console.log(`No closures to insert for site ${siteId}`);
      }

      console.log(`Site ${mode === "edit" ? "updated" : "created"} successfully`);
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving site:", error);
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
            {/* Header with Update GM button on the left */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">Management Contact</h3>
                <button
                  type="button"
                  onClick={() => setGmEditMode((v) => !v)}
                  className="px-3 py-1.5 border border-pink-500 text-pink-500 hover:bg-pink-500/10 rounded-md text-sm transition-colors"
                  aria-pressed={gmEditMode}
                >
                  {gmEditMode ? "Cancel" : "Update GM"}
                </button>
              </div>
            </div>

            {/* Single row: GM Name | Select a Manager | Save & Sync */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                {/* GM Name (read-only) */}
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

                {/* Select a Manager (disabled until Update GM toggled) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Select a Manager</label>
                  <select
                    value={formData.gm_user_id || ""}
                    onChange={(e) => handleGMChange(e.target.value)}
                    disabled={!gmEditMode}
                    className={`w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Select a manager</option>
                    {(gmList || []).map((gm) => (
                      <option key={gm.id} value={gm.id}>
                        {gm.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save & Sync (disabled until Update GM toggled and a selection exists) */}
                <div className="flex">
                  <button
                    type="button"
                    onClick={handleSaveAndSync}
                    disabled={!gmEditMode || !formData.gm_user_id || isSaving}
                    className="ml-auto px-4 py-2 border border-pink-600 text-pink-600 rounded-lg hover:shadow-lg hover:shadow-pink-600/50 hover:border-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save & Sync"}
                  </button>
                </div>
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
                onChange={(date: Date | null) => setNewClosure(prev => ({
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
                onChange={(date: Date | null) => setNewClosure(prev => ({
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