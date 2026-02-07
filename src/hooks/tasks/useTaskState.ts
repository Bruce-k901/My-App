// ============================================================================
// useTaskState - WITH DETAILED DEBUG LOGGING
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChecklistTask, TaskDataBase, Asset, EnabledFeatures } from '@/types/task-completion.types';

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
  yesNoItems: Array<{ text: string; answer: 'yes' | 'no' | null }>;
  setYesNoAnswer: (index: number, answer: 'yes' | 'no' | null) => void;

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
  const [yesNoItems, setYesNoItems] = useState<Array<{ text: string; answer: 'yes' | 'no' | null }>>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [outOfRangeActions, setOutOfRangeActions] = useState<Map<string, { action: 'monitor' | 'callout'; duration?: number; notes?: string }>>(new Map());

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect enabled features from template (memoized)
  const enabledFeatures = useMemo<EnabledFeatures>(() => {
    console.log('🎯 [FEATURES] Calculating enabled features:', {
      hasTemplate: !!template,
      templateId: template?.id,
      templateName: template?.name,
      evidenceTypes: template?.evidence_types,
      repeatableField: template?.repeatable_field_name
    });

    if (!template) {
      // Don't warn during initial load - template will be loaded async
      return {
        checklist: false,
        yesNoChecklist: false,
        temperature: false,
        photoEvidence: false,
        passFailChecks: false,
        assetSelection: false,
        documentUpload: false,
        signature: false
      };
    }

    const evidenceTypes = template.evidence_types || [];

    // CRITICAL FIX: Match the logic in template-features.ts
    // - Regular checklist uses 'text_note' evidence type (NOT 'checklist')
    // - Yes/No checklist uses 'yes_no_checklist' evidence type
    // - If yes_no_checklist is present, regular checklist should be false
    const hasTextNote = evidenceTypes.includes('text_note') || evidenceTypes.includes('checklist');
    const hasYesNoChecklist = evidenceTypes.includes('yes_no_checklist');

    const features = {
      checklist: hasTextNote && !hasYesNoChecklist,
      yesNoChecklist: hasYesNoChecklist,
      temperature: evidenceTypes.includes('temperature'),
      photoEvidence: evidenceTypes.includes('photo'),
      passFailChecks: evidenceTypes.includes('pass_fail'),
      assetSelection: !!template.repeatable_field_name || evidenceTypes.includes('asset_selection'),
      documentUpload: evidenceTypes.includes('document'),
      signature: evidenceTypes.includes('signature')
    };

    console.log('✅ [FEATURES] Enabled features:', features);
    return features;
  }, [template]);

  // Load task data when modal opens
  useEffect(() => {
    if (!isOpen) {
      console.log('🚪 [STATE] Modal closed - resetting state');
      // Reset all state when modal closes
      setTaskData({});
      setTemplate(null);
      setAssets(new Map());
      setAssetTempRanges(new Map());
      setFormData({});
      setTemperatures({});
      setChecklistItems([]);
      setYesNoItems([]);
      setPhotos([]);
      setNotes('');
      setOutOfRangeActions(new Map());
      setLoading(true);
      setError(null);
      return;
    }

    async function loadData() {
      console.log('🚀 [STATE] Loading task data for modal...');
      console.log('📋 [STATE] Task details:', {
        taskId: task.id,
        templateId: task.template_id,
        customName: task.custom_name,
        status: task.status,
        hasTaskData: !!task.task_data,
        hasEmbeddedTemplate: !!task.template
      });

      setLoading(true);
      setError(null);

      try {
        // 1. Extract task_data
        const rawTaskData = (task.task_data || {}) as TaskDataBase;
        console.log('📦 [TASK_DATA] Extracted task_data:', {
          hasData: Object.keys(rawTaskData).length > 0,
          keys: Object.keys(rawTaskData),
          FULL_DATA: rawTaskData,  // <-- See EVERYTHING
          selectedAssets: rawTaskData.selectedAssets,
          equipment_config: rawTaskData.equipment_config,
          temperatures: rawTaskData.temperatures,
          checklistItems: rawTaskData.checklistItems,
          yesNoChecklistItems: rawTaskData.yesNoChecklistItems,
          source_type: rawTaskData.source_type
        });
        setTaskData(rawTaskData);

        // 2. Load template
        let templateData = task.template;
        console.log('🔍 [TEMPLATE] Checking for embedded template:', !!templateData);

        if (!templateData && task.template_id) {
          console.log('🔍 [TEMPLATE] Loading template from DB:', task.template_id);

          const { data, error: templateError } = await supabase
            .from('task_templates')
            .select('*')
            .eq('id', task.template_id)
            .single();

          if (templateError) {
            console.error('❌ [TEMPLATE] Error loading template:', templateError);
            throw templateError;
          }
          templateData = data;
        }

        if (templateData) {
          console.log('✅ [TEMPLATE] Template loaded:', {
            id: templateData.id,
            name: templateData.name,
            slug: templateData.slug,
            category: templateData.category,
            evidenceTypes: templateData.evidence_types,
            repeatableField: templateData.repeatable_field_name,
            hasRecurrencePattern: !!templateData.recurrence_pattern
          });

          // Parse recurrence_pattern if it's a string
          if (templateData.recurrence_pattern && typeof templateData.recurrence_pattern === 'string') {
            try {
              templateData.recurrence_pattern = JSON.parse(templateData.recurrence_pattern);
              console.log('📝 [TEMPLATE] Parsed recurrence_pattern');
            } catch (e) {
              console.error('❌ [TEMPLATE] Failed to parse recurrence_pattern:', e);
            }
          }

          setTemplate(templateData);
        } else {
          console.warn('⚠️ [TEMPLATE] No template available');
        }

        // 3. Build equipment list from task_data - NO DATABASE QUERY NEEDED
        console.log('🔍 [ASSETS] Searching for assets in task_data...');

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
          console.log(`📍 [ASSETS] Found repeatable field '${templateData.repeatable_field_name}':`, repeatableData);

          if (Array.isArray(repeatableData)) {
            repeatableData.forEach((item: any) => {
              // Extract assetId from nested structure
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

            console.log('✅ [ASSETS] Equipment list built from repeatable field:', equipmentList);
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
          console.log('📍 [ASSETS] Equipment list built from equipment_config:', equipmentList);
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
          console.log('📍 [ASSETS] Equipment list built from temperatures:', equipmentList);
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
              console.log(`🔄 [ASSETS] Auto-correcting swapped min/max for ${equipment.nickname || equipment.equipment}: min=${correctedMin}, max=${correctedMax} → min=${correctedMax}, max=${correctedMin}`);
              [correctedMin, correctedMax] = [correctedMax, correctedMin];
            }

            // Create Asset object from task_data (no DB query needed)
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

          console.log('✅ [ASSETS] Assets loaded into state:', {
            assetMapSize: assetMap.size,
            tempRangeMapSize: tempRangeMap.size
          });
        } else {
          console.warn('⚠️ [ASSETS] No equipment found in task_data');
        }

        // 4. Initialize form data
        initializeFormData(rawTaskData, equipmentList);

        console.log('✅ [STATE] Task data loaded successfully');

      } catch (err: any) {
        console.error('❌ [STATE] Error loading task data:', err);
        setError(err.message || 'Failed to load task data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, task.id, task.template_id]);

  // Initialize form data from task_data and equipment list
  function initializeFormData(rawTaskData: TaskDataBase, equipmentList: any[]) {
    console.log('🔧 [INIT] Initializing form data from task_data');

    // Initialize temperatures from equipment list
    if (equipmentList.length > 0) {
      const initialTemps: Record<string, number | null> = {};
      equipmentList.forEach((equipment: any) => {
        initialTemps[equipment.assetId] = null;
      });
      console.log('🌡️ [INIT] Initialized temperature state:', initialTemps);
      setTemperatures(initialTemps);
    }

    // Initialize checklist items
    if (rawTaskData.checklistItems && Array.isArray(rawTaskData.checklistItems)) {
      const items = rawTaskData.checklistItems.map((item: any) => {
        if (typeof item === 'string') {
          return { text: item, completed: false };
        }
        return { text: item.text || '', completed: item.completed || false };
      });
      console.log('✅ [INIT] Initialized checklist items:', items.length);
      setChecklistItems(items);
    }

    // Initialize yes/no items
    if (rawTaskData.yesNoChecklistItems && Array.isArray(rawTaskData.yesNoChecklistItems)) {
      setYesNoItems(rawTaskData.yesNoChecklistItems.map((item: any) => ({
        text: item.text || '',
        answer: item.answer || null
      })));
      console.log('✅ [INIT] Initialized yes/no items:', rawTaskData.yesNoChecklistItems.length);
    }

    setFormData({});
    console.log('✅ [INIT] Form data initialized');
  }

  // Temperature setter
  const setTemperature = useCallback((assetId: string, temp: number | null) => {
    console.log('🌡️ [TEMP] Temperature changed:', { assetId, temp });
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

  // Yes/No item setter
  const setYesNoAnswer = useCallback((index: number, answer: 'yes' | 'no' | null) => {
    setYesNoItems(prev => {
      const newItems = [...prev];
      if (newItems[index]) {
        newItems[index] = { ...newItems[index], answer };
      }
      return newItems;
    });
  }, []);

  // Photo helpers
  const addPhoto = useCallback((file: File) => {
    console.log('📸 [PHOTO] Photo added:', file.name);
    setPhotos(prev => [...prev, file]);
  }, []);

  const removePhoto = useCallback((index: number) => {
    console.log('📸 [PHOTO] Photo removed:', index);
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

  // Debug: Log final state (inline, not in useEffect to avoid hook order issues)
  if (isOpen && !loading) {
    console.log('📊 [FINAL STATE]', {
      hasTemplate: !!template,
      templateName: template?.name,
      hasTaskData: Object.keys(taskData).length > 0,
      taskDataKeys: Object.keys(taskData),
      assetsLoaded: assets.size,
      enabledFeatures,
      temperaturesInitialized: Object.keys(temperatures).length,
      checklistItemsCount: checklistItems.length,
      yesNoItemsCount: yesNoItems.length
    });
  }

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
    photos,
    addPhoto,
    removePhoto,
    notes,
    setNotes,
    outOfRangeActions,
    setOutOfRangeAction,
    loading,
    error
  };
}
