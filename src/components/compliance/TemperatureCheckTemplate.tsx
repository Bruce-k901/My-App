"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Thermometer, Edit2, X } from "lucide-react";
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

interface TemperatureCheckTemplateProps {
  editTemplateId?: string;
  onSave?: () => void;
}

export function TemperatureCheckTemplate({ editTemplateId, onSave }: TemperatureCheckTemplateProps = {}) {
  const { profile, selectedSiteId, siteId } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([
    { id: crypto.randomUUID(), assetId: "", nickname: "" }
  ]);
  const [selectedDayParts, setSelectedDayParts] = useState<string[]>(["morning", "afternoon", "evening"]);
  const [times, setTimes] = useState<string[]>(["09:00", "14:00", "20:00"]);
  const [status, setStatus] = useState<"draft">("draft");
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>(editTemplateId);
  const [loading, setLoading] = useState(false);
  const [instructions, setInstructions] = useState<string>("");
  // Scheduling state
  const [frequency, setFrequency] = useState<string>("daily");
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ..., 6=Sat
  const [monthlyDay, setMonthlyDay] = useState<number | null>(null); // Day of month (1-31) or null
  const [monthlyLastWeekday, setMonthlyLastWeekday] = useState<string | null>(null); // "friday" or null
  const [annualDate, setAnnualDate] = useState<string>(""); // MM-DD format
  const [nextInstanceDates, setNextInstanceDates] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.company_id) {
      loadAssets();
      if (editTemplateId) {
        loadDraftData(editTemplateId);
      }
    }
  }, [profile?.company_id, selectedSiteId, siteId, profile?.site_id, editTemplateId]);
  
  // Reload assets when selectedSiteId changes (from header site selector)
  useEffect(() => {
    if (profile?.company_id) {
      loadAssets();
    }
  }, [selectedSiteId]);

  const loadAssets = async () => {
    if (!profile?.company_id) return;


    // Load all active assets from the user's company (filter by selected site from header)
    // Use selectedSiteId from header if available, otherwise fall back to siteId
    const effectiveSiteId = selectedSiteId || siteId || profile?.site_id;
    
    let query = supabase
      .from("assets")
      .select("id, name, category, site_id, company_id, status")
      .eq("status", "active")
      .eq("company_id", profile.company_id)
      .eq("archived", false)
      .order("name");

    // Filter by selected site from header
    if (effectiveSiteId) {
      query = query.eq("site_id", effectiveSiteId);
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

  // Calculate next instance dates for quarterly, biannual, and annual frequencies
  const calculateNextInstanceDates = (month: string, day: string, freq: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    const currentYear = today.getFullYear();
    const instances: string[] = [];
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (freq === 'quarterly') {
      // Quarterly: Show next 4 instances (every 3 months from selected date)
      let foundFirstFuture = false;
      let monthsToAdd = 0;
      
      for (let q = 0; q < 4; q++) {
        const targetMonth = monthNum + monthsToAdd;
        let targetYear = currentYear;
        
        // Handle year rollover
        if (targetMonth > 12) {
          targetYear = currentYear + Math.floor((targetMonth - 1) / 12);
          const adjustedMonth = ((targetMonth - 1) % 12) + 1;
          
          const targetDate = new Date(targetYear, adjustedMonth - 1, dayNum);
          
          // Handle invalid dates (e.g., Feb 30) by using last day of month
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
          
          // Handle invalid dates (e.g., Feb 30) by using last day of month
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
      // Biannual: Show next 2 instances (1 year)
      const month1 = monthNum;
      const month2 = monthNum + 6 > 12 ? monthNum + 6 - 12 : monthNum + 6;
      
      for (let i = 0; i < 2; i++) {
        const targetMonth = i === 0 ? month1 : month2;
        let targetYear = currentYear;
        
        // Calculate target date
        const targetDate = new Date(targetYear, targetMonth - 1, dayNum);
        
        // If first instance has passed this year
        if (i === 0 && targetDate < today) {
          targetYear = currentYear + 1;
        } else if (i === 1) {
          // For second instance, it might be same year or next year
          const secondDateThisYear = new Date(currentYear, month2 - 1, dayNum);
          if (secondDateThisYear < today) {
            targetYear = currentYear + 1;
          } else {
            targetYear = currentYear;
          }
        }
        
        const finalDate = new Date(targetYear, targetMonth - 1, dayNum);
        
        // Handle invalid dates (e.g., Feb 30) by using last day of month
        if (finalDate.getDate() !== dayNum) {
          const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
          const adjustedDate = new Date(targetYear, targetMonth - 1, Math.min(dayNum, lastDayOfMonth));
          instances.push(adjustedDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        } else {
          instances.push(finalDate.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
        }
      }
    } else if (freq === 'annually') {
      // Annual: Show next 2 years
      for (let y = 0; y < 2; y++) {
        let targetYear = currentYear + y;
        
        // If this year's date has already passed, start from next year
        if (y === 0) {
          const thisYearDate = new Date(currentYear, monthNum - 1, dayNum);
          if (thisYearDate < today) {
            targetYear = currentYear + 1;
            y = -1; // Reset loop to show 2 future dates
          }
        }
        
        const targetDate = new Date(targetYear, monthNum - 1, dayNum);
        
        // Handle invalid dates (e.g., Feb 29 in non-leap year) by using last day of month
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
      
      // Load template data
      const { data: template, error: templateError } = await supabase
        .from("task_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Load template fields to get equipment
      const { data: fields, error: fieldsError } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", templateId)
        .order("field_order");

      if (fieldsError) throw fieldsError;

      // Find the fridge_name field and extract options
      const fridgeField = fields?.find(f => f.field_name === "fridge_name");
      if (fridgeField?.options && Array.isArray(fridgeField.options)) {
        const equipmentRowsData = fridgeField.options.map((opt: any) => ({
          id: crypto.randomUUID(),
          assetId: opt.value,
          nickname: opt.label
        }));
        setEquipmentRows(equipmentRowsData);
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

      // Load instructions
      if (template.instructions) {
        setInstructions(template.instructions);
      }

      // Set is expanded
      setIsExpanded(true);
      setEditingTemplateId(templateId);
      
    } catch (error) {
      console.error("Error loading draft:", error);
      alert(`Error loading draft: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Save as draft - goes to Drafts page
    setStatus("draft");
    
    const validEquipment = equipmentRows.filter(row => row.assetId !== "");
    
    if (validEquipment.length === 0) {
      alert("Please select at least one equipment item");
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
      // Prepare template data
      const templateName = "SFBB Temperature Checks (Draft)";
      const templateSlug = `sfbb-temperature-checks-draft-${Date.now()}`;
      
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
      
      const templateData = {
        company_id: profile.company_id,
        name: templateName,
        slug: templateSlug,
        description: "Daily temperature monitoring for refrigeration equipment - Draft",
        category: "food_safety",
        frequency: frequency,
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: recurrencePattern,
        assigned_to_role: "kitchen_manager",
        repeatable_field_name: "fridge_name",
        evidence_types: ["temperature", "photo", "pass_fail"],
        compliance_standard: "Food Safety Act / HACCP",
        audit_category: "food_safety",
        is_critical: false,
        is_template_library: false, // This makes it a draft
        is_active: true,
        instructions: instructions || `Temperature check for: ${validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const name = asset?.name || 'Equipment';
          const nick = eq.nickname || '';
          return nick ? `${name} (${nick})` : name;
        }).join(', ')}`
      };

      let template;
      
      // Update existing draft or create new
      if (editingTemplateId) {
        const { data: updatedTemplate, error: updateError } = await supabase
          .from("task_templates")
          .update(templateData)
          .eq("id", editingTemplateId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating draft template:", updateError);
          alert(`Error updating draft template: ${updateError.message}`);
          return;
        }
        template = updatedTemplate;
        
        // Delete old fields before creating new ones
        await supabase
          .from("template_fields")
          .delete()
          .eq("template_id", editingTemplateId);
      } else {
        // Create the template
        const { data: newTemplate, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating draft template:", insertError);
          alert(`Error creating draft template: ${insertError.message}`);
          return;
        }
        template = newTemplate;
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
          field_type: "number",
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
        .from("template_fields")
        .insert(fields.map(f => ({
          template_id: f.task_template_id,
          field_name: f.field_name,
          field_type: f.field_type,
          label: f.field_label,
          required: f.is_required,
          min_value: f.min_value,
          max_value: f.max_value,
          options: f.options,
          field_order: f.display_order,
          help_text: f.help_text
        })));

      if (fieldsError) {
        console.error("Error creating template fields:", fieldsError);
        alert(`Template ${editingTemplateId ? 'updated' : 'created'} but fields failed: ${fieldsError.message}`);
        return;
      }

      setIsExpanded(false);
      alert(`✅ Draft template ${editingTemplateId ? 'updated' : 'saved'}! Check the Drafts page to see your template.`);
      
      // Call the onSave callback if provided
      if (onSave) {
        onSave();
      }
      
    } catch (error) {
      console.error("Draft save error:", error);
      alert(`Error saving draft template: ${error.message || error}`);
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
      // 1. Create or update a task template (goes to Templates page)
      const templateName = "SFBB Temperature Checks";
      const templateSlug = editingTemplateId 
        ? undefined // Don't change slug when updating
        : `sfbb-temperature-checks-${Date.now()}`;
      
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
        description: "Daily temperature monitoring for refrigeration equipment",
        category: "food_safety",
        frequency: frequency,
        time_of_day: "before_open",
        dayparts: selectedDayParts,
        recurrence_pattern: recurrencePattern,
        assigned_to_role: "kitchen_manager",
        repeatable_field_name: "fridge_name",
        evidence_types: ["temperature", "photo", "pass_fail"],
        compliance_standard: "Food Safety Act / HACCP",
        audit_category: "food_safety",
        is_critical: false,
        is_template_library: true, // This makes it available in Templates
        is_active: true,
        instructions: instructions || `Temperature check for: ${validEquipment.map(eq => {
          const asset = assets.find(a => a.id === eq.assetId);
          const name = asset?.name || 'Equipment';
          const nick = eq.nickname || '';
          return nick ? `${name} (${nick})` : name;
        }).join(', ')}`
      };

      // Add slug only when creating new template
      if (templateSlug) {
        templateData.slug = templateSlug;
      }

      let template;
      
      // Update existing template or create new one
      if (editingTemplateId) {
        // Update existing template
        const { data: updatedTemplate, error: updateError } = await supabase
          .from("task_templates")
          .update(templateData)
          .eq("id", editingTemplateId)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating template:", updateError);
          alert(`Error updating task template: ${updateError.message}`);
          return;
        }
        template = updatedTemplate;
        
        // Delete old fields before creating new ones
        await supabase
          .from("template_fields")
          .delete()
          .eq("template_id", editingTemplateId);
      } else {
        // Create the template
        const { data: newTemplate, error: insertError } = await supabase
          .from("task_templates")
          .insert(templateData)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating template:", insertError);
          alert(`Error creating task template: ${insertError.message}`);
          return;
        }
        template = newTemplate;
        setEditingTemplateId(template.id);
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
          field_type: "number",
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
        .from("template_fields")
        .insert(fields.map(f => ({
          template_id: f.task_template_id,
          field_name: f.field_name,
          field_type: f.field_type,
          label: f.field_label,
          required: f.is_required,
          min_value: f.min_value,
          max_value: f.max_value,
          options: f.options,
          field_order: f.display_order,
          help_text: f.help_text
        })));

      if (fieldsError) {
        console.error("Error creating template fields:", fieldsError);
        alert(`Template created but fields failed: ${fieldsError.message}`);
        return;
      }

      // NOTE: Tasks should ONLY be created from templates via TaskFromTemplateModal
      // in the compliance or templates pages. This component only saves templates.
      // Tasks will be created automatically by the task generation system or manually
      // by users via the TaskFromTemplateModal.

      setIsExpanded(false);
      if (editingTemplateId) {
        // Template was updated
        if (onSave) {
          onSave();
        } else {
          alert(`✅ Template updated successfully!\n\n📋 Template configuration has been updated.\n\nTo create tasks from this template, use the Templates or Compliance pages.`);
        }
      } else {
        // Template was created
        alert(`✅ Template saved successfully!\n\n📋 Template is now available in the Templates and Compliance pages.\n\nTo create tasks from this template, go to the Templates or Compliance pages and click on the template.`);
      }

    } catch (error) {
      console.error("Deployment error:", error);
      alert(`Error deploying to My Tasks: ${error.message || error}`);
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
                  // Recalculate dates if we have an annualDate set
                  if (annualDate && (newFreq === 'quarterly' || newFreq === 'biannual' || newFreq === 'annually')) {
                    const [month, day] = annualDate.split('-');
                    if (month && day) {
                      calculateNextInstanceDates(month, day, newFreq);
                    }
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
                        onChange={() => {
                          setMonthlyLastWeekday(null);
                        }}
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

            {/* Instructions Field */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Instructions - How to Successfully Carry Out This Task
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter step-by-step instructions for completing this task. Include equipment to check, procedures, and corrective actions..."
                rows={10}
                className="w-full px-4 py-3 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-magenta-500 transition-colors resize-y"
              />
              <p className="text-xs text-slate-500 mt-2">
                These instructions will be displayed to staff when completing the task. Include clear steps, equipment details, and what to do if readings are out of range.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              {editingTemplateId ? (
                // When editing existing template, show Update button
                <button
                  type="button"
                  onClick={handleSaveAndDeploy}
                  className="px-6 py-2 rounded-lg bg-magenta-500/20 border border-magenta-500/50 text-magenta-400 hover:bg-magenta-500/30 hover:border-magenta-500/70 backdrop-blur-md transition-all duration-150 font-medium"
                >
                  Update Template
                </button>
              ) : (
                // When creating new template, show Save and Save & Deploy buttons
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
