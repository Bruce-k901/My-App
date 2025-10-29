"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Thermometer, Edit2, X } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string | null;
  site_id: string | null;
  company_id: string | null;
  status: string | null;
}

interface EquipmentRow {
  id: string;
  assetId: string;
  nickname: string;
}

export function TemperatureCheckTemplate() {
  const { profile } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
    { id: crypto.randomUUID(), assetId: "", nickname: "" }
  ]);
  const [selectedDayParts, setSelectedDayParts] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [times, setTimes] = useState<string[]>(["09:00", "14:00", "20:00"]);
  const [status, setStatus] = useState<"draft">("draft");

  useEffect(() => {
    if (profile?.company_id) {
      loadAssets();
    }
  }, [profile?.company_id, profile?.site_id]);

  const loadAssets = async () => {
    if (!profile?.company_id) return;


    // Load all active assets from the user's company (and site if available)
    let query = supabase
      .from("assets")
      .select("id, name, category, site_id, company_id, status")
      .eq("status", "active")
      .eq("company_id", profile.company_id)
      .eq("archived", false)
      .order("name");

    // If user has a site_id, filter by site
    if (profile.site_id) {
      query = query.eq("site_id", profile.site_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading assets:", error);
      return;
    }

    setAssets(data as unknown as Asset[]);
  };

  const addEquipmentRow = () => {
    setEquipmentRows(prev => [...prev, { id: crypto.randomUUID(), assetId: "", nickname: "" }]);
  };

  const removeEquipmentRow = (id: string) => {
    setEquipmentRows(prev => prev.filter(row => row.id !== id));
  };

  const updateEquipmentRow = (id: string, field: 'assetId' | 'nickname', value: string) => {
    setEquipmentRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const toggleDayPart = (dayPart: string) => {
    setSelectedDayParts(prev =>
      prev.includes(dayPart) ? prev.filter(dp => dp !== dayPart) : [...prev, dayPart]
    );
  };

  const updateTime = (index: number, time: string) => {
    setTimes(prev => {
      const newTimes = [...prev];
      newTimes[index] = time;
      return newTimes;
    });
  };

  const handleSave = async () => {
    // Save as draft - goes to Drafts page
    setStatus("draft");
    
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    
    if (validEquipment.length === 0) {
      alert("Please select at least one equipment item");
      return;
    }

    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      // Create a draft task template (not in library, goes to drafts)
      const templateName = "SFBB Temperature Checks (Draft)";
      const templateSlug = `sfbb-temperature-checks-draft-${Date.now()}`;
      
      const templateData = {
        company_id: profile.company_id,
        name: templateName,
        slug: templateSlug,
        description: "Daily temperature monitoring for refrigeration equipment - Draft",
        category: "food_safety",
        frequency: "daily",
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        assigned_to_role: "kitchen_manager",
        repeatable_field_name: "fridge_name",
        evidence_types: ["temperature", "photo", "pass_fail"],
        compliance_standard: "Food Safety Act / HACCP",
        audit_category: "food_safety",
        is_critical: false,
        is_template_library: false, // This makes it a draft
        is_active: true,
        instructions: `Temperature check for: ${validEquipment.map(eq => eq.nickname || 'Equipment').join(', ')}`
      };

      // Create the template
      const { data: template, error: insertError } = await supabase
        .from("task_templates")
        .insert(templateData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating draft template:", insertError);
        alert("Error creating draft template");
        return;
      }

      // Create fields for the template
      const fields = [
        {
          task_template_id: template.id,
          field_name: "fridge_name",
          field_label: "Fridge Name",
          field_type: "select",
          is_required: true,
          display_order: 1,
          help_text: "Select the unit being checked",
          options: validEquipment.map(eq => ({
            value: eq.assetId,
            label: eq.nickname || 'Equipment'
          }))
        },
        {
          task_template_id: template.id,
          field_name: "temperature",
          field_label: "Temperature (°C)",
          field_type: "temperature",
          is_required: true,
          min_value: -20,
          max_value: 10,
          display_order: 2,
          help_text: "Cold hold must be between 0-8°C"
        },
        {
          task_template_id: template.id,
          field_name: "status",
          field_label: "Status",
          field_type: "pass_fail",
          is_required: true,
          display_order: 3
        },
        {
          task_template_id: template.id,
          field_name: "initials",
          field_label: "Initials",
          field_type: "text",
          is_required: true,
          display_order: 4
        },
        {
          task_template_id: template.id,
          field_name: "photo",
          field_label: "Photo Evidence",
          field_type: "photo",
          is_required: false,
          display_order: 5
        }
      ];

      const { error: fieldsError } = await supabase
        .from("task_fields")
        .insert(fields);

      if (fieldsError) {
        console.error("Error creating template fields:", fieldsError);
        alert("Template created but fields failed to save");
        return;
      }

      setIsExpanded(false);
      alert("✅ Template saved as Draft! Check the Drafts page to see your template.");
      
    } catch (error) {
      console.error("Draft save error:", error);
      alert("Error saving draft template");
    }
  };

  const handleSaveAndDeploy = async () => {
    // Save as template AND deploy task instances to My Tasks
    setStatus("draft");
    
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    
    if (validEquipment.length === 0) {
      alert("Please select at least one equipment item");
      return;
    }

    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      // 1. Create a task template (goes to Templates page)
      const templateName = "SFBB Temperature Checks";
      const templateSlug = `sfbb-temperature-checks-${Date.now()}`;
      
      const templateData = {
        company_id: profile.company_id,
        name: templateName,
        slug: templateSlug,
        description: "Daily temperature monitoring for refrigeration equipment",
        category: "food_safety",
        frequency: "daily",
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        assigned_to_role: "kitchen_manager",
        repeatable_field_name: "fridge_name",
        evidence_types: ["temperature", "photo", "pass_fail"],
        compliance_standard: "Food Safety Act / HACCP",
        audit_category: "food_safety",
        is_critical: false,
        is_template_library: true, // This makes it available in Templates
        is_active: true,
        instructions: `Temperature check for: ${validEquipment.map(eq => eq.nickname || 'Equipment').join(', ')}`
      };

      // Create the template
      const { data: template, error: insertError } = await supabase
        .from("task_templates")
        .insert(templateData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating template:", insertError);
        alert("Error creating task template");
        return;
      }

      // 2. Create fields for the template
      const fields = [
        {
          task_template_id: template.id,
          field_name: "fridge_name",
          field_label: "Fridge Name",
          field_type: "select",
          is_required: true,
          display_order: 1,
          help_text: "Select the unit being checked",
          options: validEquipment.map(eq => ({
            value: eq.assetId,
            label: eq.nickname || 'Equipment'
          }))
        },
        {
          task_template_id: template.id,
          field_name: "temperature",
          field_label: "Temperature (°C)",
          field_type: "temperature",
          is_required: true,
          min_value: -20,
          max_value: 10,
          display_order: 2,
          help_text: "Cold hold must be between 0-8°C"
        },
        {
          task_template_id: template.id,
          field_name: "status",
          field_label: "Status",
          field_type: "pass_fail",
          is_required: true,
          display_order: 3
        },
        {
          task_template_id: template.id,
          field_name: "initials",
          field_label: "Initials",
          field_type: "text",
          is_required: true,
          display_order: 4
        },
        {
          task_template_id: template.id,
          field_name: "photo",
          field_label: "Photo Evidence",
          field_type: "photo",
          is_required: false,
          display_order: 5
        }
      ];

      const { error: fieldsError } = await supabase
        .from("task_fields")
        .insert(fields);

      if (fieldsError) {
        console.error("Error creating template fields:", fieldsError);
        alert("Template created but fields failed to save");
        return;
      }

      // 3. Create task instances for immediate deployment (goes to My Tasks)
      const today = new Date();
      const taskInstances = [];

      // Create instances for each day part selected
      for (let i = 0; i < selectedDayParts.length; i++) {
        const dayPart = selectedDayParts[i];
        const time = times[i] || "09:00";
        
        // Create a task instance for today
        const scheduledDate = today.toISOString().split('T')[0];
        const [hours, minutes] = time.split(':');
        const scheduledTime = `${hours}:${minutes}:00`;
        
        // Calculate due datetime (2 hours after scheduled time)
        const dueDateTime = new Date(today);
        dueDateTime.setHours(parseInt(hours) + 2, parseInt(minutes), 0, 0);
        
        taskInstances.push({
          task_template_id: template.id,
          company_id: profile.company_id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          due_datetime: dueDateTime.toISOString(),
          assigned_to_user_id: profile.id, // Assign to current user
          site_id: profile.site_id,
          status: "pending",
          custom_name: `Temperature Check - ${dayPart.charAt(0).toUpperCase() + dayPart.slice(1)}`,
          custom_instructions: `Check temperatures for all refrigeration units during ${dayPart} service.`
        });
      }

      // Insert all task instances
      const { error: instancesError } = await supabase
        .from("task_instances")
        .insert(taskInstances);

      if (instancesError) {
        console.error("Error creating task instances:", instancesError);
        alert("Template created but task instances failed to deploy");
        return;
      }

      setIsExpanded(false);
      alert(`✅ Template saved and deployed!\n\n📋 Template available in Templates page\n📝 ${taskInstances.length} task(s) created in My Tasks page`);

    } catch (error) {
      console.error("Deployment error:", error);
      alert("Error deploying to My Tasks");
    }
  };

  const dayParts = [
    { id: "morning", label: "Morning" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" }
  ];

  return (
    <div className="rounded-xl border border-magenta-500 bg-[#141823]">
      {/* Card Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-[#1a1f2e] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-magenta-500/10 border border-magenta-500/20">
              <Thermometer className="w-5 h-5 text-magenta-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">SFBB Temperature Checks</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Draft
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Daily temperature monitoring for refrigerators, freezers, and hot holding units to ensure food safety compliance.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Regulation:</span>
                  <p className="text-slate-200 font-medium">SFBB</p>
                </div>
                <div>
                  <span className="text-slate-500">Frequency:</span>
                  <p className="text-slate-200 font-medium">Daily</p>
                </div>
                <div>
                  <span className="text-slate-500">Requirement:</span>
                  <p className="text-slate-200 font-medium">3x daily</p>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="text-slate-200 font-medium">Food Safety</p>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 rounded-lg hover:bg-magenta-500/10 text-magenta-400 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Edit Mode */}
      {isExpanded && (
        <div className="border-t border-neutral-800 p-6 bg-[#0f1220]">
          <div className="space-y-6">
              {/* Equipment Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium">
                    Equipment to Monitor
                  </label>
                  <button
                    type="button"
                    onClick={addEquipmentRow}
                    className="text-sm px-3 py-1 rounded-lg border border-magenta-500 text-magenta-400 hover:bg-magenta-500/10 transition-colors"
                  >
                    + Add Equipment
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {equipmentRows.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-[#141823]"
                    >
                      {/* Equipment Dropdown */}
                      <select
                        value={row.assetId}
                        onChange={(e) => updateEquipmentRow(row.id, 'assetId', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200"
                      >
                        <option value="">Select equipment...</option>
                        {assets.length === 0 ? (
                          <option value="" disabled>No equipment found</option>
                        ) : (
                          assets.map(asset => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name}
                            </option>
                          ))
                        )}
                      </select>
                      
                      {/* Nickname Input */}
                      <input
                        type="text"
                        placeholder="Nickname (e.g., Fridge 1, ABC)"
                        value={row.nickname}
                        onChange={(e) => updateEquipmentRow(row.id, 'nickname', e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200 placeholder:text-slate-500"
                      />

                      {/* Delete Button */}
                      {equipmentRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEquipmentRow(row.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            {/* Day Parts Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                When to Run Task (Day Parts)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {dayParts.map(part => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => toggleDayPart(part.id)}
                    className={`px-4 py-3 rounded-lg border text-center transition-all ${
                      selectedDayParts.includes(part.id)
                        ? "border-magenta-500 bg-magenta-500/10 text-magenta-400"
                        : "border-neutral-800 bg-[#141823] text-slate-400 hover:border-neutral-700"
                    }`}
                  >
                    <div className="text-sm font-medium">{part.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Settings */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Check Times
              </label>
              <div className="grid grid-cols-3 gap-3">
                {selectedDayParts.map((dayPart, index) => (
                  <div key={dayPart}>
                    <label className="block text-xs text-slate-400 mb-1 capitalize">
                      {dayPart}
                    </label>
                    <input
                      type="time"
                      value={times[index] || "09:00"}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleSaveAndDeploy}
                className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150"
              >
                Save & Deploy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
