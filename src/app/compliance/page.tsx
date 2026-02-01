"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/useUser";
import { supabase } from "@/lib/supabaseClient";
import { Thermometer, Edit2, X } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";

interface Asset {
  id: string;
  name: string;
  category: string;
  site_id: string;
  sites: { name: string };
}

interface EquipmentRow {
  id: string;
  assetId: string;
  nickname: string;
}

export default function CompliancePage() {
  const { profile } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [templateName, setTemplateName] = useState("SFBB Temperature Checks");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
    { id: crypto.randomUUID(), assetId: "", nickname: "" }
  ]);
  const [selectedDayParts, setSelectedDayParts] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [times, setTimes] = useState<string[]>(["09:00", "14:00", "20:00"]);
  const [status, setStatus] = useState<"draft">("draft");

  useEffect(() => {
    if (profile?.company_id && profile?.site_id) {
      loadAssets();
    }
  }, [profile?.company_id, profile?.site_id]);

  const loadAssets = async () => {
    if (!profile?.company_id || !profile?.site_id) return;

    // Only load assets from the user's home site
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, category, site_id, sites(name)")
      .eq("status", "active")
      .eq("site_id", profile.site_id) // Filter by user's home site
      .in("category", ["refrigeration", "freezer"])
      .order("name");

    if (!error && data) {
      setAssets(data as unknown as Asset[]);
    }
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
    setStatus("draft");
    
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    
    if (validEquipment.length === 0) {
      alert("Please select at least one equipment item");
      return;
    }

    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!profile?.company_id || !profile?.site_id) {
      alert("Missing user profile information");
      return;
    }

    // Check if template already exists with this name
    const { data: existingTemplates, error: searchError } = await supabase
      .from("checklist_templates")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("site_id", profile.site_id)
      .eq("name", templateName.trim());

    if (searchError) {
      console.error("Error searching for template:", searchError);
    }

    const existing = existingTemplates?.[0];

    const templateData = {
      company_id: profile.company_id,
      site_id: profile.site_id,
      name: templateName.trim(),
      description: "Daily temperature monitoring for refrigerators, freezers, and hot holding units",
      frequency: "daily",
      day_part: selectedDayParts[0] || "morning",
      category: "temperature",
      active: true,
      form_schema: {
        equipment: validEquipment.map(row => ({
          assetId: row.assetId,
          nickname: row.nickname
        })),
        day_parts: selectedDayParts,
        times: times.slice(0, selectedDayParts.length)
      }
    };

    let error;
    if (existing) {
      // Update existing template
      const result = await supabase
        .from("checklist_templates")
        .update(templateData)
        .eq("id", existing.id);
      error = result.error;
    } else {
      // Insert new template
      const result = await supabase
        .from("checklist_templates")
        .insert(templateData);
      error = result.error;
      
      // If duplicate, try updating instead
      if (error?.code === '23505') {
        const { data: fetchedTemplate } = await supabase
          .from("checklist_templates")
          .select("id")
          .eq("company_id", profile.company_id)
          .eq("site_id", profile.site_id)
          .eq("name", templateName.trim())
          .single();
        
        if (fetchedTemplate) {
          const updateResult = await supabase
            .from("checklist_templates")
            .update(templateData)
            .eq("id", fetchedTemplate.id);
          error = updateResult.error;
        }
      }
    }

    if (error) {
      console.error("Error saving template:", error);
      alert("Error saving template: " + error.message);
    } else {
      setIsExpanded(false);
      alert("✅ Template saved successfully!");
    }
  };

  const handleSaveAndDeploy = async () => {
    setStatus("draft");
    
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    
    if (validEquipment.length === 0) {
      alert("Please select at least one equipment item");
      return;
    }

    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    if (!profile?.site_id || !profile?.company_id) {
      alert("No home site found for user");
      return;
    }

    // Check if template already exists with this name
    const { data: existingTemplates, error: searchError } = await supabase
      .from("checklist_templates")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("site_id", profile.site_id)
      .eq("name", templateName.trim());

    if (searchError) {
      console.error("Error searching for template:", searchError);
    }

    const existing = existingTemplates?.[0];

    const templateData = {
      company_id: profile.company_id,
      site_id: profile.site_id,
      name: templateName.trim(),
      description: "Daily temperature monitoring for refrigerators, freezers, and hot holding units",
      frequency: "daily",
      day_part: selectedDayParts[0] || "morning",
      category: "temperature",
      active: true,
      form_schema: {
        equipment: validEquipment.map(row => ({
          assetId: row.assetId,
          nickname: row.nickname,
          assetName: assets.find(a => a.id === row.assetId)?.name || ""
        })),
        day_parts: selectedDayParts,
        times: times.slice(0, selectedDayParts.length)
      }
    };

    let template;
    if (existing) {
      // Update existing template
      const { data, error: templateError } = await supabase
        .from("checklist_templates")
        .update(templateData)
        .eq("id", existing.id)
        .select()
        .single();
      
      if (templateError) {
        console.error("Error updating template:", templateError);
        alert("Error updating template: " + templateError.message);
        return;
      }
      template = data;
    } else {
      // Insert new template
      const { data, error: templateError } = await supabase
        .from("checklist_templates")
        .insert(templateData)
        .select()
        .single();
      
      if (templateError) {
        console.error("Error creating template:", templateError);
        
        // If it's a duplicate error, try to fetch the existing one
        if (templateError.code === '23505') {
          const { data: fetchedTemplate } = await supabase
            .from("checklist_templates")
            .select("id")
            .eq("company_id", profile.company_id)
            .eq("site_id", profile.site_id)
            .eq("name", templateName.trim())
            .single();
          
          if (fetchedTemplate) {
            // Update the existing one instead
            const { data: updatedTemplate, error: updateError } = await supabase
              .from("checklist_templates")
              .update(templateData)
              .eq("id", fetchedTemplate.id)
              .select()
              .single();
            
            if (updateError) {
              alert("Error updating existing template: " + updateError.message);
              return;
            }
            template = updatedTemplate;
          } else {
            alert("Error saving template: " + templateError.message);
            return;
          }
        } else {
          alert("Error saving template: " + templateError.message);
          return;
        }
      } else {
        template = data;
      }
    }

    // Then create site_checklist entries for each day part
    const checklistEntries = selectedDayParts.map((dayPart) => ({
      site_id: profile.site_id,
      checklist_template_id: template.id,
      name: templateName.trim(),
      day_part: dayPart,
      frequency: "daily",
      active: true
    }));

    const { error: checklistError } = await supabase
      .from("site_checklists")
      .upsert(checklistEntries, { onConflict: "site_id,checklist_template_id,day_part" });

    if (checklistError) {
      console.error("Error deploying:", checklistError);
      alert("Template saved but error deploying to My Tasks: " + checklistError.message);
    } else {
      setIsExpanded(false);
      alert("✅ Template saved and deployed successfully!");
    }
  };

  const dayParts = [
    { id: "morning", label: "Morning" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" }
  ];

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Available Templates</h1>
          <p className="text-slate-300 text-sm">
            Deploy compliance tasks to your sites. Each template includes SFBB requirements and can be customized per site.
          </p>
        </div>
        <button
          onClick={() => {
            setTemplateName("SFBB Temperature Checks");
            setEquipmentRows([{ id: crypto.randomUUID(), assetId: "", nickname: "" }]);
            setSelectedDayParts(["morning", "afternoon", "evening"]);
            setTimes(["09:00", "14:00", "20:00"]);
            setIsExpanded(true);
          }}
          className="px-4 py-2 rounded-lg bg-magenta-500/10 border border-magenta-500 text-magenta-400 hover:bg-magenta-500/20 transition-colors text-sm font-medium"
        >
          + Create New Template
        </button>
      </div>

      {/* SFBB Temperature Checks Template Card */}
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
                  <h3 className="text-lg font-semibold">{templateName}</h3>
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
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Morning Fridges, Evening Walk-ins, All Equipment"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-magenta-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Give this template a unique name to identify it (e.g., "Morning Fridges Only", "Evening Walk-in Coolers")
                </p>
              </div>

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
                        {assets.map(asset => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name}
                          </option>
                        ))}
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
                      <TimePicker
                        value={times[index] || "09:00"}
                        onChange={(value) => updateTime(index, value)}
                        className="w-full"
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
    </div>
  );
}