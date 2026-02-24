'use client';

import { useState, useEffect } from 'react';
import { X, Info } from '@/components/ui/icons';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'sonner';
import { getTemplateFeatures, featuresToEvidenceTypes } from '@/lib/template-features';
import TimePicker from '@/components/ui/TimePicker';
import NotificationConfigSection from '@/components/templates/NotificationConfigSection';
import type { NotificationConfig, TemplateField } from '@/types/checklist';
import { FieldBuilderPanel } from '@/components/templates/field-builder/FieldBuilderPanel';
import { ChecklistFeature, YesNoChecklistFeature, DocumentUploadFeature } from '@/components/templates/features';

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
        ? 'border-[#D37E91] bg-[#D37E91]/15 dark:bg-[#D37E91]/15' 
        : 'border-theme bg-white dark:bg-white/[0.02] hover:border-[#D37E91]/50 dark:hover:border-[#D37E91]/50'}`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => {}}
          className="mt-1 accent-[#D37E91]"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-theme-primary">{name}</span>
            <div className="group relative">
              <Info className="w-4 h-4 text-[#D37E91] dark:text-[#D37E91]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-theme-surface border border-theme text-theme-primary text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                {description}
              </div>
            </div>
          </div>
          <div className="text-xs text-theme-secondary mt-1">{description}</div>
        </div>
      </div>
    </button>
  );
};

export function MasterTemplateModal({ isOpen, onClose, onSave, editingTemplate, mode = 'template' }: MasterTemplateModalProps) {
  const { companyId, user, profile } = useAppContext();
  const [isSaving, setIsSaving] = useState(false);
  const isTrailImport = editingTemplate?.tags?.includes('trail_import') ?? false;
  
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

  // Multi-site assignment state
  const [applyToAllSites, setApplyToAllSites] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [availableSites, setAvailableSites] = useState<Array<{id: string, name: string}>>([]);

  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig | null>(null);

  // Custom form builder state
  const [useCustomFields, setUseCustomFields] = useState(false);
  const [customFieldsList, setCustomFieldsList] = useState<TemplateField[]>([]);

  // Checklist / Yes-No items state (editable from feature editors)
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [yesNoChecklistItems, setYesNoChecklistItems] = useState<any[]>([]);

  // Template document uploads state
  const [templateDocuments, setTemplateDocuments] = useState<Array<{ url: string; fileName: string; fileType: string; fileSize: number }>>([]);

  // Compliance template linking state (for trail_import templates)
  const [complianceTemplates, setComplianceTemplates] = useState<Array<{id: string, slug: string, name: string, category?: string}>>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

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
    customFields: false,
  });

  // Load sites on modal open
  useEffect(() => {
    const loadSites = async () => {
      if (!isOpen) {
        console.log('🚫 Template builder site loading skipped: modal not open');
        // Reset state when modal closes
        setAvailableSites([]);
        setSelectedSites([]);
        setApplyToAllSites(false);
        return;
      }
      
      if (!companyId) {
        console.log('🚫 Template builder site loading skipped: no companyId');
        return;
      }
      
      try {
        console.log('🏢 Loading sites for template builder, companyId:', companyId, 'isOpen:', isOpen, 'home_site:', profile?.home_site);
        const { data: sites, error } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', companyId)
          .order('name');
        
        if (sites && !error) {
          console.log(`✅ Loaded ${sites.length} sites for template builder:`, sites.map(s => s.name));
          setAvailableSites(sites);

          // For trail_import templates, let the pre-assigned sites effect handle selection
          if (isTrailImport) {
            console.log('📋 Trail import template — skipping default site selection (pre-assigned sites effect will handle it)');
          } else {
            // Default to home site only (if available), otherwise empty
            const homeSiteId = profile?.home_site;
            if (homeSiteId && sites.some(s => s.id === homeSiteId)) {
              console.log('🏠 Defaulting to home site only:', homeSiteId);
              setSelectedSites([homeSiteId]);
              setApplyToAllSites(false);
            } else {
              console.log('⚠️ No home site found or home site not in available sites, defaulting to empty selection');
              setSelectedSites([]);
              setApplyToAllSites(false);
            }
          }
        } else {
          console.error('❌ Error loading sites for template builder:', error);
          setAvailableSites([]);
          setSelectedSites([]);
          setApplyToAllSites(false);
        }
      } catch (error) {
        console.error('❌ Exception loading sites for template builder:', error);
        setAvailableSites([]);
        setSelectedSites([]);
        setApplyToAllSites(false);
      }
    };
    
    loadSites();
  }, [isOpen, companyId, profile?.home_site]);

  // Load template data when editing
  useEffect(() => {
    if (editingTemplate && isOpen) {
      // Reverse map frequency from database to UI
      const frequencyReverseMap: Record<string, string> = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'annually': 'Annually',
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

      // Debug: Log evidence_types and detected features
      console.log('📋 Loading template for editing:', {
        templateId: editingTemplate.id,
        templateName: editingTemplate.name,
        evidence_types: editingTemplate.evidence_types,
        evidence_types_type: typeof editingTemplate.evidence_types,
        is_array: Array.isArray(editingTemplate.evidence_types),
        detectedFeatures: templateFeatures
      });

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
        customFields: !!editingTemplate.use_custom_fields,
      });

      // Load checklist / yes-no items from recurrence_pattern
      const defaultItems = editingTemplate.recurrence_pattern?.default_checklist_items || [];
      if (templateFeatures.yesNoChecklist && Array.isArray(defaultItems)) {
        const loaded = defaultItems
          .map((item: any) => {
            if (item && typeof item === 'object' && item.options && Array.isArray(item.options)) {
              return { ...item, answer: null }; // Enhanced format
            }
            return {
              text: typeof item === 'string' ? item : (item.text || item.label || ''),
              answer: null,
            };
          })
          .filter((item: any) => item.text && item.text.trim().length > 0);
        setYesNoChecklistItems(loaded);
        setChecklistItems([]);
      } else if (Array.isArray(defaultItems)) {
        const loaded = defaultItems
          .map((item: any) => typeof item === 'string' ? item : (item.text || item.label || ''))
          .filter((item: string) => item && item.trim().length > 0);
        setChecklistItems(loaded);
        setYesNoChecklistItems([]);
      } else {
        setChecklistItems([]);
        setYesNoChecklistItems([]);
      }

      // Load template documents from recurrence_pattern
      const docs = editingTemplate.recurrence_pattern?.template_documents;
      if (Array.isArray(docs) && docs.length > 0) {
        setTemplateDocuments(docs);
      } else {
        setTemplateDocuments([]);
      }

      // Load notification config
      if (editingTemplate.notification_config) {
        setNotificationConfig(editingTemplate.notification_config);
      } else {
        setNotificationConfig(null);
      }

      // Load custom fields if template uses custom form builder
      if (editingTemplate.use_custom_fields) {
        setUseCustomFields(true);
        (async () => {
          const { data: fields } = await supabase
            .from('template_fields')
            .select('*')
            .eq('template_id', editingTemplate.id)
            .order('field_order');
          if (fields) {
            // Normalize field types from Trail imports (e.g. 'checkbox' → 'yes_no')
            const FIELD_TYPE_NORMALIZE: Record<string, string> = { 'checkbox': 'yes_no' };
            const normalized = fields.map(f => ({
              ...f,
              field_type: FIELD_TYPE_NORMALIZE[f.field_type] || f.field_type,
            }));
            setCustomFieldsList(normalized);
          }
        })();
      } else {
        setUseCustomFields(false);
        setCustomFieldsList([]);
      }
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
        customFields: false,
      });
      setNotificationConfig(null);
      setUseCustomFields(false);
      setCustomFieldsList([]);
      setChecklistItems([]);
      setYesNoChecklistItems([]);
      setTemplateDocuments([]);
    }
  }, [editingTemplate, isOpen]);

  // Load pre-assigned sites for trail_import templates
  useEffect(() => {
    if (!editingTemplate?.id || !isTrailImport || !isOpen) return;
    (async () => {
      const { data } = await supabase
        .from('template_site_assignments')
        .select('site_id')
        .eq('template_id', editingTemplate.id);
      if (data && data.length > 0) {
        setSelectedSites(data.map(a => a.site_id));
        setApplyToAllSites(false);
      } else {
        // No pre-assigned sites — fall back to home site so button isn't greyed out
        const homeSiteId = profile?.home_site;
        if (homeSiteId) {
          setSelectedSites([homeSiteId]);
        }
      }
    })();
  }, [editingTemplate?.id, isTrailImport, isOpen, profile?.home_site]);

  // Load compliance library templates for trail_import template linking
  useEffect(() => {
    if (!isTrailImport || !isOpen || !companyId) {
      setComplianceTemplates([]);
      return;
    }
    setLoadingCompliance(true);
    (async () => {
      const { data } = await supabase
        .from('task_templates')
        .select('id, slug, name, category')
        .eq('is_template_library', true)
        .eq('is_active', true)
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .order('name');
      if (data) {
        setComplianceTemplates(data);
      }
      setLoadingCompliance(false);
    })();
  }, [isTrailImport, isOpen, companyId]);

  // Apply a compliance library template's configuration to the current form
  const applyComplianceTemplate = async (templateId: string) => {
    if (!templateId) return;
    const { data: ct, error } = await supabase
      .from('task_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    if (error || !ct) {
      toast.error('Failed to load compliance template');
      return;
    }

    // Map compliance template's features
    const templateFeatures = getTemplateFeatures(ct);

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
      assetDropdown: templateFeatures.assetSelection,
      sopUpload: templateFeatures.requiresSOP,
    });

    // Map frequency
    const frequencyReverseMap: Record<string, string> = {
      'daily': 'Daily', 'weekly': 'Weekly', 'monthly': 'Monthly',
      'annually': 'Annually', 'triggered': 'On Demand', 'once': 'Once'
    };

    setTemplateConfig(prev => ({
      ...prev,
      frequency: frequencyReverseMap[ct.frequency] || prev.frequency,
      taskDescription: ct.description || prev.taskDescription,
    }));

    // Copy dayparts if available
    if (ct.dayparts && Array.isArray(ct.dayparts) && ct.dayparts.length > 0) {
      setSelectedDayparts(ct.dayparts);
    }
    if (ct.recurrence_pattern?.daypart_times) {
      setDaypartTimes(ct.recurrence_pattern.daypart_times);
    }

    if (ct.notification_config) {
      setNotificationConfig(ct.notification_config);
    }

    toast.success(`Applied "${ct.name}" configuration`);
  };

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

      // Sync customFields feature with useCustomFields state
      if (featureName === 'customFields') {
        setUseCustomFields(newValue);
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

  const handleSave = async (withSchedule: boolean = false) => {
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
        'Quarterly': 'monthly', // Map to monthly since quarterly not in site_checklists schema
        'Bi-Annually': 'annually', // Closest supported frequency
        'Annually': 'annually',
        'On Demand': 'triggered',
        'Custom': 'triggered', // Map to triggered for custom schedules
      };

      // Build instructions from purpose, importance, method, specialRequirements
      const instructions = `Purpose:\n${templateConfig.purpose}\n\nImportance:\n${templateConfig.importance}\n\nMethod:\n${templateConfig.method}\n\nSpecial Requirements:\n${templateConfig.specialRequirements}`;

      // Build evidence types from features (standard + custom can coexist)
      const evidenceTypes = featuresToEvidenceTypes({
        tempLogs: features.tempLogs,
        photoEvidence: features.photoEvidence,
        passFail: features.passFail,
        yesNoChecklist: features.yesNoChecklist,
        checklist: features.checklist,
        documentUpload: features.documentUpload,
      });
      if (useCustomFields) {
        evidenceTypes.push('custom_fields');
      }

      // Debug: Log the features being saved
      console.log('💾 Saving template with features:', {
        selectedFeatures: {
          tempLogs: features.tempLogs,
          photoEvidence: features.photoEvidence,
          passFail: features.passFail,
          yesNoChecklist: features.yesNoChecklist,
          checklist: features.checklist,
        },
        evidenceTypes: evidenceTypes,
        evidenceTypesLength: evidenceTypes.length,
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

      // Save checklist / yes-no items into recurrence_pattern
      if (features.yesNoChecklist && yesNoChecklistItems.length > 0) {
        const validItems = yesNoChecklistItems.filter((item: any) => item?.text?.trim());
        if (validItems.length > 0) {
          recurrencePattern.default_checklist_items = validItems;
        }
      } else if (features.checklist && checklistItems.length > 0) {
        const validItems = checklistItems.filter((item: string) => item.trim());
        if (validItems.length > 0) {
          recurrencePattern.default_checklist_items = validItems.map(text => ({
            id: crypto.randomUUID(),
            text,
            required: true,
          }));
        }
      }

      // Save template documents into recurrence_pattern
      if (features.documentUpload && templateDocuments.length > 0) {
        recurrencePattern.template_documents = templateDocuments;
      }

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
        category: editingTemplate?.category || 'compliance',
        frequency: frequencyMap[templateConfig.frequency] || 'monthly',
        dayparts: dayparts,
        instructions: instructions,
        evidence_types: evidenceTypes,
        requires_sop: features.sopUpload,
        requires_risk_assessment: features.raUpload,
        // CRITICAL: Set is_active = false for Custom Task Builder templates
        // Templates should only generate tasks when added to "My Tasks" (which creates site_checklist entries)
        // This prevents the old database cron from creating tasks for all sites
        is_active: false,
        is_template_library: false, // User-created templates, not library templates
        notification_config: notificationConfig,
        use_custom_fields: useCustomFields,
      };

      // Set asset selection fields if asset dropdown feature is enabled
      if (features.assetDropdown) {
        templateData.repeatable_field_name = 'asset_id'; // Standard field name for asset selection
        templateData.asset_type = 'equipment'; // Default asset type
        console.log('✅ Setting asset selection fields:', {
          repeatable_field_name: templateData.repeatable_field_name,
          asset_type: templateData.asset_type
        });
      } else {
        // Clear asset selection fields if feature is disabled
        templateData.repeatable_field_name = null;
        templateData.asset_type = null;
      }

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

      // Verify companyId is valid before saving
      if (!companyId) {
        toast.error('Company ID is missing. Please refresh the page and try again.');
        setIsSaving(false);
        return;
      }

      // Verify user has access to this company by checking their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, is_platform_admin')
        .or(`id.eq.${user?.id},auth_user_id.eq.${user?.id}`)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
        toast.error('Unable to verify your access. Please refresh and try again.');
        setIsSaving(false);
        return;
      }

      // Platform admins can create templates for any company (View As mode)
      if (!profileData || (!profileData.is_platform_admin && profileData.company_id !== companyId)) {
        toast.error('You do not have access to create templates for this company.');
        setIsSaving(false);
        return;
      }

      // Save to database (create or update)
      console.log('Saving template data:', templateData);
      console.log('Company ID:', companyId);
      console.log('User ID:', user?.id);
      
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

        // Propagate frequency & timing changes to all site_checklists for this template
        if (savedTemplate && !updateError) {
          const siteChecklistUpdate: Record<string, any> = {
            frequency: frequencyMap[templateConfig.frequency] || 'triggered',
            updated_at: new Date().toISOString(),
          };

          // Build daypart_times object for site_checklists
          if (selectedDayparts.length > 0) {
            const dpTimes: Record<string, string> = {};
            selectedDayparts.forEach(dp => {
              dpTimes[dp] = daypartTimes[dp] || '';
            });
            siteChecklistUpdate.daypart_times = dpTimes;
          } else {
            siteChecklistUpdate.daypart_times = null;
          }

          // Set days_of_week for weekly tasks
          if (templateConfig.frequency === 'Weekly' && weeklyDays.length > 0) {
            siteChecklistUpdate.days_of_week = weeklyDays;
          } else {
            siteChecklistUpdate.days_of_week = null;
          }

          // Set date_of_month for monthly tasks
          if (templateConfig.frequency === 'Monthly' && monthlyDay !== null) {
            siteChecklistUpdate.date_of_month = monthlyDay;
          } else {
            siteChecklistUpdate.date_of_month = null;
          }

          // Set anniversary_date for annual tasks
          if ((templateConfig.frequency === 'Annually' || templateConfig.frequency === 'Bi-Annually') && annualDate) {
            siteChecklistUpdate.anniversary_date = annualDate;
          } else {
            siteChecklistUpdate.anniversary_date = null;
          }

          const { error: scError } = await supabase
            .from('site_checklists')
            .update(siteChecklistUpdate)
            .eq('template_id', editingTemplate.id);

          if (scError) {
            console.error('Error propagating to site_checklists:', scError);
            toast.error('Template saved but scheduling update failed. Try editing from My Tasks.');
          } else {
            console.log('Propagated timing changes to site_checklists');
            toast.success('Scheduling updated for all sites');
          }
        }
      } else {
        // Create new template
        const { data, error: insertError } = await supabase
          .from('task_templates')
          .insert(templateData)
          .select()
          .single();
        
        savedTemplate = data;
        error = insertError;
        
        // CRITICAL: If only one site is selected, set site_id on the template
        // This prevents the old database cron from creating tasks for ALL sites
        // If multiple sites are selected, site_id remains NULL (template is company-wide)
        if (savedTemplate && selectedSites.length === 1) {
          const { error: updateError } = await supabase
            .from('task_templates')
            .update({ site_id: selectedSites[0] })
            .eq('id', savedTemplate.id);
          
          if (updateError) {
            console.error('Error setting template site_id:', updateError);
            // Don't fail - template is created, just log the error
          } else {
            console.log(`Template site_id set to: ${selectedSites[0]}`);
            // Update savedTemplate to reflect the change
            savedTemplate.site_id = selectedSites[0];
          }
        }
        
        // Link template to selected sites (only for new templates)
        // This is for future use - currently the system uses site_checklists
        if (savedTemplate && selectedSites.length > 0) {
          const siteAssignments = selectedSites.map(siteId => ({
            template_id: savedTemplate.id,
            site_id: siteId,
            company_id: companyId
          }));
          
          const { error: assignError } = await supabase
            .from('template_site_assignments')
            .insert(siteAssignments);
          
          if (assignError) {
            console.error('Error creating site assignments:', assignError);
            // Don't fail - template is created, just log the error
          } else {
            console.log(`Template assigned to ${selectedSites.length} sites`);
          }
        }
      }

      // Save custom fields if using custom form builder
      if (savedTemplate && useCustomFields && customFieldsList.length > 0) {
        // Delete existing template_fields for this template
        await supabase
          .from('template_fields')
          .delete()
          .eq('template_id', savedTemplate.id);

        // Build a map from temp IDs to real IDs (for parent_field_id references)
        const tempToRealId = new Map<string, string>();

        // Insert top-level fields first
        const topLevelFields = customFieldsList.filter(f => !f.parent_field_id);
        for (const field of topLevelFields) {
          const { data: inserted, error: fieldError } = await supabase
            .from('template_fields')
            .insert({
              template_id: savedTemplate.id,
              field_name: field.field_name,
              field_type: field.field_type,
              label: field.label,
              placeholder: field.placeholder,
              help_text: field.help_text,
              options: field.options,
              required: field.required,
              field_order: field.field_order,
              min_value: field.min_value,
              max_value: field.max_value,
              warn_threshold: field.warn_threshold,
              fail_threshold: field.fail_threshold,
              unit: field.unit,
              default_value: field.default_value,
              section_label: field.section_label,
            })
            .select()
            .single();

          if (inserted && !fieldError) {
            tempToRealId.set(field.id, inserted.id);
          } else if (fieldError) {
            console.error('Error inserting field:', fieldError);
          }
        }

        // Insert sub-fields with real parent_field_id
        const subFields = customFieldsList.filter(f => f.parent_field_id);
        for (const field of subFields) {
          const realParentId = tempToRealId.get(field.parent_field_id!) || field.parent_field_id;
          await supabase
            .from('template_fields')
            .insert({
              template_id: savedTemplate.id,
              field_name: field.field_name,
              field_type: field.field_type,
              label: field.label,
              placeholder: field.placeholder,
              help_text: field.help_text,
              options: field.options,
              required: field.required,
              field_order: field.field_order,
              min_value: field.min_value,
              max_value: field.max_value,
              warn_threshold: field.warn_threshold,
              fail_threshold: field.fail_threshold,
              unit: field.unit,
              default_value: field.default_value,
              parent_field_id: realParentId,
            });
        }

        console.log(`✅ Saved ${customFieldsList.length} custom fields`);
      }

      if (error) {
        console.error('Error saving template:', error);
        
        // Enhanced error logging
        const errorInfo = {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          fullError: error
        };
        
        console.error('Full error details:', errorInfo);
        console.error('Error object keys:', Object.keys(error || {}));
        console.error('Error object values:', Object.values(error || {}));
        
        // Better error handling - check for common issues
        let errorMessage = 'Failed to save template';
        
        // Check for RLS/permission errors
        if (error.code === 'PGRST116' || 
            error.code === '42501' || 
            error.message?.includes('permission denied') || 
            error.message?.includes('403') ||
            error.status === 403) {
          errorMessage = 'Permission denied. The RLS policy check failed. Please ensure:\n' +
            '1. You are logged in\n' +
            '2. Your profile has the correct company_id\n' +
            '3. The company_id matches your current company context';
        } else if (error.code === '23503') {
          errorMessage = 'Foreign key constraint violation. Please check that the company_id exists.';
        } else if (error.code === '23505') {
          errorMessage = 'A template with this slug already exists. Please use a different template name.';
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (error.hint) {
          errorMessage = `${errorMessage}: ${error.hint}`;
        } else {
          // Try to stringify the error object with all properties
          try {
            const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
            if (errorStr !== '{}') {
              errorMessage = `Error: ${errorStr}`;
            } else {
              errorMessage = 'Unknown error occurred. Check browser console for details. Error code: ' + (error.code || 'N/A');
            }
          } catch (e) {
            errorMessage = 'Unknown error occurred. Please check console for details.';
          }
        }
        
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }

      // If Save & Schedule was clicked for a trail_import template, create site_checklists
      if (withSchedule && isTrailImport && savedTemplate && selectedSites.length > 0) {
        const siteFreqMap: Record<string, string> = {
          'Daily': 'daily', 'Weekly': 'weekly', 'Monthly': 'monthly',
          'Quarterly': 'monthly', 'Bi-Annually': 'annually',
          'Annually': 'annually', 'On Demand': 'triggered',
        };
        const siteFreq = siteFreqMap[templateConfig.frequency] || 'triggered';

        // Build daypart_times
        const dpTimes: Record<string, string> = {};
        selectedDayparts.forEach(dp => {
          dpTimes[dp] = daypartTimes[dp] || '';
        });

        for (const sId of selectedSites) {
          const siteChecklistData: Record<string, any> = {
            template_id: savedTemplate.id,
            company_id: companyId,
            site_id: sId,
            name: templateConfig.templateName,
            frequency: siteFreq,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (Object.keys(dpTimes).length > 0) {
            siteChecklistData.daypart_times = dpTimes;
          }
          if (templateConfig.frequency === 'Weekly' && weeklyDays.length > 0) {
            siteChecklistData.days_of_week = weeklyDays;
          }
          if (templateConfig.frequency === 'Monthly' && monthlyDay !== null) {
            siteChecklistData.date_of_month = monthlyDay;
          }
          if ((templateConfig.frequency === 'Annually' || templateConfig.frequency === 'Bi-Annually') && annualDate) {
            siteChecklistData.anniversary_date = annualDate;
          }

          const { error: scError } = await supabase
            .from('site_checklists')
            .insert(siteChecklistData);

          if (scError) {
            console.error(`Failed to create site_checklist for site ${sId}:`, scError);
          }
        }

        // Remove 'trail_import' tag — template is now fully configured
        const updatedTags = (savedTemplate.tags || []).filter((t: string) => t !== 'trail_import');
        await supabase
          .from('task_templates')
          .update({ tags: updatedTags.length > 0 ? updatedTags : null })
          .eq('id', savedTemplate.id);

        toast.success(`Template scheduled for ${selectedSites.length} site(s)!`);
      } else {
        toast.success(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
      }

      // Call onSave callback if provided - pass savedTemplate so parent can use it
      if (onSave) {
        onSave({
          template: templateConfig,
          features,
          savedTemplate,
          shouldCreateTask: !editingTemplate && !isTrailImport
        });
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
    { id: 'customFields', name: 'Custom Form Fields', description: 'Build custom form with fields' },
  ];

  // Multi-site selector component
  const MultiSiteSelector = () => {
    console.log('🔍 MultiSiteSelector component rendering:', { 
      applyToAllSites, 
      availableSitesCount: availableSites.length, 
      selectedSitesCount: selectedSites.length,
      availableSites: availableSites.map(s => s.name)
    });
    
    if (availableSites.length === 0) {
      return (
        <div className="space-y-4 p-4 border border-theme rounded-lg bg-gray-50 dark:bg-white/[0.03]">
          <div>
            <h3 className="text-sm font-semibold text-theme-primary mb-2">Site Assignment</h3>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Loading sites... Please wait.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 p-4 border border-theme rounded-lg bg-gray-50 dark:bg-white/[0.03]">
        <div>
          <h3 className="text-sm font-semibold text-theme-primary mb-2">Site Assignment</h3>
          <p className="text-xs text-theme-secondary mb-3">
            Select which sites can use this template
          </p>
        </div>
        
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={applyToAllSites}
            onChange={(e) => {
              console.log('📝 Apply to all sites changed:', e.target.checked);
              setApplyToAllSites(e.target.checked);
              if (e.target.checked) {
                const allSiteIds = availableSites.map(s => s.id);
                console.log('✅ Selecting all sites:', allSiteIds);
                setSelectedSites(allSiteIds);
              }
            }}
            className="w-4 h-4 text-[#D37E91] border-gray-300 rounded focus:ring-[#D37E91]"
          />
          <span className="text-sm font-medium text-theme-primary">
            Apply to all sites ({availableSites.length})
          </span>
        </label>
        
        {!applyToAllSites && availableSites.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto border border-theme rounded p-2 bg-white dark:bg-[#141823]">
            {availableSites.map(site => (
              <label key={site.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSites.includes(site.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSites([...selectedSites, site.id]);
                    } else {
                      setSelectedSites(selectedSites.filter(id => id !== site.id));
                    }
                  }}
                  className="w-4 h-4 text-[#D37E91] border-gray-300 rounded focus:ring-[#D37E91]"
                />
                <span className="text-sm text-theme-primary">{site.name}</span>
              </label>
            ))}
          </div>
        )}
        
        {!applyToAllSites && availableSites.length === 0 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            No sites available. Please ensure you have sites configured for your company.
          </p>
        )}
        
        <p className="text-xs text-theme-tertiary">
          {selectedSites.length} site{selectedSites.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-[#14161c] rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-theme shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-theme flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-theme-primary mb-2">
                {editingTemplate ? 'Edit Template Configuration' : 'Template Builder'}
              </h1>
              <p className="text-theme-secondary text-sm sm:text-base">
                {editingTemplate 
                  ? 'Modify template features and configuration. This will affect all future tasks created from this template.'
                  : 'Create comprehensive compliance task templates with all required elements'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-theme-muted text-theme-secondary flex-shrink-0 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#14161c] min-h-0">
          <div className="p-4 sm:p-6">
          {/* Template Configuration */}
          <div className="mb-6 pb-6 border-b border-theme">
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Template Configuration</h2>
            <p className="text-sm text-theme-secondary mb-4">Define the basic information for your template</p>
            
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Template Name</label>
              <input
                type="text"
                value={templateConfig.templateName}
                onChange={(e) => setTemplateConfig(prev => ({ ...prev, templateName: e.target.value }))}
 className="w-full p-2 border border-theme rounded bg-theme-surface ] text-theme-primary text-sm"
                placeholder="Enter template name"
              />
            </div>

            {/* Compliance Template Linking - for trail_import templates */}
            {isTrailImport && complianceTemplates.length > 0 && (
              <div className="mt-4 p-4 rounded-lg border border-dashed border-[#D37E91]/40 bg-[#D37E91]/5">
                <label className="block text-sm font-medium text-theme-primary mb-1">
                  Apply Compliance Template Setup
                </label>
                <p className="text-xs text-theme-tertiary mb-2">
                  Copy features, frequency and settings from an existing compliance template
                </p>
                <select
                  onChange={e => {
                    if (e.target.value) {
                      applyComplianceTemplate(e.target.value);
                      e.target.value = ''; // Reset dropdown after applying
                    }
                  }}
                  className="w-full text-sm px-3 py-2 rounded border border-theme bg-theme-surface text-theme-primary"
                  disabled={loadingCompliance}
                >
                  <option value="">
                    {loadingCompliance ? 'Loading templates...' : 'Select a compliance template to apply...'}
                  </option>
                  {complianceTemplates.map(ct => (
                    <option key={ct.id} value={ct.id}>
                      {ct.name} {ct.category ? `(${ct.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Multi-Site Selector - Show for new templates and trail_import edits */}
            {(!editingTemplate || isTrailImport) && <MultiSiteSelector />}

            {/* Task Name and Description fields removed from builder - they will be shown in curated template view */}
          </div>

          {/* Frequency & Scheduling */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-theme-primary mb-4">Frequency & Scheduling</h2>
            
            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-3">
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
 className="w-full px-4 py-2 text-sm rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
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
                <label className="block text-sm font-medium text-theme-primary mb-3">
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
                          ? "border-[#D37E91] bg-[#D37E91]/15 text-[#D37E91] dark:text-[#D37E91]"
 :"border-gray-300 bg-white dark:bg-[#141823] text-gray-700 dark:text-theme-tertiary hover:border-gray-400 dark:hover:border-theme"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {weeklyDays.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-yellow-400 mt-2">Please select at least one day</p>
                )}
              </div>
            )}

            {/* Monthly Scheduling */}
            {templateConfig.frequency === 'Monthly' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-primary mb-3">
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
                      <label htmlFor="monthly_date" className="text-sm text-gray-700 dark:text-theme-primary">
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
                        className="w-full px-4 py-2 text-sm rounded-lg bg-white dark:bg-[#141823] border border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-theme-primary ml-7"
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
                        className="w-4 h-4 text-[#D37E91] dark:text-magenta-500"
                      />
                      <label htmlFor="monthly_last_weekday" className="text-sm text-gray-700 dark:text-theme-primary">
                        Last Weekday of Month
                      </label>
                    </div>
                    {monthlyLastWeekday !== null && (
                      <select
                        value={monthlyLastWeekday || 'friday'}
                        onChange={(e) => setMonthlyLastWeekday(e.target.value)}
                        className="w-full px-4 py-2 text-sm rounded-lg bg-white dark:bg-[#141823] border border-gray-300 dark:border-neutral-800 text-gray-900 dark:text-theme-primary ml-7"
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
                <label className="block text-sm font-medium text-theme-primary mb-3">
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
 className="w-full px-4 py-2 text-sm rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                />
 <p className="text-xs text-gray-600 dark:text-theme-tertiary mt-2">
                  Tasks will be automatically scheduled for this date {templateConfig.frequency === 'Annually' ? 'each year' : templateConfig.frequency === 'Bi-Annually' ? 'every 6 months' : 'each quarter'}
                </p>
                
                {/* Show next instance dates preview */}
                {annualDate && nextInstanceDates.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-green-500/10 border border-emerald-200 dark:border-green-500/20 rounded-lg">
                    <p className="text-xs font-medium text-emerald-700 dark:text-green-400 mb-2">Next Scheduled Instances:</p>
                    <div className="space-y-1">
                      {nextInstanceDates.map((dateStr, idx) => (
                        <div key={idx} className="text-xs text-module-fg dark:text-green-300">
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
                <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-theme rounded-lg">
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">Custom frequency - configure all options:</p>
                  
                  {/* Days of week */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-theme-primary mb-2">Days of Week (optional)</label>
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
                              ? "border-[#D37E91] bg-[#D37E91]/15 text-[#D37E91] dark:text-[#D37E91]"
 :"border-gray-300 bg-white dark:bg-[#141823] text-gray-700 dark:text-theme-tertiary hover:border-gray-400 dark:hover:border-theme"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specific date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-theme-primary mb-2">Specific Date (optional)</label>
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
 className="w-full px-4 py-2 text-sm rounded-lg bg-theme-surface ] border border-theme text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] focus:border-[#D37E91]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Day Parts Selection - Show for all frequencies */}
            {templateConfig.frequency !== 'On Demand' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-theme-primary mb-3">
                  When to Run Task (Day Parts)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DAYPARTS.map((part) => (
                    <button
                      key={part.value}
                      type="button"
                      onClick={() => toggleDaypart(part.value)}
                      className={`px-4 py-3 rounded-lg border text-center transition-all ${
                        selectedDayparts.includes(part.value)
                          ? "border-[#D37E91] bg-[#D37E91]/15 text-[#D37E91] dark:text-[#D37E91]"
 :"border-gray-300 bg-white dark:bg-[#141823] text-gray-700 dark:text-theme-tertiary hover:border-gray-400 dark:hover:border-theme"
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
                <label className="block text-sm font-medium text-theme-primary mb-3">
                  Check Times
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedDayparts.map((dayPart) => (
                    <div key={dayPart}>
 <label className="block text-xs text-gray-600 dark:text-theme-tertiary mb-1 capitalize">
                        {dayPart.replace('_', ' ')}
                      </label>
                      <TimePicker
                        value={daypartTimes[dayPart] || ''}
                        onChange={(value) => setDaypartTime(dayPart, value)}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 bg-emerald-50 dark:bg-green-500/10 border border-emerald-200 dark:border-green-500/20 rounded p-3">
              <p className="text-emerald-700 dark:text-green-400 text-sm">Auto-captured: User, time, date, location - no input required</p>
            </div>
          </div>

          {/* Template Features */}
          <div className="mb-6 pb-6 border-b border-theme">
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Template Features</h2>
            <p className="text-sm text-theme-secondary mb-3">Select the features and requirements for this template</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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

            {/* Inline feature editors — configure content for enabled features */}
            {features.checklist && !features.yesNoChecklist && (
              <div className="mt-4 border-t border-theme pt-4">
                <ChecklistFeature
                  items={checklistItems}
                  defaultItems={editingTemplate?.recurrence_pattern?.default_checklist_items || []}
                  onChange={setChecklistItems}
                />
              </div>
            )}

            {features.yesNoChecklist && (
              <div className="mt-4 border-t border-theme pt-4">
                <YesNoChecklistFeature
                  items={yesNoChecklistItems}
                  onChange={setYesNoChecklistItems}
                />
              </div>
            )}

            {features.documentUpload && (
              <div className="mt-4 border-t border-theme pt-4">
                <DocumentUploadFeature
                  uploads={templateDocuments}
                  onChange={setTemplateDocuments}
                  label="Files & Links"
                  helpText="Attach documents or link to files on OneDrive, Dropbox, Google Drive etc."
                  maxFiles={20}
                />
              </div>
            )}

            {features.customFields && (
              <div className="mt-4 border-t border-theme pt-4">
                <h3 className="text-sm font-medium text-theme-primary mb-3">Custom Form Fields</h3>
                <FieldBuilderPanel
                  fields={customFieldsList}
                  onChange={setCustomFieldsList}
                />
              </div>
            )}
          </div>

          {/* Notification Configuration */}
          <NotificationConfigSection
            config={notificationConfig}
            onChange={setNotificationConfig}
            companyId={companyId || ''}
          />

          {/* Task Instructions */}
          <div className="mb-6 pb-6 border-b border-theme">
            <h2 className="text-lg font-semibold text-theme-primary mb-1">Task Instructions</h2>
            <p className="text-sm text-theme-secondary mb-3">Guide staff on how to complete this task</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Purpose</label>
                <textarea
                  value={templateConfig.purpose}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Why is this task important?"
                  rows={2}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91] placeholder-theme-tertiary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Method</label>
                <textarea
                  value={templateConfig.method}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, method: e.target.value }))}
                  placeholder="Step-by-step instructions for completing the task"
                  rows={3}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91] placeholder-theme-tertiary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Importance</label>
                <textarea
                  value={templateConfig.importance}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, importance: e.target.value }))}
                  placeholder="What happens if this task is missed or done incorrectly?"
                  rows={2}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91] placeholder-theme-tertiary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-1">Special Requirements</label>
                <textarea
                  value={templateConfig.specialRequirements}
                  onChange={(e) => setTemplateConfig(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="PPE, tools, certifications, or other requirements"
                  rows={2}
                  className="w-full px-3 py-2 bg-theme-surface border border-theme rounded-lg text-theme-primary text-sm focus:outline-none focus:border-[#D37E91] placeholder-theme-tertiary resize-none"
                />
              </div>
            </div>
          </div>
          </div>
        </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-theme bg-white dark:bg-[#14161c] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 border border-theme rounded-lg text-theme-secondary hover:bg-theme-muted transition-colors font-medium"
          >
            Cancel
          </button>

          {isTrailImport && (
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2 border border-[#D37E91] text-[#D37E91] rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D37E91]/10"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          )}

          <button
            onClick={() => handleSave(isTrailImport)}
            disabled={isSaving || (isTrailImport && selectedSites.length === 0)}
            className="w-full sm:w-auto px-5 py-2 bg-[#D37E91] hover:bg-[#D37E91]/90 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {isSaving
              ? (isTrailImport ? 'Scheduling...' : editingTemplate ? 'Updating...' : 'Creating...')
              : isTrailImport
                ? 'Save & Schedule'
                : editingTemplate
                  ? 'Update Template'
                  : 'Create Template'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
