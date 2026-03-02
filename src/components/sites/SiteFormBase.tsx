"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

import { ChevronUp } from '@/components/ui/icons';
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

// Shared Tailwind class strings for theme-aware styling
const inputClasses = "w-full bg-theme-button border border-gray-300 dark:border-theme rounded-lg px-3 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]";
const readOnlyInputClasses = "w-full bg-gray-100 dark:bg-neutral-900 cursor-not-allowed border border-gray-300 dark:border-theme rounded-lg px-3 py-2 text-theme-primary focus:outline-none";
const labelClasses = "block text-sm font-medium text-theme-secondary mb-1";
const selectClasses = "w-full bg-theme-button border border-gray-300 dark:border-theme rounded-lg px-3 py-2 text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91]";
const scheduleSelectClasses = "bg-gray-100 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded pl-2 pr-7 py-1 text-theme-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed";
const scheduleRowClasses = "flex items-center gap-4 py-1.5 px-3 bg-theme-muted rounded-lg transition-opacity";

export default function SiteFormBase({ mode, initialData, onClose, onSaved, companyId, gmList, onDelete }: SiteFormBaseProps) {
  console.log("🎨 Rendered", "SiteFormBase");
  console.log("🔥 Received gmList prop:", gmList);
  const [operatingScheduleOpen, setOperatingScheduleOpen] = useState(mode === "new");
  const [loading, setLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newClosure, setNewClosure] = useState({ start: "", end: "" });

  // GM expansion state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState("");
  const [gmEditMode, setGmEditMode] = useState(false);

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
    // Default values for all required fields to prevent uncontrolled input warnings
    const defaults: Partial<FormData> = {
      name: "",
      address_line1: "",
      postcode: "",
      status: "active",
      general_manager: "",
      operating_schedule: defaultSchedule,
      planned_closures: [],
      gm_name: "",
      gm_email: "",
      gm_phone: "",
      gm_user_id: "",
    };

    // if editing a site with existing schedule
    if (initialData?.operating_schedule && Object.keys(initialData.operating_schedule).length > 0) {
      return {
        ...defaults,
        ...initialData,
        operating_schedule: { ...defaultSchedule, ...initialData.operating_schedule },
        planned_closures: initialData?.planned_closures ?? [],
        // Ensure all string fields have defaults to prevent undefined
        name: initialData?.name || "",
        address_line1: initialData?.address_line1 || "",
        postcode: initialData?.postcode || "",
        status: initialData?.status || "active",
        general_manager: initialData?.general_manager || "",
        gm_name: initialData?.gm_name || "",
        gm_email: initialData?.gm_email || "",
        gm_phone: initialData?.gm_phone || "",
        gm_user_id: initialData?.gm_user_id || "",
      };
    }

    // if creating a new site
    return {
      ...defaults,
      ...initialData,
      operating_schedule: defaultSchedule,
      planned_closures: initialData?.planned_closures ?? [],
      // Ensure all string fields have defaults to prevent undefined
      name: initialData?.name || "",
      address_line1: initialData?.address_line1 || "",
      postcode: initialData?.postcode || "",
      status: initialData?.status || "active",
      general_manager: initialData?.general_manager || "",
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
  const gmProfile = initialData?.gm_profile ?? null;
  useEffect(() => {
    if (gmProfile) {
      setFormData(prev => ({
        ...prev,
        gm_user_id: gmProfile.id,
        gm_name: gmProfile.full_name || "",
        gm_email: gmProfile.email || "",
        gm_phone: gmProfile.phone || ""
      }));
    }
    // Do NOT clear gm_user_id when gm_profile is missing — the enrichment
    // may have failed (RLS, etc.) but the assignment is still valid in the DB.
  }, [gmProfile]);

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
        gm_name: selectedGM.full_name ?? "",
        gm_phone: selectedGM.phone ?? "",
        gm_email: selectedGM.email ?? ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        gm_user_id: "",
        gm_name: "",
        gm_phone: "",
        gm_email: ""
      }));
    }
  };

  const handleSaveAndSync = async () => {
    // Use the same admin API path as the main Save button to bypass RLS
    await handleSave();
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
      // Convert empty strings to null for UUID fields to prevent PostgreSQL errors
      const gmUserId = formData.gm_user_id?.trim();
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
        gm_user_id: gmUserId && gmUserId.length > 0 ? gmUserId : null,
        operating_schedule: cleanedSchedule
      };

      console.log("Saving site data:", formData.city, formData.region);

      // Filter only active closures with valid dates
      const activeClosures = (formData.planned_closures || []).filter(c => c.start && c.end);
      // Remove duplicate closures
      const uniqueClosures = activeClosures.reduce((acc: any[], c) => {
        const exists = acc.some(existing => existing.start === c.start && existing.end === c.end);
        if (!exists) acc.push({ start: c.start, end: c.end, notes: c.notes || "" });
        return acc;
      }, []);

      // Save via API route (uses admin client, bypasses RLS)
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteData, closures: uniqueClosures }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(`Save failed: ${result.error}`, { status: res.status, code: result.code });
        return;
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

  // Render the schedule rows (shared between edit and new modes)
  const renderScheduleRows = () => (
    <div className="border border-gray-200 dark:border-neutral-800 rounded-xl p-4">
      <div className="space-y-2">
        {WEEKDAYS.map((day, index) => {
          const dayData = formData.operating_schedule[day];
          const dayLabel = WEEKDAY_LABELS[index];

          return (
            <div
              key={day}
              className={`${scheduleRowClasses} ${!dayData.active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-[100px]">
                <CheckboxCustom
                  checked={dayData.active}
                  onChange={(checked: boolean) => handleCheckboxChange(day, checked)}
                  size={16}
                />
                <span className="text-theme-primary text-sm font-medium">{dayLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-theme-tertiary text-sm">Open:</span>
                <select
                  value={dayData.open?.hh || ""}
                  onChange={(e) => handleScheduleChange(day, "open", "hh", e.target.value)}
                  disabled={!dayData.active}
                  className={scheduleSelectClasses}
                >
                  <option value="">HH</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <select
                  value={dayData.open?.mm || ""}
                  onChange={(e) => handleScheduleChange(day, "open", "mm", e.target.value)}
                  disabled={!dayData.active}
                  className={scheduleSelectClasses}
                >
                  <option value="">MM</option>
                  {[0, 15, 30, 45].map((minute) => (
                    <option key={minute} value={String(minute).padStart(2, "0")}>
                      {String(minute).padStart(2, "0")}
                    </option>
                  ))}
                </select>

                <span className="text-theme-tertiary text-sm mx-2">Close:</span>
                <select
                  value={dayData.close?.hh || ""}
                  onChange={(e) => handleScheduleChange(day, "close", "hh", e.target.value)}
                  disabled={!dayData.active}
                  className={scheduleSelectClasses}
                >
                  <option value="">HH</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, "0")}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <select
                  value={dayData.close?.mm || ""}
                  onChange={(e) => handleScheduleChange(day, "close", "mm", e.target.value)}
                  disabled={!dayData.active}
                  className={scheduleSelectClasses}
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
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative z-[10000] bg-theme-surface rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-2xl font-semibold text-theme-primary">
            {mode === "new" ? "Add New Site" : "Edit Site"}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* A. Core Details */}
          <section>
            <h3 className="text-xl font-semibold mb-3 text-theme-primary">Core Details</h3>

            {/* Two-column responsive grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Site Name and Postcode */}
              <div>
                <label className={labelClasses}>
                  Site Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={inputClasses}
                  placeholder="Enter site name"
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>
                  Postcode <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postcode?.toUpperCase() || ""}
                  onChange={(e) => {
                    const uppercaseValue = e.target.value.toUpperCase();
                    setFormData({ ...formData, postcode: uppercaseValue });
                  }}
                  className={inputClasses}
                  placeholder="Enter postcode"
                  required
                />
              </div>

              {/* Row 2: Address Line 1 and Address Line 2 */}
              <div>
                <label className={labelClasses}>
                  Address Line 1 <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address_line1 || ""}
                  onChange={(e) => handleInputChange("address_line1", e.target.value)}
                  className={inputClasses}
                  placeholder="Enter address line 1"
                  required
                />
              </div>
              <div>
                <label className={labelClasses}>Address Line 2</label>
                <input
                  type="text"
                  value={formData.address2 || ""}
                  onChange={(e) => handleInputChange("address2", e.target.value)}
                  className={inputClasses}
                  placeholder="Enter address line 2 (optional)"
                />
              </div>

              {/* Row 3: City and Region (auto-filled, read-only) */}
              <div>
                <label className={labelClasses}>City</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  readOnly
                  className={readOnlyInputClasses}
                  placeholder="Auto-filled from postcode"
                />
              </div>
              <div>
                <label className={labelClasses}>Region</label>
                <input
                  type="text"
                  value={formData.region || ""}
                  readOnly
                  className={readOnlyInputClasses}
                  placeholder="Auto-filled from postcode"
                />
              </div>

              {/* Row 4: Status and empty placeholder */}
              <div>
                <label className={labelClasses}>Status</label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className={selectClasses}
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
          <section className="mt-6 border-t border-gray-200 dark:border-neutral-800 pt-6">
            {/* Header with Update GM button on the left */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-theme-primary">Management Contact</h3>
                <button
                  type="button"
                  onClick={() => setGmEditMode((v) => !v)}
                  className="px-3 py-1.5 border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/15 rounded-md text-sm transition-colors"
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
                  <label className={labelClasses}>General Manager</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.gm_name || ""}
                    placeholder="No GM assigned"
                    className={readOnlyInputClasses}
                  />
                </div>

                {/* Select a Manager (disabled until Update GM toggled) */}
                <div>
                  <label className={labelClasses}>Select a Manager</label>
                  <select
                    value={formData.gm_user_id || ""}
                    onChange={(e) => handleGMChange(e.target.value)}
                    disabled={!gmEditMode}
                    className={`${selectClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    disabled={!gmEditMode || !formData.gm_user_id || loading}
                    className="ml-auto px-4 py-2 border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-lg hover:shadow-[#D37E91]/50 hover:border-[#D37E91] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save & Sync"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Operating Schedule */}
          <section className="mt-6 border-t border-gray-200 dark:border-neutral-800 pt-6">
            {mode === "edit" ? (
              <div>
                <h3 className="text-xl font-semibold mb-3 text-theme-primary">Operating Schedule</h3>
                {renderScheduleRows()}
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setOperatingScheduleOpen(!operatingScheduleOpen)}
                  className="flex items-center justify-between w-full text-left text-xl font-semibold text-theme-primary mb-3 hover:text-[#D37E91] transition-colors"
                >
                  Operating Schedule
                  <span className={`transform transition-transform ${operatingScheduleOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {operatingScheduleOpen && renderScheduleRows()}
              </div>
            )}
          </section>

          {/* D. Planned Closures */}
          <section className="mt-6 border-t border-gray-200 dark:border-neutral-800 pt-6">
            <h3 className="text-xl font-semibold text-theme-primary mb-4">Planned Closures</h3>

            <div className="flex gap-2 items-center mb-3">
              <DatePicker
                selected={newClosure.start ? new Date(newClosure.start) : null}
                onChange={(date: Date | null) => setNewClosure(prev => ({
                  ...prev,
                  start: date?.toISOString().split("T")[0] || ""
                }))}
                placeholderText="Start date"
                className="bg-theme-surface border border-gray-300 dark:border-theme text-theme-primary p-2 rounded-md"
                popperClassName="z-50"
                calendarClassName="bg-theme-surface text-theme-primary rounded-md shadow-lg"
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
                className="bg-theme-surface border border-gray-300 dark:border-theme text-theme-primary p-2 rounded-md"
                popperClassName="z-50"
                calendarClassName="bg-theme-surface text-theme-primary rounded-md shadow-lg"
              />

              <button
                type="button"
                onClick={handleAddClosure}
                disabled={!newClosure.start || !newClosure.end}
                className="px-4 py-2 border-2 border-green-500 text-green-600 dark:text-green-500 hover:bg-module-fg/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Confirm
              </button>
            </div>

            {formData.planned_closures?.length > 0 ? (
              <div className="space-y-2">
                {formData.planned_closures.map((closure, i) => (
                  <div key={i} className="flex justify-between items-center border border-theme rounded-md p-2">
                    <span className="text-sm text-theme-primary">
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
 <p className="text-gray-500 dark:text-theme-tertiary text-sm">No planned closures yet.</p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-neutral-800 flex justify-between">
          {/* Delete button - only show in edit mode */}
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-6 py-2 text-red-500 dark:text-red-400 border border-red-500 dark:border-red-400 rounded-lg hover:shadow-lg hover:shadow-red-400/50 hover:border-red-400 dark:hover:border-red-300 transition-all duration-200"
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
              className="px-6 py-2 text-theme-secondary border border-gray-300 dark:border-white rounded-lg hover:bg-theme-hover transition-all duration-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 border border-[#D37E91] text-[#D37E91] rounded-lg hover:shadow-lg hover:shadow-[#D37E91]/50 hover:border-[#D37E91] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
