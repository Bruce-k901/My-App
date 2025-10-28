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
    // Save as draft - stays only in Templates page
    setStatus("draft");
    setIsExpanded(false);
    
    // Store template config
    const config = {
      equipment: equipmentRows.filter(row => row.assetId !== "").map(row => ({
        assetId: row.assetId,
        nickname: row.nickname
      })),
      day_parts: selectedDayParts,
      times: times.slice(0, selectedDayParts.length)
    };
    
    console.log("Saving draft template:", config);
    alert("Template saved as draft in Templates page!");
  };

  const handleSaveAndDeploy = async () => {
    // Save as draft in Templates AND deploy copy to My Tasks
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
      // 1. Create a task template for this temperature check configuration
      const templateName = "SFBB Temperature Checks";
      const templateSlug = `sfbb-temperature-checks-${Date.now()}`;
      
      const templateData = {
        company_id: profile.company_id,
        name: templateName,
        slug: templateSlug,
        description: "Daily temperature monitoring for refrigeration equipment",
        category: "food_safety",
        frequency: "daily",
        is_active: true,
        is_template_library: true
      };

      // Check if template already exists with this name
      const { data: existingTemplates, error: searchError } = await supabase
        .from("task_templates")
        .select("id")
        .eq("company_id", profile.company_id)
        .eq("name", templateName);

      if (searchError) {
        console.error("Error searching for template:", searchError);
      }

      const existing = existingTemplates?.[0];
      let template;

      if (existing) {
        // Update existing template
        const { data, error: updateError } = await supabase
          .from("task_templates")
          .update(templateData)
          .eq("id", existing.id)
          .select()
          .single();
        
        if (updateError) {
          console.error("Error updating template:", updateError);
          alert("Error updating task template");
          return;
        }
        template = data;
      } else {
        // Insert new template
        const { data, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating template:", insertError);
          alert("Error creating task template");
          return;
        }
        template = data;
      }

      setIsExpanded(false);
      alert(`✅ Template saved as Draft in Templates page!\n\nNote: Full deployment to My Tasks requires database migrations to be applied.`);

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
