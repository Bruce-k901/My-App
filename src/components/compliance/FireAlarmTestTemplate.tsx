"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Edit2, X } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string | null;
  site_id: string | null;
  company_id: string | null;
  status: string | null;
}

interface CallPointRow {
  id: string;
  callPointName: string;
  location: string;
}

interface FireAlarmTestTemplateProps {
  editTemplateId?: string;
  onSave?: () => void;
}

export function FireAlarmTestTemplate({ editTemplateId, onSave }: FireAlarmTestTemplateProps = {}) {
  const { profile } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [callPointRows, setCallPointRows] = useState<CallPointRow[]>([
    { id: crypto.randomUUID(), callPointName: "", location: "" }
  ]);
  const [selectedDayParts, setSelectedDayParts] = useState<string[]>(["before_open"]);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [status, setStatus] = useState<"draft">("draft");
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(editTemplateId);
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState<string>("");
  // Scheduling state
  const [frequency, setFrequency] = useState<string>("weekly");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ..., 6=Sat
  const [monthlyDay, setMonthlyDay] = useState<number | null>(null); // Day of month (1-31) or null
  const [monthlyLastWeekday, setMonthlyLastWeekday] = useState<string | null>(null); // "friday" or null
  const [annualDate, setAnnualDate] = useState<string>(""); // MM-DD format
  const [nextInstanceDates, setNextInstanceDates] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.company_id) {
      const initialize = async () => {
        await loadAssets();
        if (editTemplateId) {
          setTimeout(() => {
            loadDraftData(editTemplateId);
          }, 200);
        }
      };
      initialize();
    }
  }, [profile?.company_id, profile?.site_id, editTemplateId]);

  // Generate default instructions when call points are added (for new templates only)
  useEffect(() => {
    if (!editingTemplateId && callPointRows.length > 0 && instructions === "") {
      const validCallPoints = callPointRows.filter(row => row.callPointName !== "");
      if (validCallPoints.length > 0) {
        const defaultInstructions = `How to Check the Fire Alarm System (Weekly Test)

Step 1: Warn everyone. Let staff know there'll be a test so no one panics or calls the fire brigade because you pressed a button.

Step 2: Pick a different call point each week. Don't always use the same one or you'll end up with one shiny working alarm and ten dead zones.

Step 3: Activate the call point. Use the test key or break-glass cover—short, sharp press to trigger the alarm.

Step 4: Confirm sounders work. Walk the site (or send someone you don't like) to check the alarm can be heard everywhere, including toilets and storerooms.

Step 5: Silence and reset. Use the fire panel to silence, then reset the system according to manufacturer instructions.

Step 6: Record the test. Note the date, time, call point number/location, and result in the fire logbook.

Step 7: Fix issues fast. If a sounder didn't work, don't just shrug—report it to your fire alarm contractor immediately.


How to Check Emergency Lighting (Monthly Visual Check)

Step 1: Know what you're looking for. These are the little lights above exits or along escape routes that keep people from tripping over each other when the power goes out.

Step 2: Switch off normal lighting. Use the test key or control switch to simulate a mains power failure.

Step 3: Check all fittings. Ensure every emergency light comes on and is bright enough to actually see by.

Step 4: Note any failures. Dim, flickering, or dead units go straight to maintenance—don't wait for a real emergency to find out.

Step 5: Restore power. End the test and confirm the lights return to charge mode (the little green LEDs should glow again).

Step 6: Record it. Log date, duration, areas checked, and results in the emergency lighting logbook.


Call Points to test:
${validCallPoints.map(cp => {
          return `• ${cp.callPointName}${cp.location ? ` (${cp.location})` : ''}`;
        }).join('\n')}`;
        setInstructions(defaultInstructions);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPointRows, editingTemplateId]);

  const loadAssets = async () => {
    if (!profile?.company_id) return;

    let query = supabase
      .from("assets")
      .select("id, name, category, site_id, company_id, status")
      .eq("status", "active")
      .eq("company_id", profile.company_id)
      .eq("archived", false)
      .order("name");

    if (profile.site_id) {
      query = query.eq("site_id", profile.site_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading assets:", error);
      return;
    }

    // Filter for fire alarm equipment
    const fireAlarmAssets = (data || []).filter(asset => {
      if (!asset.category) return false;
      const category = asset.category.toLowerCase();
      return category.includes('fire') ||
             category.includes('alarm') ||
             category.includes('smoke') ||
             category.includes('detector') ||
             category.includes('call point') ||
             category.includes('emergency') ||
             category === 'safety';
    });

    setAssets((fireAlarmAssets.length > 0 ? fireAlarmAssets : (data || [])) as unknown as Asset[]);
  };

  const addCallPointRow = () => {
    setCallPointRows(prev => [...prev, { id: crypto.randomUUID(), callPointName: "", location: "" }]);
  };

  const removeCallPointRow = (id: string) => {
    setCallPointRows(prev => prev.filter(row => row.id !== id));
  };

  const updateCallPointRow = (id: string, field: 'callPointName' | 'location', value: string) => {
    setCallPointRows(prev => prev.map(row => 
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

  // Calculate next instance dates for quarterly, biannual, and annual frequencies
  const calculateNextInstanceDates = (month: string, day: string, freq: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const instances: string[] = [];
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (freq === 'quarterly') {
      let foundFirstFuture = false;
      let monthsToAdd = 0;
      for (let q = 0; q < 4; q++) {
        const targetMonth = monthNum + monthsToAdd;
        let targetYear = currentYear;
        if (targetMonth > 12) {
          targetYear = currentYear + Math.floor((targetMonth - 1) / 12);
          const adjustedMonth = ((targetMonth - 1) % 12) + 1;
          const targetDate = new Date(targetYear, adjustedMonth - 1, dayNum);
          if (targetDate.getDate() !== dayNum) {
            const lastDayOfMonth = new Date(targetYear, adjustedMonth, 0).getDate();
            const adjustedDate = new Date(targetYear, adjustedMonth - 1, Math.min(dayNum, lastDayOfMonth));
            if (adjustedDate >= today || !foundFirstFuture) {
              instances.push(adjustedDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
              foundFirstFuture = true;
            }
          } else {
            if (targetDate >= today || !foundFirstFuture) {
              instances.push(targetDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
              foundFirstFuture = true;
            }
          }
        } else {
          const targetDate = new Date(targetYear, targetMonth - 1, dayNum);
          if (targetDate.getDate() !== dayNum) {
            const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
            const adjustedDate = new Date(targetYear, targetMonth - 1, Math.min(dayNum, lastDayOfMonth));
            if (adjustedDate >= today || !foundFirstFuture) {
              instances.push(adjustedDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
              foundFirstFuture = true;
            }
          } else {
            if (targetDate >= today || !foundFirstFuture) {
              instances.push(targetDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
              foundFirstFuture = true;
            }
          }
        }
        monthsToAdd += 3;
        if (instances.length >= 4) break;
      }
    } else if (freq === 'biannual') {
      const month1 = monthNum;
      const month2 = monthNum + 6 > 12 ? monthNum + 6 - 12 : monthNum + 6;
      for (let i = 0; i < 2; i++) {
        const targetMonth = i === 0 ? month1 : month2;
        let targetYear = currentYear;
        const targetDate = new Date(targetYear, targetMonth - 1, dayNum);
        if (i === 0 && targetDate < today) {
          targetYear = currentYear + 1;
        } else if (i === 1) {
          const secondDateThisYear = new Date(currentYear, month2 - 1, dayNum);
          if (secondDateThisYear < today) {
            targetYear = currentYear + 1;
          } else {
            targetYear = currentYear;
          }
        }
        const finalDate = new Date(targetYear, targetMonth - 1, dayNum);
        if (finalDate.getDate() !== dayNum) {
          const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
          const adjustedDate = new Date(targetYear, targetMonth - 1, Math.min(dayNum, lastDayOfMonth));
          instances.push(adjustedDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        } else {
          instances.push(finalDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        }
      }
    } else if (freq === 'annually') {
      for (let y = 0; y < 2; y++) {
        let targetYear = currentYear + y;
        if (y === 0) {
          const thisYearDate = new Date(currentYear, monthNum - 1, dayNum);
          if (thisYearDate < today) {
            targetYear = currentYear + 1;
            y = -1;
          }
        }
        const targetDate = new Date(targetYear, monthNum - 1, dayNum);
        if (targetDate.getDate() !== dayNum) {
          const lastDayOfMonth = new Date(targetYear, monthNum, 0).getDate();
          const adjustedDate = new Date(targetYear, monthNum - 1, Math.min(dayNum, lastDayOfMonth));
          instances.push(adjustedDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        } else {
          instances.push(targetDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        }
        if (instances.length >= 2) break;
      }
    }
    setNextInstanceDates(instances);
  };

  const loadDraftData = async (templateId: string) => {
    try {
      setLoading(true);
      
      if (assets.length === 0 && profile?.company_id) {
        await loadAssets();
      }
      
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
      
      // Load call points from the fire_alarm_call_point field (or legacy fire_alarm_location for backward compatibility)
      const callPointField = fields?.find(f => f.field_name === "fire_alarm_call_point" || f.field_name === "fire_alarm_location");
      
      if (callPointField?.options) {
        let optionsArray: any[] = [];
        if (typeof callPointField.options === 'string') {
          try {
            optionsArray = JSON.parse(callPointField.options);
          } catch (e) {
            optionsArray = [];
          }
        } else if (Array.isArray(callPointField.options)) {
          optionsArray = callPointField.options;
        } else if (typeof callPointField.options === 'object') {
          optionsArray = Object.values(callPointField.options);
        }
        
        if (optionsArray.length > 0) {
          const callPointRowsData = optionsArray.map((opt: any) => {
            // Handle both new format (callPointName) and legacy format (label/value)
            const callPointName = opt.callPointName || opt.label || opt.value || '';
            const location = opt.location || '';
            
            return {
              id: crypto.randomUUID(),
              callPointName: String(callPointName),
              location: String(location || '')
            };
          });
          
          setCallPointRows(callPointRowsData);
        }
      }

      // Load frequency
      if (template.frequency) {
        setFrequency(template.frequency);
      }

      // Load scheduling data from recurrence_pattern
      if (template.recurrence_pattern && typeof template.recurrence_pattern === 'object' && template.recurrence_pattern !== null) {
        const pattern = template.recurrence_pattern as any;
        
        // Load weekly days
        if (template.frequency === 'weekly' && pattern.weeklyDays && Array.isArray(pattern.weeklyDays)) {
          setWeeklyDays(pattern.weeklyDays);
        }
        
        // Load monthly scheduling
        if (template.frequency === 'monthly') {
          if (pattern.monthlyLastWeekday) {
            setMonthlyLastWeekday(pattern.monthlyLastWeekday);
          } else if (pattern.monthlyDay) {
            setMonthlyDay(pattern.monthlyDay);
          }
        }
        
        // Load annual/biannual/quarterly date
        if ((template.frequency === 'annually' || template.frequency === 'biannual' || template.frequency === 'quarterly') && pattern.annualDate) {
          setAnnualDate(pattern.annualDate);
          const [month, day] = pattern.annualDate.split('-');
          if (month && day) {
            calculateNextInstanceDates(month, day, template.frequency);
          }
        }
        
        // Load times
        if (pattern.times && Array.isArray(pattern.times)) {
          const savedTimes = pattern.times as string[];
          if (template.dayparts && template.dayparts.length > 0) {
            const loadedTimes = template.dayparts.map((_, index) => savedTimes[index] || "09:00");
            setTimes(loadedTimes);
          } else {
            setTimes(savedTimes);
          }
        }
      }

      // Load dayparts
      if (template.dayparts) {
        setSelectedDayParts(template.dayparts as string[]);
        // If no times loaded, set defaults
        if (times.length === 0 || times.length !== template.dayparts.length) {
          setTimes(new Array(template.dayparts.length).fill("09:00"));
        }
      }

      setIsExpanded(true);
      setEditingTemplateId(templateId);
      
      if (template.instructions) {
        setInstructions(template.instructions);
      }
        
    } catch (error: any) {
      console.error("Error loading draft:", error);
      alert(`Error loading draft: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setStatus("draft");
    
    const validCallPoints = callPointRows.filter(row => row.callPointName !== "");
    
    if (validCallPoints.length === 0) {
      alert("Please add at least one fire alarm call point");
      return;
    }

    // Validate scheduling based on frequency
    if (frequency === 'weekly' && weeklyDays.length === 0) {
      alert("Please select at least one day of the week for weekly tasks");
      return;
    }
    if (frequency === 'monthly' && monthlyDay === null && monthlyLastWeekday === null) {
      alert("Please select either a specific day or last weekday for monthly tasks");
      return;
    }
    if ((frequency === 'annually' || frequency === 'biannual' || frequency === 'quarterly') && !annualDate) {
      alert("Please select a date for annual/biannual/quarterly tasks");
      return;
    }

    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      // Use existing name if updating, or create new name if creating
      let templateName = "Test fire alarms and emergency lighting (Draft)";
      if (editingTemplateId) {
        // Fetch existing template name to preserve it
        const { data: existingTemplate } = await supabase
          .from("task_templates")
          .select("name")
          .eq("id", editingTemplateId)
          .single();
        if (existingTemplate?.name) {
          templateName = existingTemplate.name;
        }
      }
      const templateSlug = editingTemplateId 
        ? undefined // Don't change slug when updating
        : `fire-alarm-test-draft-${Date.now()}`;
      
      // Build recurrence_pattern based on frequency
      const recurrencePattern: any = {
        times: times
      };
      
      if (frequency === 'weekly' && weeklyDays.length > 0) {
        recurrencePattern.weeklyDays = weeklyDays;
      } else if (frequency === 'monthly') {
        if (monthlyLastWeekday) {
          recurrencePattern.monthlyLastWeekday = monthlyLastWeekday;
        } else if (monthlyDay !== null) {
          recurrencePattern.monthlyDay = monthlyDay;
        }
      } else if ((frequency === 'annually' || frequency === 'biannual' || frequency === 'quarterly') && annualDate) {
        recurrencePattern.annualDate = annualDate;
      }
      
      const templateData: any = {
        company_id: profile.company_id,
        name: templateName,
        description: "Weekly testing of fire alarms and emergency lighting systems - Draft",
        category: "h_and_s",
        frequency: frequency,
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: recurrencePattern,
        assigned_to_role: "manager",
        asset_type: "fire_alarms",
        repeatable_field_name: "fire_alarm_call_point",
        evidence_types: ["pass_fail"],
        compliance_standard: "Fire Safety Order 2005",
        audit_category: "fire_safety",
        is_critical: true,
        triggers_contractor_on_failure: true,
        contractor_type: "fire_engineer",
        is_template_library: false,
        is_active: true,
        instructions: instructions || `How to Check the Fire Alarm System (Weekly Test)

Step 1: Warn everyone. Let staff know there'll be a test so no one panics or calls the fire brigade because you pressed a button.

Step 2: Pick a different call point each week. Don't always use the same one or you'll end up with one shiny working alarm and ten dead zones.

Step 3: Activate the call point. Use the test key or break-glass cover—short, sharp press to trigger the alarm.

Step 4: Confirm sounders work. Walk the site (or send someone you don't like) to check the alarm can be heard everywhere, including toilets and storerooms.

Step 5: Silence and reset. Use the fire panel to silence, then reset the system according to manufacturer instructions.

Step 6: Record the test. Note the date, time, call point number/location, and result in the fire logbook.

Step 7: Fix issues fast. If a sounder didn't work, don't just shrug—report it to your fire alarm contractor immediately.


How to Check Emergency Lighting (Monthly Visual Check)

Step 1: Know what you're looking for. These are the little lights above exits or along escape routes that keep people from tripping over each other when the power goes out.

Step 2: Switch off normal lighting. Use the test key or control switch to simulate a mains power failure.

Step 3: Check all fittings. Ensure every emergency light comes on and is bright enough to actually see by.

Step 4: Note any failures. Dim, flickering, or dead units go straight to maintenance—don't wait for a real emergency to find out.

Step 5: Restore power. End the test and confirm the lights return to charge mode (the little green LEDs should glow again).

Step 6: Record it. Log date, duration, areas checked, and results in the emergency lighting logbook.


Call Points to test:
${validCallPoints.map(cp => {
          return `• ${cp.callPointName}${cp.location ? ` (${cp.location})` : ''}`;
        }).join('\n')}`
      };

      // Add slug only if creating new template
      if (templateSlug) {
        templateData.slug = templateSlug;
      }

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
        
        // Delete old fields before creating new ones
        await supabase
          .from("template_fields")
          .delete()
          .eq("template_id", editingTemplateId);
      } else {
        const { data: newTemplate, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();

        if (insertError) throw insertError;
        template = newTemplate;
        // Update editingTemplateId so future saves update this draft
        setEditingTemplateId(template.id);
      }

      const fields = [
        {
          task_template_id: template.id,
          field_name: "fire_alarm_call_point",
          field_label: "Fire Alarm Call Point",
          field_type: "select",
          is_required: true,
          display_order: 1,
          help_text: "Select the call point being tested this week",
          options: validCallPoints.map(cp => ({
            value: cp.callPointName,
            label: cp.location ? `${cp.callPointName} (${cp.location})` : cp.callPointName,
            callPointName: cp.callPointName,
            location: cp.location || ''
          }))
        },
        {
          task_template_id: template.id,
          field_name: "fire_alarm_test_result",
          field_label: "Fire Alarm Test Result",
          field_type: "pass_fail",
          is_required: true,
          display_order: 2,
          help_text: "Pass if alarm sounds and sounders work throughout the site, Fail if faulty. On failure, a callout will be created for the fire panel company."
        },
        {
          task_template_id: template.id,
          field_name: "emergency_lights_test_result",
          field_label: "Emergency Lights Test Result",
          field_type: "pass_fail",
          is_required: true,
          display_order: 3,
          help_text: "Pass if all emergency lights are working correctly, Fail if any issues found. On failure, a callout will be created for an electrician."
        },
        {
          task_template_id: template.id,
          field_name: "notes",
          field_label: "Notes",
          field_type: "text",
          is_required: false,
          display_order: 4,
          help_text: "Record any observations, issues, or actions taken"
        }
      ];

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
    setStatus("draft");
    
    const validCallPoints = callPointRows.filter(row => row.callPointName !== "");
    
    if (validCallPoints.length === 0) {
      alert("Please add at least one fire alarm call point");
      return;
    }

    // Validate scheduling based on frequency
    if (frequency === 'weekly' && weeklyDays.length === 0) {
      alert("Please select at least one day of the week for weekly tasks");
      return;
    }
    if (frequency === 'monthly' && monthlyDay === null && monthlyLastWeekday === null) {
      alert("Please select either a specific day or last weekday for monthly tasks");
      return;
    }
    if ((frequency === 'annually' || frequency === 'biannual' || frequency === 'quarterly') && !annualDate) {
      alert("Please select a date for annual/biannual/quarterly tasks");
      return;
    }

    if (!profile?.company_id) {
      alert("No company found for user");
      return;
    }

    try {
      const templateName = "Test fire alarms and emergency lighting";
      const templateSlug = editingTemplateId 
        ? undefined
        : `fire-alarm-test-${Date.now()}`;
      
      // Build recurrence_pattern based on frequency
      const recurrencePattern: any = {
        times: times
      };
      
      if (frequency === 'weekly' && weeklyDays.length > 0) {
        recurrencePattern.weeklyDays = weeklyDays;
      } else if (frequency === 'monthly') {
        if (monthlyLastWeekday) {
          recurrencePattern.monthlyLastWeekday = monthlyLastWeekday;
        } else if (monthlyDay !== null) {
          recurrencePattern.monthlyDay = monthlyDay;
        }
      } else if ((frequency === 'annually' || frequency === 'biannual' || frequency === 'quarterly') && annualDate) {
        recurrencePattern.annualDate = annualDate;
      }
      
      const templateData: any = {
        company_id: profile.company_id,
        name: editingTemplateId 
          ? templateName.replace(' (Draft)', '').replace(' (draft)', '') // Remove "(Draft)" if updating
          : templateName, // New template doesn't have "(Draft)" in name
        description: "Weekly testing of fire alarms and emergency lighting systems",
        category: "h_and_s",
        frequency: frequency,
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: recurrencePattern,
        assigned_to_role: "manager",
        asset_type: "fire_alarms",
        repeatable_field_name: "fire_alarm_call_point",
        evidence_types: ["pass_fail"],
        compliance_standard: "Fire Safety Order 2005",
        audit_category: "fire_safety",
        is_critical: true,
        triggers_contractor_on_failure: true,
        contractor_type: "fire_engineer",
        is_template_library: true, // This removes it from drafts
        is_active: true,
        instructions: instructions || `How to Check the Fire Alarm System (Weekly Test)

Step 1: Warn everyone. Let staff know there'll be a test so no one panics or calls the fire brigade because you pressed a button.

Step 2: Pick a different call point each week. Don't always use the same one or you'll end up with one shiny working alarm and ten dead zones.

Step 3: Activate the call point. Use the test key or break-glass cover—short, sharp press to trigger the alarm.

Step 4: Confirm sounders work. Walk the site (or send someone you don't like) to check the alarm can be heard everywhere, including toilets and storerooms.

Step 5: Silence and reset. Use the fire panel to silence, then reset the system according to manufacturer instructions.

Step 6: Record the test. Note the date, time, call point number/location, and result in the fire logbook.

Step 7: Fix issues fast. If a sounder didn't work, don't just shrug—report it to your fire alarm contractor immediately.


How to Check Emergency Lighting (Monthly Visual Check)

Step 1: Know what you're looking for. These are the little lights above exits or along escape routes that keep people from tripping over each other when the power goes out.

Step 2: Switch off normal lighting. Use the test key or control switch to simulate a mains power failure.

Step 3: Check all fittings. Ensure every emergency light comes on and is bright enough to actually see by.

Step 4: Note any failures. Dim, flickering, or dead units go straight to maintenance—don't wait for a real emergency to find out.

Step 5: Restore power. End the test and confirm the lights return to charge mode (the little green LEDs should glow again).

Step 6: Record it. Log date, duration, areas checked, and results in the emergency lighting logbook.


Call Points to test:
${validCallPoints.map(cp => {
          return `• ${cp.callPointName}${cp.location ? ` (${cp.location})` : ''}`;
        }).join('\n')}`
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
        
        await supabase
          .from("template_fields")
          .delete()
          .eq("template_id", editingTemplateId);
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

      const fields = [
        {
          task_template_id: template.id,
          field_name: "fire_alarm_call_point",
          field_label: "Fire Alarm Call Point",
          field_type: "select",
          is_required: true,
          display_order: 1,
          help_text: "Select the call point being tested this week",
          options: validCallPoints.map(cp => ({
            value: cp.callPointName,
            label: cp.location ? `${cp.callPointName} (${cp.location})` : cp.callPointName,
            callPointName: cp.callPointName,
            location: cp.location || ''
          }))
        },
        {
          task_template_id: template.id,
          field_name: "fire_alarm_test_result",
          field_label: "Fire Alarm Test Result",
          field_type: "pass_fail",
          is_required: true,
          display_order: 2,
          help_text: "Pass if alarm sounds and sounders work throughout the site, Fail if faulty. On failure, a callout will be created for the fire panel company."
        },
        {
          task_template_id: template.id,
          field_name: "emergency_lights_test_result",
          field_label: "Emergency Lights Test Result",
          field_type: "pass_fail",
          is_required: true,
          display_order: 3,
          help_text: "Pass if all emergency lights are working correctly, Fail if any issues found. On failure, a callout will be created for an electrician."
        },
        {
          task_template_id: template.id,
          field_name: "notes",
          field_label: "Notes",
          field_type: "text",
          is_required: false,
          display_order: 4,
          help_text: "Record any observations, issues, or actions taken"
        }
      ];

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
        if (onSave) {
          onSave(); // This will refresh drafts page if called from drafts
        } else {
          alert(`✅ Template updated successfully!\n\n📋 Template configuration has been updated.\n\nTo create tasks from this template, use the Templates or Compliance pages.`);
        }
      } else {
        if (onSave) {
          onSave();
        } else {
          alert(`✅ Template saved successfully!\n\n📋 Template is now available in the Templates and Compliance pages.\n\nTo create tasks from this template, go to the Templates or Compliance pages and click on the template.`);
        }
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
              <AlertTriangle className="w-5 h-5 text-magenta-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Test fire alarms and emergency lighting</h3>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  Critical
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-3">
                Weekly testing of fire alarms and emergency lighting systems. Escalate any failures immediately.
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
                  Fire Alarm Call Points
                </label>
                <button
                  type="button"
                  onClick={addCallPointRow}
                  className="text-sm px-3 py-1 rounded-lg border border-magenta-500 text-magenta-400 hover:bg-magenta-500/10 transition-colors"
                >
                  + Add Call Point
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Add all fire alarm call points. Each week, a different call point will be tested. Make sure you rotate through them.
              </p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {callPointRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-[#141823]"
                  >
                    {/* Call Point Name Input */}
                    <input
                      type="text"
                      placeholder="Call Point Name (e.g., CP1, Main Entrance, Kitchen)"
                      value={row.callPointName}
                      onChange={(e) => updateCallPointRow(row.id, 'callPointName', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200 placeholder:text-slate-500"
                    />
                    
                    {/* Location Input */}
                    <input
                      type="text"
                      placeholder="Location (e.g., Ground Floor, Reception)"
                      value={row.location}
                      onChange={(e) => updateCallPointRow(row.id, 'location', e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg bg-[#0f1220] border border-neutral-800 text-slate-200 placeholder:text-slate-500"
                    />

                    {/* Delete Button */}
                    {callPointRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCallPointRow(row.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Task Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => {
                  const newFreq = e.target.value;
                  setFrequency(newFreq);
                  if (annualDate && (newFreq === 'quarterly' || newFreq === 'biannual' || newFreq === 'annually')) {
                    const [month, day] = annualDate.split('-');
                    if (month && day) calculateNextInstanceDates(month, day, newFreq);
                  } else {
                    setNextInstanceDates([]);
                  }
                }}
                className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannual">Bi-annually (Every 6 months)</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            {/* Weekly Day Selection */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium mb-3">
                  Days of Week to Run Task
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[
                    { value: 0, label: 'Sun' },
                    { value: 1, label: 'Mon' },
                    { value: 2, label: 'Tue' },
                    { value: 3, label: 'Wed' },
                    { value: 4, label: 'Thu' },
                    { value: 5, label: 'Fri' },
                    { value: 6, label: 'Sat' }
                  ].map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        setWeeklyDays(prev => 
                          prev.includes(day.value)
                            ? prev.filter(d => d !== day.value)
                            : [...prev, day.value].sort()
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-center transition-all text-sm ${
                        weeklyDays.includes(day.value)
                          ? "border-magenta-500 bg-magenta-500/10 text-magenta-400"
                          : "border-neutral-800 bg-[#141823] text-slate-400 hover:border-neutral-700"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {weeklyDays.length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">Please select at least one day</p>
                )}
              </div>
            )}

            {/* Monthly Scheduling */}
            {frequency === 'monthly' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Monthly Schedule Option
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="monthly_date"
                        name="monthly_option"
                        checked={monthlyLastWeekday === null}
                        onChange={() => setMonthlyLastWeekday(null)}
                        className="w-4 h-4 text-magenta-500"
                      />
                      <label htmlFor="monthly_date" className="text-sm text-slate-200">
                        Specific Day of Month
                      </label>
                    </div>
                    {monthlyLastWeekday === null && (
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={monthlyDay || ''}
                        onChange={(e) => setMonthlyDay(parseInt(e.target.value) || null)}
                        placeholder="Day (1-31)"
                        className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 ml-7"
                      />
                    )}
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="monthly_last_weekday"
                        name="monthly_option"
                        checked={monthlyLastWeekday !== null}
                        onChange={() => {
                          setMonthlyLastWeekday('friday');
                          setMonthlyDay(null);
                        }}
                        className="w-4 h-4 text-magenta-500"
                      />
                      <label htmlFor="monthly_last_weekday" className="text-sm text-slate-200">
                        Last Weekday of Month
                      </label>
                    </div>
                    {monthlyLastWeekday !== null && (
                      <select
                        value={monthlyLastWeekday || 'friday'}
                        onChange={(e) => setMonthlyLastWeekday(e.target.value)}
                        className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 ml-7"
                      >
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Annual/Biannual/Quarterly Date Selection */}
            {(frequency === 'annually' || frequency === 'biannual' || frequency === 'quarterly') && (
              <div>
                <label className="block text-sm font-medium mb-3">
                  {frequency === 'annually' ? 'Annual' : frequency === 'biannual' ? 'Bi-annual' : 'Quarterly'} Date (Month-Day)
                </label>
                <input
                  type="date"
                  value={annualDate ? `${new Date().getFullYear()}-${annualDate}` : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (date) {
                      const [year, month, day] = date.split('-');
                      setAnnualDate(`${month}-${day}`);
                      calculateNextInstanceDates(month, day, frequency);
                    } else {
                      setAnnualDate('');
                      setNextInstanceDates([]);
                    }
                  }}
                  className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Tasks will be automatically scheduled for this date {frequency === 'annually' ? 'each year' : frequency === 'biannual' ? 'every 6 months' : 'each quarter'}
                </p>
                
                {/* Show next instance dates preview */}
                {annualDate && nextInstanceDates.length > 0 && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs font-medium text-green-400 mb-2">Next Scheduled Instances:</p>
                    <div className="space-y-1">
                      {nextInstanceDates.map((dateStr, idx) => (
                        <div key={idx} className="text-xs text-green-300">
                          {dateStr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Day Parts Selection */}
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

