'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { getTemplateFeatures, featuresToEvidenceTypes } from '@/lib/template-features';

interface MasterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (templateConfig: any) => void;
  editingTemplate?: any; // Template to edit (null for new template)
  mode?: 'template'; // 'template' saves as template (default)
}

const DAYPARTS = [
  { value: 'before_open', label: 'Before Open', times: ['06:00', '07:00', '08:00', '08:30', '09:00'] },
  { value: 'during_service', label: 'During Service', times: ['11:00', '12:00', '13:00', '14:00', '15:00'] },
  { value: 'afternoon', label: 'Afternoon', times: ['15:00', '16:00', '17:00'] },
  { value: 'after_service', label: 'After Service', times: ['21:00', '22:00', '23:00'] },
  { value: 'anytime', label: 'Anytime', times: ['10:00-11:00', 'Flexible'] }
];

interface FeatureItemProps {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ id, name, description, enabled, onChange }) => {
  return (
    <button
      onClick={onChange}
      className={`p-3 rounded border transition-all text-left ${enabled 
        ? 'border-pink-500 bg-pink-500/10' 
        : 'border-white/[0.1] bg-white/[0.02] hover:border-pink-500/50'}`
      }
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => {}}
          className="mt-1 accent-pink-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-white">{name}</span>
            <div className="group relative">
              <Info className="w-4 h-4 text-pink-400" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-neutral-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {description}
              </div>
            </div>
          </div>
          <div className="text-xs text-white/60 mt-1">{description}</div>
        </div>
      </div>
    </button>
  );
};

