'use client'

import { X, Camera, Thermometer, FileText, CheckCircle2, AlertCircle, Save, ChevronDown, ChevronUp, Monitor, PhoneCall, ExternalLink, Download, Lightbulb, ArrowRight } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskCompletionPayload } from '@/types/checklist-types'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import MonitorDurationModal from './MonitorDurationModal'
import { useToast } from '@/components/ui/ToastProvider'
import { isCompletedOutsideWindow, isCompletedLate } from '@/utils/taskTiming'
import CalloutModal from '@/components/modals/CalloutModal'
import { handleWorkflow } from './workflows'
import type { ComplianceTemplate } from '@/data/compliance-templates'
import Image from 'next/image'
import Link from 'next/link'
import CheckboxCustom from '@/components/ui/CheckboxCustom'

interface TaskCompletionModalProps {
  task: ChecklistTaskWithTemplate
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  onMonitoringTaskCreated?: () => void // Callback to refresh task list when monitoring task is created
}

export default function TaskCompletionModal({
  task,
  isOpen,
  onClose,
  onComplete,
  onMonitoringTaskCreated
}: TaskCompletionModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [instructionsExpanded, setInstructionsExpanded] = useState(false)
  const [templateFields, setTemplateFields] = useState<any[]>([])
  const [assetsMap, setAssetsMap] = useState<Map<string, any>>(new Map())
  const [assetTempRanges, setAssetTempRanges] = useState<Map<string, { min: number | null, max: number | null }>>(new Map())
  
  // Track out-of-range assets independently - use Set to store asset IDs that are out of range
  const [outOfRangeAssets, setOutOfRangeAssets] = useState<Set<string>>(new Set())
  // Track action options visibility per asset
  const [showActionOptions, setShowActionOptions] = useState<Map<string, boolean>>(new Map())
  // Track selected action per asset
  const [selectedActions, setSelectedActions] = useState<Map<string, 'monitor' | 'callout'>>(new Map())
  // Legacy single asset tracking (kept for backwards compatibility with single temp field)
  const [outOfRangeAssetId, setOutOfRangeAssetId] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<'monitor' | 'callout' | null>(null)
  const [showWarning, setShowWarning] = useState(false) // Legacy single field warning state
  const [showActionOptionsSingle, setShowActionOptionsSingle] = useState(false) // Legacy single field action options
  const [showMonitorDurationModal, setShowMonitorDurationModal] = useState(false)
  const [showCalloutModal, setShowCalloutModal] = useState(false)
  const [calloutAsset, setCalloutAsset] = useState<any>(null)
  const [calloutQueue, setCalloutQueue] = useState<Array<{type: 'fire_alarm' | 'emergency_lights', asset: any}>>([])
  const [pendingCallouts, setPendingCallouts] = useState<Array<{type: 'fire_alarm' | 'emergency_lights', notes?: string}>>([])
  // Fire alarm and emergency lighting checklist states
  const [fireAlarmChecklist, setFireAlarmChecklist] = useState<boolean[]>([false, false, false, false, false, false])
  const [emergencyLightingChecklist, setEmergencyLightingChecklist] = useState<boolean[]>([false, false, false, false, false, false])
  const { companyId, siteId } = useAppContext()
  const { showToast } = useToast()
  
  // State for task data (assets, libraries, SOPs, RAs)
  const [selectedAssets, setSelectedAssets] = useState<any[]>([])
  const [selectedLibraries, setSelectedLibraries] = useState<Record<string, any[]>>({})
  const [sopUploads, setSopUploads] = useState<Array<{ url: string; fileName: string }>>([])
  const [raUploads, setRaUploads] = useState<Array<{ url: string; fileName: string }>>([])
  const [documentUploads, setDocumentUploads] = useState<Array<{ url: string; fileName: string }>>([])
  
  const templateNote = task.template_notes || task.template?.notes || null
  
  // Callout follow-up task state
  const [calloutData, setCalloutData] = useState<any>(null)
  const [calloutLoading, setCalloutLoading] = useState(false)
  const [calloutRepairSummary, setCalloutRepairSummary] = useState('')
  const [calloutUpdateNotes, setCalloutUpdateNotes] = useState('')
  const [calloutCloseDocuments, setCalloutCloseDocuments] = useState<File[]>([])

  useEffect(() => {
    if (isOpen) {
      // Set window.selectedTask for debugging
      if (typeof window !== 'undefined') {
        (window as any).selectedTask = task
      }
      
      // Load task data from task_data field (stored when task was created)
      let taskData: Record<string, any> = {};
      if (task.task_data && typeof task.task_data === 'object') {
        taskData = task.task_data;
        console.log('📦 [TASK DATA] Loaded task_data:', {
          keys: Object.keys(taskData),
          selectedAssets: taskData.selectedAssets,
          selectedAssetsCount: Array.isArray(taskData.selectedAssets) ? taskData.selectedAssets.length : 0,
          repeatableField: task.template?.repeatable_field_name,
          repeatableFieldValue: taskData[task.template?.repeatable_field_name || ''],
          repeatableFieldValueCount: Array.isArray(taskData[task.template?.repeatable_field_name || '']) ? taskData[task.template?.repeatable_field_name || ''].length : 0,
          temperatures: taskData.temperatures,
          temperaturesCount: Array.isArray(taskData.temperatures) ? taskData.temperatures.length : 0
        })
      } else if (task.completion_notes) {
        // Fallback: try loading from completion_notes (for backwards compatibility)
        try {
          const parsed = JSON.parse(task.completion_notes);
          if (typeof parsed === 'object' && parsed !== null && !parsed.completed_at) {
            taskData = parsed;
          }
        } catch (e) {
          // Not JSON, treat as regular completion notes
        }
      } else {
        console.warn('⚠️ [TASK DATA] No task_data found for task:', task.id)
      }
      
      // Initialize form data with task data FIRST (before loading template fields)
      const initialData: Record<string, any> = {}
      
      // CRITICAL: For monitoring tasks, only load the monitored asset (not all assets)
      // Monitoring tasks should only show the asset that was out of range
      const isMonitoringTask = task.flag_reason === 'monitoring' || task.flagged === true
      
      // CRITICAL: Load repeatable field data (selected assets) from task_data
      // This is essential for equipment_list to be built correctly
      // For monitoring tasks, only load the monitored asset (should already be filtered in task_data)
      if (task.template?.repeatable_field_name) {
        const repeatableFieldName = task.template.repeatable_field_name
        if (taskData[repeatableFieldName] && Array.isArray(taskData[repeatableFieldName])) {
          // For monitoring tasks, ensure only the monitored asset is loaded
          // task_data should already be filtered, but double-check
          const assetsToLoad = isMonitoringTask 
            ? taskData[repeatableFieldName].slice(0, 1) // Only first asset for monitoring tasks
            : taskData[repeatableFieldName] // All assets for regular tasks
          
          initialData[repeatableFieldName] = assetsToLoad
          console.log('📦 Loaded repeatable field data from task_data:', {
            fieldName: repeatableFieldName,
            assetCount: assetsToLoad.length,
            assets: assetsToLoad,
            isMonitoringTask
          })
        } else {
          // Initialize empty array if no data
          initialData[repeatableFieldName] = []
        }
      }
      
      // Load checklist items from task data
      if (taskData.checklistItems && Array.isArray(taskData.checklistItems) && taskData.checklistItems.length > 0) {
        initialData.checklist_items = taskData.checklistItems;
      }
      
      // Load yes/no checklist items from task data
      if (taskData.yesNoChecklistItems && Array.isArray(taskData.yesNoChecklistItems)) {
        initialData.yes_no_checklist_items = taskData.yesNoChecklistItems;
      } else if (task.template?.evidence_types?.includes('yes_no_checklist')) {
        // Fallback: Load from template's default_checklist_items if not in task_data
        // This handles tasks created before yes/no checklist items were properly saved
        let recurrencePattern = task.template.recurrence_pattern;
        if (typeof recurrencePattern === 'string') {
          try {
            recurrencePattern = JSON.parse(recurrencePattern);
          } catch (e) {
            console.error('Failed to parse recurrence_pattern:', e);
            recurrencePattern = null;
          }
        }
        
        const defaultChecklistItems = (recurrencePattern as any)?.default_checklist_items || [];
        if (Array.isArray(defaultChecklistItems) && defaultChecklistItems.length > 0) {
          initialData.yes_no_checklist_items = defaultChecklistItems.map((item: any) => ({
            text: typeof item === 'string' ? item : (item.text || item.label || ''),
            answer: null as 'yes' | 'no' | null
          })).filter((item: { text: string; answer: null }) => item.text && item.text.trim().length > 0);
          
          console.log('📋 Loaded yes/no checklist items from template:', {
            templateId: task.template.id,
            templateName: task.template.name,
            itemsCount: initialData.yes_no_checklist_items.length,
            items: initialData.yes_no_checklist_items
          });
        }
      }
      
      // CRITICAL: For monitoring tasks, DO NOT pre-populate temperatures
      // Monitoring tasks should start with empty temperature fields so user can record new reading
      
      // Load temperature logs from task data (only for non-monitoring tasks)
      // For monitoring tasks, leave temperatures empty so user can enter new reading
      if (!isMonitoringTask && taskData.temperatures && Array.isArray(taskData.temperatures)) {
        initialData.temperatures = taskData.temperatures;
        // Map temperatures to formData by assetId for quick access
        taskData.temperatures.forEach((temp: any) => {
          if (temp.assetId) {
            initialData[`temp_${temp.assetId}`] = temp.temp;
          }
        });
      } else if (isMonitoringTask) {
        // For monitoring tasks, initialize empty temperatures array
        // User needs to record a fresh temperature reading
        initialData.temperatures = [];
        console.log('🔧 Monitoring task detected - temperature fields will be empty for fresh reading')
      }
      
      // Load pass/fail status from task data
      if (taskData.passFailStatus) {
        initialData.pass_fail_result = taskData.passFailStatus;
      }
      
      console.log('📋 Initial formData loaded from task_data:', {
        keys: Object.keys(initialData),
        repeatableField: task.template?.repeatable_field_name,
        repeatableFieldValue: initialData[task.template?.repeatable_field_name || ''],
        checklistItemsCount: initialData.checklist_items?.length || 0,
        yesNoItemsCount: initialData.yes_no_checklist_items?.length || 0
      })
      
      // Set formData with task data immediately
      setFormData(initialData)
      
      // Load template fields - use task.template if available, otherwise fetch
      const initialize = async () => {
        // Use template_fields from task.template if available (fastest path)
        if (task.template?.template_fields && Array.isArray(task.template.template_fields) && task.template.template_fields.length > 0) {
          console.log('✅ [TEMPLATE FIELDS] Using pre-loaded template fields:', task.template.template_fields.length)
          const sortedFields = [...task.template.template_fields].sort((a: any, b: any) => (a.field_order || 0) - (b.field_order || 0))
          setTemplateFields(sortedFields)
        } else if (task.template_id) {
          // Fallback: fetch from database
          console.log('📋 [TEMPLATE FIELDS] Fetching from database for templateId:', task.template_id)
          try {
            await loadTemplateFields(task.template_id)
          } catch (error) {
            console.error('❌ [TEMPLATE FIELDS] Error loading template fields:', error)
            setTemplateFields([]) // Set empty array on error
          }
        } else {
          console.warn('⚠️ [TEMPLATE FIELDS] No template_id available and no pre-loaded fields')
          setTemplateFields([]) // Set empty array if no template_id
        }
        
        // Load task resources (assets, libraries, SOPs, RAs)
        // Temperature range loading will happen after assets are loaded
        await loadTaskResources(taskData).then(() => {
          // Load ranges after assets are available
          setTimeout(() => {
            console.log('🌡️ [TEMPERATURE SYSTEM] Loading temperature ranges after assets loaded...')
            loadAssetTempRanges();
          }, 500)
        }).catch((error) => {
          console.error('❌ [TEMPERATURE SYSTEM] Error loading task resources:', error)
          // Still try to load temp ranges
          loadAssetTempRanges();
        })
        
        // Final safeguard - reload temp ranges after everything is loaded
        setTimeout(() => {
          loadAssetTempRanges()
        }, 1000)
      }
      
      // Execute initialization
      initialize().catch((error) => {
        console.error('❌ Error during initialization:', error)
      })
      
      // Cleanup
      return () => {
        // Cleanup if needed
      }
    }, [task.id, task.template_id, task.template, isOpen])
    
    // SAFEGUARD: Load template fields from task.template if state is empty
    useEffect(() => {
      if (!isOpen || templateFields.length > 0) return
      
      // If task.template has fields but state is empty, use them
      if (task.template?.template_fields && Array.isArray(task.template.template_fields) && task.template.template_fields.length > 0) {
        console.log('✅ [TEMPLATE FIELDS SAFEGUARD] Loading from task.template:', task.template.template_fields.length)
        const sortedFields = [...task.template.template_fields].sort((a: any, b: any) => (a.field_order || 0) - (b.field_order || 0))
        setTemplateFields(sortedFields)
      }
    }, [isOpen, templateFields.length, task.template])
    
    // SAFEGUARD: Reload temperature ranges when templateFields state updates
    // This ensures ranges are loaded even if template fields load after initialization
    useEffect(() => {
      if (!isOpen || !task.template?.evidence_types?.includes('temperature')) return
      if (templateFields.length === 0) return
      
      console.log('🌡️ [TEMPERATURE SYSTEM] Template fields updated, reloading temperature ranges...')
      // Extract asset IDs from template fields
      const equipmentField = templateFields.find((f: any) => 
        f.field_type === 'select' && 
        (f.field_name === 'fridge_name' || 
         f.field_name === 'hot_holding_unit' || 
         f.field_name === 'equipment_name' ||
         f.field_name === 'asset_name')
      )
      
      if (equipmentField?.options && Array.isArray(equipmentField.options)) {
        const assetIdsFromFields = equipmentField.options
          .map((opt: any) => opt?.value)
          .filter(Boolean)
        
        if (assetIdsFromFields.length > 0) {
          console.log('🌡️ [TEMPERATURE SYSTEM] Reloading ranges for assets from template fields:', assetIdsFromFields.length)
          loadAssetTempRanges(assetIdsFromFields)
        }
      } else {
        // No equipment field found, try loading from other sources
        loadAssetTempRanges()
      }
    }, [templateFields, isOpen, task.template?.evidence_types])
    
    // Reset state when modal opens/closes
    useEffect(() => {
      if (!isOpen) return
      
      setPhotos([])
      setError('')
      setInstructionsExpanded(false)
      setOutOfRangeAssets(new Set())
      setShowActionOptions(new Map())
      setSelectedActions(new Map())
      setOutOfRangeAssetId(null)
      setSelectedAction(null)
      setShowWarning(false)
      setShowActionOptionsSingle(false)
      setPendingCallouts([])
      setCalloutAsset(null)
      setCalloutQueue([])
      setFireAlarmChecklist([false, false, false, false, false, false])
      setEmergencyLightingChecklist([false, false, false, false, false, false])
      // Reset task resources
      setSelectedAssets([])
      setSelectedLibraries({})
      setSopUploads([])
      setRaUploads([])
      setDocumentUploads([])
      // Reset callout follow-up state
      setCalloutData(null)
      setCalloutRepairSummary('')
      setCalloutUpdateNotes('')
      setCalloutCloseDocuments([])
    }
     
  }, [isOpen, task])

  // Load callout data for callout follow-up tasks
  useEffect(() => {
    if (isOpen && task.task_data?.source_type === 'callout_followup' && task.task_data?.source_id) {
      loadCalloutData(task.task_data.source_id)
    }
  }, [isOpen, task.task_data?.source_type, task.task_data?.source_id])

  async function loadCalloutData(calloutId: string) {
    setCalloutLoading(true)
    try {
      const { data, error } = await supabase
        .from('callouts')
        .select('*, assets(id, name, category), sites(id, name)')
        .eq('id', calloutId)
        .single()

      if (error) throw error
      if (data) {
        setCalloutData(data)
        // Pre-fill notes if callout has existing notes
        if (data.notes) {
          setCalloutUpdateNotes(data.notes)
        }
      }
    } catch (error: any) {
      console.error('Error loading callout data:', error)
      showToast({
        title: 'Error',
        description: 'Failed to load callout details',
        type: 'error'
      })
    } finally {
      setCalloutLoading(false)
    }
  }

  // Load task resources (assets, libraries, SOPs, RAs) from task_data
  async function loadTaskResources(taskData: Record<string, any>) {
    try {
      // CRITICAL: For monitoring tasks, only load the monitored asset (not all assets)
      // Monitoring tasks should only show the asset that was out of range
      const isMonitoringTask = task.flag_reason === 'monitoring' || task.flagged === true
      
      // CRITICAL: For PPM tasks, load the asset from task_data.source_id (or asset_id for backwards compatibility)
      // PPM tasks use source_id (not asset_id) - this is the asset ID
      const ppmAssetId = taskData.source_id || taskData.asset_id
      const isPPMTask = taskData.source_type === 'ppm_overdue' && ppmAssetId
      if (isPPMTask && ppmAssetId) {
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('id, name, category, site_id, sites(id, name)')
          .eq('id', ppmAssetId)
          .single()
        
        if (!assetError && assetData) {
          const site = Array.isArray(assetData.sites) ? assetData.sites[0] : assetData.sites
          const assetWithSite = {
            ...assetData,
            site_name: site?.name || 'No site assigned'
          }
          setSelectedAssets([assetWithSite])
          // Update assetsMap state
          setAssetsMap(prev => {
            const newMap = new Map(prev)
            newMap.set(assetData.id, assetWithSite)
            return newMap
          })
          console.log('🔧 PPM task: Loaded asset for callout:', {
            assetId: assetData.id,
            assetName: assetData.name
          })
        }
      }
      
      // Load selected assets
      // CRITICAL: Check both taskData.selectedAssets AND taskData[repeatableFieldName] for assets
      // The edge function might save assets in either location
      let assetIdsToLoad: string[] = []
      
      // Priority 1: Check taskData.selectedAssets
      if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
        assetIdsToLoad = isMonitoringTask 
          ? taskData.selectedAssets.slice(0, 1) // Only load first asset for monitoring tasks
          : taskData.selectedAssets // Load all assets for regular tasks
      }
      
      // Priority 2: Check taskData[repeatableFieldName] if selectedAssets is empty
      // This handles cases where the edge function saves assets in the repeatable field
      if (assetIdsToLoad.length === 0 && task.template?.repeatable_field_name) {
        const repeatableFieldName = task.template.repeatable_field_name
        const repeatableFieldData = taskData[repeatableFieldName]
        
        if (Array.isArray(repeatableFieldData) && repeatableFieldData.length > 0) {
          // Extract asset IDs from repeatable field data
          // Handle both formats: array of IDs or array of objects with assetId/value
          assetIdsToLoad = repeatableFieldData
            .map((item: any) => {
              if (typeof item === 'string') return item
              if (typeof item === 'object' && item !== null) {
                return item.assetId || item.value || item.id || item.asset_id
              }
              return null
            })
            .filter((id): id is string => Boolean(id))
          
          if (isMonitoringTask && assetIdsToLoad.length > 0) {
            assetIdsToLoad = assetIdsToLoad.slice(0, 1) // Only first asset for monitoring tasks
          }
          
          console.log('📦 [ASSET LOADING] Found assets in repeatable field:', {
            repeatableFieldName,
            assetCount: assetIdsToLoad.length,
            assetIds: assetIdsToLoad
          })
        }
      }
      
      // Load assets if we found any
      if (assetIdsToLoad.length > 0) {
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, category, site_id, sites(id, name)')
          .in('id', assetIdsToLoad);
        
        if (!assetsError && assetsData) {
          const assetsWithSite = assetsData.map((asset: any) => {
            const site = Array.isArray(asset.sites) ? asset.sites[0] : asset.sites;
            return {
              ...asset,
              site_name: site?.name || 'No site assigned'
            };
          });
          setSelectedAssets(assetsWithSite);
          
          console.log('✅ [ASSET LOADING] Loaded assets:', {
            assetCount: assetsWithSite.length,
            assets: assetsWithSite.map(a => ({ id: a.id, name: a.name }))
          })
          
          if (isMonitoringTask) {
            console.log('🔧 Monitoring task: Only loading monitored asset:', {
              assetCount: assetsWithSite.length,
              assets: assetsWithSite.map(a => ({ id: a.id, name: a.name }))
            })
          }
          
          // CRITICAL: Load temperature ranges immediately after assets are loaded
          // Pass asset IDs directly to avoid state timing issues
          const assetIds = assetsWithSite.map(a => a.id).filter(Boolean)
          if (assetIds.length > 0) {
            console.log('🌡️ [TEMPERATURE SYSTEM] Loading ranges immediately after assets loaded:', assetIds)
            loadAssetTempRanges(assetIds)
          }
        } else if (assetsError) {
          console.error('❌ [ASSET LOADING] Error loading assets:', assetsError)
        }
      } else {
        console.warn('⚠️ [ASSET LOADING] No assets found in task_data.selectedAssets or task_data[repeatableFieldName]')
      }
      
      // Also load ranges for template-linked asset if it exists
      if (task.template?.asset_id) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Loading range for template-linked asset:', task.template.asset_id)
        loadAssetTempRanges([task.template.asset_id])
      }
      
      // Load selected libraries
      if (taskData.selectedLibraries && typeof taskData.selectedLibraries === 'object') {
        const librariesMap: Record<string, any[]> = {};
        
        // Load PPE library items
        if (taskData.selectedLibraries.ppe && Array.isArray(taskData.selectedLibraries.ppe) && taskData.selectedLibraries.ppe.length > 0) {
          const { data: ppeData } = await supabase
            .from('ppe_library')
            .select('id, item_name, category')
            .in('id', taskData.selectedLibraries.ppe);
          if (ppeData) librariesMap.ppe = ppeData;
        }
        
        // Load Chemicals library items
        if (taskData.selectedLibraries.chemicals && Array.isArray(taskData.selectedLibraries.chemicals) && taskData.selectedLibraries.chemicals.length > 0) {
          const { data: chemicalsData } = await supabase
            .from('chemicals_library')
            .select('id, product_name, manufacturer')
            .in('id', taskData.selectedLibraries.chemicals);
          if (chemicalsData) librariesMap.chemicals = chemicalsData;
        }
        
        // Load Equipment library items
        if (taskData.selectedLibraries.equipment && Array.isArray(taskData.selectedLibraries.equipment) && taskData.selectedLibraries.equipment.length > 0) {
          const { data: equipmentData } = await supabase
            .from('equipment_library')
            .select('id, equipment_name, category')
            .in('id', taskData.selectedLibraries.equipment)
            .catch(() => ({ data: [] }));
          if (equipmentData) librariesMap.equipment = equipmentData;
        }
        
        // Load Ingredients library items
        if (taskData.selectedLibraries.ingredients && Array.isArray(taskData.selectedLibraries.ingredients) && taskData.selectedLibraries.ingredients.length > 0) {
          const { data: ingredientsData } = await supabase
            .from('ingredients_library')
            .select('id, ingredient_name, category')
            .in('id', taskData.selectedLibraries.ingredients)
            .catch(() => ({ data: [] }));
          if (ingredientsData) librariesMap.ingredients = ingredientsData;
        }
        
        // Load Drinks library items
        if (taskData.selectedLibraries.drinks && Array.isArray(taskData.selectedLibraries.drinks) && taskData.selectedLibraries.drinks.length > 0) {
          const { data: drinksData } = await supabase
            .from('drinks_library')
            .select('id, item_name, category')
            .in('id', taskData.selectedLibraries.drinks)
            .catch(() => ({ data: [] }));
          if (drinksData) librariesMap.drinks = drinksData;
        }
        
        // Load Disposables library items
        if (taskData.selectedLibraries.disposables && Array.isArray(taskData.selectedLibraries.disposables) && taskData.selectedLibraries.disposables.length > 0) {
          const { data: disposablesData } = await supabase
            .from('disposables_library')
            .select('id, item_name, category')
            .in('id', taskData.selectedLibraries.disposables)
            .catch(() => ({ data: [] }));
          if (disposablesData) librariesMap.disposables = disposablesData;
        }
        
        setSelectedLibraries(librariesMap);
      }
      
      // Load SOP uploads
      if (taskData.sopUploads && Array.isArray(taskData.sopUploads)) {
        setSopUploads(taskData.sopUploads.map((sop: any) => ({
          url: sop.url,
          fileName: sop.fileName
        })));
      }
      
      // Load RA uploads
      if (taskData.raUploads && Array.isArray(taskData.raUploads)) {
        setRaUploads(taskData.raUploads.map((ra: any) => ({
          url: ra.url,
          fileName: ra.fileName
        })));
      }
      
      // Load document uploads
      if (taskData.documentUploads && Array.isArray(taskData.documentUploads)) {
        setDocumentUploads(taskData.documentUploads.map((doc: any) => ({
          url: doc.url,
          fileName: doc.fileName
        })));
      }
    } catch (error) {
      console.error('Error loading task resources:', error);
    }
  }

  const loadTemplateFields = async (templateId: string): Promise<any[]> => {
    if (!templateId) {
      console.warn('⚠️ [TEMPLATE FIELDS] No templateId provided to loadTemplateFields')
      return []
    }
    console.log('📋 [TEMPLATE FIELDS] Loading template fields for templateId:', templateId)
    try {
      // CRITICAL: Use template_fields from task.template if already loaded (from Today's Tasks page)
      // This avoids unnecessary database queries and ensures fields are available immediately
      let fields = task.template?.template_fields || []
      
      // If template_fields weren't included in the template, fetch them separately
      if (!fields || fields.length === 0) {
        console.log('📋 [TEMPLATE FIELDS] Template fields not pre-loaded, fetching from database with templateId:', templateId)
        const { data, error } = await supabase
          .from('template_fields')
          .select('*')
          .eq('template_id', templateId)
          .order('field_order')
        
        if (error) {
          console.error('❌ [TEMPLATE FIELDS] Error fetching template fields:', error)
          console.error('   Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint })
          throw error
        }
        fields = data || []
        console.log('✅ [TEMPLATE FIELDS] Fetched', fields.length, 'fields from database for templateId:', templateId)
        if (fields.length > 0) {
          console.log('   Field names:', fields.map((f: any) => f.field_name))
          console.log('   Field types:', fields.map((f: any) => ({ name: f.field_name, type: f.field_type })))
        } else {
          console.warn('⚠️ [TEMPLATE FIELDS] Database query returned 0 fields for templateId:', templateId)
          console.warn('   This could mean:')
          console.warn('   1. Template fields were never created for this template')
          console.warn('   2. Template fields were deleted')
          console.warn('   3. There is a database connection issue')
          console.warn('   Template ID:', templateId)
          console.warn('   Template name:', task.template?.name || 'Unknown')
          console.warn('   Template slug:', task.template?.slug || 'Unknown')
        }
      } else {
        console.log('✅ [TEMPLATE FIELDS] Using pre-loaded template fields:', fields.length)
        // Ensure fields are sorted by field_order
        fields = [...fields].sort((a: any, b: any) => (a.field_order || 0) - (b.field_order || 0))
      }
      
      // CRITICAL: Always set state, even if fields is empty (prevents stale data)
      console.log('📋 [TEMPLATE FIELDS] Setting templateFields state with', fields.length, 'fields')
      setTemplateFields(fields)
      
      // Verify state was set (for debugging)
      if (fields.length > 0) {
        console.log('✅ [TEMPLATE FIELDS] State should now contain', fields.length, 'fields')
      }
      
      // Initialize form data with default values for each field type
      // IMPORTANT: Preserve existing formData (like checklist_items from task_data)
      // Use functional update to ensure we're working with the latest formData
      setFormData(prevFormData => {
        const initialFormData: Record<string, any> = { ...prevFormData }
        fields?.forEach((field: any) => {
          // For select fields, ensure value is always scalar (string), not array/object
          if (field.field_type === 'select' || field.field_type === 'pass_fail') {
            const currentValue = initialFormData[field.field_name];
            // If current value is array or object, reset to empty string for select elements
            if (Array.isArray(currentValue) || (typeof currentValue === 'object' && currentValue !== null)) {
              initialFormData[field.field_name] = '';
            } else if (!(field.field_name in initialFormData)) {
              initialFormData[field.field_name] = '';
            }
          } else if (!(field.field_name in initialFormData)) {
            // Only set default if field doesn't already exist in formData
            // This preserves checklist_items and other data loaded from task_data
            if (field.field_type === 'checkbox') {
              initialFormData[field.field_name] = false
            } else if (field.field_type === 'text') {
              initialFormData[field.field_name] = ''
            }
          }
        })
        return initialFormData
      })
      
      // CRITICAL: Return the fields so they can be used immediately without waiting for state update
      return fields
    } catch (error) {
      console.error('Error loading template fields:', error)
      return []
    }
  }

  /**
   * ============================================================================
   * TEMPERATURE WARNING SYSTEM - CRITICAL FUNCTIONALITY
   * ============================================================================
   * 
   * ⚠️ DO NOT MODIFY THIS FUNCTION WITHOUT TESTING TEMPERATURE WARNINGS ⚠️
   * 
   * This function loads asset temperature ranges from the database and is
   * essential for the temperature warning system. If this breaks, warnings
   * won't appear when temperatures are out of range.
   * 
   * SAFEGUARDS:
   * - Always loads ranges for template-linked assets
   * - Always loads ranges for selected assets from task_data
   * - Always loads ranges for assets in repeatable fields (legacy support)
   * - Logs all loaded ranges for debugging
   * - Never throws errors (catches and logs instead)
   * 
   * DEPENDENCIES:
   * - selectedAssets state must be populated before calling
   * - templateFields state should be populated (but will fetch if not)
   * - task.template.asset_id may be set for template-linked assets
   * 
   * TESTING CHECKLIST:
   * [ ] Temperature warnings appear when temp is below min
   * [ ] Temperature warnings appear when temp is above max
   * [ ] Warnings disappear when temp is corrected to in-range
   * [ ] Monitor/Callout buttons appear in warning box
   * [ ] Multiple assets can have warnings simultaneously
   * [ ] Console shows "🌡️ Loaded asset temperature ranges" on modal open
   * ============================================================================
   */
  /**
   * Load asset temperature ranges
   * @param assetIds - Optional array of asset IDs to load ranges for. If not provided, uses selectedAssets state and task_data
   */
  const loadAssetTempRanges = async (assetIds?: string[]) => {
    try {
      console.log('🌡️ [TEMPERATURE SYSTEM] Starting to load asset temperature ranges...')
      const ranges = new Map<string, { min: number | null, max: number | null }>()
      const assets = new Map<string, { name: string }>()
      const allAssetIds = new Set<string>()
      
      // SAFEGUARD 1: Load asset temperature ranges for template's linked asset
      if (task.template?.asset_id) {
        allAssetIds.add(task.template.asset_id)
        console.log('🌡️ [TEMPERATURE SYSTEM] Template has linked asset:', task.template.asset_id)
      }

      // SAFEGUARD 2: Load ranges for selected assets
      // Priority: Use provided assetIds parameter, then selectedAssets state, then task_data
      if (assetIds && assetIds.length > 0) {
        // Use provided asset IDs (most reliable - passed directly)
        assetIds.forEach(id => {
          if (id) allAssetIds.add(id)
        })
        console.log('🌡️ [TEMPERATURE SYSTEM] Using provided asset IDs:', assetIds.length)
      } else if (selectedAssets && selectedAssets.length > 0) {
        // Fallback to selectedAssets state
        selectedAssets.forEach(asset => {
          if (asset?.id) {
            allAssetIds.add(asset.id)
          }
        })
        console.log('🌡️ [TEMPERATURE SYSTEM] Found selected assets from state:', selectedAssets.length)
      } else {
        // Fallback: Try to get asset IDs from task_data directly
        // This ensures ranges load even if selectedAssets state hasn't updated yet
        const taskData = task.task_data || {}
        if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
          taskData.selectedAssets.forEach((id: string) => {
            if (id) allAssetIds.add(id)
          })
          console.log('🌡️ [TEMPERATURE SYSTEM] Found asset IDs from task_data:', taskData.selectedAssets.length)
        }
      }

      // SAFEGUARD 3: Also load ranges for assets referenced in repeatable fields (equipment lists) - legacy support
      // CRITICAL: First check task.template.template_fields, then templateFields state, then fetch from DB
      let currentFields: any[] = []
      
      // Priority 1: Check task.template.template_fields (pre-loaded)
      if (task.template?.template_fields && Array.isArray(task.template.template_fields) && task.template.template_fields.length > 0) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Using pre-loaded template_fields from task.template for asset lookup')
        currentFields = task.template.template_fields
      }
      // Priority 2: Check templateFields state
      else if (templateFields.length > 0) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Using templateFields state for asset lookup')
        currentFields = templateFields
      }
      // Priority 3: Fetch from database as last resort
      else {
        console.log('🌡️ [TEMPERATURE SYSTEM] Fetching template fields for asset lookup...')
        try {
          const { data, error } = await supabase
            .from('template_fields')
            .select('*')
            .eq('template_id', task.template_id)
            .order('field_order')
          
          if (error) {
            console.error('❌ [TEMPERATURE SYSTEM] Error fetching template fields:', error)
          } else {
            currentFields = data || []
            console.log('🌡️ [TEMPERATURE SYSTEM] Fetched', currentFields.length, 'template fields for asset lookup')
          }
        } catch (error) {
          console.error('❌ [TEMPERATURE SYSTEM] Exception fetching template fields:', error)
          currentFields = []
        }
      }
      
      const equipmentField = currentFields.find((f: any) => 
        f.field_type === 'select' && 
        (f.field_name === 'fridge_name' || f.field_name === 'hot_holding_unit')
      )
      if (equipmentField?.options && Array.isArray(equipmentField.options)) {
        equipmentField.options.forEach((opt: any) => {
          if (opt?.value) {
            allAssetIds.add(opt.value)
          }
        })
        console.log('🌡️ [TEMPERATURE SYSTEM] Found assets in equipment field:', equipmentField.options.length)
      }
      
      // Fetch all assets with temperature ranges in one query
      if (allAssetIds.size > 0) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Fetching temperature ranges for', allAssetIds.size, 'assets')
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, working_temp_min, working_temp_max')
          .in('id', Array.from(allAssetIds))
        
        if (assetsError) {
          console.error('❌ [TEMPERATURE SYSTEM] Error fetching assets:', assetsError)
          throw assetsError
        }
        
        if (assetsData && assetsData.length > 0) {
          assetsData.forEach(asset => {
            ranges.set(asset.id, { 
              min: asset.working_temp_min, 
              max: asset.working_temp_max 
            })
            assets.set(asset.id, { name: asset.name })
            console.log(`🌡️ [TEMPERATURE SYSTEM] Loaded range for ${asset.name}:`, {
              id: asset.id,
              min: asset.working_temp_min,
              max: asset.working_temp_max
            })
          })
        } else if (allAssetIds.size > 0) {
          // Only warn if we expected to find assets but didn't
          console.warn('⚠️ [TEMPERATURE SYSTEM] No assets found with IDs:', Array.from(allAssetIds))
        }
        // Note: No asset IDs is normal for tasks without asset selection - no warning needed
      }
      
      // CRITICAL: Always set the ranges, even if empty (prevents stale data)
      setAssetTempRanges(ranges)
      setAssetsMap(prev => {
        const newMap = new Map(prev)
        assets.forEach((value, key) => {
          newMap.set(key, value)
        })
        return newMap
      })
      
      // Debug: Log loaded ranges
      console.log('✅ [TEMPERATURE SYSTEM] Successfully loaded asset temperature ranges:', {
        count: ranges.size,
        ranges: Array.from(ranges.entries()).map(([id, range]) => ({
          assetId: id,
          assetName: assets.get(id)?.name || 'Unknown',
          min: range.min,
          max: range.max
        }))
      })
      
      // SAFEGUARD: Verify ranges were loaded
      if (ranges.size === 0 && allAssetIds.size > 0) {
        console.error('❌ [TEMPERATURE SYSTEM] WARNING: No temperature ranges loaded despite having asset IDs!')
        console.error('   Asset IDs requested:', Array.from(allAssetIds))
        console.error('   This will cause temperature warnings to NOT appear!')
      }
    } catch (error) {
      console.error('❌ [TEMPERATURE SYSTEM] CRITICAL ERROR loading asset temperature ranges:', error)
      // Don't throw - allow modal to continue, but log the error
      // This ensures the modal still works even if temp ranges fail to load
    }
  }

  const handleMonitorAction = (assetId?: string) => {
    if (assetId) {
      // Multi-asset mode
      setSelectedActions(prev => new Map(prev).set(assetId, 'monitor'))
      setOutOfRangeAssetId(assetId) // Set temporarily for createMonitoringTask
      setShowMonitorDurationModal(true)
    } else {
      // Single asset mode (legacy)
    setSelectedAction('monitor')
    setShowMonitorDurationModal(true)
    }
  }

  const createMonitoringTask = async (durationMinutes: number) => {
    // Use the asset ID that was set when handleMonitorAction was called
    // This ensures we're creating a monitoring task for the correct asset
    const targetAssetId = outOfRangeAssetId || (outOfRangeAssets.size > 0 ? Array.from(outOfRangeAssets)[0] : null)
    if (!task.template || !targetAssetId || !companyId || !siteId) {
      showToast({ title: 'Error', description: 'Missing required information', type: 'error' })
      setShowMonitorDurationModal(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get asset name from selectedAssets or assetsMap
      const assetName = selectedAssets.find(a => a.id === targetAssetId)?.name || 
                       assetsMap.get(targetAssetId)?.name || 
                       'Equipment'
      const tempValue = formData[`temp_${targetAssetId}`] || formData.temperature

      // Calculate due time (current time + duration)
      const now = new Date()
      const dueDate = new Date(now.getTime() + durationMinutes * 60 * 1000)

      // CRITICAL: Monitoring tasks should:
      // 1. ONLY include the asset that was out of range (not all assets)
      // 2. PRESERVE all other features from original task (SOPs, RAs, libraries, checklists, etc.)
      // 3. Show temperature warnings if temp is still out of range
      // 4. Allow user to monitor again or escalate to callout
      let monitoringTaskData: Record<string, any> = {}
      
      // Find the specific asset that triggered monitoring
      const outOfRangeAsset = selectedAssets.find(a => a.id === targetAssetId)
      const savedTemp = task.task_data?.temperatures?.find((t: any) => t.assetId === targetAssetId)
      const assetNickname = savedTemp?.nickname || ''
      
      if (task.task_data && typeof task.task_data === 'object') {
        // Deep copy the original task_data to preserve ALL features
        monitoringTaskData = JSON.parse(JSON.stringify(task.task_data))
        
        // CRITICAL: Filter ONLY asset-related data to the out-of-range asset
        // 1. Filter selectedAssets to only include the out-of-range asset
        if (monitoringTaskData.selectedAssets && Array.isArray(monitoringTaskData.selectedAssets)) {
          monitoringTaskData.selectedAssets = monitoringTaskData.selectedAssets.filter((assetId: string) => assetId === targetAssetId)
        } else if (task.task_data?.selectedAssets && Array.isArray(task.task_data.selectedAssets)) {
          monitoringTaskData.selectedAssets = task.task_data.selectedAssets.filter((assetId: string) => assetId === targetAssetId)
        } else {
          // Fallback: use the asset ID directly
          monitoringTaskData.selectedAssets = [targetAssetId]
        }
        
        // 2. Filter temperatures to only include the out-of-range asset
        monitoringTaskData.temperatures = [{
          assetId: targetAssetId,
          temp: tempValue,
          nickname: assetNickname,
          recorded_at: now.toISOString()
        }]
        
        // 3. If there's a repeatable field (equipment list), filter it to only the out-of-range asset
        const repeatableFieldName = task.template?.repeatable_field_name
        if (repeatableFieldName && monitoringTaskData[repeatableFieldName]) {
          if (Array.isArray(monitoringTaskData[repeatableFieldName])) {
            monitoringTaskData[repeatableFieldName] = monitoringTaskData[repeatableFieldName].filter((item: any) => {
              // Filter by assetId if it's an object, or by value if it's a string/ID
              if (typeof item === 'object' && item !== null) {
                return item.assetId === targetAssetId || item.id === targetAssetId || item.value === targetAssetId
              }
              return item === targetAssetId
            })
          }
        }
        
        // CRITICAL: Remove dayparts array from monitoring task - monitoring tasks should be single instances
        // If we keep dayparts, the monitoring task will be expanded into multiple instances in Today's Tasks
        if (monitoringTaskData.dayparts) {
          console.log('🔧 Removing dayparts from monitoring task to prevent expansion into multiple instances')
          delete monitoringTaskData.dayparts
        }
        
        // PRESERVE all other features (these are NOT filtered):
        // - checklist_items (preserved)
        // - yes_no_checklist_items (preserved)
        // - sop_uploads (preserved)
        // - ra_uploads (preserved)
        // - document_uploads (preserved)
        // - selectedLibraries (preserved - all library types)
        // - All other task_data fields (preserved)
        
        console.log('🔧 Created monitoring task data:', {
          assetId: targetAssetId,
          assetName: outOfRangeAsset?.name || 'Unknown',
          nickname: assetNickname,
          temp: tempValue,
          selectedAssets: monitoringTaskData.selectedAssets,
          temperaturesCount: monitoringTaskData.temperatures?.length || 0,
          preservedFeatures: {
            checklistItems: monitoringTaskData.checklist_items?.length || 0,
            yesNoItems: monitoringTaskData.yes_no_checklist_items?.length || 0,
            sopUploads: monitoringTaskData.sop_uploads?.length || 0,
            raUploads: monitoringTaskData.ra_uploads?.length || 0,
            documentUploads: monitoringTaskData.document_uploads?.length || 0,
            libraries: Object.keys(monitoringTaskData.selectedLibraries || {}).length
          }
        })
      } else {
        // If no task_data, create basic structure with ONLY the asset that triggered monitoring
        // But still preserve any features that might exist
        monitoringTaskData = {
          selectedAssets: [targetAssetId], // Only the out-of-range asset
          temperatures: [{
            assetId: targetAssetId,
            temp: tempValue,
            nickname: assetNickname,
            recorded_at: now.toISOString()
          }]
        }
        
        // If there's a repeatable field, include it with only the out-of-range asset
        const repeatableFieldName = task.template?.repeatable_field_name
        if (repeatableFieldName && outOfRangeAsset) {
          monitoringTaskData[repeatableFieldName] = [{
            assetId: targetAssetId,
            nickname: assetNickname,
            equipment: outOfRangeAsset.name
          }]
        }
      }

      // Create monitoring task based on original template
      // CRITICAL: Monitoring tasks are SINGLE INSTANCE tasks - they should NOT have dayparts in task_data
      // This prevents them from being expanded into multiple instances in Today's Tasks
      const { data: monitoringTask, error: taskError } = await supabase
        .from('checklist_tasks')
        .insert({
          template_id: task.template_id,
          company_id: companyId,
          site_id: siteId,
          due_date: now.toISOString().split('T')[0], // Today's date
          due_time: dueDate.toTimeString().slice(0, 5), // HH:MM format (calculated from duration)
          daypart: 'during_service', // Monitoring tasks are always single instance - use a default daypart
          assigned_to_role: task.template.assigned_to_role || null,
          assigned_to_user_id: task.assigned_to_user_id || null,
          status: 'pending',
          priority: 'high', // Monitoring tasks are high priority
          flagged: true,
          flag_reason: 'monitoring', // Mark as monitoring task
          generated_at: new Date().toISOString(),
          expires_at: dueDate.toISOString(),
          task_data: monitoringTaskData, // Include all assets, temperatures, and features from original task (but NO dayparts)
          custom_name: task.custom_name || task.template?.name, // Preserve task name
          custom_instructions: task.custom_instructions || task.template?.instructions, // Preserve instructions
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Create notification/alert
      await createAlert('monitor', assetName, tempValue, monitoringTask.id)

      showToast({ 
        title: 'Monitoring task created', 
        description: `Follow-up check scheduled for ${assetName} in ${durationMinutes} minutes`,
        type: 'success' 
      })

      // Record action in form data with duration
      setFormData(prev => ({
        ...prev,
        temp_action: 'monitor',
        temp_action_asset_id: targetAssetId,
        monitoring_task_id: monitoringTask.id,
        monitoring_duration: durationMinutes,
        monitoring_duration_minutes: durationMinutes,
        monitoring_asset_id: targetAssetId,
        monitoring_asset_name: assetName,
        [`temp_action_${targetAssetId}`]: 'monitor',
        [`monitoring_task_id_${targetAssetId}`]: monitoringTask.id,
        [`monitoring_duration_${targetAssetId}`]: durationMinutes
      }))

      // Close duration modal
      setShowMonitorDurationModal(false)
      
      // Reset outOfRangeAssetId so next asset can use the modal
      // But keep it in outOfRangeAssets set so warning still shows
      
      // Trigger refresh of parent task list
      if (onMonitoringTaskCreated) {
        onMonitoringTaskCreated()
      }
    } catch (error) {
      console.error('Error creating monitoring task:', error)
      showToast({ 
        title: 'Failed to create monitoring task', 
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error' 
      })
      setShowMonitorDurationModal(false)
    }
  }

  const createAlert = async (actionType: 'monitor' | 'callout', assetName: string, tempValue: number, taskId?: string) => {
    if (!companyId || !siteId) {
      console.error('Missing companyId or siteId for alert creation')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        return
      }

      // Note: Manager profile fetching removed - email/SMS notifications disabled for now
      // Can be re-enabled later when email/SMS services are configured

      const title = actionType === 'monitor' 
        ? 'Temperature Monitoring Scheduled' 
        : 'Temperature Callout Required'
      
      const message = actionType === 'monitor'
        ? `Temperature out of range detected on ${assetName} (${tempValue}°C). Monitoring task scheduled for re-evaluation.`
        : `Temperature out of range detected on ${assetName} (${tempValue}°C). Callout action requested.`

      // Create notification
      // Note: site_id is omitted due to foreign key constraint issues (references sites_redundant, not sites)
      // The notification will still work without site_id - company_id is sufficient for filtering
      const notificationData: any = {
        company_id: companyId,
        // site_id: siteId, // Omitted - foreign key constraint references sites_redundant, not sites
        type: 'temperature',
        title,
        message,
        severity: actionType === 'callout' ? 'critical' : 'warning',
        recipient_role: 'manager',
        status: 'active',
      }

      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()

      if (notifError) {
        // Log detailed error information for debugging
        const errorInfo = {
          message: notifError.message || 'Unknown error',
          code: notifError.code || 'UNKNOWN',
          details: notifError.details || null,
          hint: notifError.hint || null,
          attemptedData: notificationData
        }
        console.error('❌ Error creating notification:', JSON.stringify(errorInfo, null, 2))
        
        // Check if it's an RLS policy issue
        if (notifError.code === '42501' || notifError.code === 'PGRST301' || 
            notifError.message?.toLowerCase().includes('permission') || 
            notifError.message?.toLowerCase().includes('policy')) {
          console.warn('⚠️ This appears to be an RLS policy issue. The user may not have permission to create notifications.')
        }
        
        // Check if it's a foreign key constraint issue
        if (notifError.code === '23503') {
          console.warn('⚠️ Foreign key constraint violation. This may be due to schema mismatch.')
        }
        
        // Don't throw - allow task creation to continue even if notification fails
        // The task creation should still succeed
        return
      }

      console.log('✅ Notification created successfully:', notification?.id)
      
      // Email and SMS notifications removed for now - can be re-enabled later when email/SMS services are configured
      
    } catch (error) {
      console.error('Error creating alert:', error)
      // Don't throw - allow task creation to continue even if alert creation fails
    }
  }


  const handleFireAlarmFailure = async () => {
    // Try to find a fire alarm asset or create a placeholder asset for callout
    try {
      const { data: fireAlarmAssets } = await supabase
        .from('assets')
        .select('id, name, site_id, company_id, reactive_contractor_id')
        .eq('category', 'fire_alarms')
        .eq('company_id', companyId)
        .eq('site_id', siteId)
        .limit(1)
        .maybeSingle()
      
      if (fireAlarmAssets) {
        // Load site and contractor info
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', siteId)
          .single()
        
        let contractorName = null
        let contractorId = null
        if (fireAlarmAssets.reactive_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', fireAlarmAssets.reactive_contractor_id)
            .single()
          contractorName = contractor?.name || null
          contractorId = fireAlarmAssets.reactive_contractor_id
        }
        
        const assetForCallout = {
          id: fireAlarmAssets.id,
          name: fireAlarmAssets.name,
          site_name: site?.name || null,
          reactive_contractor_name: contractorName,
          reactive_contractor_id: contractorId
        }
        
        // Open callout modal immediately (don't queue)
          setCalloutAsset(assetForCallout)
          setShowCalloutModal(true)
      } else {
        // No fire alarm asset found - create placeholder asset for manual contractor entry
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', siteId)
          .single()
        
        const assetForCallout = {
          id: null, // No asset ID - will use manual contractor entry
          name: 'Fire Alarm System',
          site_name: site?.name || null,
          reactive_contractor_name: null,
          reactive_contractor_id: null,
          requiresManualContractor: true,
          contractorType: 'fire_panel_company'
        }
        
        setCalloutAsset(assetForCallout)
        setShowCalloutModal(true)
      }
    } catch (error) {
      console.error('Error loading fire alarm asset:', error)
      // Create placeholder asset for manual contractor entry
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single()
      
      const assetForCallout = {
        id: null,
        name: 'Fire Alarm System',
        site_name: site?.name || null,
        reactive_contractor_name: null,
        reactive_contractor_id: null,
        requiresManualContractor: true,
        contractorType: 'fire_panel_company'
      }
      
      setCalloutAsset(assetForCallout)
      setShowCalloutModal(true)
    }
  }

  const handleEmergencyLightsFailure = async () => {
    // Try to find an emergency lighting asset or create a placeholder
    try {
      const { data: emergencyLightAssets } = await supabase
        .from('assets')
        .select('id, name, site_id, company_id, reactive_contractor_id')
        .eq('category', 'emergency_lighting')
        .eq('company_id', companyId)
        .eq('site_id', siteId)
        .limit(1)
        .maybeSingle()
      
      if (emergencyLightAssets) {
        // Load site and contractor info
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', siteId)
          .single()
        
        let contractorName = null
        let contractorId = null
        if (emergencyLightAssets.reactive_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', emergencyLightAssets.reactive_contractor_id)
            .single()
          contractorName = contractor?.name || null
          contractorId = emergencyLightAssets.reactive_contractor_id
        }
        
        const assetForCallout = {
          id: emergencyLightAssets.id,
          name: emergencyLightAssets.name,
          site_name: site?.name || null,
          reactive_contractor_name: contractorName,
          reactive_contractor_id: contractorId
        }
        
        // Open callout modal immediately
          setCalloutAsset(assetForCallout)
          setShowCalloutModal(true)
      } else {
        // No emergency lighting asset found - create placeholder for manual contractor entry
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', siteId)
          .single()
        
        const assetForCallout = {
          id: null, // No asset ID - will use manual contractor entry
          name: 'Emergency Lighting System',
          site_name: site?.name || null,
          reactive_contractor_name: null,
          reactive_contractor_id: null,
          requiresManualContractor: true,
          contractorType: 'electrician'
        }
        
        setCalloutAsset(assetForCallout)
        setShowCalloutModal(true)
      }
    } catch (error) {
      console.error('Error loading emergency lighting asset:', error)
      // Create placeholder asset for manual contractor entry
      const { data: site } = await supabase
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single()
      
      const assetForCallout = {
        id: null,
        name: 'Emergency Lighting System',
        site_name: site?.name || null,
        reactive_contractor_name: null,
        reactive_contractor_id: null,
        requiresManualContractor: true,
        contractorType: 'electrician'
      }
      
      setCalloutAsset(assetForCallout)
      setShowCalloutModal(true)
    }
  }

  const handleCalloutAction = async (assetId?: string, skipQueueCheck: boolean = false) => {
    const targetAssetId = assetId || outOfRangeAssetId
    if (!targetAssetId) {
      showToast({ 
        title: 'Error', 
        description: 'No asset selected for callout',
        type: 'error' 
      })
      return
    }
    
    // If a callout modal is already open, queue this one (unless we're processing a queued item)
    if (!skipQueueCheck && showCalloutModal && calloutAsset) {
      // Check if it's for the same asset - if so, just keep the current modal
      if (calloutAsset.id === targetAssetId) {
        return // Already showing modal for this asset
      }
      // Different asset - prepare asset data and queue it
      const assetForQueue = selectedAssets.find(a => a.id === targetAssetId)
      if (assetForQueue) {
        // Mark this asset as needing callout
        setSelectedActions(prev => new Map(prev).set(targetAssetId, 'callout'))
        // Queue will be processed after current modal closes
        showToast({
          title: 'Callout queued',
          description: `Callout for ${assetForQueue.name} will open after current callout is completed`,
          type: 'info'
        })
        // Store the asset ID to process later - we'll rebuild the full asset object when processing the queue
        setCalloutQueue(prev => [...prev, { type: 'fire_alarm' as const, asset: { id: targetAssetId } }])
        return
      }
    }
    
    if (assetId) {
      // Multi-asset mode - mark this specific asset as needing callout
      setSelectedActions(prev => new Map(prev).set(assetId, 'callout'))
    } else {
      // Single asset mode (legacy)
      setSelectedAction('callout')
    }

    // First, try to find asset in selectedAssets array (already loaded with site info)
    let assetForCallout = selectedAssets.find(a => a.id === targetAssetId)
    
    // If found in selectedAssets, use it directly (already has site_name)
    if (assetForCallout) {
      // Build asset object for callout modal - fetch contractor info from DB
      try {
        const { data: assetData } = await supabase
          .from('assets')
          .select('id, name, serial_number, warranty_end, install_date, category, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
          .eq('id', targetAssetId)
          .single()

        // Load contractor names
        let ppmContractorName = null
        let reactiveContractorName = null
        let warrantyContractorName = null

        if (assetData?.ppm_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', assetData.ppm_contractor_id)
            .single()
          ppmContractorName = contractor?.name || null
        }

        if (assetData?.reactive_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', assetData.reactive_contractor_id)
            .single()
          reactiveContractorName = contractor?.name || null
        }

        if (assetData?.warranty_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', assetData.warranty_contractor_id)
            .single()
          warrantyContractorName = contractor?.name || null
        }

        const finalAssetForCallout = {
          id: assetForCallout.id,
          name: assetForCallout.name,
          serial_number: assetData?.serial_number || null,
          warranty_end: assetData?.warranty_end || null,
          install_date: assetData?.install_date || null,
          category: assetForCallout.category || assetData?.category || null,
          site_name: assetForCallout.site_name || null,
          ppm_contractor_name: ppmContractorName,
          reactive_contractor_name: reactiveContractorName,
          warranty_contractor_name: warrantyContractorName,
        }

        setCalloutAsset(finalAssetForCallout)
        setShowCalloutModal(true)
        
        // Record action in form data
        setFormData(prev => ({
          ...prev,
          temp_action: 'callout',
          temp_action_asset_id: targetAssetId,
          [`temp_action_${targetAssetId}`]: 'callout'
        }))

        // Create alert for callout
        const assetName = finalAssetForCallout.name || 'Equipment'
        const tempValue = formData[`temp_${targetAssetId}`] || formData.temperature
        
        // Update outOfRangeAssetId for backwards compatibility
        setOutOfRangeAssetId(targetAssetId)
        await createAlert('callout', assetName, tempValue)
        return
      } catch (error) {
        console.error('Error loading contractor info for callout:', error)
        // Continue with basic asset info if contractor fetch fails
      }
    }
    
    // If not found in selectedAssets, fetch full asset details from database
    try {
      const { data: simpleAsset, error: simpleError } = await supabase
        .from('assets')
        .select('id, name, serial_number, warranty_end, install_date, category, site_id, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
        .eq('id', targetAssetId)
        .single()

      if (simpleError) {
        const errorDetails = {
          message: simpleError.message || 'Unknown error',
          code: simpleError.code || 'UNKNOWN',
          details: simpleError.details || null,
          hint: simpleError.hint || null
        }
        console.error('❌ Error loading asset for callout:', JSON.stringify(errorDetails, null, 2))
        showToast({ 
          title: 'Error', 
          description: `Failed to load asset: ${simpleError.message}`,
          type: 'error' 
        })
        return
      }

      if (!simpleAsset) {
        showToast({ 
          title: 'Error', 
          description: 'Asset not found',
          type: 'error' 
        })
        return
      }

      // Load site name separately
      let siteName = null
      if (simpleAsset.site_id) {
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', simpleAsset.site_id)
          .single()
        siteName = site?.name || null
      }

      // Load contractor names separately
      let ppmContractorName = null
      let reactiveContractorName = null
      let warrantyContractorName = null

      if (simpleAsset.ppm_contractor_id) {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('name')
          .eq('id', simpleAsset.ppm_contractor_id)
          .single()
        ppmContractorName = contractor?.name || null
      }

      if (simpleAsset.reactive_contractor_id) {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('name')
          .eq('id', simpleAsset.reactive_contractor_id)
          .single()
        reactiveContractorName = contractor?.name || null
      }

      if (simpleAsset.warranty_contractor_id) {
        const { data: contractor } = await supabase
          .from('contractors')
          .select('name')
          .eq('id', simpleAsset.warranty_contractor_id)
          .single()
        warrantyContractorName = contractor?.name || null
      }

      const assetForCalloutFinal = {
        id: simpleAsset.id,
        name: simpleAsset.name,
        serial_number: simpleAsset.serial_number || null,
        warranty_end: simpleAsset.warranty_end || null,
        install_date: simpleAsset.install_date || null,
        category: simpleAsset.category || null,
        site_name: siteName,
        ppm_contractor_name: ppmContractorName,
        reactive_contractor_name: reactiveContractorName,
        warranty_contractor_name: warrantyContractorName,
      }

      setCalloutAsset(assetForCalloutFinal)
      setShowCalloutModal(true)
      
      // Record action in form data
      setFormData(prev => ({
        ...prev,
        temp_action: 'callout',
        temp_action_asset_id: targetAssetId,
        [`temp_action_${targetAssetId}`]: 'callout'
      }))

      // Create alert for callout
      const assetName = assetForCalloutFinal.name || 'Equipment'
      const tempValue = formData[`temp_${targetAssetId}`] || formData.temperature
      
      // Update outOfRangeAssetId for backwards compatibility
      setOutOfRangeAssetId(targetAssetId)
      await createAlert('callout', assetName, tempValue)
      
    } catch (error) {
      console.error('Error loading asset for callout:', error)
      showToast({ 
        title: 'Error', 
        description: 'Failed to load asset details',
        type: 'error' 
      })
    }
  }

  /**
   * ============================================================================
   * TEMPERATURE RANGE CHECK - CRITICAL FUNCTIONALITY
   * ============================================================================
   * 
   * ⚠️ DO NOT MODIFY WITHOUT TESTING NEGATIVE TEMPERATURES ⚠️
   * 
   * This function checks if a temperature is outside the asset's working range.
   * CRITICAL: Must handle negative temperatures correctly (e.g., freezers at -18°C)
   * 
   * Examples:
   * - Freezer range: min=-20, max=-18
   *   - -22°C is OUT (below min: -22 < -20) ✓
   *   - -19°C is OUT (above max: -19 > -18) ✓
   *   - -19.5°C is IN (between -20 and -18) ✓
   * 
   * SAFEGUARDS:
   * - Handles negative numbers correctly
   * - Handles null min/max values
   * - Returns false if range not loaded (prevents false positives)
   * 
   * TESTING CHECKLIST:
   * [ ] Freezer: -22°C with range -20 to -18 → OUT (below min)
   * [ ] Freezer: -19°C with range -20 to -18 → OUT (above max)
   * [ ] Freezer: -19.5°C with range -20 to -18 → IN
   * [ ] Fridge: 10°C with range 0 to 5 → OUT (above max)
   * [ ] Fridge: 3°C with range 0 to 5 → IN
   * ============================================================================
   */
  const checkTemperatureRange = (temp: number, assetId: string | null): boolean => {
    if (!assetId || isNaN(temp)) {
      console.warn(`⚠️ [TEMPERATURE RANGE CHECK] Invalid input: assetId=${assetId}, temp=${temp}`)
      return false
    }
    
    const range = assetTempRanges.get(assetId)
    if (!range) {
      console.warn(`⚠️ [TEMPERATURE RANGE CHECK] No range loaded for asset ${assetId}`)
      return false
    }
    
    const { min, max } = range
    if (min === null && max === null) {
      console.warn(`⚠️ [TEMPERATURE RANGE CHECK] Range has no min or max for asset ${assetId}`)
      return false
    }
    
    // CRITICAL: Check if temperature is outside the working range
    // For negative temps: -22 < -20 (below min) OR -19 > -18 (above max)
    // For positive temps: 10 > 5 (above max) OR -1 < 0 (below min)
    let isOutOfRange = false
    
    if (min !== null && temp < min) {
      // Temperature is below minimum (works for both positive and negative)
      // Example: -22 < -20 (freezer too cold) OR -1 < 0 (fridge too cold)
      isOutOfRange = true
      console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is BELOW minimum ${min}°C (out of range)`)
    }
    
    if (max !== null && temp > max) {
      // Temperature is above maximum (works for both positive and negative)
      // Example: -19 > -18 (freezer too warm) OR 10 > 5 (fridge too warm)
      isOutOfRange = true
      console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is ABOVE maximum ${max}°C (out of range)`)
    }
    
    if (!isOutOfRange) {
      console.log(`✅ [TEMPERATURE RANGE CHECK] ${temp}°C is within range [${min ?? 'no min'}, ${max ?? 'no max'}]`)
    }
    
    return isOutOfRange
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Check for temperature warnings
    if (fieldName === 'temperature') {
      // Only check if value is a valid number
      const tempValue = value !== null && value !== undefined && value !== '' 
        ? (typeof value === 'number' ? value : parseFloat(String(value)))
        : null
      
      if (tempValue === null || isNaN(tempValue) || !isFinite(tempValue)) {
        setShowWarning(false)
        setOutOfRangeAssetId(null)
        return
      }
      
      // Check against template's linked asset
      if (task.template?.asset_id) {
        const isOutOfRange = checkTemperatureRange(tempValue, task.template.asset_id)
        if (isOutOfRange) {
          setShowWarning(true)
          setOutOfRangeAssetId(task.template.asset_id)
        } else {
          setShowWarning(false)
          setOutOfRangeAssetId(null)
        }
      }
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setPhotos(prev => [...prev, ...files])
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!task.template) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user profile to ensure we have profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // Upload photos if any
      const photoUrls: string[] = []
      for (const photo of photos) {
        const fileName = `${task.id}_${Date.now()}_${photo.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-evidence')
          .upload(fileName, photo)

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          throw new Error(`Failed to upload photo: ${uploadError.message}`)
        }
        photoUrls.push(uploadData.path)
      }

      const completedAt = new Date().toISOString()
      const completedAtDate = new Date(completedAt)
      
      // Check if task was completed outside the valid window (1 hour before/after due_time)
      const completedOutsideWindow = isCompletedOutsideWindow(
        task.due_date,
        task.due_time || null,
        completedAt
      )
      
      // Check if task was completed late (after window end)
      const completedLate = isCompletedLate(
        task.due_date,
        task.due_time || null,
        completedAt
      )

      // Get repeatable field once for use in both temperature records and equipment list
      const repeatableField = templateFields.find(f => f.field_name === task.template?.repeatable_field_name)
      
      // Save temperature records for each equipment/temperature entry
      const temperatureRecords: any[] = []
      
      // Check if this is a temperature task with equipment fields
      if (repeatableField && formData[repeatableField.field_name]) {
        // Handle repeatable equipment list (e.g., multiple fridges)
        const equipmentList = formData[repeatableField.field_name] || []
        for (const equipment of equipmentList) {
          const tempKey = `temp_${equipment.value || equipment}`
          const tempValue = formData[tempKey]
          
          if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
            const assetId = equipment.value || equipment
            const assetName = assetsMap.get(assetId)?.name || 'Unknown Equipment'
            
            // Get asset temperature range to determine status
            const assetRange = assetTempRanges.get(assetId)
            let status = 'ok'
            if (assetRange) {
              const { min, max } = assetRange
              const temp = parseFloat(tempValue)
              const tolerance = 2
              const warningTolerance = 1
              
              if ((min !== null && temp < min - tolerance) || (max !== null && temp > max + tolerance)) {
                status = 'failed'
              } else if ((min !== null && temp < min - warningTolerance) || (max !== null && temp > max + warningTolerance)) {
                status = 'warning'
              } else if ((min !== null && temp < min) || (max !== null && temp > max)) {
                status = 'warning'
              }
            }
            
            temperatureRecords.push({
              company_id: companyId,
              site_id: siteId,
              asset_id: assetId,
              recorded_by: profile.id,
              reading: parseFloat(tempValue),
              unit: '°C',
              recorded_at: completedAt,
              day_part: task.daypart || null,
              status,
              notes: `Recorded via task: ${task.template.name}`,
              photo_url: photoUrls.length > 0 ? photoUrls[0] : null
            })
          }
        }
      } else if (formData.temperature !== undefined && formData.temperature !== null && formData.temperature !== '') {
        // Handle single temperature field (template's linked asset)
        const assetId = task.template.asset_id
        if (assetId) {
          const assetRange = assetTempRanges.get(assetId)
          let status = 'ok'
          if (assetRange) {
            const { min, max } = assetRange
            const temp = parseFloat(formData.temperature)
            const tolerance = 2
            const warningTolerance = 1
            
            if ((min !== null && temp < min - tolerance) || (max !== null && temp > max + tolerance)) {
              status = 'failed'
            } else if ((min !== null && temp < min - warningTolerance) || (max !== null && temp > max + warningTolerance)) {
              status = 'warning'
            } else if ((min !== null && temp < min) || (max !== null && temp > max)) {
              status = 'warning'
            }
          }
          
          temperatureRecords.push({
            company_id: companyId,
            site_id: siteId,
            asset_id: assetId,
            recorded_by: profile.id,
            reading: parseFloat(formData.temperature),
            unit: '°C',
            recorded_at: completedAt,
            day_part: task.daypart || null,
            status,
            notes: `Recorded via task: ${task.template.name}`,
            photo_url: photoUrls.length > 0 ? photoUrls[0] : null
          })
        }
      }

      // Insert temperature records
      if (temperatureRecords.length > 0) {
        const { error: tempError } = await supabase
          .from('temperature_logs')
          .insert(temperatureRecords)

        if (tempError) {
          console.error('Temperature logs insert error:', tempError)
          // Don't fail the whole operation, but log it
        } else {
          console.log(`✅ Created ${temperatureRecords.length} temperature record(s)`)
        }
      }

      // Handle callout follow-up tasks - update/close the callout
      if (task.task_data?.source_type === 'callout_followup' && task.task_data?.source_id && calloutData) {
        try {
          const updateData: any = {
            updated_at: completedAt
          }

          // Add update notes if provided
          if (calloutUpdateNotes && calloutUpdateNotes.trim()) {
            const existingNotes = calloutData.notes || ''
            updateData.notes = existingNotes 
              ? `${existingNotes}\n\n[${new Date().toLocaleString()}] ${calloutUpdateNotes}`
              : calloutUpdateNotes
          }

          // If callout is open, check if we're trying to close it
          if (calloutData.status === 'open') {
            // If repair summary is provided, we're closing the callout
            if (calloutRepairSummary && calloutRepairSummary.trim()) {
              // Upload documents if any
              const documentUrls: Array<{ url: string; name: string; type: string }> = []
              
              if (calloutCloseDocuments.length > 0) {
                for (const file of calloutCloseDocuments) {
                  try {
                    const fileExt = file.name.split('.').pop()
                    const random = Math.random().toString(36).slice(2, 8)
                    const filePath = `${companyId}/callout-documents/${calloutData.id}/${Date.now()}-${random}.${fileExt}`
                    
                    // Try callout-documents bucket first, fallback to global_docs
                    let bucketName = 'callout-documents'
                    let { error: uploadError } = await supabase.storage
                      .from(bucketName)
                      .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type || 'application/pdf'
                      })
                    
                    if (uploadError) {
                      // Fallback to global_docs bucket
                      bucketName = 'global_docs'
                      const fallbackResult = await supabase.storage
                        .from(bucketName)
                        .upload(filePath, file, {
                          cacheControl: '3600',
                          upsert: false,
                          contentType: file.type || 'application/pdf'
                        })
                      uploadError = fallbackResult.error
                    }
                    
                    if (uploadError) throw uploadError
                    
                    const { data: urlData } = supabase.storage
                      .from(bucketName)
                      .getPublicUrl(filePath)
                    
                    documentUrls.push({
                      url: urlData.publicUrl,
                      name: file.name,
                      type: file.type?.includes('pdf') ? 'invoice' : 'worksheet' // Default to invoice for PDFs, worksheet for images
                    })
                  } catch (uploadErr: any) {
                    console.error('Error uploading callout document:', uploadErr)
                    showToast({
                      title: 'Document upload failed',
                      description: `Failed to upload ${file.name}: ${uploadErr.message}`,
                      type: 'warning'
                    })
                    // Continue with other documents
                  }
                }
              }

              // Merge with existing documents
              const existingDocuments = calloutData.documents || []
              const allDocuments = [...existingDocuments, ...documentUrls]

              updateData.repair_summary = calloutRepairSummary
              updateData.status = 'closed'
              updateData.closed_at = completedAt
              updateData.documents = allDocuments

              // Try RPC function first, fallback to direct update
              // Note: RPC may fail due to permissions or function not existing, so we always have a fallback
              let calloutClosed = false
              
              try {
                // Ensure documents is properly formatted as JSONB array
                const documentsArray = Array.isArray(allDocuments) ? allDocuments : []
                
                const { data: rpcData, error: rpcError } = await supabase.rpc('close_callout', {
                  p_callout_id: calloutData.id,
                  p_repair_summary: calloutRepairSummary,
                  p_documents: documentsArray
                })

                if (rpcError) {
                  console.warn('RPC close_callout error, using direct update:', rpcError)
                  console.warn('RPC error details:', {
                    message: rpcError.message,
                    code: rpcError.code,
                    details: rpcError.details,
                    hint: rpcError.hint
                  })
                  
                  // Fall through to direct update
                  const { error: updateError } = await supabase
                    .from('callouts')
                    .update(updateData)
                    .eq('id', calloutData.id)

                  if (updateError) {
                    console.error('Direct update also failed:', updateError)
                    // Don't throw - log error but allow task completion
                    showToast({
                      title: 'Warning',
                      description: 'Callout may not have been closed. Please check manually.',
                      type: 'warning'
                    })
                  } else {
                    console.log('✅ Callout closed successfully via direct update (RPC failed)')
                    calloutClosed = true
                  }
                } else {
                  console.log('✅ Callout closed successfully via RPC')
                  calloutClosed = true
                }
              } catch (error: any) {
                console.error('Error closing callout:', error)
                // Try direct update as final fallback
                try {
                  const { error: updateError } = await supabase
                    .from('callouts')
                    .update(updateData)
                    .eq('id', calloutData.id)
                  
                  if (updateError) {
                    console.error('Direct update failed:', updateError)
                    showToast({
                      title: 'Warning',
                      description: 'Callout may not have been closed. Please check manually.',
                      type: 'warning'
                    })
                  } else {
                    console.log('✅ Callout closed successfully via direct update (fallback)')
                    calloutClosed = true
                  }
                } catch (fallbackError: any) {
                  console.error('Fallback update also failed:', fallbackError)
                  showToast({
                    title: 'Warning',
                    description: 'Callout may not have been closed. Please check manually.',
                    type: 'warning'
                  })
                }
              }
              
              // Note: We don't throw an error here - task completion should proceed even if callout close fails
              // The user can manually close the callout later if needed
            } else if (Object.keys(updateData).length > 1) {
              // Just update notes if callout is still open and we have notes (but not closing)
              const { error: updateError } = await supabase
                .from('callouts')
                .update(updateData)
                .eq('id', calloutData.id)

              if (updateError) {
                console.warn('Error updating callout notes:', updateError)
                // Don't fail the task completion if notes update fails
              }
            }
            // If callout is open but no repair summary and no notes, that's fine - just complete the task
          } else {
            // Callout is already closed/reopened - just update notes if provided
            if (Object.keys(updateData).length > 1) {
              const { error: updateError } = await supabase
                .from('callouts')
                .update(updateData)
                .eq('id', calloutData.id)

              if (updateError) {
                console.warn('Error updating callout notes:', updateError)
                // Don't fail the task completion if notes update fails
              }
            }
          }
        } catch (error: any) {
          console.error('Error handling callout follow-up:', error)
          throw error // Re-throw to prevent task completion if callout update fails
        }
      }

      // Handle fire alarm and emergency lights failures - create callouts
      const fireAlarmTestResult = formData.fire_alarm_test_result
      const emergencyLightsTestResult = formData.emergency_lights_test_result
      
      if (fireAlarmTestResult === 'fail') {
        // Create fire panel company callout
        try {
          const { data: fireAlarmAsset } = await supabase
            .from('assets')
            .select('id, name, site_id, company_id, reactive_contractor_id')
            .eq('category', 'fire_alarms')
            .eq('company_id', companyId)
            .eq('site_id', siteId)
            .limit(1)
            .maybeSingle()
          
          if (fireAlarmAsset) {
            const calloutData: any = {
              company_id: companyId,
              asset_id: fireAlarmAsset.id,
              site_id: siteId,
              contractor_id: fireAlarmAsset.reactive_contractor_id,
              created_by: profile.id,
              callout_type: 'reactive',
              priority: 'urgent',
              status: 'open',
              fault_description: `Fire alarm test failed. Call point: ${formData.fire_alarm_call_point || 'Not specified'}. Requires fire panel company attention.`,
              notes: formData.notes || `Fire alarm test failure recorded via task: ${task.template?.name || 'Unknown'}`,
              attachments: photoUrls.length > 0 ? photoUrls : [],
              troubleshooting_complete: false
            }

            const { error: calloutError } = await supabase
              .from('callouts')
              .insert(calloutData)

            if (calloutError) {
              console.error('Failed to create fire alarm callout:', calloutError)
            } else {
              console.log('✅ Fire alarm callout created')
            }
          }
        } catch (error) {
          console.error('Error creating fire alarm callout:', error)
        }
      }
      
      if (emergencyLightsTestResult === 'fail') {
        // Create electrician callout
        try {
          const { data: emergencyLightAsset } = await supabase
            .from('assets')
            .select('id, name, site_id, company_id, reactive_contractor_id')
            .eq('category', 'emergency_lighting')
            .eq('company_id', companyId)
            .eq('site_id', siteId)
            .limit(1)
            .maybeSingle()
          
          if (emergencyLightAsset) {
            const calloutData: any = {
              company_id: companyId,
              asset_id: emergencyLightAsset.id,
              site_id: siteId,
              contractor_id: emergencyLightAsset.reactive_contractor_id,
              created_by: profile.id,
              callout_type: 'reactive',
              priority: 'urgent',
              status: 'open',
              fault_description: `Emergency lights test failed. Requires electrician attention.`,
              notes: formData.notes || `Emergency lights test failure recorded via task: ${task.template?.name || 'Unknown'}`,
              attachments: photoUrls.length > 0 ? photoUrls : [],
              troubleshooting_complete: false
            }

            const { error: calloutError } = await supabase
              .from('callouts')
              .insert(calloutData)

            if (calloutError) {
              console.error('Failed to create emergency lights callout:', calloutError)
            } else {
              console.log('✅ Emergency lights callout created')
            }
          }
        } catch (error) {
          console.error('Error creating emergency lights callout:', error)
        }
      }

      // NEW: Handle workflow escalation using the workflow handler system
      // This runs after temperature records are saved but before task completion
      // Note: If user already selected monitor/callout action via UI (createMonitoringTask/handleCalloutAction),
      // those actions are taken first. This workflow handler provides additional escalation logic
      // and ensures consistent workflow processing across all compliance templates.
      if (temperatureRecords.length > 0 && outOfRangeAssetId) {
        const outOfRangeRecord = temperatureRecords.find(tr => tr.asset_id === outOfRangeAssetId)
        if (outOfRangeRecord) {
          try {
            // Get template as ComplianceTemplate (with workflowType)
            // For now, we'll treat it as a measurement workflow if it has temperature evidence
            const template = task.template as unknown as ComplianceTemplate
            const workflowType = (template as any).workflowType || 
              (template.evidence_types?.includes('temperature') ? 'measurement' : 'simple_confirm')
            
            // Call workflow handler for measurement-based tasks
            // This will handle escalation logic (monitor/callout) based on template configuration
            // If user already selected an action via UI, this serves as validation/backup
            if (workflowType === 'measurement') {
              const assetRange = assetTempRanges.get(outOfRangeAssetId)
              const workflowResult = await handleWorkflow({
                template: {
                  ...template,
                  workflowType: 'measurement'
                } as ComplianceTemplate,
                formData,
                photoUrls,
                companyId: companyId!,
                siteId: siteId!,
                userId: profile.id,
                taskId: task.id,
                assetId: outOfRangeAssetId,
                assetName: assetsMap.get(outOfRangeAssetId)?.name || 'Equipment',
                measuredValue: outOfRangeRecord.reading,
                assetMinTemp: assetRange?.min ?? null,
                assetMaxTemp: assetRange?.max ?? null,
                durationMinutes: selectedAction === 'monitor' ? 30 : undefined
              })

              if (workflowResult.success) {
                console.log('✅ Workflow handled:', workflowResult.message)
                
                // Update formData with workflow action (if not already set)
                if (workflowResult.action === 'monitor' && workflowResult.monitoringTaskId) {
                  formData.temp_action = 'monitor'
                  formData.monitoring_task_id = workflowResult.monitoringTaskId
                } else if (workflowResult.action === 'callout' && workflowResult.calloutId) {
                  formData.temp_action = 'callout'
                  formData.callout_id = workflowResult.calloutId
                }
              }
            }
          } catch (workflowError) {
            console.error('Workflow handling error (non-fatal):', workflowError)
            // Don't fail the task completion if workflow handling fails
          }
        }
      }

      // CRITICAL: Build equipment_list with ALL assets from task_data, not just those with temperatures
      // This ensures compliance reporting shows all assets checked, even if no temp was recorded
      const equipmentList: any[] = []
      
      // Get all assets from task_data (these are the assets chosen when task was created)
      // First check formData (user's current selections)
      // Note: repeatableField is already declared above
      let equipmentFromForm = []
      
      if (repeatableField && formData[repeatableField.field_name]) {
        equipmentFromForm = formData[repeatableField.field_name] || []
      }
      
      // Also check task_data as fallback (assets chosen when task was created)
      if (equipmentFromForm.length === 0 && task.task_data && task.template?.repeatable_field_name) {
        const taskDataField = task.task_data[task.template.repeatable_field_name]
        if (Array.isArray(taskDataField)) {
          equipmentFromForm = taskDataField
        }
      }
      
      // Also check selectedAssets state (loaded from task_data when modal opened)
      if (equipmentFromForm.length === 0 && selectedAssets.length > 0) {
        // Convert selectedAssets to equipment format
        equipmentFromForm = selectedAssets.map(asset => ({
          value: asset.id,
          asset_id: asset.id,
          id: asset.id,
          label: asset.name,
          name: asset.name,
          asset_name: asset.name
        }))
      }
      
      // Final fallback: check task_data.selectedAssets
      if (equipmentFromForm.length === 0 && task.task_data?.selectedAssets && Array.isArray(task.task_data.selectedAssets)) {
        // Fetch asset names for these IDs
        const assetIds = task.task_data.selectedAssets.filter(Boolean)
        if (assetIds.length > 0) {
          equipmentFromForm = assetIds.map((assetId: string) => ({
            value: assetId,
            asset_id: assetId,
            id: assetId,
            label: assetsMap.get(assetId)?.name || 'Unknown Equipment',
            name: assetsMap.get(assetId)?.name || 'Unknown Equipment',
            asset_name: assetsMap.get(assetId)?.name || 'Unknown Equipment'
          }))
        }
      }
      
      // Create a map of recorded temperatures by asset_id for quick lookup
      const tempMap = new Map(temperatureRecords.map(tr => [tr.asset_id, tr]))
      
      // Include ALL assets from formData or task_data
      if (equipmentFromForm.length > 0) {
        equipmentFromForm.forEach((equipment: any) => {
          const assetId = equipment.value || equipment.asset_id || equipment.id || equipment
          if (!assetId) return
          
          const recordedTemp = tempMap.get(assetId)
          const assetName = assetsMap.get(assetId)?.name || equipment.label || equipment.name || equipment.asset_name || 'Unknown Equipment'
          
          equipmentList.push({
            asset_id: assetId,
            asset_name: assetName,
            temperature: recordedTemp ? recordedTemp.reading : null,
            reading: recordedTemp ? recordedTemp.reading : null,
            status: recordedTemp ? recordedTemp.status : 'ok',
            recorded_at: recordedTemp ? recordedTemp.recorded_at : completedAt
          })
        })
      } else if (task.template?.asset_id) {
        // Handle single asset task (template's linked asset)
        const assetId = task.template.asset_id
        const recordedTemp = temperatureRecords.find(tr => tr.asset_id === assetId)
        const assetName = assetsMap.get(assetId)?.name || 'Unknown Equipment'
        
        equipmentList.push({
          asset_id: assetId,
          asset_name: assetName,
          temperature: recordedTemp ? recordedTemp.reading : (formData.temperature !== undefined && formData.temperature !== null && formData.temperature !== '' ? parseFloat(formData.temperature) : null),
          reading: recordedTemp ? recordedTemp.reading : (formData.temperature !== undefined && formData.temperature !== null && formData.temperature !== '' ? parseFloat(formData.temperature) : null),
          status: recordedTemp ? recordedTemp.status : 'ok',
          recorded_at: recordedTemp ? recordedTemp.recorded_at : completedAt
        })
      } else if (temperatureRecords.length > 0) {
        // Fallback: if no task_data assets, use temperature records
        temperatureRecords.forEach(tr => {
          equipmentList.push({
            asset_id: tr.asset_id,
            asset_name: assetsMap.get(tr.asset_id)?.name || 'Unknown Equipment',
            temperature: tr.reading,
            reading: tr.reading,
            status: tr.status,
            recorded_at: tr.recorded_at
          })
        })
      }
      
      // Debug logging - CRITICAL: Verify what data is being saved
      console.log('📋 COMPLETION DATA BEING SAVED:', {
        equipmentCount: equipmentList.length,
        equipmentList,
        temperatureRecordsCount: temperatureRecords.length,
        temperatureRecords,
        formDataKeys: Object.keys(formData),
        formData: formData,
        taskData: task.task_data,
        repeatableFieldName: repeatableField?.field_name,
        selectedAssets: selectedAssets.length,
        checklistItems: formData.checklist_items?.length || 0,
        yesNoItems: formData.yes_no_checklist_items?.length || 0,
        notes: formData.notes,
        photos: photoUrls.length
      })

      // Extract monitoring and callout details for compliance reporting
      const monitoringDetails: any = {}
      if (formData.monitoring_task_id) {
        monitoringDetails.monitoring_task_id = formData.monitoring_task_id
        const monitoringAssetId = formData.temp_action_asset_id || formData.monitoring_asset_id
        monitoringDetails.asset_id = monitoringAssetId
        monitoringDetails.asset_name = formData.monitoring_asset_name || (monitoringAssetId ? assetsMap.get(monitoringAssetId)?.name : null)
        
        // Get monitoring duration - check various possible field names
        const duration = formData.monitoring_duration || formData.monitoring_duration_minutes || formData[`monitoring_duration_${monitoringAssetId}`]
        monitoringDetails.duration = duration || 60 // Default 1 hour if not specified
      }
      
      // For callouts, if we don't have the ID in formData, try to fetch the most recent one for the asset
      const calloutDetails: any = {}
      let calloutIdToSave = formData.callout_id
      
      if (formData.temp_action === 'callout' && formData.temp_action_asset_id && !calloutIdToSave) {
        // Try to fetch the most recent callout for this asset (created within last 5 minutes)
        try {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const { data: recentCallouts } = await supabase
            .from('callouts')
            .select('id, contractor_id, callout_type, status, contractors(name)')
            .eq('asset_id', formData.temp_action_asset_id)
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (recentCallouts) {
            calloutIdToSave = recentCallouts.id
            const contractor = Array.isArray(recentCallouts.contractors) ? recentCallouts.contractors[0] : recentCallouts.contractors
            calloutDetails.contractor_name = contractor?.name || null
            calloutDetails.contractor_type = recentCallouts.callout_type || 'reactive'
            calloutDetails.status = recentCallouts.status || 'open'
          }
        } catch (error) {
          console.error('Error fetching recent callout:', error)
        }
      }
      
      if (calloutIdToSave || formData.temp_action === 'callout') {
        calloutDetails.callout_id = calloutIdToSave || formData.callout_id
        calloutDetails.contractor_name = calloutDetails.contractor_name || formData.reactive_contractor_name || formData.contractor_name || calloutAsset?.reactive_contractor_name || calloutAsset?.ppm_contractor_name || calloutAsset?.warranty_contractor_name
        calloutDetails.contractor_type = calloutDetails.contractor_type || 'reactive' // Default for temperature issues
        calloutDetails.asset_id = formData.temp_action_asset_id
      }
      
      // Build completion_data with ALL recorded information
      // CRITICAL: This is what gets saved and displayed on the completed tasks page
      const completionData: Record<string, any> = {
        // Spread formData first to capture all form fields
        ...formData,
        
        // Photos/Evidence
        photos: photoUrls,
        evidence_attachments: photoUrls,
        
        // Equipment/Assets - CRITICAL for compliance reporting
        equipment_list: equipmentList, // All assets checked, with or without temps
        temperature_records_count: temperatureRecords.length,
        
        // Checklist items (if any)
        checklist_items: formData.checklist_items || [],
        yes_no_checklist_items: formData.yes_no_checklist_items || [],
        
        // Pass/Fail result
        pass_fail_result: formData.pass_fail_result || null,
        
        // Notes
        notes: formData.notes || null,
        
        // Monitoring task details (if created)
        monitoring_task_id: formData.monitoring_task_id || null,
        monitoring_task_details: Object.keys(monitoringDetails).length > 0 ? monitoringDetails : null,
        
        // Callout details (if created)
        callout_id: calloutIdToSave || formData.callout_id || null,
        callout_details: Object.keys(calloutDetails).length > 0 ? calloutDetails : null,
        contractor_name: calloutDetails.contractor_name || formData.reactive_contractor_name || formData.contractor_name || null,
        
        // Follow-up action details (structured for easy access)
        follow_up_details: {
          monitoring_task: Object.keys(monitoringDetails).length > 0 ? monitoringDetails : null,
          callout: Object.keys(calloutDetails).length > 0 ? calloutDetails : null
        },
        
        // Temperature action (monitor/callout/pass)
        temp_action: formData.temp_action || null,
        temp_action_asset_id: formData.temp_action_asset_id || null,
        
        // CRITICAL: Store which daypart instance was completed
        // This allows us to track completion per instance for tasks with multiple dayparts
        completed_daypart: task.daypart || null,
        completed_due_time: task.due_time || null
      }

      // Create completion record with proper schema structure
      const completionRecord = {
        task_id: task.id,
        template_id: task.template_id,
        company_id: companyId!,
        site_id: siteId!,
        completed_by: profile.id,
        completed_at: completedAt,
        completion_data: completionData, // Use structured completion_data
        evidence_attachments: photoUrls,
        flagged: completedOutsideWindow || formData.temp_action === 'monitor' || formData.temp_action === 'callout',
        flag_reason: completedOutsideWindow 
          ? (completedLate ? 'completed_late' : 'completed_early') 
          : (formData.temp_action || null)
      }

      // CRITICAL: Log what we're about to save
      console.log('💾 SAVING COMPLETION RECORD:', {
        task_id: completionRecord.task_id,
        equipment_list_count: completionData.equipment_list?.length || 0,
        equipment_list: completionData.equipment_list,
        temperature_records_count: completionData.temperature_records_count,
        checklist_items_count: completionData.checklist_items?.length || 0,
        yes_no_items_count: completionData.yes_no_checklist_items?.length || 0,
        monitoring_task_id: completionData.monitoring_task_id,
        callout_id: completionData.callout_id,
        has_notes: !!completionData.notes,
        photos_count: completionData.photos?.length || 0,
        completion_data_keys: Object.keys(completionData)
      })

      // Use server-side API route to bypass RLS (uses service role key)
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionRecord),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorDetails = {
          message: errorData.error || 'Unknown error',
          code: response.status.toString(),
          details: null,
          hint: null,
          attemptedData: completionRecord
        }
        console.error('❌ Task completion record error:', JSON.stringify(errorDetails, null, 2))
        throw new Error(`Failed to create completion record: ${errorData.error || 'Unknown error'}`)
      }

      const { data: insertedRecord, taskUpdated, taskUpdateSuccess, warning } = await response.json()

      // Verify the record was saved correctly
      if (insertedRecord) {
        console.log('✅ COMPLETION RECORD SAVED SUCCESSFULLY:', {
          record_id: insertedRecord.id,
          task_id: insertedRecord.task_id,
          taskUpdated,
          taskUpdateSuccess,
          warning,
          equipment_list_in_db: insertedRecord.completion_data?.equipment_list?.length || 0,
          completion_data_keys: Object.keys(insertedRecord.completion_data || {})
        })
      } else {
        console.warn('⚠️ Completion record inserted but no data returned')
      }

      // Task status update is now handled by the API route
      if (taskUpdated && taskUpdateSuccess) {
        console.log('✅ Task status updated to completed by API route')
      } else if (warning) {
        console.warn('⚠️', warning)
        // If task update failed, try to update it directly as fallback
        // This ensures the task gets marked as completed even if API route update failed
        try {
          const { error: directUpdateError } = await supabase
            .from('checklist_tasks')
            .update({
              status: 'completed',
              completed_at: completedAt,
              completed_by: profile.id
            })
            .eq('id', task.id)
          
          if (directUpdateError) {
            console.error('❌ Direct task update also failed:', directUpdateError)
          } else {
            console.log('✅ Task status updated directly (fallback)')
          }
        } catch (fallbackError) {
          console.error('❌ Fallback task update error:', fallbackError)
        }
      } else {
        console.log('ℹ️ Task has multiple dayparts - not marking as completed yet (waiting for all instances)')
      }

      // Create alert if task was completed late (after window end)
      if (completedLate) {
        try {
          const { error: alertError } = await supabase
            .from('notifications')
            .insert({
              company_id: companyId,
              type: 'task',
              title: 'Task Completed Late',
              message: `Task "${task.template.name}" was completed late (after ${task.due_time || 'due time'} + 1 hour). Completed at ${completedAtDate.toLocaleString()}.`,
              severity: 'warning',
              recipient_role: 'manager',
              status: 'active',
            })
          
          if (alertError) {
            console.error('Error creating late completion alert:', alertError)
          } else {
            console.log('✅ Late completion alert created')
          }
        } catch (alertErr) {
          console.error('Error creating late completion alert:', alertErr)
        }
      }

      console.log('✅ Task completed successfully')

      // Check if this is a monitoring task and temperature is still out of range
      // If so, automatically trigger callout creation
      // Note: isMonitoringTask is already defined above in the completion logic
      const isMonitoringTaskCheck = task.flag_reason === 'monitoring' || task.flagged === true
      
      if (isMonitoringTaskCheck) {
        // Check if temperature is still out of range
        let shouldCreateCallout = false
        let tempValue: number | null = null
        let assetId: string | null = null
        
        // Get temperature value and asset ID from form data
        if (task.template?.repeatable_field_name) {
          // Check repeatable equipment temperature fields
          const equipmentList = formData[task.template.repeatable_field_name] || []
          for (const equipment of equipmentList) {
            const tempField = `temp_${equipment.value || equipment}`
            const temp = formData[tempField]
            if (temp !== undefined && temp !== null && temp !== '') {
              tempValue = parseFloat(temp)
              assetId = equipment.value || equipment
              if (checkTemperatureRange(tempValue, assetId)) {
                shouldCreateCallout = true
                break
              }
            }
          }
        } else if (task.template?.asset_id && formData.temperature !== undefined && formData.temperature !== null && formData.temperature !== '') {
          // Check single temperature field
          tempValue = parseFloat(formData.temperature)
          assetId = task.template.asset_id
          if (checkTemperatureRange(tempValue, assetId)) {
            shouldCreateCallout = true
          }
        }
        
        // If still out of range, automatically create callout
        if (shouldCreateCallout && assetId && tempValue !== null) {
          console.log('🔄 Monitoring task completed but temperature still out of range - creating callout')
          
          try {
            // Load asset details for callout
            const { data: assetData, error: assetError } = await supabase
              .from('assets')
              .select(`
                id,
                name,
                serial_number,
                warranty_end,
                install_date,
                category,
                site_id,
                company_id,
                ppm_contractor_id,
                reactive_contractor_id,
                warranty_contractor_id,
                sites(name)
              `)
              .eq('id', assetId)
              .single()

            if (!assetError && assetData) {
              const site = Array.isArray(assetData.sites) ? assetData.sites[0] : assetData.sites
              const siteName = site?.name || null

              // Load contractor names
              let ppmContractorName = null
              let reactiveContractorName = null
              let warrantyContractorName = null

              if (assetData.ppm_contractor_id) {
                const { data: contractor } = await supabase
                  .from('contractors')
                  .select('name')
                  .eq('id', assetData.ppm_contractor_id)
                  .single()
                ppmContractorName = contractor?.name || null
              }

              if (assetData.reactive_contractor_id) {
                const { data: contractor } = await supabase
                  .from('contractors')
                  .select('name')
                  .eq('id', assetData.reactive_contractor_id)
                  .single()
                reactiveContractorName = contractor?.name || null
              }

              if (assetData.warranty_contractor_id) {
                const { data: contractor } = await supabase
                  .from('contractors')
                  .select('name')
                  .eq('id', assetData.warranty_contractor_id)
                  .single()
                warrantyContractorName = contractor?.name || null
              }

              const assetForCallout = {
                id: assetData.id,
                name: assetData.name,
                serial_number: assetData.serial_number || null,
                warranty_end: assetData.warranty_end || null,
                install_date: assetData.install_date || null,
                category: assetData.category || null,
                site_name: siteName,
                ppm_contractor_name: ppmContractorName,
                reactive_contractor_name: reactiveContractorName,
                warranty_contractor_name: warrantyContractorName,
              }

              // Automatically create callout via RPC or direct insert
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                try {
                  // Try RPC function first
                  const { data: calloutId, error: rpcError } = await supabase.rpc('create_callout', {
                    p_asset_id: assetId,
                    p_callout_type: 'reactive', // Default to reactive for temperature issues
                    p_priority: 'urgent', // Temperature issues are urgent
                    p_fault_description: `Temperature monitoring task completed but reading still out of range (${tempValue}°C). Requires contractor attention.`,
                    p_notes: `Automatically created after monitoring task completion. Original task: ${task.template?.name || 'Unknown'}`,
                    p_attachments: photoUrls.length > 0 ? photoUrls : [],
                    p_troubleshooting_complete: false
                  })

                  if (!rpcError && calloutId) {
                    console.log('✅ Callout automatically created:', calloutId)
                    showToast({
                      title: 'Callout Created',
                      description: `Temperature still out of range (${tempValue}°C). Callout automatically created for ${assetForCallout.name}.`,
                      type: 'success'
                    })
                  } else {
                    throw rpcError || new Error('RPC callout creation failed')
                  }
                } catch (rpcError: any) {
                  // Fallback to direct insert
                  console.log('RPC function not available, using direct insert:', rpcError)
                  
                  const contractorId = assetData.reactive_contractor_id

                  const calloutData: any = {
                    company_id: assetData.company_id,
                    asset_id: assetId,
                    site_id: assetData.site_id,
                    contractor_id: contractorId,
                    created_by: profile.id,
                    callout_type: 'reactive',
                    priority: 'urgent',
                    status: 'open',
                    fault_description: `Temperature monitoring task completed but reading still out of range (${tempValue}°C). Requires contractor attention.`,
                    notes: `Automatically created after monitoring task completion. Original task: ${task.template?.name || 'Unknown'}`,
                    attachments: photoUrls.length > 0 ? photoUrls : [],
                    troubleshooting_complete: false
                  }

                  const { error: insertError } = await supabase
                    .from('callouts')
                    .insert(calloutData)
                    .select()
                    .single()

                  if (insertError) {
                    console.error('Failed to create callout:', insertError)
                    showToast({
                      title: 'Warning',
                      description: 'Task completed but failed to auto-create callout. Please create manually.',
                      type: 'warning'
                    })
                  } else {
                    console.log('✅ Callout automatically created via direct insert')
                    showToast({
                      title: 'Callout Created',
                      description: `Temperature still out of range (${tempValue}°C). Callout automatically created for ${assetForCallout.name}.`,
                      type: 'success'
                    })
                  }
                }
              }
            }
          } catch (calloutError) {
            console.error('Error creating automatic callout:', calloutError)
            // Don't fail the task completion, just log and show warning
            showToast({
              title: 'Warning',
              description: 'Task completed but failed to auto-create callout. Please create manually.',
              type: 'warning'
            })
          }
        }
      }

      onComplete()
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      }
      console.error('❌ Task completion error:', JSON.stringify(errorInfo, null, 2))
      setError(error instanceof Error ? error.message : 'Failed to complete task')
    } finally {
      setLoading(false)
    }
  }

  // Refresh tasks list when monitoring task is created
  const handleMonitorTaskCreated = () => {
    // The parent component will refresh via onComplete
    // But we can also close the modal if needed
    if (onComplete) {
      // Small delay to ensure task is saved before refresh
      setTimeout(() => {
        // Don't close the modal, just refresh
      }, 500)
    }
  }

  if (!isOpen) return null


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-neutral-900 border border-white/[0.06] rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/[0.06] p-4 sm:p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-magenta-400">{(task.custom_name || task.template?.name || 'Unknown Task')?.replace(' (Draft)', '')}</h2>
            {task.template?.compliance_standard && (
              <p className="text-sm text-neutral-400 mt-1">
                {task.template.compliance_standard}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-all p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {templateNote && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-100/90 p-4 flex gap-3">
              <Lightbulb className="w-5 h-5 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-200 uppercase tracking-wide">Template note</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-amber-100/90">{templateNote}</p>
              </div>
            </div>
          )}
          
          {/* Instructions - Expandable */}
          {(task.custom_instructions || task.template?.instructions) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <button
                onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">
                  Instructions
                </h3>
                {instructionsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                )}
              </button>
              {instructionsExpanded && (
                <div className="px-4 pb-4">
                  <div className="text-white/80 text-sm whitespace-pre-line">
                    {task.custom_instructions || task.template?.instructions || ''}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Show warning only if instructions are truly missing or very minimal (just equipment names) */}
          {(() => {
            const instructions = task.custom_instructions || task.template?.instructions || '';
            const hasInstructions = instructions && instructions.trim().length > 0;
            
            // Only show warning if instructions are completely missing
            // Don't show warning if custom_instructions exist (user has already provided them)
            if (!hasInstructions) {
              return true; // Show warning - no instructions at all
            }
            
            // If custom_instructions exist, don't show warning (user knows what they're doing)
            if (task.custom_instructions && task.custom_instructions.trim().length > 0) {
              return false; // Don't show warning
            }
            
            // For template instructions, check if they're minimal (just equipment names)
            const isMinimalInstructions = instructions.length < 50 || // Very short (likely just equipment names)
              (!instructions.toLowerCase().includes('how') && 
               !instructions.toLowerCase().includes('step') &&
               !instructions.toLowerCase().includes('record') &&
               !instructions.toLowerCase().includes('insert') &&
               !instructions.toLowerCase().includes('take') &&
               !instructions.toLowerCase().includes('check') &&
               !instructions.toLowerCase().includes('locate') &&
               !instructions.toLowerCase().includes('verify') &&
               !instructions.toLowerCase().includes('ensure') &&
               !instructions.toLowerCase().includes('confirm'));
            
            return isMinimalInstructions;
          })() && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                ⚠️ Instructions are missing or need to be updated. Please edit the template in "Templates" page to update the instructions with proper "How to" guidance.
              </p>
            </div>
          )}

          {/* Task Resources Section - Assets, Libraries, SOPs, RAs */}
          {(Object.keys(selectedLibraries).length > 0 || sopUploads.length > 0 || raUploads.length > 0 || documentUploads.length > 0 || 
            // Show assets section only if temperature fields are NOT shown (i.e., no temp evidence or no selected assets for temp)
            (selectedAssets.length > 0 && !task.template?.evidence_types?.includes('temperature'))) && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Task Resources</h3>
              
              {/* Selected Assets with Yes/No Questions - Only show if not showing temperature fields */}
              {selectedAssets.length > 0 && !task.template?.evidence_types?.includes('temperature') && (
                <div className="space-y-4">
                  {selectedAssets.map((asset) => {
                    // Find yes/no questions related to this asset (if any)
                    const yesNoItems = formData.yes_no_checklist_items || [];
                    const assetRelatedQuestions = yesNoItems.filter((item: any) => 
                      item.text && (
                        item.text.toLowerCase().includes(asset.name.toLowerCase()) ||
                        asset.name.toLowerCase().includes(item.text.toLowerCase().split(' ')[0])
                      )
                    );
                    
                    return (
                      <div key={asset.id} className="bg-white/[0.05] border border-white/[0.08] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-pink-400" />
                          <h4 className="text-white font-semibold">{asset.name}</h4>
                          {asset.category && (
                            <span className="text-gray-400 text-xs">({asset.category})</span>
                          )}
                          {asset.site_name && (
                            <span className="text-pink-400 text-xs">• {asset.site_name}</span>
                          )}
                        </div>
                        
                        {/* Yes/No Questions for this Asset */}
                        {assetRelatedQuestions.length > 0 && (
                          <div className="mt-3 ml-7 space-y-2">
                            {assetRelatedQuestions.map((item: any, idx: number) => {
                              const itemText = item.text || `Question ${idx + 1}`;
                              const currentAnswer = item.answer || null;
                              const questionKey = `yesno_${asset.id}_${idx}`;
                              const showActions = showActionOptions.get(questionKey) || false;
                              const selectedAction = selectedActions.get(questionKey);
                              
                              return (
                                <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                                  <p className="text-white/90 text-sm mb-2">{itemText}</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [...yesNoItems];
                                        const itemIndex = yesNoItems.findIndex((i: any) => i.text === item.text);
                                        if (itemIndex !== -1) {
                                          updatedItems[itemIndex] = { ...updatedItems[itemIndex], answer: 'yes' };
                                          handleFieldChange('yes_no_checklist_items', updatedItems);
                                          // Clear action options if switching back to Yes
                                          setShowActionOptions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(questionKey);
                                            return newMap;
                                          });
                                          setSelectedActions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(questionKey);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded border transition-colors text-sm ${
                                        currentAnswer === 'yes'
                                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [...yesNoItems];
                                        const itemIndex = yesNoItems.findIndex((i: any) => i.text === item.text);
                                        if (itemIndex !== -1) {
                                          updatedItems[itemIndex] = { ...updatedItems[itemIndex], answer: 'no' };
                                          handleFieldChange('yes_no_checklist_items', updatedItems);
                                          // Show action options when "No" is selected
                                          setShowActionOptions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(questionKey, true);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded border transition-colors text-sm ${
                                        currentAnswer === 'no'
                                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <AlertCircle className="w-3 h-3 inline mr-1" />
                                      No
                                    </button>
                                  </div>
                                  
                                  {/* Action Options for No Answer */}
                                  {currentAnswer === 'no' && showActions && (
                                    <div className="mt-3 space-y-2 pt-3 border-t border-white/[0.06]">
                                      <p className="text-xs text-orange-400 mb-2">⚠️ Action Required</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedActions(prev => new Map(prev).set(questionKey, 'monitor'));
                                          setOutOfRangeAssetId(asset.id);
                                          handleMonitorAction(asset.id);
                                        }}
                                        className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                          selectedAction === 'monitor'
                                            ? 'bg-yellow-500/20 border-yellow-500/50'
                                            : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                        }`}
                                      >
                                        <Monitor className="h-4 w-4 text-yellow-400" />
                                        <div>
                                          <p className="text-xs font-medium text-white">Monitor</p>
                                          <p className="text-xs text-white/60">Schedule a follow-up check</p>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedActions(prev => new Map(prev).set(questionKey, 'callout'));
                                          handleCalloutAction(asset.id);
                                        }}
                                        className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                          selectedAction === 'callout'
                                            ? 'bg-red-500/20 border-red-500/50'
                                            : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                        }`}
                                      >
                                        <PhoneCall className="h-4 w-4 text-red-400" />
                                        <div>
                                          <p className="text-xs font-medium text-white">Place Callout</p>
                                          <p className="text-xs text-white/60">Contact contractor immediately</p>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Libraries Section */}
              {Object.keys(selectedLibraries).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">Libraries</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedLibraries).map(([libraryType, items]) => {
                      if (!items || items.length === 0) return null;
                      
                      const libraryLabels: Record<string, string> = {
                        ppe: 'PPE Library',
                        chemicals: 'Chemicals Library',
                        equipment: 'Equipment Library',
                        ingredients: 'Ingredients Library',
                        drinks: 'Drinks Library',
                        disposables: 'Disposables Library'
                      };
                      
                      return (
                        <div key={libraryType} className="bg-white/[0.05] border border-white/[0.08] rounded-lg p-3">
                          <h5 className="text-white/90 font-medium text-sm mb-2">{libraryLabels[libraryType] || libraryType}</h5>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {items.map((item: any) => (
                              <div key={item.id} className="text-white/70 text-xs">
                                • {item.item_name || item.product_name || item.equipment_name || item.ingredient_name || item.drink_name || 'Unknown Item'}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* SOPs, RAs, and Documents Section */}
              {(sopUploads.length > 0 || raUploads.length > 0 || documentUploads.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-white font-medium text-sm">Documents</h4>
                  <div className="flex flex-wrap gap-2">
                    {/* SOP Buttons */}
                    {sopUploads.map((sop, idx) => (
                      <a
                        key={idx}
                        href={sop.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">{sop.fileName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                    
                    {/* RA Buttons */}
                    {raUploads.map((ra, idx) => (
                      <a
                        key={idx}
                        href={ra.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">{ra.fileName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                    
                    {/* Document Buttons */}
                    {documentUploads.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="max-w-[200px] truncate">{doc.fileName}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Fields */}
          <div className="space-y-6">
            {/* Temperature Fields for Selected Assets - Show directly from task_data */}
            {task.template?.evidence_types?.includes('temperature') && selectedAssets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Temperature Readings
                </label>
                <div className="space-y-3">
                  {selectedAssets.map((asset: any) => {
                    // Get saved temperature from task_data if available
                    const savedTemp = task.task_data?.temperatures?.find((t: any) => t.assetId === asset.id)
                    const nickname = savedTemp?.nickname || ''
                    const displayLabel = nickname 
                      ? `${asset.name} | ${nickname}`
                      : asset.name
                    const assetId = asset.id
                    const range = assetTempRanges.get(assetId)
                    // CRITICAL: For monitoring tasks, don't use savedTemp - field should be empty
                    // For regular tasks, use formData first, then savedTemp as fallback
                    const isMonitoringTask = task.flag_reason === 'monitoring' || task.flagged === true
                    const tempValue = isMonitoringTask 
                      ? (formData[`temp_${assetId}`] || '') // Only use formData, ignore savedTemp
                      : (formData[`temp_${assetId}`] || savedTemp?.temp || '') // Regular task: formData or savedTemp
                    
                    // Find yes/no questions related to this asset (if any)
                    const yesNoItems = formData.yes_no_checklist_items || [];
                    const assetRelatedQuestions = yesNoItems.filter((item: any) => 
                      item.text && (
                        item.text.toLowerCase().includes(asset.name.toLowerCase()) ||
                        asset.name.toLowerCase().includes(item.text.toLowerCase().split(' ')[0])
                      )
                    );
                    
                    return (
                      <div key={assetId} className="space-y-3 border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          {/* Asset Name | Nickname */}
                          <div className="flex-1 min-w-0">
                            <p className="text-magenta-400 font-medium">{displayLabel}</p>
                            {asset.site_name && (
                              <p className="text-xs text-white/60 mt-0.5">{asset.site_name}</p>
                            )}
                          </div>
                          {/* Temperature Input */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              placeholder="°C"
                              min="-50"
                              max="100"
                              value={tempValue}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                // CRITICAL: Handle negative temperatures correctly
                                // parseFloat handles negative numbers: parseFloat('-18') = -18
                                // Also handle cases like '-18.5', '-18.0', etc.
                                let temp = NaN
                                if (inputValue !== '' && inputValue !== '-') {
                                  // Allow '-' to be typed (user might be typing negative number)
                                  // Only parse if we have more than just '-'
                                  temp = parseFloat(inputValue)
                                }
                                const isValidTemp = !isNaN(temp) && inputValue !== '' && inputValue !== '-'
                                
                                // Only update form data if we have a valid number
                                if (isValidTemp) {
                                  handleFieldChange(`temp_${assetId}`, temp)
                                } else if (inputValue === '') {
                                  // Clear the field if empty
                                  handleFieldChange(`temp_${assetId}`, '')
                                }
                                
                                // Check if temp is out of range using asset's working temperature ranges from assets table
                                // CRITICAL: Use the centralized checkTemperatureRange function for consistency
                                // This ensures negative temperatures are handled correctly (e.g., freezers at -18°C)
                                let isOutOfRange = false
                                
                                // Only check range if we have a valid temperature and a range to check against
                                if (isValidTemp && range && (range.min !== null || range.max !== null)) {
                                  // Use the centralized function to check range (handles negative temps correctly)
                                  // This function properly handles:
                                  // - Freezer: -22°C with range -20 to -18 → OUT (below min: -22 < -20)
                                  // - Freezer: -19°C with range -20 to -18 → OUT (above max: -19 > -18)
                                  // - Freezer: -19.5°C with range -20 to -18 → IN (between -20 and -18)
                                  isOutOfRange = checkTemperatureRange(temp, assetId)
                                } else if (isValidTemp && !range) {
                                  // SAFEGUARD: Log if range is missing - this indicates a problem
                                  console.warn(`⚠️ [TEMPERATURE WARNING] No temperature range loaded for asset ${assetId} - cannot check if out of range`)
                                  console.warn(`   This means warnings will NOT appear for this asset!`)
                                  console.warn(`   Check: Is loadAssetTempRanges() being called? Are asset IDs correct?`)
                                  // Try to reload ranges as a fallback
                                  setTimeout(() => {
                                    console.log(`🔄 [TEMPERATURE WARNING] Attempting to reload ranges for asset ${assetId}...`)
                                    loadAssetTempRanges()
                                  }, 500)
                                } else if (isValidTemp) {
                                  console.log(`ℹ️ [TEMPERATURE WARNING] Temperature ${temp}°C entered but no range defined (min: ${range?.min ?? 'null'}, max: ${range?.max ?? 'null'})`)
                                }
                                
                                // Update out-of-range assets set independently
                                // Support both positive and negative temperatures (e.g., freezers at -18°C)
                                if (isOutOfRange && isValidTemp) {
                                  console.log(`🚨 [TEMPERATURE WARNING] Adding asset ${assetId} to out-of-range set - warning should appear`)
                                  // Add to out-of-range set - this triggers the warning display
                                  setOutOfRangeAssets(prev => {
                                    const newSet = new Set(prev)
                                    newSet.add(assetId)
                                    console.log(`📋 [TEMPERATURE WARNING] Out-of-range assets set updated:`, Array.from(newSet))
                                    return newSet
                                  })
                                  // Don't auto-show action options - let user choose when they're ready
                                  // User will see the warning and can click the buttons to choose Monitor or Callout
                                } else if (isValidTemp) {
                                  // Temperature is valid and in range - remove from out-of-range set
                                  console.log(`✅ [TEMPERATURE WARNING] Temperature ${temp}°C is in range - removing from out-of-range set`)
                                  setOutOfRangeAssets(prev => {
                                    const newSet = new Set(prev)
                                    newSet.delete(assetId)
                                    return newSet
                                  })
                                  setShowActionOptions(prev => {
                                    const newMap = new Map(prev)
                                    newMap.set(assetId, false)
                                    return newMap
                                  })
                                }
                                // If isValidTemp is false (user is still typing), keep current state
                                // This prevents warning from flashing on/off while typing
                              }}
                              className={`w-24 px-3 py-2 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors text-sm text-center ${
                                outOfRangeAssets.has(assetId)
                                  ? 'border-red-500 focus:border-red-500'
                                  : 'border-white/[0.06] focus:border-pink-500'
                              }`}
                            />
                            <span className="text-sm text-white/60">°C</span>
                          </div>
                        </div>
                        
                        {/* Temperature Range Info */}
                        {range && (range.min !== null || range.max !== null) && (
                          <p className="text-xs text-white/50 ml-2">
                            Range: {range.min !== null ? `${range.min}°C` : 'No min'} - {range.max !== null ? `${range.max}°C` : 'No max'}
                          </p>
                        )}
                        
                        {/* Temperature Warning - Show for out of range asset */}
                        {(() => {
                          // Debug: Log when warning should show
                          if (outOfRangeAssets.has(assetId)) {
                            console.log(`🚨 Rendering warning for asset ${assetId} - temp: ${tempValue}°C, range:`, range)
                          }
                          return null
                        })()}
                        {outOfRangeAssets.has(assetId) && (
                          <div className="ml-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-400 mb-1">
                                  Temperature Out of Range
                                </p>
                                <p className="text-xs text-red-300/80 mb-3">
                                  {tempValue}°C is outside the safe operating range for {displayLabel}.
                                  {range && (
                                    <span> Expected range: {range.min !== null ? `${range.min}°C` : 'No min'} - {range.max !== null ? `${range.max}°C` : 'No max'}</span>
                                  )}
                                </p>
                                
                                {/* Action Options - Direct action buttons (no intermediate step) */}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedActions(prev => new Map(prev).set(assetId, 'monitor'))
                                      setOutOfRangeAssetId(assetId)
                                      handleMonitorAction(assetId)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-xs"
                                  >
                                    <Monitor className="w-3 h-3" />
                                    Schedule Monitor
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedActions(prev => new Map(prev).set(assetId, 'callout'))
                                      handleCalloutAction(assetId)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    Place Callout
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Yes/No Questions for this Asset - Show below temperature */}
                        {assetRelatedQuestions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                            <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Questions</p>
                            {assetRelatedQuestions.map((item: any, idx: number) => {
                              const itemText = item.text || `Question ${idx + 1}`;
                              const currentAnswer = item.answer || null;
                              const questionKey = `yesno_${assetId}_${idx}`;
                              const showActions = showActionOptions.get(questionKey) || false;
                              const selectedAction = selectedActions.get(questionKey);
                              
                              return (
                                <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                                  <p className="text-white/90 text-sm mb-2">{itemText}</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [...yesNoItems];
                                        const itemIndex = yesNoItems.findIndex((i: any) => i.text === item.text);
                                        if (itemIndex !== -1) {
                                          updatedItems[itemIndex] = { ...updatedItems[itemIndex], answer: 'yes' };
                                          handleFieldChange('yes_no_checklist_items', updatedItems);
                                          setShowActionOptions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(questionKey);
                                            return newMap;
                                          });
                                          setSelectedActions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.delete(questionKey);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded border transition-colors text-sm ${
                                        currentAnswer === 'yes'
                                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedItems = [...yesNoItems];
                                        const itemIndex = yesNoItems.findIndex((i: any) => i.text === item.text);
                                        if (itemIndex !== -1) {
                                          updatedItems[itemIndex] = { ...updatedItems[itemIndex], answer: 'no' };
                                          handleFieldChange('yes_no_checklist_items', updatedItems);
                                          setShowActionOptions(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(questionKey, true);
                                            return newMap;
                                          });
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded border transition-colors text-sm ${
                                        currentAnswer === 'no'
                                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      <AlertCircle className="w-3 h-3 inline mr-1" />
                                      No
                                    </button>
                                  </div>
                                  
                                  {/* Action Options for No Answer */}
                                  {currentAnswer === 'no' && showActions && (
                                    <div className="mt-3 space-y-2 pt-3 border-t border-white/[0.06]">
                                      <p className="text-xs text-orange-400 mb-2">⚠️ Action Required</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedActions(prev => new Map(prev).set(questionKey, 'monitor'));
                                          setOutOfRangeAssetId(assetId);
                                          handleMonitorAction(assetId);
                                        }}
                                        className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                          selectedAction === 'monitor'
                                            ? 'bg-yellow-500/20 border-yellow-500/50'
                                            : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                        }`}
                                      >
                                        <Monitor className="h-4 w-4 text-yellow-400" />
                                        <div>
                                          <p className="text-xs font-medium text-white">Monitor</p>
                                          <p className="text-xs text-white/60">Schedule a follow-up check</p>
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedActions(prev => new Map(prev).set(questionKey, 'callout'));
                                          handleCalloutAction(assetId);
                                        }}
                                        className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                          selectedAction === 'callout'
                                            ? 'bg-red-500/20 border-red-500/50'
                                            : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                        }`}
                                      >
                                        <PhoneCall className="h-4 w-4 text-red-400" />
                                        <div>
                                          <p className="text-xs font-medium text-white">Place Callout</p>
                                          <p className="text-xs text-white/60">Contact contractor immediately</p>
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Temperature Field - Show when template has temperature evidence */}
            {(task.template?.evidence_types?.includes('temperature') ||
              task.template?.slug === 'hot_holding_temperature_verification' ||
              task.template?.slug === 'hot-holding-temps' ||
              (task.template?.name && task.template.name.toLowerCase().includes('hot holding'))
            ) && (() => {
              // CRITICAL: Use templateFields if loaded, otherwise fallback to task.template.template_fields
              // This ensures temperature fields show even if templateFields state hasn't updated yet
              // IMPORTANT: Check if task.template.template_fields is an array before using it
              const preLoadedFields = task.template?.template_fields
              const fieldsToUse = templateFields.length > 0 
                ? templateFields 
                : (Array.isArray(preLoadedFields) && preLoadedFields.length > 0
                    ? preLoadedFields
                    : [])
              
              // Check for equipment select fields (legacy and new field names)
              // Note: asset_name can be both a select field AND a repeatable field name
              // We need to check if it's used as a select dropdown (has options) vs asset selection
              const equipmentField = fieldsToUse.find((f: any) => 
                f.field_type === 'select' && 
                (f.field_name === 'fridge_name' || 
                 f.field_name === 'hot_holding_unit' || 
                 f.field_name === 'equipment_name' ||
                 f.field_name === 'asset_name')
              )
              const temperatureField = fieldsToUse.find((f: any) => 
                f.field_type === 'number' && 
                (f.field_name === 'temperature' || f.field_name?.toLowerCase().includes('temp'))
              )
              const activeTemperatureField = temperatureField ?? {
                field_name: 'temperature',
                label: 'Temperature Reading',
                field_label: 'Temperature Reading',
                required: false,
                min_value: null,
                max_value: null,
                help_text: null,
                field_type: 'number'
              }
              const isHotHoldingTemplate = task.template?.slug === 'hot_holding_temperature_verification' ||
                task.template?.slug === 'hot-holding-temps' ||
                task.template?.repeatable_field_name === 'equipment_name' ||
                task.template?.repeatable_field_name === 'hot_holding_unit' ||
                (task.template?.name && task.template.name.toLowerCase().includes('hot holding'))
              const equipmentOptions = (equipmentField?.options && Array.isArray(equipmentField.options)) 
                ? equipmentField.options 
                : []
              
              // Debug logging
              console.log('🌡️ Temperature field check:', {
                templateSlug: task.template?.slug,
                hasTemperatureEvidence: task.template?.evidence_types?.includes('temperature'),
                templateFieldsCount: templateFields.length,
                fieldsToUseCount: fieldsToUse.length,
                usingFallbackFields: templateFields.length === 0 && fieldsToUse.length > 0,
                temperatureFieldFound: !!temperatureField,
                temperatureFieldName: temperatureField?.field_name,
                equipmentFieldFound: !!equipmentField,
                equipmentFieldName: equipmentField?.field_name,
                equipmentOptionsCount: equipmentOptions.length,
                selectedAssetsCount: selectedAssets.length,
                repeatableFieldName: task.template?.repeatable_field_name,
                hasCurrentTemplate: !!task.template
              })
              
              // CRITICAL: Only hide temperature section if:
              // 1. There are selectedAssets (from asset picker) 
              // 2. AND template uses repeatable_field_name for asset selection (not equipment select dropdown)
              // 3. AND the equipment field doesn't have options (meaning it's used for asset selection, not dropdown)
              // Equipment select fields with options should always show temperature inputs
              // ALWAYS show temperature field if it exists, even if using asset selection
              const repeatableFieldName = task.template?.repeatable_field_name
              const usesAssetSelection = repeatableFieldName && selectedAssets.length > 0
              const equipmentFieldHasOptions = equipmentField && equipmentOptions && equipmentOptions.length > 0
              const isRepeatableAssetSelection = repeatableFieldName && 
                                                 equipmentField?.field_name === repeatableFieldName && 
                                                 !equipmentFieldHasOptions
              
              // Only hide if using asset selection AND no temperature field exists AND no selectedAssets
              // If temperature field exists OR we have selectedAssets, always show temperature inputs
              // CRITICAL: Even if template_fields are missing, show temperature inputs if we have selectedAssets
              if (usesAssetSelection && isRepeatableAssetSelection && !equipmentFieldHasOptions && !temperatureField && selectedAssets.length === 0) {
                console.log('⚠️ [TEMPERATURE RENDERING] Hiding temperature section: using asset selection, no temperature field, no selectedAssets')
                return null
              }
              
              // CRITICAL: If we have selectedAssets but no template_fields, still show temperature inputs
              // This handles cases where template_fields aren't loaded yet or don't exist
              if (selectedAssets.length > 0 && fieldsToUse.length === 0) {
                console.log('📋 [TEMPERATURE RENDERING] Showing temperature inputs based on selectedAssets (template_fields not loaded yet)')
                // Continue to render temperature inputs below
              }
              
              // Render equipment list with temperature inputs (for equipment select fields with options)
              if (equipmentOptions && equipmentOptions.length > 0) {
                return (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Temperature Readings
                    </label>
                    <div className="space-y-3">
                      {equipmentOptions.map((equipment: any, idx: number) => {
                        // Handle both legacy format (with assetName) and new format (with label/value)
                        const equipmentValue = equipment.value || equipment
                        const equipmentLabel = equipment.label || equipment.assetName || equipment
                        const assetName = equipment.assetName || assetsMap.get(equipmentValue)?.name || equipmentLabel || 'Equipment'
                        const nickname = equipment.nickname || (typeof equipmentLabel === 'string' && equipmentLabel.includes('(') 
                          ? equipmentLabel.match(/\(([^)]+)\)/)?.[1] 
                          : '') || ''
                        const displayLabel = nickname 
                          ? `${assetName} | ${nickname}`
                          : (typeof equipmentLabel === 'string' ? equipmentLabel : assetName)
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-magenta-400 font-medium">{displayLabel}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                placeholder="°C"
                                value={formData[`temp_${equipmentValue}`] || ''}
                                onChange={(e) => {
                                  const tempRaw = e.target.value
                                  const temp = tempRaw === '' || tempRaw === null || tempRaw === undefined 
                                    ? null 
                                    : parseFloat(tempRaw)
                                  
                                  // Only update if valid number or clearing the field
                                  if (temp === null || (!isNaN(temp) && isFinite(temp))) {
                                    handleFieldChange(`temp_${equipmentValue}`, temp)
                                  }
                                  
                                  // Only check range if we have a valid temperature
                                  if (temp === null || isNaN(temp) || !isFinite(temp)) {
                                    // Clear out of range state if field is empty
                                    setOutOfRangeAssets(prev => {
                                      const newSet = new Set(prev)
                                      newSet.delete(equipmentValue)
                                      return newSet
                                    })
                                    return
                                  }
                                  
                                  const assetId = equipmentValue
                                  
                                  // Check if this is a hot holding task - check this FIRST
                                  const isHotHolding = equipmentField?.field_name === 'hot_holding_unit' || 
                                    equipmentField?.field_name === 'equipment_name' ||
                                    task.template?.repeatable_field_name === 'equipment_name' ||
                                    task.template?.repeatable_field_name === 'hot_holding_unit' ||
                                    task.template?.slug === 'hot_holding_temperature_verification' ||
                                    task.template?.slug === 'hot-holding-temps' ||
                                    (task.template?.name && task.template.name.toLowerCase().includes('hot holding')) ||
                                    isHotHoldingTemplate
                                  
                                  console.log('🌡️ [MULTI-EQUIP HOT HOLDING CHECK]', {
                                    equipmentFieldName: equipmentField?.field_name,
                                    slug: task.template?.slug,
                                    name: task.template?.name,
                                    isHotHolding,
                                    temp,
                                    assetId
                                  })
                                  
                                  let isOutOfRange = false
                                  
                                  if (isHotHolding) {
                                    // For hot holding, always check 63°C threshold
                                    if (temp < 63) {
                                      console.log('✅ [MULTI-EQUIP HOT HOLDING] Setting out of range for temp:', temp)
                                      isOutOfRange = true
                                    }
                                  } else {
                                    // For non-hot-holding tasks, check asset range first
                                    isOutOfRange = checkTemperatureRange(temp, assetId)
                                    
                                    // If not out of range from asset, check template field ranges
                                    if (!isOutOfRange) {
                                      const tempField = temperatureField ?? fieldsToUse.find((f: any) => 
                                        f.field_type === 'number' && f.field_name === 'temperature'
                                      ) ?? activeTemperatureField
                                      
                                      if (tempField) {
                                        const minValue = tempField?.min_value ?? null
                                        const maxValue = tempField?.max_value ?? null
                                        
                                        if (minValue !== null && temp < minValue) {
                                          isOutOfRange = true
                                        }
                                        if (maxValue !== null && temp > maxValue) {
                                          isOutOfRange = true
                                        }
                                      }
                                    }
                                  }
                                  
                                  if (isOutOfRange) {
                                    setOutOfRangeAssets(prev => {
                                      const newSet = new Set(prev)
                                      newSet.add(assetId)
                                      return newSet
                                    })
                                    setShowActionOptions(prev => {
                                      const newMap = new Map(prev)
                                      newMap.set(assetId, false)
                                      return newMap
                                    })
                                    setSelectedActions(prev => {
                                      const newMap = new Map(prev)
                                      newMap.delete(assetId)
                                      return newMap
                                    })
                                  } else {
                                    setOutOfRangeAssets(prev => {
                                      const newSet = new Set(prev)
                                      newSet.delete(assetId)
                                      return newSet
                                    })
                                  }
                                }}
                                className={`w-24 px-3 py-2 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors text-sm text-center ${
                                  outOfRangeAssets.has(equipmentValue)
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-white/[0.06] focus:border-pink-500'
                                }`}
                              />
                              <span className="text-sm text-white/60">°C</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Temperature Warnings - Show for each out of range asset independently */}
                    {outOfRangeAssets && Array.from(outOfRangeAssets).map((assetId) => {
                      const equipmentOption = (equipmentOptions && Array.isArray(equipmentOptions)) 
                        ? equipmentOptions.find((opt: any) => {
                            const optValue = opt.value || opt
                            return optValue === assetId || optValue?.toString() === assetId?.toString()
                          })
                        : null
                      const optValue = equipmentOption?.value || equipmentOption
                      const optLabel = equipmentOption?.label || equipmentOption?.assetName || equipmentOption
                      const assetName = equipmentOption?.assetName || assetsMap.get(assetId)?.name || (typeof optLabel === 'string' ? optLabel : 'Equipment')
                      const nickname = equipmentOption?.nickname || ''
                      const displayName = nickname ? `${assetName} (${nickname})` : (typeof optLabel === 'string' ? optLabel : assetName)
                      const range = assetTempRanges.get(assetId)
                      const tempValueRaw = formData[`temp_${assetId}`] || formData.temperature
                      // Convert to number and validate
                      const tempValue = tempValueRaw !== null && tempValueRaw !== undefined && tempValueRaw !== '' 
                        ? parseFloat(String(tempValueRaw)) 
                        : null
                      const showActionOptionsForAsset = showActionOptions.get(assetId) || false
                      const selectedActionForAsset = selectedActions.get(assetId)
                      
                      // If no temperature value, don't show warning
                      if (tempValue === null || isNaN(tempValue)) {
                        return null
                      }
                      
                      let isFailed = false
                      let isWarning = false
                      let minThreshold = null
                      let maxThreshold = null
                      
                      if (range && (range.min !== null || range.max !== null)) {
                        minThreshold = range.min
                        maxThreshold = range.max
                        isFailed = (
                          (range.min !== null && tempValue < range.min - 2) ||
                          (range.max !== null && tempValue > range.max + 2)
                        )
                        // Warning if within tolerance but still out of range
                        if (!isFailed) {
                          isWarning = (
                            (range.min !== null && tempValue < range.min) ||
                            (range.max !== null && tempValue > range.max)
                          )
                        }
                      } else {
                        // Check hot holding threshold
                        if (equipmentField?.field_name === 'hot_holding_unit' || 
                            equipmentField?.field_name === 'equipment_name' ||
                            task.template?.slug === 'hot_holding_temperature_verification') {
                          minThreshold = 63
                          maxThreshold = null
                          isFailed = tempValue < 60 // Critical below 60°C
                          // Warning if between 60-63°C (below minimum but not critical)
                          isWarning = tempValue >= 60 && tempValue < 63
                        } else if (activeTemperatureField) {
                          minThreshold = activeTemperatureField.min_value
                          maxThreshold = activeTemperatureField.max_value
                          if (minThreshold !== null && tempValue < minThreshold - 2) {
                            isFailed = true
                          } else if (minThreshold !== null && tempValue < minThreshold) {
                            isWarning = true
                          }
                          if (maxThreshold !== null && tempValue > maxThreshold + 2) {
                            isFailed = true
                          } else if (maxThreshold !== null && tempValue > maxThreshold) {
                            isWarning = true
                          }
                        }
                      }
                      
                      // Show warning if failed OR warning (out of range)
                      const showWarning = isFailed || isWarning
                      
                      if (!showWarning) {
                        return null
                      }
                      
                      return (
                        <div key={assetId} className={`mt-3 p-4 border rounded-lg ${
                          isFailed 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : 'bg-yellow-500/10 border-yellow-500/30'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                              isFailed ? 'text-red-400' : 'text-yellow-400'
                            }`} />
                            <div className="flex-1">
                              <h4 className={`text-sm font-semibold mb-1 ${
                                isFailed ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {isFailed ? 'Temperature Critical' : 'Temperature Out of Range'} - {displayName}
                              </h4>
                              <p className={`text-sm mb-2 ${
                                isFailed ? 'text-red-300/80' : 'text-yellow-300/80'
                              }`}>
                                Reading: <strong>{tempValue !== null && !isNaN(tempValue) ? tempValue : 'N/A'}°C</strong> 
                                {(minThreshold !== null || maxThreshold !== null) && (
                                  <span className="ml-2">
                                    {(equipmentField?.field_name === 'hot_holding_unit' || 
                                      equipmentField?.field_name === 'equipment_name' ||
                                      task.template?.slug === 'hot_holding_temperature_verification')
                                      ? `(Minimum required: 63°C${isWarning && !isFailed ? ' - Warning: Below minimum' : ''})`
                                      : `(Normal range: ${minThreshold !== null ? minThreshold : 'N/A'}°C to ${maxThreshold !== null ? maxThreshold : 'N/A'}°C)`
                                    }
                                  </span>
                                )}
                              </p>
                              {!showActionOptionsForAsset && (
                                <button
                                  onClick={() => {
                                    setShowActionOptions(prev => {
                                      const newMap = new Map(prev)
                                      newMap.set(assetId, true)
                                      return newMap
                                    })
                                  }}
                                  className={`text-sm underline ${
                                    isFailed ? 'text-red-400 hover:text-red-300' : 'text-yellow-400 hover:text-yellow-300'
                                  }`}
                                >
                                  Choose action →
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Options */}
                          {showActionOptionsForAsset && (
                            <div className="mt-4 space-y-3">
                              <button
                                onClick={() => handleMonitorAction(assetId)}
                                className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                                  selectedActionForAsset === 'monitor'
                                    ? 'bg-yellow-500/20 border-yellow-500/50'
                                    : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                }`}
                              >
                                <Monitor className="h-5 w-5 text-yellow-400" />
                                <div>
                                  <p className="text-sm font-medium text-white">Monitor</p>
                                  <p className="text-xs text-white/60">Schedule a follow-up check</p>
                                </div>
                              </button>
                              <button
                                onClick={() => handleCalloutAction(assetId)}
                                className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                                  selectedActionForAsset === 'callout'
                                    ? 'bg-red-500/20 border-red-500/50'
                                    : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                }`}
                              >
                                <PhoneCall className="h-5 w-5 text-red-400" />
                                <div>
                                  <p className="text-sm font-medium text-white">Place Callout</p>
                                  <p className="text-xs text-white/60">Contact contractor immediately</p>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }
              
              // Fallback to single temperature field if no equipment options OR if temperature field exists
              // Always show temperature field if template has temperature evidence and a temperature field exists
              if (!temperatureField) {
                return null // No temperature field found, don't render anything
              }
              
              // Use template field label and help text if available
              const tempFieldLabel = temperatureField.label || temperatureField.field_label || 'Temperature Reading'
              const tempFieldHelp = temperatureField.help_text
              const tempFieldName = temperatureField.field_name || 'temperature'
              
              return (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {tempFieldLabel}
                    {temperatureField?.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {tempFieldHelp && (
                    <p className="text-xs text-white/60 mb-2">{tempFieldHelp}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-neutral-400" />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter temperature"
                      value={formData[tempFieldName] || formData.temperature || ''}
                      onChange={(e) => {
                        const tempRaw = e.target.value
                        const temp = tempRaw === '' || tempRaw === null || tempRaw === undefined 
                          ? null 
                          : parseFloat(tempRaw)
                        
                        // Only update if valid number or clearing the field
                        if (temp === null || (!isNaN(temp) && isFinite(temp))) {
                          handleFieldChange(tempFieldName, temp)
                          // Also update 'temperature' for backward compatibility
                          if (tempFieldName !== 'temperature') {
                            handleFieldChange('temperature', temp)
                          }
                        }
                        
                        // Only check range if we have a valid temperature
                        if (temp === null || isNaN(temp) || !isFinite(temp)) {
                          // Clear warning state if field is empty
                          setShowWarning(false)
                          setOutOfRangeAssetId(null)
                          return
                        }
                        
                        // Check hot holding threshold FIRST (before asset_id check)
                        // This ensures hot holding warnings take precedence
                        const isHotHolding = isHotHoldingTemplate
                        
                        console.log('🌡️ [HOT HOLDING CHECK]', {
                          slug: task.template?.slug,
                          name: task.template?.name,
                          isHotHolding,
                          temp,
                          showWarning: temp < 63
                        })
                        
                        if (isHotHolding) {
                          if (temp < 63) {
                            console.log('✅ [HOT HOLDING] Setting warning for temp:', temp)
                            setShowWarning(true)
                            setOutOfRangeAssetId(null) // No specific asset for hot holding
                            setShowActionOptionsSingle(false)
                            setSelectedAction(null)
                          } else {
                            console.log('✅ [HOT HOLDING] Temp in range:', temp)
                            setShowWarning(false)
                            setOutOfRangeAssetId(null)
                          }
                        } else {
                          // Check against template's linked asset if available (non-hot-holding tasks)
                          if (task.template?.asset_id) {
                            const isOutOfRange = checkTemperatureRange(temp, task.template.asset_id)
                            if (isOutOfRange) {
                              setShowWarning(true)
                              setOutOfRangeAssetId(task.template.asset_id)
                              setShowActionOptionsSingle(false)
                              setSelectedAction(null)
                            } else {
                              setShowWarning(false)
                              setOutOfRangeAssetId(null)
                            }
                          }
                        }
                      }}
                      className={`flex-1 px-4 py-3 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                        showWarning
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/[0.06] focus:border-pink-500'
                      }`}
                      required={temperatureField?.required}
                    />
                    <span className="text-sm text-white/60">°C</span>
                  </div>
                  
                  {/* Temperature Warning for single field */}
                  {(() => {
                    // Check if we should show warning - check both state and current value
                    const tempValueRaw = formData[tempFieldName] || formData.temperature
                    const tempValue = tempValueRaw !== null && tempValueRaw !== undefined && tempValueRaw !== '' 
                      ? parseFloat(String(tempValueRaw)) 
                      : null
                    const isHotHolding = isHotHoldingTemplate
                    
                    console.log('🔍 [WARNING CHECK]', {
                      tempFieldName,
                      tempValueRaw,
                      tempValue,
                      isHotHolding,
                      showWarning,
                      templateSlug: task.template?.slug,
                      templateName: task.template?.name,
                      repeatableFieldName: task.template?.repeatable_field_name,
                      formData: { [tempFieldName]: formData[tempFieldName], temperature: formData.temperature }
                    })
                    
                    // Show warning if: state says so OR it's hot holding and temp < 63
                    const shouldShowWarning = showWarning || (isHotHolding && tempValue !== null && !isNaN(tempValue) && tempValue < 63)
                    
                    if (!shouldShowWarning) {
                      return null
                    }
                    
                    // If no valid temperature, don't show warning
                    if (tempValue === null || isNaN(tempValue)) {
                      return null
                    }
                    
                    const isCritical = selectedAction === 'callout' || 
                      (isHotHolding && tempValue < 60) ||
                      (outOfRangeAssetId && assetTempRanges.get(outOfRangeAssetId) && (
                        (assetTempRanges.get(outOfRangeAssetId)!.min !== null && tempValue < assetTempRanges.get(outOfRangeAssetId)!.min! - 2) ||
                        (assetTempRanges.get(outOfRangeAssetId)!.max !== null && tempValue > assetTempRanges.get(outOfRangeAssetId)!.max! + 2)
                      ))
                    const isWarningLevel = isHotHolding && tempValue >= 60 && tempValue < 63
                    
                    return (
                      <div className={`mt-3 p-4 border rounded-lg ${
                        isCritical
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                            isCritical
                              ? 'text-red-400' 
                              : 'text-yellow-400'
                          }`} />
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold mb-1 ${
                              isCritical
                                ? 'text-red-400' 
                                : 'text-yellow-400'
                            }`}>
                              {isCritical ? 'Temperature Critical' : 'Temperature Out of Range'}
                            </h4>
                            <p className={`text-sm mb-2 ${
                              isCritical
                                ? 'text-red-300/80' 
                                : 'text-yellow-300/80'
                            }`}>
                              Reading: <strong>{tempValue !== null && !isNaN(tempValue) ? tempValue : 'N/A'}°C</strong>
                              {isHotHolding ? (
                                <span className="ml-2">
                                  (Minimum required: 63°C{isWarningLevel ? ' - Warning: Below minimum' : ''})
                                </span>
                              ) : assetTempRanges.get(outOfRangeAssetId) ? (
                                <span className="ml-2">
                                  (Normal range: {assetTempRanges.get(outOfRangeAssetId)!.min !== null ? assetTempRanges.get(outOfRangeAssetId)!.min : 'N/A'}°C to {assetTempRanges.get(outOfRangeAssetId)!.max !== null ? assetTempRanges.get(outOfRangeAssetId)!.max : 'N/A'}°C)
                                </span>
                              ) : null}
                            </p>
                            {!showActionOptionsSingle && (
                              <button
                                onClick={() => setShowActionOptionsSingle(true)}
                                className={`text-sm underline ${
                                  isCritical ? 'text-red-400 hover:text-red-300' : 'text-yellow-400 hover:text-yellow-300'
                                }`}
                              >
                                Choose action →
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {showActionOptionsSingle && (
                        <div className="mt-4 space-y-3">
                          <button
                            onClick={() => {
                              setSelectedAction('monitor')
                              const assetId = isHotHolding ? task.template?.asset_id : outOfRangeAssetId
                              if (assetId) {
                                setOutOfRangeAssetId(assetId)
                                handleMonitorAction(assetId)
                              } else {
                                handleMonitorAction()
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                              selectedAction === 'monitor'
                                ? 'bg-yellow-500/20 border-yellow-500/50'
                                : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                            }`}
                          >
                            <Monitor className="h-5 w-5 text-yellow-400" />
                            <div>
                              <p className="text-sm font-medium text-white">Monitor</p>
                              <p className="text-xs text-white/60">Schedule a follow-up check</p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAction('callout')
                              const assetId = isHotHolding ? task.template?.asset_id : outOfRangeAssetId
                              if (assetId) {
                                handleCalloutAction(assetId)
                              } else {
                                showToast({
                                  title: 'Error',
                                  description: 'No asset available for callout. Please ensure the task has an associated asset.',
                                  type: 'error'
                                })
                              }
                            }}
                            className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                              selectedAction === 'callout'
                                ? 'bg-red-500/20 border-red-500/50'
                                : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                            }`}
                          >
                            <PhoneCall className="h-5 w-5 text-red-400" />
                            <div>
                              <p className="text-sm font-medium text-white">Place Callout</p>
                              <p className="text-xs text-white/60">Contact contractor immediately</p>
                            </div>
                          </button>
                        </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })()}

            {/* General Template Fields - Render all fields that aren't handled by specific evidence types */}
            {templateFields
              .filter((field: any) => {
                // Exclude fields already handled by specific sections
                const excludedFieldNames = [
                  'fire_alarm_call_point', // Handled by fire alarm section
                  'fire_alarm_test_result', // Handled by fire alarm section
                  'emergency_lights_test_result', // Handled by emergency lighting section
                  'notes', // Handled by notes section below
                  'text_note', // Also exclude text_note fields (they're notes)
                  'additional_notes', // Also exclude additional_notes
                  'temperature', // Handled by temperature sections
                  'pass_fail_result', // Handled by pass_fail section if no template field
                  'initials', // Removed - user login is used instead (task is timestamped and completed_by is set)
                  'checked_by_initials', // Removed - user login is used instead
                  'checked_by', // Removed - user login is used instead
                ]
                
                // Also exclude fields that look like notes fields (by label)
                const isNotesField = (field.field_type === 'text' || field.field_type === 'textarea' || field.field_type === 'text_note') &&
                  (field.field_name?.toLowerCase().includes('note') || 
                   field.label?.toLowerCase().includes('note') ||
                   field.label?.toLowerCase().includes('comment'))
                
                // Exclude equipment select fields (fridge_name, hot_holding_unit, equipment_name, asset_name) - handled by temperature sections
                // BUT: Only exclude asset_name if it has options (dropdown), not if it's used for repeatable asset selection
                const isEquipmentField = field.field_type === 'select' && 
                  (field.field_name === 'fridge_name' || 
                   field.field_name === 'hot_holding_unit' || 
                   field.field_name === 'equipment_name' ||
                   (field.field_name === 'asset_name' && field.options && Array.isArray(field.options) && field.options.length > 0))
                
                // Exclude repeatable field if it's being used for equipment list
                const isRepeatableField = task.template?.repeatable_field_name === field.field_name
                
                // Exclude if it's a pass_fail field that's already handled by evidence type section
                const isPassFailField = field.field_type === 'pass_fail' && 
                  task.template?.evidence_types?.includes('pass_fail')
                
                return !excludedFieldNames.includes(field.field_name) && 
                       !isEquipmentField && 
                       !isRepeatableField &&
                       !isPassFailField &&
                       !isNotesField
              })
              .map((field: any) => {
                // Render based on field type
                if (field.field_type === 'text') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-2">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                      )}
                      <input
                        type="text"
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label || field.field_name}`}
                        required={field.required}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  )
                }
                
                if (field.field_type === 'textarea') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-2">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                      )}
                      <textarea
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label || field.field_name}`}
                        required={field.required}
                        rows={field.rows || 4}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                      />
                    </div>
                  )
                }
                
                if (field.field_type === 'number') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-2">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                      )}
                      <input
                        type="number"
                        step={field.step || 'any'}
                        min={field.min_value !== null ? field.min_value : undefined}
                        max={field.max_value !== null ? field.max_value : undefined}
                        value={formData[field.field_name] || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseFloat(e.target.value)
                          handleFieldChange(field.field_name, value)
                        }}
                        placeholder={field.placeholder || `Enter ${field.label || field.field_name}`}
                        required={field.required}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  )
                }
                
                if (field.field_type === 'select') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-2">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                      )}
                      <select
                        value={(() => {
                          const fieldValue = formData[field.field_name];
                          if (Array.isArray(fieldValue) || (typeof fieldValue === 'object' && fieldValue !== null)) {
                            return '';
                          }
                          return fieldValue || '';
                        })()}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 bg-neutral-800 border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-pink-500 transition-colors"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" className="bg-neutral-800 text-white">Select {field.label || field.field_name}...</option>
                        {(field.options || []).map((option: any) => {
                          const optionValue = typeof option === 'string' ? option : option.value
                          const optionLabel = typeof option === 'string' ? option : (option.label || optionValue)
                          return (
                            <option key={optionValue} value={optionValue} className="bg-neutral-800 text-white">
                              {optionLabel}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )
                }
                
                if (field.field_type === 'checkbox') {
                  return (
                    <div key={field.id || field.field_name} className="flex items-start gap-3">
                      <CheckboxCustom
                        checked={formData[field.field_name] || false}
                        onChange={(checked) => handleFieldChange(field.field_name, checked)}
                        size={20}
                      />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-white mb-1">
                          {field.label || field.field_label || field.field_name}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.help_text && (
                          <p className="text-xs text-white/60">{field.help_text}</p>
                        )}
                      </div>
                    </div>
                  )
                }
                
                if (field.field_type === 'pass_fail') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-3">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-3">{field.help_text}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(field.field_name, 'pass')}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                            formData[field.field_name] === 'pass'
                              ? 'bg-green-500/20 border-green-500/50 text-green-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                          }`}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Pass</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFieldChange(field.field_name, 'fail')}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                            formData[field.field_name] === 'fail'
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                          }`}
                        >
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Fail</span>
                        </button>
                      </div>
                    </div>
                  )
                }
                
                if (field.field_type === 'date') {
                  return (
                    <div key={field.id || field.field_name}>
                      <label className="block text-sm font-medium text-white mb-2">
                        {field.label || field.field_label || field.field_name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {field.help_text && (
                        <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                      )}
                      <input
                        type="date"
                        value={(() => {
                          const value = formData[field.field_name];
                          if (!value) return '';
                          // If it's already a date string in YYYY-MM-DD format, return it
                          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                            return value;
                          }
                          // If it's a Date object or ISO string, convert to YYYY-MM-DD
                          try {
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                              return date.toISOString().split('T')[0];
                            }
                          } catch (e) {
                            // Invalid date, return empty
                          }
                          return '';
                        })()}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        required={field.required}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  )
                }
                
                // Default: render as text input for unknown field types
                return (
                  <div key={field.id || field.field_name}>
                    <label className="block text-sm font-medium text-white mb-2">
                      {field.label || field.field_label || field.field_name}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.help_text && (
                      <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                    )}
                    <input
                      type="text"
                      value={formData[field.field_name] || ''}
                      onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                      placeholder={field.placeholder || `Enter ${field.label || field.field_name}`}
                      required={field.required}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                )
              })}

            {/* Notes Section - Only show if template doesn't already have a notes field */}
            {(() => {
              // Check if template already has a notes field (check multiple possible field names)
              const hasNotesField = templateFields.some((f: any) => {
                // Check by field name first (most reliable)
                if (f.field_name === 'notes' || 
                    f.field_name === 'text_note' || 
                    f.field_name === 'additional_notes') {
                  return true
                }
                // Check by field type and label
                const isNotesType = f.field_type === 'text' || f.field_type === 'textarea' || f.field_type === 'text_note'
                if (isNotesType) {
                  const label = (f.label || f.field_label || '').toLowerCase()
                  if (label.includes('note') || label.includes('comment')) {
                    return true
                  }
                }
                return false
              });
              
              console.log('📝 [NOTES CHECK]', {
                hasNotesField,
                templateFields: templateFields.map((f: any) => ({ 
                  name: f.field_name, 
                  type: f.field_type, 
                  label: f.label || f.field_label 
                }))
              })
              
              // Only show additional notes section if template doesn't have a notes field
              if (hasNotesField) {
                return null; // Template already has notes field, don't show duplicate
              }
              
              return (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="Add any additional notes or observations..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                  />
                </div>
              );
            })()}

            {/* Fire Alarm Specific Fields - Only show if this is a fire alarm task */}
            {templateFields.some((f: any) => f.field_name === 'fire_alarm_call_point') && (
              <div className="space-y-4">
                {templateFields
                  .filter((field: any) => field.field_name === 'fire_alarm_call_point')
                  .map((field: any) => {
                    return (
                      <div key={field.id || field.field_name}>
                        <label className="block text-sm font-medium text-white mb-2">
                          {field.label || field.field_label || field.field_name}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.help_text && (
                          <p className="text-xs text-white/60 mb-2">{field.help_text}</p>
                        )}
                        <select
                          value={(() => {
                            const fieldValue = formData[field.field_name];
                            if (Array.isArray(fieldValue) || (typeof fieldValue === 'object' && fieldValue !== null)) {
                              return '';
                            }
                            return fieldValue || '';
                          })()}
                          onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                          required={field.required}
                          className="w-full px-4 py-3 bg-neutral-800 border border-white/[0.06] rounded-lg text-white focus:outline-none focus:border-pink-500 transition-colors"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-neutral-800 text-white">Select {field.label || field.field_name}...</option>
                          {(field.options || []).map((option: any) => {
                            const optionValue = typeof option === 'string' ? option : option.value
                            const optionLabel = typeof option === 'string' ? option : (option.label || optionValue)
                            return (
                              <option key={optionValue} value={optionValue} className="bg-neutral-800 text-white">
                                {optionLabel}
                              </option>
                            )
                          })}
                        </select>
                        
                        {/* Fire Alarm Checklist - Show below call point dropdown */}
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-semibold text-white mb-3">Fire Alarm Test Steps</h4>
                          {[
                            'Warn everyone. Let staff know there\'ll be a test so no one panics or calls the fire brigade because you pressed a button.',
                            'Pick a different call point each week. Don\'t always use the same one or you\'ll end up with one shiny working alarm and ten dead zones.',
                            'Activate the call point. Use the test key or break-glass cover—short, sharp press to trigger the alarm.',
                            'Confirm sounders work. Walk the site (or send someone you don\'t like) to check the alarm can be heard everywhere, including toilets and storerooms.',
                            'Silence and reset. Use the fire panel to silence, then reset the system according to manufacturer instructions.',
                            'Record the test. Note the date, time, call point number/location, and result in the fire logbook.'
                          ].map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <CheckboxCustom
                                checked={fireAlarmChecklist[idx]}
                                onChange={(checked) => {
                                  const newChecklist = [...fireAlarmChecklist]
                                  newChecklist[idx] = checked
                                  setFireAlarmChecklist(newChecklist)
                                }}
                                size={20}
                              />
                              <p className="text-sm text-white/80 flex-1 pt-0.5">
                                <span className="font-medium text-white">Step {idx + 1}:</span> {step}
                              </p>
                            </div>
                          ))}
                          
                          {/* Fire Alarm Pass/Fail Buttons */}
                          <div className="mt-4 pt-4 border-t border-white/[0.06]">
                            <label className="block text-sm font-semibold text-white mb-3">
                              Test Result
                              <span className="text-red-400 ml-1">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => handleFieldChange('fire_alarm_test_result', 'pass')}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                                  formData.fire_alarm_test_result === 'pass'
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                }`}
                              >
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Pass</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleFieldChange('fire_alarm_test_result', 'fail')
                                  handleFireAlarmFailure()
                                }}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                                  formData.fire_alarm_test_result === 'fail'
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                    : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                }`}
                              >
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">Fail</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Emergency Lighting Checklist - Show if this is a combined fire alarm + emergency lighting task */}
            {task.template?.name?.toLowerCase().includes('fire alarm') && 
             task.template?.name?.toLowerCase().includes('emergency light') && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white mb-3">Emergency Lighting Test Steps</h4>
                {[
                  'Know what you\'re looking for. These are the little lights above exits or along escape routes that keep people from tripping over each other when the power goes out.',
                  'Switch off normal lighting. Use the test key or control switch to simulate a mains power failure.',
                  'Check all fittings. Ensure every emergency light comes on and is bright enough to actually see by.',
                  'Note any failures. Dim, flickering, or dead units go straight to maintenance—don\'t wait for a real emergency to find out.',
                  'Restore power. End the test and confirm the lights return to charge mode (the little green LEDs should glow again).',
                  'Record it. Log date, duration, areas checked, and results in the emergency lighting logbook.'
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckboxCustom
                      checked={emergencyLightingChecklist[idx]}
                      onChange={(checked) => {
                        const newChecklist = [...emergencyLightingChecklist]
                        newChecklist[idx] = checked
                        setEmergencyLightingChecklist(newChecklist)
                      }}
                      size={20}
                    />
                    <p className="text-sm text-white/80 flex-1 pt-0.5">
                      <span className="font-medium text-white">Step {idx + 1}:</span> {step}
                    </p>
                  </div>
                ))}
                
                {/* Emergency Lighting Pass/Fail Buttons */}
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Emergency Lighting Test Result
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleFieldChange('emergency_lights_test_result', 'pass')}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.emergency_lights_test_result === 'pass'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Pass</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange('emergency_lights_test_result', 'fail')
                        handleEmergencyLightsFailure()
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        formData.emergency_lights_test_result === 'fail'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                      }`}
                    >
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Fail</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Checklist Items (for text_note evidence type) */}
            {task.template?.evidence_types?.includes('text_note') && (
              (() => {
                // Check if there's a repeatable field for checklist items
                const repeatableField = templateFields.find(f => f.field_name === task.template?.repeatable_field_name);
                const checklistItems = repeatableField ? (formData[repeatableField.field_name] || []) : [];
                
                // Get checklist items from task data
                const checklistFieldName = 'checklist_items';
                const itemsFromTaskData = formData[checklistFieldName] || [];
                
                // Priority 1: Use repeatable field items if available
                if (repeatableField && checklistItems.length > 0) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Checklist Items
                      </label>
                      <div className="space-y-3">
                        {checklistItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                            <CheckboxCustom
                              checked={item.completed || false}
                              onChange={(checked) => {
                                const updatedItems = [...checklistItems];
                                updatedItems[idx] = { ...updatedItems[idx], completed: checked };
                                handleFieldChange(repeatableField.field_name, updatedItems);
                              }}
                              size={20}
                            />
                            <div className="flex-1">
                              <p className="text-white/90 text-sm">{item.label || item.text || `Item ${idx + 1}`}</p>
                              {item.description && (
                                <p className="text-white/60 text-xs mt-1">{item.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                // Priority 2: Use items from task_data (saved when task was created)
                if (itemsFromTaskData.length > 0) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Checklist Items
                      </label>
                      <div className="space-y-3">
                        {itemsFromTaskData.map((item: any, idx: number) => {
                          const itemText = typeof item === 'string' ? item : (item.label || item.text || `Item ${idx + 1}`);
                          const isCompleted = typeof item === 'object' ? (item.completed || false) : false;
                          
                          return (
                            <div key={idx} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                              <CheckboxCustom
                                checked={isCompleted}
                                onChange={(checked) => {
                                  const updatedItems = [...itemsFromTaskData];
                                  updatedItems[idx] = typeof item === 'string' 
                                    ? { text: item, completed: checked }
                                    : { ...item, completed: checked };
                                  handleFieldChange(checklistFieldName, updatedItems);
                                }}
                                size={20}
                              />
                              <div className="flex-1">
                                <p className="text-white/90 text-sm">{itemText}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Priority 3: Show notes fallback if no checklist items
                const hasNotesField = templateFields.find((f: any) => f.field_type === 'text' && f.field_name === 'notes');
                if (!hasNotesField) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Notes
                      </label>
                      <textarea
                        placeholder="Add any notes or observations..."
                        value={formData.notes || ''}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                      />
                    </div>
                  );
                }
                
                return null;
              })()
            )}

            {/* Yes/No Checklist Items (for yes_no_checklist evidence type) - Show only questions not already grouped under assets */}
            {task.template?.evidence_types?.includes('yes_no_checklist') && (
              (() => {
                const yesNoItems = formData.yes_no_checklist_items || [];
                
                // Filter out questions that are already shown under assets
                const assetRelatedQuestionTexts = new Set<string>();
                selectedAssets.forEach((asset) => {
                  const assetRelatedQuestions = yesNoItems.filter((item: any) => 
                    item.text && (
                      item.text.toLowerCase().includes(asset.name.toLowerCase()) ||
                      asset.name.toLowerCase().includes(item.text.toLowerCase().split(' ')[0])
                    )
                  );
                  assetRelatedQuestions.forEach((q: any) => {
                    if (q.text) assetRelatedQuestionTexts.add(q.text);
                  });
                });
                
                // Show only questions that are NOT related to assets
                const generalQuestions = yesNoItems.filter((item: any) => 
                  !item.text || !assetRelatedQuestionTexts.has(item.text)
                );
                
                if (generalQuestions.length > 0) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Yes/No Checklist Items
                      </label>
                      <div className="space-y-3">
                        {generalQuestions.map((item: any, idx: number) => {
                          const itemText = item.text || `Item ${idx + 1}`;
                          const currentAnswer = item.answer || null;
                          const originalIndex = yesNoItems.findIndex((i: any) => i.text === item.text);
                          const questionKey = `yesno_general_${idx}`;
                          const showActions = showActionOptions.get(questionKey) || false;
                          const selectedAction = selectedActions.get(questionKey);
                          
                          return (
                            <div key={idx} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                              <p className="text-white/90 text-sm mb-3 font-medium">{itemText}</p>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedItems = [...yesNoItems];
                                    if (originalIndex !== -1) {
                                      updatedItems[originalIndex] = { ...updatedItems[originalIndex], answer: 'yes' };
                                      handleFieldChange('yes_no_checklist_items', updatedItems);
                                      // Clear action options if switching back to Yes
                                      setShowActionOptions(prev => {
                                        const newMap = new Map(prev);
                                        newMap.delete(questionKey);
                                        return newMap;
                                      });
                                      setSelectedActions(prev => {
                                        const newMap = new Map(prev);
                                        newMap.delete(questionKey);
                                        return newMap;
                                      });
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg border transition-colors ${
                                    currentAnswer === 'yes'
                                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                      : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedItems = [...yesNoItems];
                                    if (originalIndex !== -1) {
                                      updatedItems[originalIndex] = { ...updatedItems[originalIndex], answer: 'no' };
                                      handleFieldChange('yes_no_checklist_items', updatedItems);
                                      // Show action options when "No" is selected
                                      setShowActionOptions(prev => {
                                        const newMap = new Map(prev);
                                        newMap.set(questionKey, true);
                                        return newMap;
                                      });
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg border transition-colors ${
                                    currentAnswer === 'no'
                                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                      : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <AlertCircle className="w-4 h-4 inline mr-2" />
                                  No
                                </button>
                              </div>
                              
                              {/* Action Options for No Answer */}
                              {currentAnswer === 'no' && showActions && (
                                <div className="mt-4 space-y-3 pt-3 border-t border-white/[0.06]">
                                  <p className="text-xs text-orange-400 mb-2">⚠️ Action Required</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedActions(prev => new Map(prev).set(questionKey, 'monitor'));
                                      // For general questions without an asset, we need to handle differently
                                      // Use the first selected asset if available, otherwise use template asset
                                      const assetId = selectedAssets.length > 0 ? selectedAssets[0].id : task.template?.asset_id;
                                      if (assetId) {
                                        setOutOfRangeAssetId(assetId);
                                        handleMonitorAction(assetId);
                                      } else {
                                        // No asset - show monitor modal anyway (it will handle gracefully)
                                        handleMonitorAction();
                                      }
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                                      selectedAction === 'monitor'
                                        ? 'bg-yellow-500/20 border-yellow-500/50'
                                        : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                                    }`}
                                  >
                                    <Monitor className="h-5 w-5 text-yellow-400" />
                                    <div>
                                      <p className="text-sm font-medium text-white">Monitor</p>
                                      <p className="text-xs text-white/60">Schedule a follow-up check</p>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedActions(prev => new Map(prev).set(questionKey, 'callout'));
                                      // For general questions without an asset, use the first selected asset or template asset
                                      const assetId = selectedAssets.length > 0 ? selectedAssets[0].id : task.template?.asset_id;
                                      if (assetId) {
                                        handleCalloutAction(assetId);
                                      } else {
                                        showToast({
                                          title: 'Error',
                                          description: 'No asset available for callout. Please select an asset in the task.',
                                          type: 'error'
                                        });
                                      }
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                                      selectedAction === 'callout'
                                        ? 'bg-red-500/20 border-red-500/50'
                                        : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                    }`}
                                  >
                                    <PhoneCall className="h-5 w-5 text-red-400" />
                                    <div>
                                      <p className="text-sm font-medium text-white">Place Callout</p>
                                      <p className="text-xs text-white/60">Contact contractor immediately</p>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()
            )}

            {/* Pass/Fail Field (for pass_fail evidence type) */}
            {task.template?.evidence_types?.includes('pass_fail') && !templateFields.find((f: any) => f.field_type === 'pass_fail') && (
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Result
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('pass_fail_result', 'pass')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      formData.pass_fail_result === 'pass'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('pass_fail_result', 'fail')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      formData.pass_fail_result === 'fail'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
                    }`}
                  >
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Fail</span>
                  </button>
                </div>
              </div>
            )}

            {/* Generic Task Navigation Section - Certificate, SOP, Document tasks */}
            {(() => {
              const taskData = task.task_data as any
              if (!taskData?.source_type) return null
              
              let link: string | null = null
              let label: string = ''
              let description: string = ''
              
              switch (taskData.source_type) {
                case 'certificate_expiry':
                  if (taskData.profile_id) {
                    link = `/dashboard/training?profile_id=${taskData.profile_id}&certificate_type=${taskData.certificate_type || ''}`
                    label = 'View Training Details'
                    description = 'Update certificate expiry date and training records'
                  }
                  break
                
                case 'sop_review':
                  if (taskData.sop_id) {
                    link = `/dashboard/sops/list?sop_id=${taskData.sop_id}`
                    label = 'Review SOP'
                    description = 'Review and update the SOP, set new review date'
                  }
                  break
                
                case 'document_expiry':
                  if (taskData.document_id) {
                    link = `/dashboard/documents?document_id=${taskData.document_id}`
                    label = 'Review Document'
                    description = 'Review and update the document, set new expiry date'
                  }
                  break
                
                case 'ppm_overdue':
                  // PPM tasks use source_id (not asset_id) - this is the asset ID
                  if (taskData.source_id || taskData.asset_id) {
                    const assetId = taskData.source_id || taskData.asset_id
                    link = `/dashboard/ppm?asset_id=${assetId}`
                    label = 'View PPM Schedule'
                    description = 'View and manage the PPM schedule for this asset'
                  }
                  break
              }
              
              if (!link) return null
              
              return (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <FileText className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm mb-1">Quick Navigation</h3>
                      <p className="text-white/70 text-xs">
                        {description}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={link}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                  >
                    <ArrowRight className="h-4 w-4" />
                    {label}
                  </Link>
                </div>
              )
            })()}

            {/* Callout Follow-up Task Section */}
            {task.task_data?.source_type === 'callout_followup' && task.task_data?.source_id && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <PhoneCall className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-sm mb-1">Callout Follow-up Required</h3>
                    {calloutLoading ? (
                      <p className="text-white/70 text-xs">Loading callout details...</p>
                    ) : calloutData ? (
                      <div className="space-y-2">
                        <p className="text-white/70 text-xs">
                          <span className="font-medium">Status:</span> {calloutData.status}
                          {calloutData.asset_id && calloutData.assets && (
                            <>
                              <br />
                              <span className="font-medium">Asset:</span> {calloutData.assets.name || 'Unknown'}
                            </>
                          )}
                          {calloutData.fault_description && (
                            <>
                              <br />
                              <span className="font-medium">Issue:</span> {calloutData.fault_description}
                            </>
                          )}
                        </p>
                        {calloutData.status === 'open' && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-white/80 mb-1">
                                Update Notes (Optional)
                              </label>
                              <textarea
                                value={calloutUpdateNotes}
                                onChange={(e) => setCalloutUpdateNotes(e.target.value)}
                                placeholder="Add any updates or notes about this callout..."
                                className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/80 mb-1">
                                Repair Summary (Optional - Required to close callout)
                              </label>
                              <textarea
                                value={calloutRepairSummary}
                                onChange={(e) => setCalloutRepairSummary(e.target.value)}
                                placeholder="Enter repair summary to close this callout. Leave empty to just update notes..."
                                className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                rows={4}
                              />
                              <p className="text-xs text-white/50 mt-1">
                                Enter a repair summary to close this callout. You can complete the task without closing the callout by leaving this empty.
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white/80 mb-1">
                                Documents (Optional - PDF/Photos)
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || [])
                                  setCalloutCloseDocuments(prev => [...prev, ...files])
                                }}
                                className="w-full rounded-lg border border-white/10 bg-[#0f1220] px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 file:cursor-pointer"
                              />
                              {calloutCloseDocuments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {calloutCloseDocuments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs text-white/70 bg-white/5 rounded px-2 py-1">
                                      <span>{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => setCalloutCloseDocuments(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-white/50 mt-1">
                                Upload invoices, worksheets, or photos related to the repair.
                              </p>
                            </div>
                          </div>
                        )}
                        {calloutData.status !== 'open' && (
                          <p className="text-white/50 text-xs mt-2">
                            This callout is already {calloutData.status}. You can still complete the task to acknowledge the follow-up.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-white/70 text-xs">Callout details not available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PPM Task Callout Section - Always show callout button for PPM tasks */}
            {task.task_data?.source_type === 'ppm_overdue' && (task.task_data?.source_id || task.task_data?.asset_id) && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium text-sm mb-1">PPM Service Required</h3>
                    <p className="text-white/70 text-xs">
                      This asset requires scheduled maintenance. If service is needed, create a callout for the contractor.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    // PPM tasks use source_id (not asset_id) - this is the asset ID
                    const assetId = task.task_data?.source_id || task.task_data?.asset_id
                    if (assetId) {
                      await handleCalloutAction(assetId)
                    } else {
                      showToast({
                        title: 'Error',
                        description: 'Asset information not available for callout.',
                        type: 'error'
                      })
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <PhoneCall className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Place Callout</p>
                    <p className="text-xs text-red-400/70">Create a callout for PPM service</p>
                  </div>
                </button>
              </div>
            )}

            {/* Photo Upload - Mobile Optimized */}
            {task.template?.evidence_types?.includes('photo') && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Photos
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg cursor-pointer hover:bg-white/[0.06] transition-all"
                  >
                    <Camera className="h-5 w-5 text-pink-400" />
                    <span className="text-white/90 font-medium">Add Photos</span>
                  </label>
                  
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/[0.06]"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-900 border-t border-white/[0.06] p-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-transparent text-magenta-400 border border-magenta-500 rounded-lg hover:shadow-lg hover:shadow-pink-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Completing...' : 'Complete Task'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 bg-white/[0.03] border border-white/[0.06] text-white/90 rounded-lg hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Monitor Duration Modal */}
      <MonitorDurationModal
        key={outOfRangeAssetId || 'monitor'} // Key ensures modal resets for each asset
        isOpen={showMonitorDurationModal}
        onClose={() => {
          setShowMonitorDurationModal(false)
          // Keep asset ID in outOfRangeAssets but clear the single asset ID for next use
          // Don't clear outOfRangeAssetId immediately - let it persist briefly
        }}
        onConfirm={createMonitoringTask}
        assetName={outOfRangeAssetId ? (selectedAssets.find(a => a.id === outOfRangeAssetId)?.name || assetsMap.get(outOfRangeAssetId)?.name) : undefined}
      />

      {/* Callout Modal - Key ensures it resets for each unique asset */}
      {calloutAsset && (
        <CalloutModal
          key={`callout-${calloutAsset.id || 'unknown'}`} // Unique key per asset ensures modal resets properly
          open={showCalloutModal}
          onClose={async () => {
            setShowCalloutModal(false)
            // Clear callout asset after modal closes
            setTimeout(async () => {
              setCalloutAsset(null)
              // Process next callout in queue after a short delay
              if (calloutQueue.length > 0) {
                const nextCallout = calloutQueue[0]
                const queuedAssetId = nextCallout.asset?.id || nextCallout.asset
                
                // Rebuild full asset object for queued callout using handleCalloutAction logic
                // Skip queue check since we're processing the queue
                // This ensures all assets get proper callout modal with full data
                await handleCalloutAction(queuedAssetId, true)
                setCalloutQueue(prev => prev.slice(1))
              }
            }, 300) // Small delay for smooth transition
          }}
          asset={calloutAsset}
          requireTroubleshoot={(() => {
            // PPM tasks should NOT require troubleshooting - they're scheduled maintenance
            const taskData = task.task_data as any
            const isPPMTask = taskData?.source_type === 'ppm_overdue'
            
            // Only require troubleshooting for temperature tasks that are out of range
            // PPM tasks bypass troubleshooting
            if (isPPMTask) {
              return false
            }
            
            // For temperature tasks, require troubleshooting if there's an out-of-range asset
            // Otherwise, require troubleshooting when opened from task (default behavior)
            return outOfRangeAssets.size > 0 || outOfRangeAssetId !== null
          })()}
        />
      )}
    </div>
  )
}
