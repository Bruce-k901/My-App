"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Lightbulb, Edit2, X } from "lucide-react";
import TimePicker from "@/components/ui/TimePicker";

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

interface EmergencyLightingTemplateProps {
  editTemplateId?: string;
  onSave?: () => void;
}

export function EmergencyLightingTemplate({ editTemplateId, onSave }: EmergencyLightingTemplateProps = {}) {
  const { profile, selectedSiteId, siteId } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
    { id: crypto.randomUUID(), assetId: "", nickname: "" }
  ]);
  const [selectedDayParts, setSelectedDayParts] = useState<string[]>(["before_open"]);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(editTemplateId);
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState<string>("");

  useEffect(() => {
    if (profile?.company_id) {
      const initialize = async () => {
        await loadAssets();
        if (editTemplateId) {
          setTimeout(() => loadDraftData(editTemplateId), 200);
        }
      };
      initialize();
    }
  }, [profile?.company_id, selectedSiteId, siteId, profile?.site_id, editTemplateId]);
  
  // Reload assets when selectedSiteId changes (from header site selector)
  useEffect(() => {
    if (profile?.company_id) {
      loadAssets();
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (!editingTemplateId && equipmentRows.length > 0 && assets.length > 0 && instructions === "") {
      const validEquipment = equipmentRows.filter(row => row.assetId !== "");
      if (validEquipment.length > 0) {
        setInstructions(`How to successfully carry out this task:

1. Locate each emergency lighting unit listed below
2. Turn off the main lighting in the area to test emergency lighting activation
3. Verify each emergency light activates automatically and provides adequate illumination
4. Check that illumination covers the designated escape route
5. Record the test result for each unit (Pass/Fail)
6. If any unit fails:
   - Note the location and issue in the notes field
   - Escalate immediately using the Callout option
   - Do not use the area until the emergency lighting is repaired

Equipment to test:
${validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const name = asset?.name || 'Equipment';
          const nick = eq.nickname || '';
          return `• ${nick ? `${name} (${nick})` : name}`;
        }).join('\n')}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentRows, assets, editingTemplateId]);

  const loadAssets = async () => {
    if (!profile?.company_id) return;
    let query = supabase
      .from("assets")
      .select("id, name, category, site_id, company_id, status")
      .eq("status", "active")
      .eq("company_id", profile.company_id)
      .eq("archived", false)
      .order("name");
    // Use selectedSiteId from header if available, otherwise fall back to siteId
    const effectiveSiteId = selectedSiteId || siteId || profile?.site_id;
    if (effectiveSiteId) query = query.eq("site_id", effectiveSiteId);
    const { data, error } = await query;
    if (error) {
      console.error("Error loading assets:", error);
      return;
    }
    const emergencyLightAssets = (data || []).filter(asset => {
      if (!asset.category) return false;
      const category = asset.category.toLowerCase();
      return category.includes('emergency') || category.includes('light') || category.includes('lighting') || category === 'safety';
    });
    setAssets((emergencyLightAssets.length > 0 ? emergencyLightAssets : (data || [])) as unknown as Asset[]);
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

  const loadDraftData = async (templateId: string) => {
    try {
      setLoading(true);
      if (assets.length === 0 && profile?.company_id) await loadAssets();
      
      const { data: template, error: templateError } = await supabase
        .from("task_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (templateError) throw templateError;

      const { data: fields, error: fieldsError } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("field_order");
      if (fieldsError) throw fieldsError;
      
      const equipmentField = fields?.find(f => f.field_name === "emergency_light_location");
      if (equipmentField?.options) {
        let optionsArray: any[] = [];
        if (typeof equipmentField.options === 'string') {
          try { optionsArray = JSON.parse(equipmentField.options); } catch (e) { optionsArray = []; }
        } else if (Array.isArray(equipmentField.options)) {
          optionsArray = equipmentField.options;
        } else if (typeof equipmentField.options === 'object') {
          optionsArray = Object.values(equipmentField.options);
        }
        
        if (optionsArray.length > 0) {
          const equipmentRowsData = optionsArray.map((opt: any) => {
            let nickname = '';
            if (opt.nickname !== undefined && opt.nickname !== null && opt.nickname !== '') {
              nickname = String(opt.nickname);
            } else if (opt.label) {
              const match = String(opt.label).match(/\((.+)\)$/);
              if (match) nickname = match[1];
            }
            return {
              id: crypto.randomUUID(),
              assetId: String(opt.value || opt.assetId || ''),
              nickname: nickname || ''
            };
          });
          setEquipmentRows(equipmentRowsData);
        }
      }

      if (template.dayparts) setSelectedDayParts(template.dayparts as string[]);
      if (template.dayparts && template.dayparts.length > 0) {
        if (template.recurrence_pattern && typeof template.recurrence_pattern === 'object' && template.recurrence_pattern !== null) {
          const pattern = template.recurrence_pattern as any;
          if (pattern.times && Array.isArray(pattern.times)) {
            const savedTimes = pattern.times as string[];
            const loadedTimes = template.dayparts.map((_, index) => savedTimes[index] || "09:00");
            setTimes(loadedTimes);
          } else {
            setTimes(new Array(template.dayparts.length).fill("09:00"));
          }
        } else {
          setTimes(new Array(template.dayparts.length).fill("09:00"));
        }
      }

      setIsExpanded(true);
      setEditingTemplateId(templateId);
      if (template.instructions) setInstructions(template.instructions);
        
    } catch (error: any) {
      console.error("Error loading draft:", error);
      alert(`Error loading draft: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createFields = (templateId: string, validEquipment: EquipmentRow[]) => {
    return [
      {
        task_template_id: templateId,
        field_name: "emergency_light_location",
        field_label: "Emergency Light Location",
        field_type: "select",
        is_required: true,
        display_order: 1,
        help_text: "Select the emergency light being tested",
        options: validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const assetName = asset?.name || 'Equipment';
          return {
            value: eq.assetId,
            label: eq.nickname ? `${assetName} (${eq.nickname})` : assetName,
            assetName: assetName,
            nickname: eq.nickname || ''
          };
        })
      },
      {
        task_template_id: templateId,
        field_name: "test_result",
        field_label: "Test Result",
        field_type: "pass_fail",
        is_required: true,
        display_order: 2,
        help_text: "Pass if light activates and provides adequate illumination"
      },
      {
        task_template_id: templateId,
        field_name: "notes",
        field_label: "Notes",
        field_type: "text",
        is_required: false,
        display_order: 3,
        help_text: "Any observations or issues"
      }
    ];
  };

  const handleSave = async () => {
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    if (validEquipment.length === 0) {
      alert("Please select at least one emergency light");
      return;
    }
    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      const templateName = "Test emergency lighting (Draft)";
      const templateSlug = `emergency-lighting-test-draft-${Date.now()}`;
      const defaultInstructions = `How to successfully carry out this task:

1. Locate each emergency lighting unit listed below
2. Turn off the main lighting in the area to test emergency lighting activation
3. Verify each emergency light activates automatically and provides adequate illumination
4. Check that illumination covers the designated escape route
5. Record the test result for each unit (Pass/Fail)
6. If any unit fails:
   - Note the location and issue in the notes field
   - Escalate immediately using the Callout option
   - Do not use the area until the emergency lighting is repaired

Equipment to test:
${validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const name = asset?.name || 'Equipment';
          const nick = eq.nickname || '';
          return `• ${nick ? `${name} (${nick})` : name}`;
        }).join('\n')}`;
      
      const templateData = {
        company_id: profile.company_id,
        name: templateName,
        slug: templateSlug,
        description: "Weekly testing of emergency lighting systems - Draft",
        category: "h_and_s",
        frequency: "weekly",
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: { times: times },
        assigned_to_role: "manager",
        asset_type: "emergency_lights",
        repeatable_field_name: "emergency_light_location",
        evidence_types: ["pass_fail"],
        compliance_standard: "Fire Safety Order 2005",
        audit_category: "fire_safety",
        is_critical: true,
        triggers_contractor_on_failure: true,
        contractor_type: "fire_engineer",
        is_template_library: false,
        is_active: true,
        instructions: instructions || defaultInstructions
      };

      let template;
      if (editingTemplateId) {
        const { data: updatedTemplate, error: updateError } = await supabase
          .from("task_templates")
          .update(templateData)
          .eq("id", editingTemplateId)
          .select()
          .single();
        if (updateError) throw updateError;
        template = updatedTemplate;
        await supabase.from("template_fields").delete().eq("template_id", editingTemplateId);
      } else {
        const { data: newTemplate, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();
        if (insertError) throw insertError;
        template = newTemplate;
        setEditingTemplateId(template.id);
      }

      const fields = createFields(template.id, validEquipment);
      const { error: fieldsError } = await supabase
        .from("template_fields")
        .insert(fields.map(f => ({
          template_id: f.task_template_id,
          field_name: f.field_name,
          field_type: f.field_type,
          label: f.field_label,
          required: f.is_required,
          options: f.options,
          field_order: f.display_order,
          help_text: f.help_text
        })));

      if (fieldsError) throw fieldsError;
      setIsExpanded(false);
      alert(`✅ Draft template ${editingTemplateId ? 'updated' : 'saved'}! Check the Drafts page to see your template.`);
      if (onSave) onSave();
      
    } catch (error: any) {
      console.error("Draft save error:", error);
      alert(`Error saving draft template: ${error.message || error}`);
    }
  };

  const handleSaveAndDeploy = async () => {
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    if (validEquipment.length === 0) {
      alert("Please select at least one emergency light");
      return;
    }
    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      const templateName = "Test emergency lighting";
      const templateSlug = editingTemplateId ? undefined : `emergency-lighting-test-${Date.now()}`;
      const defaultInstructions = `How to successfully carry out this task:

1. Locate each emergency lighting unit listed below
2. Turn off the main lighting in the area to test emergency lighting activation
3. Verify each emergency light activates automatically and provides adequate illumination
4. Check that illumination covers the designated escape route
5. Record the test result for each unit (Pass/Fail)
6. If any unit fails:
   - Note the location and issue in the notes field
   - Escalate immediately using the Callout option
   - Do not use the area until the emergency lighting is repaired

Equipment to test:
${validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const name = asset?.name || 'Equipment';
          const nick = eq.nickname || '';
          return `• ${nick ? `${name} (${nick})` : name}`;
        }).join('\n')}`;
      
      const templateData: any = {
        company_id: profile.company_id,
        name: templateName,
        description: "Weekly testing of emergency lighting systems",
        category: "h_and_s",
        frequency: "weekly",
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: { times: times },
        assigned_to_role: "manager",
        asset_type: "emergency_lights",
        repeatable_field_name: "emergency_light_location",
        evidence_types: ["pass_fail"],
        compliance_standard: "Fire Safety Order 2005",
        audit_category: "fire_safety",
        is_critical: true,
        triggers_contractor_on_failure: true,
        contractor_type: "fire_engineer",
        is_template_library: true,
        is_active: true,
        instructions: instructions || defaultInstructions
      };

      if (templateSlug) templateData.slug = templateSlug;

      let template;
      if (editingTemplateId) {
        const { data: updatedTemplate, error: updateError } = await supabase
          .from("task_templates")
          .update(templateData)
          .eq("id", editingTemplateId)
          .select()
          .single();
        if (updateError) throw updateError;
        template = updatedTemplate;
        await supabase.from("template_fields").delete().eq("template_id", editingTemplateId);
      } else {
        const { data: newTemplate, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();
        if (insertError) throw insertError;
        template = newTemplate;
        setEditingTemplateId(template.id);
      }

      const fields = createFields(template.id, validEquipment);
      const { error: fieldsError } = await supabase
        .from("template_fields")
        .insert(fields.map(f => ({
          template_id: f.task_template_id,
          field_name: f.field_name,
          field_type: f.field_type,
          label: f.field_label,
          required: f.is_required,
          options: f.options,
          field_order: f.display_order,
          help_text: f.help_text
        })));

      if (fieldsError) throw fieldsError;

      // NOTE: Tasks should ONLY be created from templates via TaskFromTemplateModal
      // in the compliance or templates pages. This component only saves templates.
      // Tasks will be created automatically by the task generation system or manually
      // by users via the TaskFromTemplateModal.

      setIsExpanded(false);
      if (editingTemplateId) {
        if (onSave) onSave();
        else alert(`✅ Template updated successfully!\n\n📋 Template configuration has been updated.\n\nTo create tasks from this template, use the Templates or Compliance pages.`);
      } else {
        alert(`✅ Template saved successfully!\n\n📋 Template is now available in the Templates and Compliance pages.\n\nTo create tasks from this template, go to the Templates or Compliance pages and click on the template.`);
      }

    } catch (error: any) {
      console.error("Deployment error:", error);
      alert(`Error deploying to My Tasks: ${error.message || error}`);
    }
  };

  const dayParts = [
    { id: "before_open", label: "Before Open" },
    { id: "morning", label: "Morning" },
    { id: "afternoon", label: "Afternoon" },
    { id: "evening", label: "Evening" }
  ];

  return (
    <div className="rounded-xl border border-magenta-500 bg-[#141823]">
      <div 
        className="p-4 cursor-pointer hover:bg-[#1a1f2e] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-magenta-500/10 border border-magenta-500/20">
              <Lightbulb className="w-5 h-5 text-magenta-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Test emergency lighting</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Critical
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Weekly testing of emergency lighting systems. Escalate any failures immediately.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Regulation:</span>
                  <p className="text-slate-200 font-medium">Fire Safety Order 2005</p>
                </div>
                <div>
                  <span className="text-slate-500">Frequency:</span>
                  <p className="text-slate-200 font-medium">Weekly</p>
                </div>
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="text-slate-200 font-medium">Health & Safety</p>
                </div>
                <div>
                  <span className="text-slate-500">Evidence:</span>
                  <p className="text-slate-200 font-medium">Pass/Fail</p>
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

      {isExpanded && (
        <div className="border-t border-neutral-800 p-6 bg-[#0f1220]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">
                  Emergency Lights to Test
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
                {equipmentRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-[#141823]"
                  >
                    <select
                      value={row.assetId}
                      onChange={(e) => updateEquipmentRow(row.id, 'assetId', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200"
                    >
                      <option value="">Select emergency light...</option>
                      {assets.length === 0 ? (
                        <option value="" disabled>No emergency lighting found</option>
                      ) : (
                        assets.map(asset => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name}
                          </option>
                        ))
                      )}
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Location/Nickname"
                      value={row.nickname}
                      onChange={(e) => updateEquipmentRow(row.id, 'nickname', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200 placeholder:text-slate-500"
                    />

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

            <div>
              <label className="block text-sm font-medium mb-3">
                When to Run Task (Day Parts)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            <div>
              <label className="block text-sm font-medium mb-3">
                Check Times
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedDayParts.map((dayPart, index) => (
                  <div key={dayPart}>
                    <label className="block text-xs text-slate-400 mb-1 capitalize">
                      {dayPart.replace('_', ' ')}
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

            <div>
              <label className="block text-sm font-medium mb-3">
                Instructions - How to Successfully Carry Out This Task
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter step-by-step instructions for completing this task..."
                rows={10}
                className="w-full px-4 py-3 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-magenta-500 transition-colors resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              {editingTemplateId ? (
                <button
                  type="button"
                  onClick={handleSaveAndDeploy}
                  className="px-6 py-2 rounded-lg bg-magenta-500/20 border border-magenta-500/50 text-magenta-400 hover:bg-magenta-500/30 hover:border-magenta-500/70 backdrop-blur-md transition-all duration-150 font-medium"
                >
                  Update Template
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndDeploy}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] hover:border-white/[0.25] backdrop-blur-md transition-all duration-150"
                  >
                    Save & Deploy
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