export function MasterTemplateModal({ isOpen, onClose, onSave, editingTemplate, mode = 'template' }: MasterTemplateModalProps) {
  const { companyId } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  
  const [templateConfig, setTemplateConfig] = useState({
    templateName: '',
    taskDescription: '', // Hidden in builder but still saved to template
    frequency: 'Daily',
    dayPart: 'Morning',
    purpose: '',
    importance: '',
    method: '',
    specialRequirements: '',
  });

  // Scheduling state - match SFBB template structure
  const [selectedDayparts, setSelectedDayparts] = useState<string[]>(['before_open']);
  const [daypartTimes, setDaypartTimes] = useState<Record<string, string>>({
    before_open: '06:00',
  });
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ..., 6=Sat
  const [monthlyDay, setMonthlyDay] = useState<number | null>(null); // Day of month (1-31)
  const [monthlyLastWeekday, setMonthlyLastWeekday] = useState<string | null>(null); // "friday" or null
  const [annualDate, setAnnualDate] = useState<string>(""); // MM-DD format
  const [nextInstanceDates, setNextInstanceDates] = useState<string[]>([]);

  const [features, setFeatures] = useState({
    monitorCallout: false,
    checklist: false,
    yesNoChecklist: false,
    passFail: false,
    libraryDropdown: false,
    raUpload: false,
    photoEvidence: false,
    documentUpload: false,
    tempLogs: false,
    assetDropdown: false,
    sopUpload: false,
  });

  // Load template data when editing
  useEffect(() => {
    if (editingTemplate && isOpen) {
      // Reverse map frequency from database to UI
      const frequencyReverseMap: Record<string, string> = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'triggered': 'On Demand',
        'once': 'Once'
      };

      // Parse instructions (purpose, importance, method, specialRequirements)
      const instructions = editingTemplate.instructions || '';
      const purposeMatch = instructions.match(/Purpose:\n([\s\S]*?)(?:\n\n|$)/);
      const importanceMatch = instructions.match(/Importance:\n([\s\S]*?)(?:\n\n|$)/);
      const methodMatch = instructions.match(/Method:\n([\s\S]*?)(?:\n\n|$)/);
      const specialMatch = instructions.match(/Special Requirements:\n([\s\S]*?)(?:\n\n|$)/);

      setTemplateConfig({
        templateName: editingTemplate.name || '',
        taskDescription: editingTemplate.description || '',
        frequency: frequencyReverseMap[editingTemplate.frequency] || 'Daily',
        dayPart: 'Morning',
        purpose: purposeMatch ? purposeMatch[1].trim() : '',
        importance: importanceMatch ? importanceMatch[1].trim() : '',
        method: methodMatch ? methodMatch[1].trim() : '',
        specialRequirements: specialMatch ? specialMatch[1].trim() : '',
      });

      // Set dayparts
      if (editingTemplate.dayparts && Array.isArray(editingTemplate.dayparts)) {
        setSelectedDayparts(editingTemplate.dayparts);
      }

      // Set daypart times from recurrence_pattern
      if (editingTemplate.recurrence_pattern?.daypart_times) {
        setDaypartTimes(editingTemplate.recurrence_pattern.daypart_times);
      }

      // Set frequency-specific data
      if (editingTemplate.frequency === 'weekly' && editingTemplate.recurrence_pattern?.weeklyDays) {
        setWeeklyDays(editingTemplate.recurrence_pattern.weeklyDays);
      }
      if (editingTemplate.frequency === 'monthly') {
        if (editingTemplate.recurrence_pattern?.monthlyLastWeekday) {
          setMonthlyLastWeekday(editingTemplate.recurrence_pattern.monthlyLastWeekday);
        } else if (editingTemplate.recurrence_pattern?.monthlyDay !== undefined) {
          setMonthlyDay(editingTemplate.recurrence_pattern.monthlyDay);
        }
      }
      if (editingTemplate.recurrence_pattern?.annualDate) {
        setAnnualDate(editingTemplate.recurrence_pattern.annualDate);
      }

      // Use shared utility to determine features from template config
      const templateFeatures = getTemplateFeatures(editingTemplate);
      
      setFeatures({
        monitorCallout: templateFeatures.monitorCallout,
        checklist: templateFeatures.checklist,
        yesNoChecklist: templateFeatures.yesNoChecklist,
        passFail: templateFeatures.passFail,
        libraryDropdown: templateFeatures.libraryDropdown,
        raUpload: templateFeatures.raUpload,
        photoEvidence: templateFeatures.photoEvidence,
        documentUpload: templateFeatures.documentUpload,
        tempLogs: templateFeatures.tempLogs,
        assetDropdown: templateFeatures.assetSelection, // Map assetSelection to assetDropdown
        sopUpload: templateFeatures.requiresSOP,
      });
    } else if (!editingTemplate && isOpen) {
      // Reset form for new template
      setTemplateConfig({
        templateName: '',
        taskDescription: '',
        frequency: 'Daily',
        dayPart: 'Morning',
        purpose: '',
        importance: '',
        method: '',
        specialRequirements: '',
      });
      setSelectedDayparts(['before_open']);
      setDaypartTimes({ before_open: '06:00' });
      setWeeklyDays([]);
      setMonthlyDay(null);
      setMonthlyLastWeekday(null);
      setAnnualDate('');
      setFeatures({
        monitorCallout: false,
        checklist: false,
        yesNoChecklist: false,
        passFail: false,
        libraryDropdown: false,
        raUpload: false,
        photoEvidence: false,
        documentUpload: false,
        tempLogs: false,
        assetDropdown: false,
        sopUpload: false,
      });
    }
  }, [editingTemplate, isOpen]);

  const toggleFeature = (featureName: keyof typeof features) => {
    setFeatures(prev => {
      const newValue = !prev[featureName];
      const updated = {
        ...prev,
        [featureName]: newValue
      };
      
      // Auto-select monitor/callout when assetDropdown, passFail, or tempLogs is selected
      if (featureName === 'assetDropdown' && newValue) {
        updated.monitorCallout = true;
      }
      if (featureName === 'passFail' && newValue) {
        updated.monitorCallout = true;
      }
      if (featureName === 'tempLogs' && newValue) {
        updated.monitorCallout = true;
      }
      
      return updated;
    });
  };

  const toggleDaypart = (daypart: string) => {
    setSelectedDayparts(prev => 
      prev.includes(daypart)
        ? prev.filter(d => d !== daypart)
        : [...prev, daypart]
    );
    
    // Initialize time if adding new daypart
    if (!selectedDayparts.includes(daypart)) {
      const daypartConfig = DAYPARTS.find(d => d.value === daypart);
      if (daypartConfig && daypartConfig.times.length > 0) {
        setDaypartTimes(prev => ({ ...prev, [daypart]: daypartConfig.times[0] }));
      }
    }
  };

  const setDaypartTime = (daypart: string, time: string) => {
    setDaypartTimes(prev => ({ ...prev, [daypart]: time }));
  };

  // Calculate next instance dates for quarterly, biannual, and annual frequencies
  const calculateNextInstanceDates = (month: string, day: string, freq: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const instances: string[] = [];
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    if (freq === 'Quarterly') {
      // Quarterly: Show next 4 instances (every 3 months)
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
    } else if (freq === 'Bi-Annually') {
      // Biannual: Show next 2 instances (6 months apart)
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
    } else if (freq === 'Annually') {
      // Annual: Show next 2 instances (1 year apart)
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

  const handleSave = async () => {
    if (!companyId) {
      toast.error('Company ID not found. Please refresh and try again.');
      return;
    }

    // Validate scheduling based on frequency
    if (templateConfig.frequency === 'Daily' && selectedDayparts.length === 0) {
      toast.error('Please select at least one daypart for Daily frequency.');
      return;
    }
    if (templateConfig.frequency === 'Weekly' && weeklyDays.length === 0) {
      toast.error("Please select at least one day of the week for weekly tasks");
      return;
    }
    if (templateConfig.frequency === 'Monthly' && monthlyDay === null && monthlyLastWeekday === null) {
      toast.error("Please select either a specific day or last weekday for monthly tasks");
      return;
    }
    if ((templateConfig.frequency === 'Quarterly' || templateConfig.frequency === 'Bi-Annually' || templateConfig.frequency === 'Annually') && !annualDate) {
      toast.error("Please select a date for quarterly/biannual/annual tasks");
      return;
    }

    setIsSaving(true);

    try {
      // Map frequency to lowercase - must match database CHECK constraint
      // Valid values: 'daily', 'weekly', 'monthly', 'triggered', 'once'
      const frequencyMap: Record<string, string> = {
        'Daily': 'daily',
        'Weekly': 'weekly',
        'Monthly': 'monthly',
        'Quarterly': 'monthly', // Map to monthly since quarterly not in schema
        'Bi-Annually': 'monthly', // Map to monthly since biannual not in schema
        'Annually': 'monthly', // Map to monthly since annually not in schema
        'On Demand': 'triggered',
        'Custom': 'triggered', // Map to triggered for custom schedules
      };

      // Build instructions from purpose, importance, method, specialRequirements
      const instructions = `Purpose:\n${templateConfig.purpose}\n\nImportance:\n${templateConfig.importance}\n\nMethod:\n${templateConfig.method}\n\nSpecial Requirements:\n${templateConfig.specialRequirements}`;

      // Build evidence types from features
      // Use shared utility to map features to evidence_types
      const evidenceTypes = featuresToEvidenceTypes({
        tempLogs: features.tempLogs,
        photoEvidence: features.photoEvidence,
        passFail: features.passFail,
        yesNoChecklist: features.yesNoChecklist,
        checklist: features.checklist,
      });

      // Prepare dayparts array - use selected dayparts, ensure it's always an array
      const dayparts = Array.isArray(selectedDayparts) && selectedDayparts.length > 0 
        ? selectedDayparts 
        : [];

      // Build recurrence_pattern based on frequency
      const recurrencePattern: any = {
        daypart_times: selectedDayparts.reduce((acc: Record<string, string>, daypart) => {
          acc[daypart] = daypartTimes[daypart] || '';
          return acc;
        }, {})
      };
      
      if (templateConfig.frequency === 'Weekly' && weeklyDays.length > 0) {
        recurrencePattern.weeklyDays = weeklyDays;
      } else if (templateConfig.frequency === 'Monthly') {
        if (monthlyLastWeekday) {
          recurrencePattern.monthlyLastWeekday = monthlyLastWeekday;
        } else if (monthlyDay !== null) {
          recurrencePattern.monthlyDay = monthlyDay;
        }
      } else if ((templateConfig.frequency === 'Quarterly' || templateConfig.frequency === 'Bi-Annually' || templateConfig.frequency === 'Annually') && annualDate) {
        recurrencePattern.annualDate = annualDate;
      }

      // Set time_of_day to first daypart time
      const timeOfDay = selectedDayparts.length > 0
        ? daypartTimes[selectedDayparts[0]] || null
        : null;

      // Handle slug - keep existing when editing, generate new when creating
      let slug: string;
      
      if (editingTemplate) {
        // Keep existing slug when editing
        slug = editingTemplate.slug;
      } else {
        // Create base slug from template name
        const baseSlug = templateConfig.templateName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'template'; // Fallback if name is empty

        // Function to check if slug exists for this company
        const checkSlugExists = async (slugToCheck: string): Promise<boolean> => {
          if (!companyId) {
            console.warn('No companyId available for slug check');
            return false;
          }

          try {
            const { data, error } = await supabase
              .from('task_templates')
              .select('id')
              .eq('company_id', companyId)
              .eq('slug', slugToCheck)
              .maybeSingle();

            if (error) {
              console.warn('Error checking slug:', error);
              // If we can't check, assume it exists to be safe
              return true;
            }

            // maybeSingle returns null if no record found, or the record if found
            return data !== null;
          } catch (err) {
            console.error('Exception checking slug:', err);
            return true; // Be safe, assume exists
          }
        };

        // Generate unique slug
        slug = baseSlug || 'template';
        let slugCounter = 1;
        const maxSlugChecks = 100;

        // Ensure slug is not empty
        if (!slug || slug.trim().length === 0) {
          slug = `template_${Date.now()}`;
        } else {
          // Check initial slug
          let slugExists = await checkSlugExists(slug);

          while (slugExists && slugCounter < maxSlugChecks) {
            slug = `${baseSlug}_${slugCounter}`;
            slugExists = await checkSlugExists(slug);
            slugCounter++;
          }

          // If we hit the limit, append timestamp to ensure uniqueness
          if (slugCounter >= maxSlugChecks) {
            slug = `${baseSlug}_${Date.now()}`;
          }
        }

        console.log('Generated unique slug:', slug, 'for company:', companyId);
      }

      // Prepare template data
      const templateData: any = {
        company_id: companyId,
        name: templateConfig.templateName,
        slug: slug,
        description: templateConfig.taskDescription,
        category: 'compliance',
        frequency: frequencyMap[templateConfig.frequency] || 'monthly',
        dayparts: dayparts,
        instructions: instructions,
        evidence_types: evidenceTypes,
        requires_sop: features.sopUpload,
        requires_risk_assessment: features.raUpload,
        is_active: true,
        is_template_library: false, // User-created templates, not library templates
      };

      // Add optional fields
      if (recurrencePattern) {
        templateData.recurrence_pattern = recurrencePattern;
      }
      if (timeOfDay) {
        templateData.time_of_day = timeOfDay;
      }

      // Validate required fields
      if (!templateConfig.templateName || !templateConfig.templateName.trim()) {
        toast.error('Template name is required');
        setIsSaving(false);
        return;
      }

      // Save to database (create or update)
      console.log('Saving template data:', templateData);
      
      let savedTemplate;
      let error;

      if (editingTemplate) {
        // Update existing template
        const { data, error: updateError } = await supabase
          .from('task_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select()
          .single();
        
        savedTemplate = data;
        error = updateError;
      } else {
        // Create new template
        const { data, error: insertError } = await supabase
          .from('task_templates')
          .insert(templateData)
          .select()
          .single();
        
        savedTemplate = data;
        error = insertError;
      }

      if (error) {
        console.error('Error saving template:', error);
        const errorMessage = error.message || error.details || JSON.stringify(error);
        toast.error(`Failed to save template: ${errorMessage}`);
        setIsSaving(false);
        return;
      }

      toast.success(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');

      // Call onSave callback if provided
      if (onSave) {
        onSave({ template: templateConfig, features, savedTemplate });
      }

      // Reset state and close modal
      setIsSaving(false);
      onClose();
      
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error(`Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const featureList = [
    { id: 'monitorCallout', name: 'Monitor/Callout Modal', description: 'Alert and notification system' },
    { id: 'checklist', name: 'Checklist', description: 'Task checklist items' },
    { id: 'yesNoChecklist', name: 'Yes/No Checklist', description: 'Binary yes/no questions for each checklist item' },
    { id: 'passFail', name: 'Pass/Fail Buttons', description: 'Pass/fail assessment' },
    { id: 'libraryDropdown', name: 'Library Dropdown', description: 'Resource library access' },
    { id: 'raUpload', name: 'RA Upload', description: 'Risk assessment documents' },
    { id: 'photoEvidence', name: 'Photo Evidence', description: 'Camera and photo upload' },
    { id: 'documentUpload', name: 'Document Upload', description: 'Upload PDFs, certificates, and files' },
    { id: 'tempLogs', name: 'Temperature Logs', description: 'Temperature monitoring' },
    { id: 'assetDropdown', name: 'Asset Dropdown', description: 'Equipment and assets' },
    { id: 'sopUpload', name: 'SOP Upload', description: 'SOP documentation' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f1220] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-pink-500/20">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-pink-500 mb-2">
                {editingTemplate ? 'Edit Template Configuration' : 'Template Builder'}
              </h1>
              <p className="text-gray-400">
                {editingTemplate 
                  ? 'Modify template features and configuration. This will affect all future tasks created from this template.'
                  : 'Create comprehensive compliance task templates with all required elements'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-[#141823]">
          {/* Template Configuration */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Template Configuration</h2>
            <p className="text-sm text-gray-400 mb-4">Define the basic information for your template</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Template Name</label>
              <input
                type="text"
                value={templateConfig.templateName}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, templateName: e.target.value }))}
                className="w-full p-2 border border-white/10 rounded bg-white/[0.05] text-white text-sm"
                placeholder="Enter template name"
              />
            </div>

            {/* Task Name and Description fields removed from builder - they will be shown in curated template view */}
          </div>

          {/* Frequency & Scheduling */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Frequency & Scheduling</h2>
            
            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Task Frequency
              </label>
              <select
                value={templateConfig.frequency}
                onChange={(e) => {
                  const newFreq = e.target.value;
                  setTemplateConfig(prev => ({ ...prev, frequency: newFreq }));
                  // Recalculate dates if we have an annualDate set
                  if (annualDate && (newFreq === 'Quarterly' || newFreq === 'Bi-Annually' || newFreq === 'Annually')) {
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
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Bi-Annually">Bi-annually (Every 6 months)</option>
                <option value="Annually">Annually</option>
                <option value="On Demand">On Demand</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {/* Weekly Day Selection */}
            {templateConfig.frequency === 'Weekly' && (
              <div className="mt-4">
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
            {templateConfig.frequency === 'Monthly' && (
              <div className="mt-4 space-y-4">
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
            {(templateConfig.frequency === 'Annually' || templateConfig.frequency === 'Bi-Annually' || templateConfig.frequency === 'Quarterly') && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-3">
                  {templateConfig.frequency === 'Annually' ? 'Annual' : templateConfig.frequency === 'Bi-Annually' ? 'Bi-annual' : 'Quarterly'} Date (Month-Day)
                </label>
                <input
                  type="date"
                  value={annualDate ? `${new Date().getFullYear()}-${annualDate}` : ''}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (date) {
                      const [year, month, day] = date.split('-');
                      setAnnualDate(`${month}-${day}`);
                      calculateNextInstanceDates(month, day, templateConfig.frequency);
                    } else {
                      setAnnualDate('');
                      setNextInstanceDates([]);
                    }
                  }}
                  className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Tasks will be automatically scheduled for this date {templateConfig.frequency === 'Annually' ? 'each year' : templateConfig.frequency === 'Bi-Annually' ? 'every 6 months' : 'each quarter'}
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

            {/* Custom Frequency Options */}
            {templateConfig.frequency === 'Custom' && (
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                  <p className="text-sm text-orange-400 mb-3">Custom frequency - configure all options:</p>
                  
                  {/* Days of week */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Days of Week (optional)</label>
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
                  </div>

                  {/* Specific date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Specific Date (optional)</label>
                    <input
                      type="date"
                      value={annualDate ? `${new Date().getFullYear()}-${annualDate}` : ''}
                      onChange={(e) => {
                        const date = e.target.value;
                        if (date) {
                          const [year, month, day] = date.split('-');
                          setAnnualDate(`${month}-${day}`);
                        } else {
                          setAnnualDate('');
                        }
                      }}
                      className="w-full px-4 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Day Parts Selection - Show for all frequencies */}
            {templateConfig.frequency !== 'On Demand' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-3">
                  When to Run Task (Day Parts)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DAYPARTS.map((part) => (
                    <button
                      key={part.value}
                      type="button"
                      onClick={() => toggleDaypart(part.value)}
                      className={`px-4 py-3 rounded-lg border text-center transition-all ${
                        selectedDayparts.includes(part.value)
                          ? "border-magenta-500 bg-magenta-500/10 text-magenta-400"
                          : "border-neutral-800 bg-[#141823] text-slate-400 hover:border-neutral-700"
                      }`}
                    >
                      <div className="text-sm font-medium">{part.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Settings - Show if dayparts selected */}
            {selectedDayparts.length > 0 && templateConfig.frequency !== 'On Demand' && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-3">
                  Check Times
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {selectedDayparts.map((dayPart) => (
                    <div key={dayPart}>
                      <label className="block text-xs text-slate-400 mb-1 capitalize">
                        {dayPart.replace('_', ' ')}
                      </label>
                      <input
                        type="time"
                        value={daypartTimes[dayPart] || ''}
                        onChange={(e) => setDaypartTime(dayPart, e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[#141823] border border-neutral-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent [color-scheme:dark]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded p-3">
              <p className="text-green-400 text-sm">Auto-captured: User, time, date, location - no input required</p>
            </div>
          </div>

          {/* Template Features */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white mb-1">Template Features</h2>
            <p className="text-sm text-gray-400 mb-4">Select the features and requirements for this template</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {featureList.map((feature) => (
                <FeatureItem
                  key={feature.id}
                  id={feature.id}
                  name={feature.name}
                  description={feature.description}
                  enabled={features[feature.id as keyof typeof features]}
                  onChange={() => toggleFeature(feature.id as keyof typeof features)}
                />
              ))}
            </div>
          </div>

          {/* Task Instructions section hidden from builder - will be shown in curated template view */}
          {/* Instructions are still saved to template, just not displayed in builder */}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[#0f1220]">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-white/10 rounded text-gray-300 hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] rounded transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/40"
          >
            {isSaving 
              ? (editingTemplate ? 'Updating...' : 'Creating...')
              : (editingTemplate ? 'Update Template' : 'Create Template')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
