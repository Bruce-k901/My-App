// ============================================================================
// useTaskState - Task data loading and form state management
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChecklistTask, TaskDataBase, Asset, EnabledFeatures } from '@/types/task-completion.types';
import { normalizeYesNoItem } from '@/types/task-completion.types';
import type { TemplateField } from '@/types/checklist';

interface UseTaskStateResult {
  // Data
  task: ChecklistTask;
  taskData: TaskDataBase;
  template: any;
  assets: Map<string, Asset>;
  assetTempRanges: Map<string, { min: number | null; max: number | null }>;
  enabledFeatures: EnabledFeatures;

  // Form state
  formData: Record<string, any>;
  setFormData: (data: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;

  // Temperatures
  temperatures: Record<string, number | null>;
  setTemperature: (assetId: string, temp: number | null) => void;

  // Checklist items
  checklistItems: Array<{ text: string; completed: boolean }>;
  setChecklistItemCompleted: (index: number, completed: boolean) => void;

  // Yes/No checklist items
  yesNoItems: any[];
  setYesNoAnswer: (index: number, answer: string | null) => void;

  // Yes/No action responses (for require action)
  actionResponses: Record<number, string>;
  setActionResponse: (index: number, response: string) => void;

  // Yes/No manager selections (for request action — per-item manager IDs)
  yesNoManagerSelections: Record<number, string[]>;
  setYesNoManagerSelection: (index: number, managerIds: string[]) => void;

  // Photos
  photos: File[];
  addPhoto: (file: File) => void;
  removePhoto: (index: number) => void;

  // Notes
  notes: string;
  setNotes: (notes: string) => void;

  // Out of range handling
  outOfRangeActions: Map<string, { action: 'monitor' | 'callout'; duration?: number; notes?: string }>;
  setOutOfRangeAction: (assetId: string, action: 'monitor' | 'callout', options?: { duration?: number; notes?: string }) => void;

  // Custom fields (form builder)
  customFields: TemplateField[];
  customFieldValues: Record<string, any>;
  setCustomFieldValue: (fieldName: string, value: any) => void;
  customRecords: Record<string, any>[];
  addCustomRecord: () => void;
  updateCustomRecord: (index: number, fieldName: string, value: any) => void;
  removeCustomRecord: (index: number) => void;

  // Available managers (for yes/no action notifications)
  availableManagers: Array<{ id: string; full_name: string; email: string }>;

  // Loading states
  loading: boolean;
  error: string | null;
}

export function useTaskState(
  task: ChecklistTask,
  isOpen: boolean,
  companyId: string | null,
  siteId: string | null
): UseTaskStateResult {
  // Core data
  const [taskData, setTaskData] = useState<TaskDataBase>({});
  const [template, setTemplate] = useState<any>(null);
  const [assets, setAssets] = useState<Map<string, Asset>>(new Map());
  const [assetTempRanges, setAssetTempRanges] = useState<Map<string, { min: number | null; max: number | null }>>(new Map());

  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [temperatures, setTemperatures] = useState<Record<string, number | null>>({});
  const [checklistItems, setChecklistItems] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [yesNoItems, setYesNoItems] = useState<any[]>([]);
  const [actionResponses, setActionResponsesState] = useState<Record<number, string>>({});
  const [yesNoManagerSelections, setYesNoManagerSelectionsState] = useState<Record<number, string[]>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [outOfRangeActions, setOutOfRangeActions] = useState<Map<string, { action: 'monitor' | 'callout'; duration?: number; notes?: string }>>(new Map());

  // Custom fields state
  const [customFields, setCustomFields] = useState<TemplateField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [customRecords, setCustomRecords] = useState<Record<string, any>[]>([]);
  const [availableManagers, setAvailableManagers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect enabled features from template (memoized)
  const enabledFeatures = useMemo<EnabledFeatures>(() => {
    if (!template) {
      return {
        checklist: false,
        yesNoChecklist: false,
        temperature: false,
        photoEvidence: false,
        passFailChecks: false,
        assetSelection: false,
        documentUpload: false,
        signature: false,
        customFields: false
      };
    }

    // Detect custom fields: only trust the DB column and evidence_types
    const templateAny = template as any;
    const hasCustomFields =
      templateAny.use_custom_fields === true ||
      (Array.isArray(templateAny.evidence_types) && templateAny.evidence_types.includes('custom_fields'));

    if (hasCustomFields) {
      return {
        checklist: false,
        yesNoChecklist: false,
        temperature: false,
        photoEvidence: false,
        passFailChecks: false,
        assetSelection: false,
        documentUpload: false,
        signature: false,
        customFields: true
      };
    }

    const evidenceTypes = template.evidence_types || [];

    // Regular checklist uses 'text_note' evidence type (NOT 'checklist')
    // Yes/No checklist uses 'yes_no_checklist' evidence type
    // If yes_no_checklist is present, regular checklist should be false
    const hasTextNote = evidenceTypes.includes('text_note') || evidenceTypes.includes('checklist');
    const hasYesNoChecklist = evidenceTypes.includes('yes_no_checklist');

    return {
      checklist: hasTextNote && !hasYesNoChecklist,
      yesNoChecklist: hasYesNoChecklist,
      temperature: evidenceTypes.includes('temperature'),
      photoEvidence: evidenceTypes.includes('photo'),
      passFailChecks: evidenceTypes.includes('pass_fail'),
      assetSelection: !!template.repeatable_field_name || evidenceTypes.includes('asset_selection'),
      documentUpload: evidenceTypes.includes('document'),
      signature: evidenceTypes.includes('signature'),
      customFields: false
    };
  }, [template]);

  // Load task data when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset all state when modal closes
      setTaskData({});
      setTemplate(null);
      setAssets(new Map());
      setAssetTempRanges(new Map());
      setFormData({});
      setTemperatures({});
      setChecklistItems([]);
      setYesNoItems([]);
      setActionResponsesState({});
      setYesNoManagerSelectionsState({});
      setPhotos([]);
      setNotes('');
      setOutOfRangeActions(new Map());
      setCustomFields([]);
      setCustomFieldValues({});
      setCustomRecords([]);
      setAvailableManagers([]);
      setLoading(true);
      setError(null);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // 1. Extract task_data (will be enriched with template fallbacks below)
        const rawTaskData = (task.task_data || {}) as TaskDataBase;

        // 2. Load template
        let templateData = task.template;

        if (!templateData && task.template_id) {
          const { data, error: templateError } = await supabase
            .from('task_templates')
            .select('*, template_fields (*)')
            .eq('id', task.template_id)
            .single();

          if (templateError) {
            console.error('[useTaskState] Error loading template:', templateError);
            throw templateError;
          }
          templateData = data;
        }

        if (templateData) {
          // Parse recurrence_pattern if it's a string
          if (templateData.recurrence_pattern && typeof templateData.recurrence_pattern === 'string') {
            try {
              templateData.recurrence_pattern = JSON.parse(templateData.recurrence_pattern);
            } catch (e) {
              console.error('[useTaskState] Failed to parse recurrence_pattern:', e);
            }
          }

          setTemplate(templateData);

          // Enrich taskData with template fallbacks for cron-generated tasks
          // Cron tasks don't carry referenceDocuments — pull from template
          if (!rawTaskData.referenceDocuments) {
            const templateDocs = templateData.recurrence_pattern?.template_documents;
            if (Array.isArray(templateDocs) && templateDocs.length > 0) {
              rawTaskData.referenceDocuments = templateDocs;
            }
          }

          // Load custom fields if template uses custom form builder
          const tplAny = templateData as any;
          const isCustomFieldsTemplate =
            tplAny.use_custom_fields === true ||
            (Array.isArray(tplAny.evidence_types) && tplAny.evidence_types.includes('custom_fields'));

          if (isCustomFieldsTemplate) {
            // Use pre-joined template_fields from page query if available
            let fields = Array.isArray(tplAny.template_fields) && tplAny.template_fields.length > 0
              ? tplAny.template_fields
              : null;

            // Fallback 1: direct client query
            if (!fields) {
              const { data: dbFields, error: fieldsError } = await supabase
                .from('template_fields')
                .select('*')
                .eq('template_id', tplAny.id)
                .order('field_order');

              if (!fieldsError && dbFields && dbFields.length > 0) {
                fields = dbFields;
              }
            }

            // Fallback 2: server API route (bypasses RLS)
            if (!fields || fields.length === 0) {
              try {
                const res = await fetch(`/api/tasks/template-fields?templateId=${tplAny.id}`);
                if (res.ok) {
                  const json = await res.json();
                  if (json.fields && json.fields.length > 0) {
                    fields = json.fields;
                  }
                }
              } catch (apiErr) {
                console.error('[useTaskState] Server API fetch error:', apiErr);
              }
            }

            if (fields && fields.length > 0) {
              setCustomFields(fields);

              // Initialize values from task_data or defaults
              const initValues: Record<string, any> = {};
              const topFields = fields.filter((f: any) => !f.parent_field_id);
              topFields.forEach((f: any) => {
                if (rawTaskData.custom_field_values?.[f.field_name] !== undefined) {
                  initValues[f.field_name] = rawTaskData.custom_field_values[f.field_name];
                } else if (f.default_value) {
                  initValues[f.field_name] = f.default_value;
                }
              });
              setCustomFieldValues(initValues);

              // Initialize records from task_data
              if (rawTaskData.custom_records && Array.isArray(rawTaskData.custom_records)) {
                setCustomRecords(rawTaskData.custom_records);
              } else {
                const hasRepeatable = topFields.some((f: any) => f.field_type === 'repeatable_record');
                if (hasRepeatable) {
                  setCustomRecords([{}]);
                }
              }
            }
          }
        }

        // Set enriched taskData (after template fallbacks applied)
        setTaskData(rawTaskData);

        // 2.5 Load available managers for yes/no action notifications
        if (companyId) {
          const { data: managers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('company_id', companyId)
            .in('app_role', ['Manager', 'General Manager', 'Admin']);
          if (managers && managers.length > 0) {
            setAvailableManagers(managers);
          }
        }

        // 3. Build equipment list from task_data - NO DATABASE QUERY NEEDED
        let equipmentList: Array<{
          assetId: string;
          nickname: string | null;
          equipment: string | null;
          temp_min: number | null;
          temp_max: number | null;
        }> = [];

        // PRIORITY 1: Check dynamic repeatable field (e.g., asset_name, fridge_name)
        if (templateData?.repeatable_field_name && rawTaskData[templateData.repeatable_field_name]) {
          const repeatableData = rawTaskData[templateData.repeatable_field_name];

          if (Array.isArray(repeatableData)) {
            repeatableData.forEach((item: any) => {
              let assetId = null;

              if (item.id?.assetId) {
                assetId = item.id.assetId;
              } else if (item.value?.assetId) {
                assetId = item.value.assetId;
              } else if (item.asset_id?.assetId) {
                assetId = item.asset_id.assetId;
              } else if (typeof item.id === 'string') {
                assetId = item.id;
              } else if (typeof item.value === 'string') {
                assetId = item.value;
              } else if (typeof item.asset_id === 'string') {
                assetId = item.asset_id;
              }

              if (assetId) {
                equipmentList.push({
                  assetId: assetId,
                  nickname: item.nickname || item.id?.nickname || null,
                  equipment: item.equipment || item.asset_name || item.id?.equipment || null,
                  temp_min: item.temp_min ?? item.id?.temp_min ?? null,
                  temp_max: item.temp_max ?? item.id?.temp_max ?? null
                });
              }
            });
          }
        }

        // PRIORITY 2: Check equipment_config array
        if (equipmentList.length === 0 && rawTaskData.equipment_config && Array.isArray(rawTaskData.equipment_config)) {
          equipmentList = rawTaskData.equipment_config.map((config: any) => ({
            assetId: config.assetId,
            nickname: config.nickname || null,
            equipment: config.asset_name || config.equipment || null,
            temp_min: config.temp_min ?? null,
            temp_max: config.temp_max ?? null
          }));
        }

        // PRIORITY 3: Check temperatures array
        if (equipmentList.length === 0 && rawTaskData.temperatures && Array.isArray(rawTaskData.temperatures)) {
          equipmentList = rawTaskData.temperatures.map((temp: any) => ({
            assetId: temp.assetId,
            nickname: temp.nickname || null,
            equipment: temp.asset_name || null,
            temp_min: temp.temp_min ?? null,
            temp_max: temp.temp_max ?? null
          }));
        }

        // Convert to Maps for state management
        if (equipmentList.length > 0) {
          const assetMap = new Map<string, Asset>();
          const tempRangeMap = new Map<string, { min: number | null; max: number | null }>();

          equipmentList.forEach((equipment) => {
            // Auto-correct if min/max are swapped (common for freezers)
            let correctedMin = equipment.temp_min;
            let correctedMax = equipment.temp_max;

            if (correctedMin !== null && correctedMax !== null && correctedMin > correctedMax) {
              [correctedMin, correctedMax] = [correctedMax, correctedMin];
            }

            assetMap.set(equipment.assetId, {
              id: equipment.assetId,
              name: equipment.equipment || 'Unknown Equipment',
              category: 'temperature_monitoring',
              site_id: task.site_id || '',
              site_name: undefined,
              nickname: equipment.nickname || undefined,
              temperature_min: correctedMin,
              temperature_max: correctedMax
            });

            tempRangeMap.set(equipment.assetId, {
              min: correctedMin,
              max: correctedMax
            });
          });

          setAssets(assetMap);
          setAssetTempRanges(tempRangeMap);
        }

        // 4. Initialize form data (pass templateData so it can fall back to template's recurrence_pattern)
        initializeFormData(rawTaskData, equipmentList, templateData);

      } catch (err: any) {
        console.error('[useTaskState] Error loading task data:', err);
        setError(err.message || 'Failed to load task data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, task.id, task.template_id]);

  // Initialize form data from task_data and equipment list
  // Handles multiple task_data formats:
  //   - Manual tasks: { checklistItems, yesNoChecklistItems, referenceDocuments }
  //   - Cron Part 1b (from site_checklists): { default_checklist_items, equipment_config }
  //   - Cron Part 1 (pattern-match): { original_task_data: { checklistItems, ... } }
  // Falls back to template.recurrence_pattern when task_data is missing items
  function initializeFormData(rawTaskData: TaskDataBase, equipmentList: any[], templateData: any) {
    // Initialize temperatures from equipment list
    if (equipmentList.length > 0) {
      const initialTemps: Record<string, number | null> = {};
      equipmentList.forEach((equipment: any) => {
        initialTemps[equipment.assetId] = null;
      });
      setTemperatures(initialTemps);
    }

    // Unwrap cron Part 1 nesting if present
    const unwrapped = rawTaskData.original_task_data && typeof rawTaskData.original_task_data === 'object'
      ? rawTaskData.original_task_data as Record<string, any>
      : null;

    // Resolve checklist items from multiple possible sources (priority order)
    const rawChecklistItems: any[] | null =
      getArray(rawTaskData.checklistItems) ||
      getArray(unwrapped?.checklistItems) ||
      getArray(rawTaskData.default_checklist_items) ||
      getArray(unwrapped?.default_checklist_items) ||
      getArray(templateData?.recurrence_pattern?.default_checklist_items);

    // Resolve yes/no checklist items from multiple possible sources
    const rawYesNoItems: any[] | null =
      getArray(rawTaskData.yesNoChecklistItems) ||
      getArray(unwrapped?.yesNoChecklistItems);

    // Determine if template uses yes/no checklist
    const hasYesNoEvidence = templateData?.evidence_types?.includes('yes_no_checklist');

    // Build lookup of template's latest default_checklist_items by text
    // This allows merging template-configured actions into legacy task items
    const templateDefaultItems = getArray(templateData?.recurrence_pattern?.default_checklist_items) || [];
    const templateItemsByText = new Map<string, any>();
    for (const tItem of templateDefaultItems) {
      if (tItem && typeof tItem === 'object' && tItem.text && tItem.options && Array.isArray(tItem.options)) {
        templateItemsByText.set(tItem.text.trim().toLowerCase(), tItem);
      }
    }

    // Helper: merge a raw item with template options (if available) and normalize to enhanced format
    const mergeAndNormalize = (item: any): any => {
      const text = (item?.text || '').trim();
      const answer = item?.answer || null;

      // Already has options — keep them but also check for template updates
      if (item?.options && Array.isArray(item.options)) {
        const templateMatch = templateItemsByText.get(text.toLowerCase());
        // If template has updated options with actions, prefer template's options
        if (templateMatch) {
          const templateHasActions = templateMatch.options.some((o: any) =>
            o.actions?.logException || o.actions?.requestAction || o.actions?.requireAction || o.actions?.message
          );
          const itemHasActions = item.options.some((o: any) =>
            o.actions?.logException || o.actions?.requestAction || o.actions?.requireAction || o.actions?.message
          );
          if (templateHasActions && !itemHasActions) {
            return { text, options: templateMatch.options, answer, actionResponse: undefined, exceptionLogged: undefined };
          }
        }
        return { ...item, answer, actionResponse: undefined, exceptionLogged: undefined };
      }

      // Legacy item — check template for enhanced version
      const templateMatch = templateItemsByText.get(text.toLowerCase());
      if (templateMatch) {
        return { text, options: templateMatch.options, answer, actionResponse: undefined, exceptionLogged: undefined };
      }

      // No template match — normalize to enhanced format with empty actions
      return normalizeYesNoItem({ text, answer });
    };

    // If we have checklist items but no explicit yes/no items, check if they should be yes/no
    if (!rawYesNoItems && rawChecklistItems && hasYesNoEvidence) {
      // Items from recurrence_pattern may be in yes/no format
      const yesNoFormatted = rawChecklistItems.map((item: any) => {
        if (item && typeof item === 'object') {
          return mergeAndNormalize({ ...item, answer: item.answer || null });
        }
        const text = typeof item === 'string' ? item : (item?.text || item?.label || '');
        return text ? mergeAndNormalize({ text, answer: null }) : null;
      }).filter(Boolean);

      if (yesNoFormatted.length > 0) {
        setYesNoItems(yesNoFormatted);
      }
    } else if (rawYesNoItems && rawYesNoItems.length > 0) {
      // Initialize yes/no items — normalize all to enhanced format and merge template options
      setYesNoItems(rawYesNoItems.map((item: any) => mergeAndNormalize(item)));
    }

    // Initialize regular checklist items (only if NOT using yes/no mode)
    if (!hasYesNoEvidence && rawChecklistItems && rawChecklistItems.length > 0) {
      const items = rawChecklistItems.map((item: any) => {
        if (typeof item === 'string') {
          return { text: item, completed: false };
        }
        return { text: item.text || item.label || '', completed: item.completed || false };
      }).filter((item: any) => item.text);
      if (items.length > 0) {
        setChecklistItems(items);
      }
    }

    setFormData({});
  }

  // Helper: return array if value is a non-empty array, else null
  function getArray(value: any): any[] | null {
    return Array.isArray(value) && value.length > 0 ? value : null;
  }

  // Temperature setter
  const setTemperature = useCallback((assetId: string, temp: number | null) => {
    setTemperatures(prev => ({
      ...prev,
      [assetId]: temp
    }));
  }, []);

  // Checklist item setter
  const setChecklistItemCompleted = useCallback((index: number, completed: boolean) => {
    setChecklistItems(prev => {
      const newItems = [...prev];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], completed };
      }
      return newItems;
    });
  }, []);

  // Yes/No item setter (supports both legacy and enhanced formats)
  const setYesNoAnswer = useCallback((index: number, answer: string | null) => {
    setYesNoItems(prev => {
      const newItems = [...prev];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], answer };
      }
      return newItems;
    });
  }, []);

  // Action response setter (for require action items)
  const setActionResponse = useCallback((index: number, response: string) => {
    setActionResponsesState(prev => ({ ...prev, [index]: response }));
  }, []);

  // Manager selection setter (for request action items)
  const setYesNoManagerSelection = useCallback((index: number, managerIds: string[]) => {
    setYesNoManagerSelectionsState(prev => ({ ...prev, [index]: managerIds }));
  }, []);

  // Photo helpers
  const addPhoto = useCallback((file: File) => {
    setPhotos(prev => [...prev, file]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Out of range action setter
  const setOutOfRangeAction = useCallback((
    assetId: string,
    action: 'monitor' | 'callout',
    options?: { duration?: number; notes?: string }
  ) => {
    setOutOfRangeActions(prev => {
      const newMap = new Map(prev);
      newMap.set(assetId, {
        action,
        duration: options?.duration,
        notes: options?.notes
      });
      return newMap;
    });
  }, []);

  // Custom field callbacks
  const setCustomFieldValue = useCallback((fieldName: string, value: any) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const addCustomRecord = useCallback(() => {
    setCustomRecords(prev => [...prev, {}]);
  }, []);

  const updateCustomRecord = useCallback((index: number, fieldName: string, value: any) => {
    setCustomRecords(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [fieldName]: value };
      return updated;
    });
  }, []);

  const removeCustomRecord = useCallback((index: number) => {
    setCustomRecords(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    task,
    taskData,
    template,
    assets,
    assetTempRanges,
    enabledFeatures,
    formData,
    setFormData,
    temperatures,
    setTemperature,
    checklistItems,
    setChecklistItemCompleted,
    yesNoItems,
    setYesNoAnswer,
    actionResponses,
    setActionResponse,
    yesNoManagerSelections,
    setYesNoManagerSelection,
    photos,
    addPhoto,
    removePhoto,
    notes,
    setNotes,
    outOfRangeActions,
    setOutOfRangeAction,
    customFields,
    customFieldValues,
    setCustomFieldValue,
    customRecords,
    addCustomRecord,
    updateCustomRecord,
    removeCustomRecord,
    availableManagers,
    loading,
    error
  };
}
