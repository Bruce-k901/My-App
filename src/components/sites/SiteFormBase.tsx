"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

type SiteFormBaseProps = {
  mode: "new" | "edit";
  initialData?: any;
  onClose: () => void;
  onSaved?: () => void;
  companyId: string;
  gmList?: Array<{id: string, full_name: string, email: string, phone?: string | null, home_site?: string | null, company_id?: string | null}>;
};

type FormData = {
  id?: string;
  name: string;
  postcode: string;
  city: string;
  region: string;
  status: string;
  general_manager: string;
  gm_user_id?: string;
  gm_phone: string;
  gm_email: string;
  gm_name?: string;
  operating_schedule: {
    [key: string]: {
      open: boolean;
      openHour: string;
      openMinute: string;
      closeHour: string;
      closeMinute: string;
    };
  };
  planned_closures: Array<{
    start_date: string;
    end_date: string;
    reason: string;
  }>;
};

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SiteFormBase({ mode, initialData, onClose, onSaved, companyId, gmList: propGmList }: SiteFormBaseProps) {
  const { showToast } = useToast();
  const [operatingScheduleOpen, setOperatingScheduleOpen] = useState(mode === "new");
  const [plannedClosuresOpen, setPlannedClosuresOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gmList, setGmList] = useState<Array<{id: string, full_name: string, email: string, role?: string | null, position_title?: string | null, site_id?: string | null, phone?: string | null}>>(propGmList || []);

  // Debug logging for gmList prop
  console.log("gmList prop in SiteFormBase:", propGmList?.length, propGmList?.[0]);

  const [formData, setFormData] = useState<FormData>(() => {
    const defaultSchedule = WEEKDAYS.reduce((acc, day) => {
      acc[day] = {
        open: false,
        openHour: "",
        openMinute: "",
        closeHour: "",
        closeMinute: ""
      };
      return acc;
    }, {} as FormData["operating_schedule"]);

    return {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      postcode: initialData?.postcode || "",
      city: initialData?.city || "",
      region: initialData?.region || "",
      status: initialData?.status || "active",
      general_manager: initialData?.general_manager || "",
      gm_user_id: initialData?.gm_user_id ? String(initialData.gm_user_id) : "",
      gm_phone: initialData?.gm_phone || "",
      gm_email: initialData?.gm_email || "",
      operating_schedule: initialData?.operating_schedule || defaultSchedule,
      planned_closures: initialData?.planned_closures || []
    };
  });

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
          const { data: closures, error: closuresError } = await supabase
            .from("site_closures")
            .select("*")
            .eq("site_id", initialData.id);

          if (closuresError) {
            showToast(`Failed to load closures: ${closuresError.message}`, "error");
          }

          // Update form data with fetched data
          if (site) {
            setFormData(prev => ({
              ...prev,
              id: site.id,
              name: site.name || "",
              postcode: site.postcode || "",
              city: site.city || "",
              region: site.region || "",
              status: site.status || "active",
              gm_user_id: site.gm_user_id || "",
              operating_schedule: site.operating_schedule || prev.operating_schedule,
              planned_closures: closures || []
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

  // Temporary fetch test
  useEffect(() => { 
    const fetchManagers = async () => { 
      const { data, error } = await supabase 
        .from("gm_index") 
        .select("id, full_name, email, phone, home_site, company_id"); 
 
      console.log("GM Fetch Result:", data); 
      if (error) console.error("GM fetch error:", error); 
      else setGmList(data || []); 
    }; 
 
    fetchManagers(); 
  }, []);

  useEffect(() => {
    if (initialData && gmList?.length) {
      const gm = gmList.find(g => g.home_site === initialData.id);
      if (gm) {
        setFormData(prev => ({
          ...prev,
          gm_user_id: gm.id,
          gm_name: gm.full_name,
          gm_email: gm.email,
          gm_phone: gm.phone,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          gm_user_id: "",
          gm_name: "",
          gm_email: "No email",
          gm_phone: "No phone",
        }));
      }
    }
  }, [initialData, gmList]);

  const handleGMChange = (gmId: string) => {
    const selectedGM = gmList.find(gm => gm.id === gmId);
    if (selectedGM) {
      setFormData(prev => ({
        ...prev,
        gm_user_id: selectedGM.id,
        gm_phone: selectedGM.phone || "",
        gm_email: selectedGM.email || ""
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

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleScheduleChange = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      operating_schedule: {
        ...prev.operating_schedule,
        [day]: {
          ...prev.operating_schedule[day],
          [field]: value
        }
      }
    }));
  };

  const addPlannedClosure = () => {
    setFormData(prev => ({
      ...prev,
      planned_closures: [...prev.planned_closures, { start_date: "", end_date: "", reason: "" }]
    }));
  };

  const removePlannedClosure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      planned_closures: prev.planned_closures.filter((_, i) => i !== index)
    }));
  };

  const updatePlannedClosure = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      planned_closures: prev.planned_closures.map((closure, i) => 
        i === index ? { ...closure, [field]: value } : closure
      )
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Site name is required", "error");
      return;
    }

    setLoading(true);
    try {
      // Prepare site data for upsert (Objective 3)
      const siteData = {
        ...(formData.id && { id: formData.id }), // Include ID only if editing
        company_id: companyId,
        name: formData.name.trim(),
        postcode: formData.postcode.trim(),
        city: formData.city.trim(),
        region: formData.region.trim(),
        status: formData.status,
        gm_user_id: formData.gm_user_id ? formData.gm_user_id.trim() : null,
        operating_schedule: formData.operating_schedule
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

      const siteId = siteResult.id;

      // Handle planned closures atomically
      if (mode === "edit" && formData.id) {
        // Delete existing closures
        const { error: deleteError } = await supabase
          .from("site_closures")
          .delete()
          .eq("site_id", formData.id);

        if (deleteError) {
          showToast(`Failed to update closures: ${deleteError.message}`, "error");
          return;
        }
      }

      // Insert new/updated closures
      if (formData.planned_closures.length > 0) {
        const closuresData = formData.planned_closures
          .filter(closure => closure.start_date && closure.end_date && closure.reason)
          .map(closure => ({
            site_id: siteId,
            start_date: closure.start_date,
            end_date: closure.end_date,
            reason: closure.reason.trim()
          }));

        if (closuresData.length > 0) {
          const { error: closuresError } = await supabase
            .from("site_closures")
            .insert(closuresData);

          if (closuresError) {
            showToast(`Failed to save closures: ${closuresError.message}`, "error");
            return;
          }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter site name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Postcode</label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => handleInputChange("postcode", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter postcode"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleInputChange("region", e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter region"
                />
              </div>
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
            </div>
          </section>

          {/* Management Contact */}
          <section className="mt-6 border-t border-neutral-800 pt-6">
            <h3 className="text-xl font-semibold mb-3 text-white">Management Contact</h3>
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
                        <div key={day} className="flex items-center gap-4 py-1.5 px-3 bg-neutral-800 rounded-lg">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <input
                              type="checkbox"
                              checked={dayData.open}
                              onChange={(e) => handleScheduleChange(day, "open", e.target.checked)}
                              className="w-4 h-4 text-pink-500 bg-neutral-700 border-neutral-600 rounded focus:ring-pink-500"
                            />
                            <span className="text-white text-sm font-medium">{dayLabel}</span>
                          </div>
                          
                          {dayData.open && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 text-sm">Open:</span>
                              <select
                                value={dayData.openHour}
                                onChange={(e) => handleScheduleChange(day, "openHour", e.target.value)}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                              >
                                <option value="">HH</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={dayData.openMinute}
                                onChange={(e) => handleScheduleChange(day, "openMinute", e.target.value)}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                              >
                                <option value="">MM</option>
                                {Array.from({ length: 60 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                              
                              <span className="text-gray-400 text-sm mx-2">Close:</span>
                              <select
                                value={dayData.closeHour}
                                onChange={(e) => handleScheduleChange(day, "closeHour", e.target.value)}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                              >
                                <option value="">HH</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={dayData.closeMinute}
                                onChange={(e) => handleScheduleChange(day, "closeMinute", e.target.value)}
                                className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                              >
                                <option value="">MM</option>
                                {Array.from({ length: 60 }, (_, i) => (
                                  <option key={i} value={String(i).padStart(2, "0")}>
                                    {String(i).padStart(2, "0")}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
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
                          <div key={day} className="flex items-center gap-4 py-1.5 px-3 bg-neutral-800 rounded-lg">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <input
                                type="checkbox"
                                checked={dayData.open}
                                onChange={(e) => handleScheduleChange(day, "open", e.target.checked)}
                                className="w-4 h-4 text-pink-500 bg-neutral-700 border-neutral-600 rounded focus:ring-pink-500"
                              />
                              <span className="text-white text-sm font-medium">{dayLabel}</span>
                            </div>
                            
                            {dayData.open && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">Open:</span>
                                <select
                                  value={dayData.openHour}
                                  onChange={(e) => handleScheduleChange(day, "openHour", e.target.value)}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="">HH</option>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={String(i).padStart(2, "0")}>
                                      {String(i).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={dayData.openMinute}
                                  onChange={(e) => handleScheduleChange(day, "openMinute", e.target.value)}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="">MM</option>
                                  {Array.from({ length: 60 }, (_, i) => (
                                    <option key={i} value={String(i).padStart(2, "0")}>
                                      {String(i).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                                
                                <span className="text-gray-400 text-sm mx-2">Close:</span>
                                <select
                                  value={dayData.closeHour}
                                  onChange={(e) => handleScheduleChange(day, "closeHour", e.target.value)}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="">HH</option>
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={String(i).padStart(2, "0")}>
                                      {String(i).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={dayData.closeMinute}
                                  onChange={(e) => handleScheduleChange(day, "closeMinute", e.target.value)}
                                  className="bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="">MM</option>
                                  {Array.from({ length: 60 }, (_, i) => (
                                    <option key={i} value={String(i).padStart(2, "0")}>
                                      {String(i).padStart(2, "0")}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
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
            <button
              type="button"
              onClick={() => setPlannedClosuresOpen(!plannedClosuresOpen)}
              className="flex items-center justify-between w-full text-left text-xl font-semibold text-white mb-3 hover:text-pink-400 transition-colors"
            >
              Planned Closures
              <span className={`transform transition-transform ${plannedClosuresOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {plannedClosuresOpen && (
              <div className="border border-neutral-800 rounded-xl p-4">
                <div className="space-y-4">
                  {formData.planned_closures.map((closure, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-neutral-800 rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={closure.start_date}
                            onChange={(e) => updatePlannedClosure(index, "start_date", e.target.value)}
                            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">End Date</label>
                          <input
                            type="date"
                            value={closure.end_date}
                            onChange={(e) => updatePlannedClosure(index, "end_date", e.target.value)}
                            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Reason</label>
                          <input
                            type="text"
                            value={closure.reason}
                            onChange={(e) => updatePlannedClosure(index, "reason", e.target.value)}
                            placeholder="e.g., Renovation, Holiday"
                            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlannedClosure(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addPlannedClosure}
                    className="w-full py-2 border-2 border-dashed border-neutral-600 rounded-lg text-gray-400 hover:text-white hover:border-neutral-500 transition-colors"
                  >
                    + Add Planned Closure
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : mode === "edit" ? "Update Site" : "Create Site"}
          </button>
        </div>
      </div>
    </div>
  );
}