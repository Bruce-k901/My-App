'use client'

import { X, Camera, Thermometer, FileText, CheckCircle2, AlertCircle, Save, ChevronDown, ChevronUp, Monitor, PhoneCall, ExternalLink, Download, Lightbulb, ArrowRight } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskCompletionPayload } from '@/types/checklist-types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import MonitorDurationModal from './MonitorDurationModal'
import { useToast } from '@/components/ui/ToastProvider'
import { isCompletedOutsideWindow, isCompletedLate } from '@/utils/taskTiming'
import CalloutModal from '@/components/modals/CalloutModal'
import DocumentReviewModal from '@/components/modals/DocumentReviewModal'
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
  const [showDocumentReviewModal, setShowDocumentReviewModal] = useState(false)
  const [documentData, setDocumentData] = useState<any>(null)
  const [calloutAsset, setCalloutAsset] = useState<any>(null)
  const [calloutQueue, setCalloutQueue] = useState<Array<{type: 'fire_alarm' | 'emergency_lights', asset: any}>>([])
  const [pendingCallouts, setPendingCallouts] = useState<Array<{type: 'fire_alarm' | 'emergency_lights', notes?: string}>>([])
  const [siteChecklistEquipmentConfig, setSiteChecklistEquipmentConfig] = useState<any[]>([]) // Store equipment_config from site_checklist for nickname fallback
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
      // Load task data from task_data field (stored when task was created)
      let taskData: Record<string, any> = {};
      if (task.task_data && typeof task.task_data === 'object') {
        taskData = task.task_data;
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
      }

      // Load document data for document_expiry tasks
      if (taskData.source_type === 'document_expiry' && taskData.document_id) {
        loadDocumentData(taskData.document_id)
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
      
      // Load task resources (assets, libraries, SOPs, RAs) - await to ensure assets are loaded before temp ranges
      // CRITICAL: Temperature warning system depends on selectedAssets being loaded first
      // Note: loadTaskResources now calls loadAssetTempRanges internally with asset IDs
      // This ensures ranges load immediately when assets are available, avoiding state timing issues
      loadTaskResources(taskData).then(() => {
        // Additional safeguard: Load ranges again after a short delay to catch any edge cases
        // This is a fallback in case the internal call didn't work
        setTimeout(() => {
          console.log('🌡️ [TEMPERATURE SYSTEM] Final check: Loading temperature ranges...')
          loadAssetTempRanges();
        }, 500)
      }).catch((error) => {
        console.error('❌ [TEMPERATURE SYSTEM] Error loading task resources:', error)
        // Still try to load temp ranges even if task resources fail
        // Try to get asset IDs from task_data directly
        const assetIdsFromTaskData = taskData.selectedAssets || []
        if (assetIdsFromTaskData.length > 0) {
          loadAssetTempRanges(assetIdsFromTaskData)
        } else {
          loadAssetTempRanges();
        }
      })
      
      // SAFEGUARD: Also load temp ranges after a short delay to catch any missed assets
      // This ensures ranges are loaded even if loadTaskResources doesn't complete properly
      const tempRangeTimeout = setTimeout(() => {
        console.log('🌡️ [TEMPERATURE SYSTEM] Safety timeout: Re-checking temperature ranges...')
        loadAssetTempRanges();
      }, 1500)
      
      // Cleanup timeout on unmount
      return () => {
        clearTimeout(tempRangeTimeout)
      }
      
      // Then load template fields (which will preserve existing formData)
      const initialize = async () => {
        await loadTemplateFields()
        // SAFEGUARD: Reload temp ranges after template fields load (in case equipment field has assets)
        // This ensures we catch all assets, even if they're in template fields
        console.log('🌡️ [TEMPERATURE SYSTEM] Template fields loaded, re-checking temperature ranges...')
        loadAssetTempRanges()
      }
      initialize()
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

  async function loadDocumentData(documentId: string) {
    try {
      const { data, error } = await supabase
        .from('global_documents')
        .select('id, name, version, expiry_date, file_path')
        .eq('id', documentId)
        .single()

      if (error) throw error
      setDocumentData(data)
    } catch (err: any) {
      console.error('Error loading document data:', err)
      setError('Failed to load document information')
    }
  }

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
      
      // For monitoring tasks, fetch equipment_config from site_checklist as fallback for nickname
      if (isMonitoringTask && task.template_id && siteId) {
        try {
          const { data: siteChecklist } = await supabase
            .from('site_checklists')
            .select('equipment_config')
            .eq('template_id', task.template_id)
            .eq('site_id', siteId)
            .maybeSingle()
          
          if (siteChecklist?.equipment_config && Array.isArray(siteChecklist.equipment_config)) {
            setSiteChecklistEquipmentConfig(siteChecklist.equipment_config)
            console.log('📦 Loaded equipment_config from site_checklist for monitoring task:', siteChecklist.equipment_config.length, 'items')
          }
        } catch (error) {
          console.warn('⚠️ Failed to load equipment_config from site_checklist:', error)
        }
      } else {
        setSiteChecklistEquipmentConfig([])
      }
      
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
      
      // Load selected assets - check multiple sources
      let assetIdsToLoad: string[] = []
      
      // Priority 1: Check taskData.selectedAssets (array of asset IDs)
      if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
        assetIdsToLoad = isMonitoringTask 
          ? taskData.selectedAssets.slice(0, 1) // Only load first asset for monitoring tasks
          : taskData.selectedAssets // Load all assets for regular tasks
        console.log('📦 Found assets in taskData.selectedAssets:', assetIdsToLoad.length)
      }
      // Priority 2: Check equipment_config (array of objects with asset_id)
      // This is what the cron job saves from site_checklists
      else if (taskData.equipment_config && Array.isArray(taskData.equipment_config) && taskData.equipment_config.length > 0) {
        assetIdsToLoad = taskData.equipment_config
          .map((eq: any) => eq.assetId || eq.asset_id || eq.value || eq.id)
          .filter(Boolean)
        console.log('📦 Found assets in taskData.equipment_config:', assetIdsToLoad.length, assetIdsToLoad)
      }
      // Priority 3: Check temperatures array (for temperature tasks)
      else if (taskData.temperatures && Array.isArray(taskData.temperatures) && taskData.temperatures.length > 0) {
        assetIdsToLoad = taskData.temperatures
          .map((temp: any) => temp.assetId || temp.asset_id)
          .filter(Boolean)
        console.log('📦 Found assets in taskData.temperatures:', assetIdsToLoad.length)
      }
      // Priority 4: Check repeatable field (if template uses asset selection)
      else if (task.template?.repeatable_field_name && taskData[task.template.repeatable_field_name]) {
        const repeatableData = taskData[task.template.repeatable_field_name]
        if (Array.isArray(repeatableData)) {
          // Enhanced logging to see exact structure
          const firstItem = repeatableData[0]
          const firstItemKeys = typeof firstItem === 'object' && firstItem !== null ? Object.keys(firstItem) : []
          console.log('📦 Repeatable field data structure:', {
            fieldName: task.template.repeatable_field_name,
            itemCount: repeatableData.length,
            firstItemType: typeof firstItem,
            firstItemKeys: firstItemKeys,
            firstItemValues: firstItemKeys.reduce((acc: any, key: string) => {
              acc[key] = firstItem[key]
              return acc
            }, {}),
            allItems: repeatableData.map((item: any, idx: number) => ({
              index: idx,
              type: typeof item,
              keys: typeof item === 'object' && item !== null ? Object.keys(item) : [],
              fullItem: item
            }))
          })
          
          assetIdsToLoad = repeatableData
            .map((item: any, index: number) => {
              // Handle different formats: string ID, object with asset_id/value/id, or nested asset object
              if (typeof item === 'string') {
                console.log(`📦 [Item ${index}] String ID found:`, item)
                return item; // Already a string ID
              } else if (typeof item === 'object' && item !== null) {
                // Log what we're checking
                const itemKeys = Object.keys(item)
                console.log(`📦 [Item ${index}] Extracting ID from object:`, {
                  keys: itemKeys,
                  values: itemKeys.reduce((acc: any, key: string) => {
                    acc[key] = item[key]
                    return acc
                  }, {})
                })
                
                // Try various property names for asset ID - prioritize assetId (camelCase) as that's what equipment_config uses
                // Also check asset_id (snake_case), value, id, and nested structures
                // CRITICAL: Ensure we extract the actual string ID, not an object
                // Items may have nested objects like {id: {id: 'uuid'}, value: {value: 'uuid'}, asset_id: {id: 'uuid'}}
                let id: string | null = null;
                
                // Helper function to extract string ID from potentially nested structure
                const extractStringId = (value: any): string | null => {
                  if (typeof value === 'string') {
                    return value;
                  } else if (typeof value === 'object' && value !== null) {
                    // Try common nested properties
                    if (value.id && typeof value.id === 'string') return value.id;
                    if (value.value && typeof value.value === 'string') return value.value;
                    if (value.assetId && typeof value.assetId === 'string') return value.assetId;
                    if (value.asset_id && typeof value.asset_id === 'string') return value.asset_id;
                  }
                  return null;
                };
                
                // Check item.assetId (camelCase) - most common
                id = extractStringId(item.assetId);
                
                // Check item.asset_id (snake_case)
                if (!id) id = extractStringId(item.asset_id);
                
                // Check item.value
                if (!id) id = extractStringId(item.value);
                
                // Check item.id
                if (!id) id = extractStringId(item.id);
                
                // Check nested structures
                if (!id && item.label && typeof item.label === 'object') {
                  id = extractStringId(item.label);
                }
                if (!id && item.asset && typeof item.asset === 'object') {
                  id = extractStringId(item.asset);
                }
                if (!id && item.asset_name && typeof item.asset_name === 'object') {
                  id = extractStringId(item.asset_name);
                }
                
                if (id && typeof id === 'string' && id.length > 0) {
                  console.log(`✅ [Item ${index}] Extracted ID string:`, id, 'from item keys:', itemKeys)
                } else {
                  console.warn(`⚠️ [Item ${index}] Could not extract asset ID. Item keys:`, itemKeys, 'Full item:', item)
                }
                // CRITICAL: Only return string IDs, filter will remove null/undefined
                return id;
              }
              console.warn(`⚠️ [Item ${index}] Unexpected type:`, typeof item, item)
              return null;
            })
            .filter((id: any): id is string => typeof id === 'string' && id.length > 0) // Only keep valid string IDs
          console.log('📦 Found assets in repeatable field:', assetIdsToLoad.length, 'from', repeatableData.length, 'items', 'IDs:', assetIdsToLoad)
        }
      }
      
      if (assetIdsToLoad.length > 0) {
        console.log('📦 Loading assets with IDs:', assetIdsToLoad)
        // Validate all IDs are strings before querying
        const validIds = assetIdsToLoad.filter((id: any) => typeof id === 'string')
        if (validIds.length !== assetIdsToLoad.length) {
          console.warn('⚠️ Some asset IDs are not strings, filtering them out:', {
            total: assetIdsToLoad.length,
            valid: validIds.length,
            invalid: assetIdsToLoad.filter((id: any) => typeof id !== 'string')
          })
        }
        // Use only valid string IDs for the query
        const validAssetIds = assetIdsToLoad.filter((id: any): id is string => typeof id === 'string' && id.length > 0)
        if (validAssetIds.length === 0) {
          console.warn('⚠️ No valid asset IDs found after filtering. Trying fallback: use repeatable field data directly...')
          
          // FALLBACK: If we have repeatable field data with equipment info, construct assets directly from it
          const repeatableFieldName = task.template?.repeatable_field_name
          if (repeatableFieldName && taskData[repeatableFieldName] && Array.isArray(taskData[repeatableFieldName])) {
            const repeatableItems = taskData[repeatableFieldName]
            console.log('📦 Fallback: Using repeatable field data directly. Items:', repeatableItems)
            
            // ALWAYS construct assets from repeatable field data, regardless of ID extraction
            // This ensures temperature fields can be rendered even if IDs can't be extracted
            const constructedAssets = repeatableItems
              .map((item: any, index: number) => {
                // Try to get asset ID from various locations (but don't require it)
                const assetId = item.assetId || item.asset_id || item.value || item.id || null
                
                // Extract equipment name from various possible fields
                const equipmentName = item.equipment || 
                                    item.label || 
                                    item.name || 
                                    item.asset_name || 
                                    item.equipmentName ||
                                    item.nickname ||
                                    `Equipment ${index + 1}`
                
                const nickname = item.nickname || ''
                
                // Construct asset object from available data - always create one, even if we have an ID
                // If we have an ID, we'll try to load the full asset from DB, but we still need this for display
                return {
                  id: assetId && typeof assetId === 'string' ? assetId : `temp_${index}`, // Use real ID if available, otherwise temp ID
                  name: equipmentName,
                  nickname: nickname,
                  category: item.category || null,
                  site_id: task.site_id || item.site_id || null,
                  site_name: null,
                  _isConstructed: !assetId || typeof assetId !== 'string', // Only mark as constructed if no valid ID
                  _originalData: item, // Store original data for reference
                  _hasRealId: assetId && typeof assetId === 'string' // Flag to indicate if we should try to load from DB
                }
              })
            
            console.log('📦 Fallback: Constructed assets from repeatable field:', constructedAssets.map(a => ({ id: a.id, name: a.name, hasRealId: a._hasRealId })))
            
            // Try to load real assets from DB for items that have valid IDs
            const realIds = constructedAssets
              .filter((asset: any) => asset._hasRealId)
              .map((asset: any) => asset.id)
              .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            
            if (realIds.length > 0) {
              console.log('📦 Fallback: Found some real IDs, loading from DB:', realIds)
              const { data: assetsFromDb, error: dbError } = await supabase
                .from('assets')
                .select('id, name, category, site_id, sites(id, name)')
                .in('id', realIds);
              
              if (!dbError && assetsFromDb && assetsFromDb.length > 0) {
                const assetsWithSite = assetsFromDb.map((asset: any) => {
                  const site = Array.isArray(asset.sites) ? asset.sites[0] : asset.sites;
                  return {
                    ...asset,
                    site_name: site?.name || 'No site assigned'
                  };
                });
                
                // Merge: replace constructed assets with real assets where IDs match, keep constructed ones for items without IDs
                // CRITICAL: Preserve nickname from constructed asset (from repeatable field data) as it's the source of truth
                const allAssets = constructedAssets.map((constructed: any) => {
                  const realAsset = assetsWithSite.find((real: any) => real.id === constructed.id)
                  if (realAsset) {
                    // Use real asset data, but ALWAYS preserve nickname from constructed asset (repeatable field data)
                    // The nickname in repeatable field data is the source of truth for display
                    return {
                      ...realAsset,
                      nickname: constructed.nickname || '' // Prioritize nickname from repeatable field data
                    }
                  }
                  return constructed // Keep constructed asset if no real asset found
                })
                
                setSelectedAssets(allAssets);
                console.log('✅ Fallback: Loaded/constructed assets:', allAssets.length, allAssets.map(a => ({ id: a.id, name: a.name, isConstructed: a._isConstructed })))
                
                // Update assetsMap for real assets only
                allAssets.forEach(asset => {
                  if (!asset._isConstructed) {
                    setAssetsMap(prev => {
                      const newMap = new Map(prev)
                      newMap.set(asset.id, asset)
                      return newMap
                    })
                  }
                })
                
                // Load temperature ranges for real assets only
                if (realIds.length > 0) {
                  loadAssetTempRanges(realIds)
                }
                return // Exit early
              } else {
                console.warn('⚠️ Fallback: Failed to load assets from DB, using constructed assets only:', dbError)
              }
            }
            
            // If no real IDs or DB load failed, use constructed assets directly
            setSelectedAssets(constructedAssets);
            console.log('✅ Fallback: Using constructed assets only (no DB lookup):', constructedAssets.length, constructedAssets.map(a => a.name))
            // Load temperature ranges for constructed assets (temp IDs)
            loadAssetTempRanges()
            return // Exit early
          }
          
          console.warn('⚠️ No valid asset IDs found and all fallbacks failed. Cannot display temperature fields.')
          return
        }
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, category, site_id, sites(id, name)')
          .in('id', validAssetIds);
        
        if (assetsError) {
          console.error('❌ Error loading assets:', assetsError)
        } else if (assetsData && assetsData.length > 0) {
          // CRITICAL: Extract nicknames from repeatable field data and merge with assets
          const repeatableFieldName = task.template?.repeatable_field_name
          const repeatableData = repeatableFieldName ? (taskData[repeatableFieldName] as any[]) : null
          
          // For monitoring tasks, also fetch equipment_config from site_checklist as fallback
          let siteChecklistConfig: any[] = []
          if (isMonitoringTask && task.template_id && siteId) {
            try {
              const { data: siteChecklist } = await supabase
                .from('site_checklists')
                .select('equipment_config')
                .eq('template_id', task.template_id)
                .eq('site_id', siteId)
                .maybeSingle()
              
              if (siteChecklist?.equipment_config && Array.isArray(siteChecklist.equipment_config)) {
                siteChecklistConfig = siteChecklist.equipment_config
                setSiteChecklistEquipmentConfig(siteChecklistConfig) // Also store in state for later use
                console.log('📦 Loaded equipment_config from site_checklist for nickname fallback:', siteChecklistConfig.length, 'items')
              }
            } catch (error) {
              console.warn('⚠️ Failed to load equipment_config from site_checklist:', error)
            }
          }
          
          const assetsWithSite = assetsData.map((asset: any) => {
            const site = Array.isArray(asset.sites) ? asset.sites[0] : asset.sites;
            
            // Try to find nickname from multiple sources (priority order):
            let nickname = ''
            
            // PRIORITY 1: Repeatable field data (if available)
            if (repeatableData && Array.isArray(repeatableData) && repeatableData.length > 0) {
              const matchingItem = repeatableData.find((item: any) => {
                // Extract ID from various possible structures
                const itemId = item.assetId || item.asset_id || item.id || item.value
                // Handle nested structures
                const itemIdStr = typeof itemId === 'string' 
                  ? itemId 
                  : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                return itemIdStr === asset.id || String(itemIdStr) === String(asset.id)
              })
              
              if (matchingItem) {
                // Extract nickname from matching item
                nickname = matchingItem.nickname || 
                          (matchingItem.id && typeof matchingItem.id === 'object' ? matchingItem.id.nickname : null) ||
                          (matchingItem.value && typeof matchingItem.value === 'object' ? matchingItem.value.nickname : null) ||
                          (matchingItem.asset_id && typeof matchingItem.asset_id === 'object' ? matchingItem.asset_id.nickname : null) ||
                          ''
              }
            }
            
            // PRIORITY 2: Equipment_config from task_data (if repeatable field is empty, especially for monitoring tasks)
            if (!nickname && taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
              const configItem = taskData.equipment_config.find((item: any) => {
                const itemId = item.assetId || item.asset_id || item.id || item.value
                const itemIdStr = typeof itemId === 'string' 
                  ? itemId 
                  : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                return itemIdStr === asset.id || String(itemIdStr) === String(asset.id)
              })
              
              if (configItem) {
                nickname = configItem.nickname || 
                          (configItem.id && typeof configItem.id === 'object' ? configItem.id.nickname : null) ||
                          (configItem.value && typeof configItem.value === 'object' ? configItem.value.nickname : null) ||
                          ''
              }
            }
            
            // PRIORITY 3: Equipment_config from task_data (if available)
            if (!nickname && taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
              const configItem = taskData.equipment_config.find((item: any) => {
                const itemId = item.assetId || item.asset_id || item.id || item.value
                const itemIdStr = typeof itemId === 'string' 
                  ? itemId 
                  : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                return itemIdStr === asset.id || String(itemIdStr) === String(asset.id)
              })
              
              if (configItem) {
                nickname = configItem.nickname || 
                          (configItem.id && typeof configItem.id === 'object' ? configItem.id.nickname : null) ||
                          (configItem.value && typeof configItem.value === 'object' ? configItem.value.nickname : null) ||
                          ''
              }
            }
            
            // PRIORITY 3: Temperatures array (for monitoring tasks that might have it there)
            if (!nickname && taskData.temperatures && Array.isArray(taskData.temperatures)) {
              const tempItem = taskData.temperatures.find((t: any) => {
                const tempAssetId = t.assetId || t.asset_id
                return tempAssetId === asset.id || String(tempAssetId) === String(asset.id)
              })
              if (tempItem && tempItem.nickname) {
                nickname = tempItem.nickname
              }
            }
            
            // PRIORITY 4: Site_checklist equipment_config (CRITICAL fallback for monitoring tasks)
            if (!nickname && siteChecklistConfig.length > 0) {
              const configItem = siteChecklistConfig.find((item: any) => {
                const itemId = item.assetId || item.asset_id || item.id || item.value
                const itemIdStr = typeof itemId === 'string' 
                  ? itemId 
                  : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                return itemIdStr === asset.id || String(itemIdStr) === String(asset.id)
              })
              
              if (configItem) {
                nickname = configItem.nickname || ''
                console.log(`✅ [ASSET LOADING] Found nickname "${nickname}" from site_checklist equipment_config for asset ${asset.id} (${asset.name})`)
              }
            }
            
            return {
              ...asset,
              site_name: site?.name || 'No site assigned',
              nickname: nickname // Add nickname from various sources
            };
          });
          setSelectedAssets(assetsWithSite);
          console.log('✅ Loaded assets with nicknames:', assetsWithSite.length, assetsWithSite.map(a => ({ id: a.id, name: a.name, nickname: a.nickname })))
          
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
        } else {
          console.warn('⚠️ No assets found in database for IDs:', assetIdsToLoad)
        }
      } else {
        // No asset IDs found - try fallback: construct assets from repeatable field data
        console.warn('⚠️ No asset IDs found in task_data. Trying fallback: construct from repeatable field...', {
          selectedAssets: !!taskData.selectedAssets,
          equipment_config: !!taskData.equipment_config,
          temperatures: !!taskData.temperatures,
          repeatable_field: task.template?.repeatable_field_name,
          repeatable_data: task.template?.repeatable_field_name ? taskData[task.template.repeatable_field_name] : null
        })
        
        // FALLBACK: If we have repeatable field data, construct assets from it
        const repeatableFieldName = task.template?.repeatable_field_name
        if (repeatableFieldName && taskData[repeatableFieldName] && Array.isArray(taskData[repeatableFieldName])) {
          const repeatableItems = taskData[repeatableFieldName]
          console.log('📦 Fallback (no IDs): Using repeatable field data directly. Items:', repeatableItems)
          
          // Construct assets from repeatable field data
          const constructedAssets = repeatableItems
            .map((item: any, index: number) => {
              // Extract equipment name from various possible fields
              const equipmentName = item.equipment || 
                                  item.label || 
                                  item.name || 
                                  item.asset_name || 
                                  item.equipmentName ||
                                  item.nickname ||
                                  `Equipment ${index + 1}`
              
              const nickname = item.nickname || ''
              
              return {
                id: `temp_${index}`, // Temporary ID for display
                name: equipmentName,
                nickname: nickname,
                category: item.category || null,
                site_id: task.site_id || item.site_id || null,
                site_name: null,
                _isConstructed: true,
                _originalData: item
              }
            })
          
          setSelectedAssets(constructedAssets);
          console.log('✅ Fallback (no IDs): Using constructed assets:', constructedAssets.length, constructedAssets.map(a => a.name))
          // Load temperature ranges for constructed assets (temp IDs)
          loadAssetTempRanges()
        }
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

  const loadTemplateFields = async () => {
    if (!task.template_id) return
    try {
      // CRITICAL: Use template_fields from task.template if already loaded (from Today's Tasks page)
      // This avoids unnecessary database queries and ensures fields are available immediately
      let fields = task.template?.template_fields || []
      
      // If template_fields weren't included in the template, fetch them separately
      if (!fields || fields.length === 0) {
        console.log('📋 Template fields not pre-loaded, fetching from database...')
        const { data, error } = await supabase
          .from('template_fields')
          .select('*')
          .eq('template_id', task.template_id)
          .order('field_order')
        
        if (error) throw error
        fields = data || []
      } else {
        console.log('✅ Using pre-loaded template fields:', fields.length)
        // Ensure fields are sorted by field_order
        fields = [...fields].sort((a: any, b: any) => (a.field_order || 0) - (b.field_order || 0))
      }
      
      setTemplateFields(fields)
      
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
      
      // Load assets for equipment information (check fridge_name, hot_holding_unit, and equipment_name)
      const equipmentField = fields?.find((f: any) => 
        f.field_type === 'select' && 
        (f.field_name === 'fridge_name' || 
         f.field_name === 'hot_holding_unit' || 
         f.field_name === 'equipment_name')
      )
      if (equipmentField?.options && Array.isArray(equipmentField.options)) {
        const assetIds = equipmentField.options.map((opt: any) => opt.value).filter(Boolean)
        if (assetIds.length > 0) {
          const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('id, name')
            .in('id', assetIds)
          
          if (!assetsError && assets) {
            const assetsMapData = new Map(assets.map(a => [a.id, a]))
            setAssetsMap(assetsMapData)
          }
        }
      }
    } catch (error) {
      console.error('Error loading template fields:', error)
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
      // Start with existing ranges to preserve what was already loaded
      const ranges = new Map(assetTempRanges)
      const assets = new Map(assetsMap)
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
      const currentFields = templateFields.length > 0 ? templateFields : await (async () => {
        console.log('🌡️ [TEMPERATURE SYSTEM] Fetching template fields for asset lookup...')
        const { data } = await supabase
          .from('template_fields')
          .select('*')
          .eq('template_id', task.template_id)
          .order('field_order')
        return data || []
      })()
      
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
      
      // Separate real UUIDs from temp IDs (constructed assets)
      const realAssetIds = Array.from(allAssetIds).filter(id => {
        // Filter out temp IDs (like "temp_0", "temp_1") - these are not valid UUIDs
        return id && !id.startsWith('temp_') && typeof id === 'string' && id.length > 0
      })
      const tempAssetIds = Array.from(allAssetIds).filter(id => id && id.startsWith('temp_'))
      
      // Fetch all assets with temperature ranges in one query (only for real UUIDs)
      if (realAssetIds.length > 0) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Fetching temperature ranges for', realAssetIds.length, 'real assets')
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, working_temp_min, working_temp_max')
          .in('id', realAssetIds)
        
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
        } else if (realAssetIds.length > 0) {
          // Only warn if we expected to find assets but didn't
          console.warn('⚠️ [TEMPERATURE SYSTEM] No assets found with IDs:', realAssetIds)
        }
      }
      
      // For constructed assets with temp IDs, get temperature ranges from equipment_config or repeatable field data
      if (tempAssetIds.length > 0) {
        console.log('🌡️ [TEMPERATURE SYSTEM] Loading temperature ranges for', tempAssetIds.length, 'constructed assets')
        
        // PRIORITY 1: Check equipment_config (saved when task was created from template)
        const equipmentConfig = task.task_data?.equipment_config
        if (equipmentConfig && Array.isArray(equipmentConfig)) {
          console.log('🌡️ [TEMPERATURE SYSTEM] Found equipment_config with', equipmentConfig.length, 'items')
          tempAssetIds.forEach((tempId) => {
            const tempIndex = parseInt(tempId.replace('temp_', ''))
            if (!isNaN(tempIndex) && equipmentConfig[tempIndex]) {
              const item = equipmentConfig[tempIndex]
              const tempMin = item.temp_min !== undefined ? item.temp_min : null
              const tempMax = item.temp_max !== undefined ? item.temp_max : null
              
              if (tempMin !== null || tempMax !== null) {
                ranges.set(tempId, {
                  min: tempMin,
                  max: tempMax
                })
                const assetName = item.equipment || item.name || item.asset_name || `Equipment ${tempIndex + 1}`
                assets.set(tempId, { name: assetName })
                console.log(`🌡️ [TEMPERATURE SYSTEM] Loaded range from equipment_config for ${tempId} (${assetName}):`, {
                  id: tempId,
                  min: tempMin,
                  max: tempMax,
                  source: 'equipment_config'
                })
              }
            }
          })
        }
        
        // PRIORITY 2: Fallback to repeatable field data
        const repeatableFieldName = task.template?.repeatable_field_name
        const repeatableData = repeatableFieldName ? (task.task_data?.[repeatableFieldName] as any[]) : null
        
        if (repeatableData && Array.isArray(repeatableData)) {
          console.log('🌡️ [TEMPERATURE SYSTEM] Checking repeatable field data:', repeatableData.length, 'items')
          // Match temp IDs to repeatable field items by index (only for items not already loaded from equipment_config)
          tempAssetIds.forEach((tempId) => {
            // Skip if already loaded from equipment_config
            if (ranges.has(tempId)) return
            
            const tempIndex = parseInt(tempId.replace('temp_', ''))
            if (!isNaN(tempIndex) && repeatableData[tempIndex]) {
              const item = repeatableData[tempIndex]
              console.log(`🌡️ [TEMPERATURE SYSTEM] Processing temp asset ${tempId} (index ${tempIndex}) from repeatable field:`, {
                itemKeys: Object.keys(item),
                hasTempMin: 'temp_min' in item,
                hasTempMax: 'temp_max' in item,
                tempMin: item.temp_min,
                tempMax: item.temp_max
              })
              
              // Extract temp_min and temp_max - they might be direct properties or nested
              let tempMin = item.temp_min !== undefined ? item.temp_min : null
              let tempMax = item.temp_max !== undefined ? item.temp_max : null
              
              // If they're null/undefined, try nested structures
              if (tempMin === null && item.id && typeof item.id === 'object' && item.id.temp_min !== undefined) {
                tempMin = item.id.temp_min
              }
              if (tempMax === null && item.id && typeof item.id === 'object' && item.id.temp_max !== undefined) {
                tempMax = item.id.temp_max
              }
              
              // Always set a range, even if min/max are null (allows the system to work, just without range checking)
              ranges.set(tempId, {
                min: tempMin,
                max: tempMax
              })
              // Also set asset name if available
              const assetName = item.equipment || item.name || item.asset_name || `Equipment ${tempIndex + 1}`
              assets.set(tempId, { name: assetName })
              console.log(`🌡️ [TEMPERATURE SYSTEM] Loaded range from repeatable field for ${tempId} (${assetName}):`, {
                id: tempId,
                min: tempMin,
                max: tempMax,
                source: 'repeatable_field_data'
              })
            } else {
              console.warn(`⚠️ [TEMPERATURE SYSTEM] Could not find repeatable field item for temp asset ${tempId} at index ${tempIndex}`)
            }
          })
        } else if (!equipmentConfig) {
          console.warn('⚠️ [TEMPERATURE SYSTEM] No equipment_config or repeatable field data found for temp assets:', {
            hasEquipmentConfig: !!equipmentConfig,
            repeatableFieldName,
            hasRepeatableData: !!repeatableData,
            isArray: Array.isArray(repeatableData)
          })
        }
      }
      
      // Note: No asset IDs is normal for tasks without asset selection - no warning needed
      
      // CRITICAL: Always merge with existing ranges (prevents losing ranges loaded earlier)
      // Use functional update to ensure we're working with latest state
      setAssetTempRanges(prev => {
        const merged = new Map(prev)
        let newRangesAdded = 0
        let existingRangesUpdated = 0
        
        // Add/update ranges from this load
        ranges.forEach((range, id) => {
          const existing = merged.get(id)
          if (!existing) {
            // New range - add it
            merged.set(id, range)
            newRangesAdded++
          } else if ((existing.min === null && existing.max === null) && (range.min !== null || range.max !== null)) {
            // Existing range has no values but new one does - update it
            merged.set(id, range)
            existingRangesUpdated++
          }
          // Otherwise keep existing range (don't overwrite with empty/null values)
        })
        
        console.log('🌡️ [TEMPERATURE SYSTEM] Merged ranges:', {
          existingBefore: prev.size,
          newFound: ranges.size,
          newAdded: newRangesAdded,
          existingUpdated: existingRangesUpdated,
          finalCount: merged.size
        })
        
        return merged
      })
      setAssetsMap(prev => {
        const newMap = new Map(prev)
        assets.forEach((value, key) => {
          newMap.set(key, value)
        })
        return newMap
      })
      
      // Debug: Log loaded ranges
      const finalRangesCount = assetTempRanges.size > 0 ? assetTempRanges.size : ranges.size
      console.log('✅ [TEMPERATURE SYSTEM] Successfully loaded asset temperature ranges:', {
        newRangesFound: ranges.size,
        existingRangesPreserved: assetTempRanges.size,
        finalCount: finalRangesCount,
        ranges: Array.from(ranges.entries()).map(([id, range]) => ({
          assetId: id,
          assetName: assets.get(id)?.name || 'Unknown',
          min: range.min,
          max: range.max,
          source: id.startsWith('temp_') ? 'equipment_config/repeatable_field' : 'assets_table'
        }))
      })
      
      // SAFEGUARD: Verify ranges were loaded
      // Only warn if we had real asset IDs but no ranges loaded, OR if we had temp IDs but no ranges loaded for them
      const expectedRangesCount = realAssetIds.length + tempAssetIds.length
      if (ranges.size === 0 && expectedRangesCount > 0) {
        console.error('❌ [TEMPERATURE SYSTEM] WARNING: No temperature ranges loaded despite having asset IDs!')
        console.error('   Real asset IDs requested:', realAssetIds)
        console.error('   Temp asset IDs requested:', tempAssetIds)
        console.error('   This will cause temperature warnings to NOT appear!')
      } else if (ranges.size < expectedRangesCount && expectedRangesCount > 0) {
        // Some ranges loaded but not all
        const missingCount = expectedRangesCount - ranges.size
        console.warn(`⚠️ [TEMPERATURE SYSTEM] Only loaded ${ranges.size} of ${expectedRangesCount} expected temperature ranges (${missingCount} missing)`)
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
      
      // Extract nickname from multiple sources (priority order):
      // 1. Asset's nickname property (if loaded from DB)
      // 2. Saved temp's nickname
      // 3. Repeatable field data
      // 4. Empty string as fallback
      let assetNickname = outOfRangeAsset?.nickname || 
                         savedTemp?.nickname || 
                         ''
      
      // If still no nickname, try to get it from repeatable field data
      if (!assetNickname && task.template?.repeatable_field_name) {
        const repeatableFieldName = task.template.repeatable_field_name
        const repeatableData = task.task_data?.[repeatableFieldName]
        if (Array.isArray(repeatableData) && repeatableData.length > 0) {
          const matchingItem = repeatableData.find((item: any) => {
            const itemId = item.assetId || item.asset_id || item.id || item.value
            const itemIdStr = typeof itemId === 'string' ? itemId : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
            return itemIdStr === targetAssetId || String(itemIdStr) === String(targetAssetId)
          })
          if (matchingItem) {
            assetNickname = matchingItem.nickname || 
                           (matchingItem.id && typeof matchingItem.id === 'object' ? matchingItem.id.nickname : null) ||
                           (matchingItem.value && typeof matchingItem.value === 'object' ? matchingItem.value.nickname : null) ||
                           ''
          }
        }
      }
      
      // FALLBACK: If still no nickname, try equipment_config
      if (!assetNickname && task.task_data?.equipment_config && Array.isArray(task.task_data.equipment_config)) {
        const configItem = task.task_data.equipment_config.find((item: any) => {
          const itemId = item.assetId || item.asset_id || item.id || item.value
          const itemIdStr = typeof itemId === 'string' ? itemId : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
          return itemIdStr === targetAssetId || String(itemIdStr) === String(targetAssetId)
        })
        if (configItem) {
          assetNickname = configItem.nickname || ''
        }
      }
      
      // FINAL FALLBACK: Try to fetch from site_checklist equipment_config
      if (!assetNickname && task.template_id && siteId) {
        try {
          const { data: siteChecklist } = await supabase
            .from('site_checklists')
            .select('equipment_config')
            .eq('template_id', task.template_id)
            .eq('site_id', siteId)
            .maybeSingle()
          
          if (siteChecklist?.equipment_config && Array.isArray(siteChecklist.equipment_config)) {
            const configItem = siteChecklist.equipment_config.find((item: any) => {
              const itemId = item.assetId || item.asset_id || item.id || item.value
              return itemId === targetAssetId || String(itemId) === String(targetAssetId)
            })
            if (configItem) {
              assetNickname = configItem.nickname || ''
              console.log(`✅ Found nickname "${assetNickname}" from site_checklist when creating monitoring task`)
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch nickname from site_checklist:', error)
        }
      }
      
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
        // CRITICAL: Ensure the repeatable field has the full structure including nickname
        const repeatableFieldName = task.template?.repeatable_field_name
        if (repeatableFieldName) {
          if (monitoringTaskData[repeatableFieldName] && Array.isArray(monitoringTaskData[repeatableFieldName])) {
            const filtered = monitoringTaskData[repeatableFieldName].filter((item: any) => {
              // Filter by assetId if it's an object, or by value if it's a string/ID
              if (typeof item === 'object' && item !== null) {
                const itemId = item.assetId || item.asset_id || item.id || item.value
                const itemIdStr = typeof itemId === 'string' ? itemId : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                return itemIdStr === targetAssetId || String(itemIdStr) === String(targetAssetId)
              }
              return item === targetAssetId
            })
            
            // If filtered array has items, use it; otherwise create new structure with nickname
            if (filtered.length > 0) {
              // Ensure nickname is set on the filtered item
              monitoringTaskData[repeatableFieldName] = filtered.map((item: any) => ({
                ...item,
                assetId: targetAssetId,
                nickname: assetNickname || item.nickname || 
                         (item.id && typeof item.id === 'object' ? item.id.nickname : null) ||
                         (item.value && typeof item.value === 'object' ? item.value.nickname : null) ||
                         ''
              }))
            } else {
              // Create new structure if filtered array is empty (shouldn't happen, but safety check)
              monitoringTaskData[repeatableFieldName] = [{
                assetId: targetAssetId,
                nickname: assetNickname,
                equipment: outOfRangeAsset?.name || assetName,
                name: outOfRangeAsset?.name || assetName,
                label: outOfRangeAsset?.name || assetName
              }]
            }
          } else {
            // If repeatable field doesn't exist or is empty, create it with the asset and nickname
            monitoringTaskData[repeatableFieldName] = [{
              assetId: targetAssetId,
              nickname: assetNickname,
              equipment: outOfRangeAsset?.name || assetName,
              name: outOfRangeAsset?.name || assetName,
              label: outOfRangeAsset?.name || assetName
            }]
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
        // CRITICAL: Preserve the full structure from original task_data if it exists
        const repeatableFieldName = task.template?.repeatable_field_name
        if (repeatableFieldName) {
          // Try to get the original item structure from task_data
          const originalRepeatableData = task.task_data?.[repeatableFieldName]
          if (Array.isArray(originalRepeatableData)) {
            const originalItem = originalRepeatableData.find((item: any) => {
              const itemId = item.assetId || item.asset_id || item.id || item.value
              return itemId === targetAssetId || String(itemId) === String(targetAssetId)
            })
            
            if (originalItem) {
              // Preserve original structure but ensure nickname is set
              monitoringTaskData[repeatableFieldName] = [{
                ...originalItem,
                assetId: targetAssetId,
                nickname: assetNickname || originalItem.nickname || 
                         (originalItem.id && typeof originalItem.id === 'object' ? originalItem.id.nickname : null) ||
                         (originalItem.value && typeof originalItem.value === 'object' ? originalItem.value.nickname : null) ||
                         ''
              }]
            } else if (outOfRangeAsset) {
              // Fallback: create new structure
              monitoringTaskData[repeatableFieldName] = [{
                assetId: targetAssetId,
                nickname: assetNickname,
                equipment: outOfRangeAsset.name,
                name: outOfRangeAsset.name,
                label: outOfRangeAsset.name
              }]
            }
          } else if (outOfRangeAsset) {
            // Fallback: create new structure
            monitoringTaskData[repeatableFieldName] = [{
              assetId: targetAssetId,
              nickname: assetNickname,
              equipment: outOfRangeAsset.name,
              name: outOfRangeAsset.name,
              label: outOfRangeAsset.name
            }]
          }
        }
      }

      // Create monitoring task based on original template
      // CRITICAL: Monitoring tasks are SINGLE INSTANCE tasks - they should NOT have dayparts in task_data
      // This prevents them from being expanded into multiple instances in Today's Tasks
      
      // Check for existing monitoring task to avoid unique constraint violation
      const dueDateStr = now.toISOString().split('T')[0];
      const dueTimeStr = dueDate.toTimeString().slice(0, 5);
      
      const { data: existingMonitoringTask } = await supabase
        .from('checklist_tasks')
        .select('id, status')
        .eq('template_id', task.template_id)
        .eq('site_id', siteId)
        .eq('due_date', dueDateStr)
        .eq('daypart', 'during_service')
        .eq('due_time', dueTimeStr)
        .eq('flag_reason', 'monitoring')
        .eq('status', 'pending')
        .maybeSingle();
      
      let monitoringTask;
      
      if (existingMonitoringTask) {
        // Update existing monitoring task instead of creating duplicate
        console.log('🔄 Found existing monitoring task, updating instead of creating:', existingMonitoringTask.id);
        const { data: updatedTask, error: updateError } = await supabase
          .from('checklist_tasks')
          .update({
            task_data: monitoringTaskData,
            expires_at: dueDate.toISOString(),
            priority: 'high',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMonitoringTask.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        monitoringTask = updatedTask;
      } else {
        // Create new monitoring task
        // Add small random offset to due_time (seconds) to avoid conflicts if multiple monitoring tasks created simultaneously
        const timeOffset = Math.floor(Math.random() * 60); // 0-59 seconds
        const dueTimeWithOffset = new Date(dueDate.getTime() + timeOffset * 1000);
        const dueTimeStrWithOffset = dueTimeWithOffset.toTimeString().slice(0, 5);
        
        const { data: newTask, error: taskError } = await supabase
          .from('checklist_tasks')
          .insert({
            template_id: task.template_id,
            company_id: companyId,
            site_id: siteId,
            due_date: dueDateStr,
            due_time: dueTimeStrWithOffset, // Add small offset to avoid conflicts
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
          .single();

        if (taskError) {
          // If still getting unique constraint error, try with a different time
          if (taskError.code === '23505' && taskError.message?.includes('idx_checklist_tasks_unique_template_task')) {
            console.warn('⚠️ Unique constraint violation, retrying with different time...');
            const retryTime = new Date(dueDate.getTime() + 120 * 1000); // Add 2 minutes
            const retryTimeStr = retryTime.toTimeString().slice(0, 5);
            
            const { data: retryTask, error: retryError } = await supabase
              .from('checklist_tasks')
              .insert({
                template_id: task.template_id,
                company_id: companyId,
                site_id: siteId,
                due_date: dueDateStr,
                due_time: retryTimeStr,
                daypart: 'during_service',
                assigned_to_role: task.template.assigned_to_role || null,
                assigned_to_user_id: task.assigned_to_user_id || null,
                status: 'pending',
                priority: 'high',
                flagged: true,
                flag_reason: 'monitoring',
                generated_at: new Date().toISOString(),
                expires_at: dueDate.toISOString(),
                task_data: monitoringTaskData,
                custom_name: task.custom_name || task.template?.name,
                custom_instructions: task.custom_instructions || task.template?.instructions,
              })
              .select()
              .single();
            
            if (retryError) throw retryError;
            monitoringTask = retryTask;
          } else {
            throw taskError;
          }
        } else {
          monitoringTask = newTask;
        }
      }

      // Create notification/alert
      await createTemperatureAlert('monitor', assetName, tempValue, monitoringTask.id)

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

  const createTemperatureAlert = async (actionType: 'monitor' | 'callout', assetName: string, tempValue: number, taskId?: string) => {
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

      // Get user profile to ensure we have profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        console.error('User profile not found - cannot create notification')
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
      // Note: recipient_role column doesn't exist in notifications table - removed
      
      console.log('🔔 Creating notification (v3 - renamed function):', { title, message })
      
      const notificationData: any = {
        company_id: companyId,
        profile_id: profile.id, // Add profile_id - required field
        // site_id: siteId, // Omitted - foreign key constraint references sites_redundant, not sites
        type: 'temperature',
        title,
        message,
        // severity removed as column does not exist in notifications table
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
        console.error('❌ Error creating notification (v3):', JSON.stringify(errorInfo, null, 2))
        
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
      // Check if this is a constructed asset (temp ID) - skip DB query for these
      const isConstructedAsset = targetAssetId?.startsWith('temp_') || assetForCallout._isConstructed
      
      // Build asset object for callout modal - fetch contractor info from DB (only for real assets)
      try {
        let assetData = null
        if (!isConstructedAsset) {
          // Only query DB for real asset IDs (not temp IDs)
          const { data } = await supabase
            .from('assets')
            .select('id, name, serial_number, warranty_end, install_date, category, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
            .eq('id', targetAssetId)
            .single()
          assetData = data
        } else {
          // For constructed assets, use the asset object directly
          console.log('📞 [CALLOUT] Using constructed asset data for callout (temp ID):', assetForCallout)
        }

        // Load contractor names (only for real assets, not constructed/temp IDs)
        let ppmContractorName = null
        let reactiveContractorName = null
        let warrantyContractorName = null

        if (!isConstructedAsset && assetData?.ppm_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', assetData.ppm_contractor_id)
            .single()
          ppmContractorName = contractor?.name || null
        }

        if (!isConstructedAsset && assetData?.reactive_contractor_id) {
          const { data: contractor } = await supabase
            .from('contractors')
            .select('name')
            .eq('id', assetData.reactive_contractor_id)
            .single()
          reactiveContractorName = contractor?.name || null
        }

        if (!isConstructedAsset && assetData?.warranty_contractor_id) {
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
          // For constructed assets, mark as such so callout modal knows it's not a real asset
          _isConstructed: isConstructedAsset || false
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
        await createTemperatureAlert('callout', assetName, tempValue)
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
      await createTemperatureAlert('callout', assetName, tempValue)
      
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
    
    // First, try to get range from asset card (primary source)
    let range = assetTempRanges.get(assetId)
    let rangeSource = 'asset_card'
    
    // Fallback: For temp IDs (constructed assets), check repeatable field data
    if ((!range || (range.min === null && range.max === null)) && assetId.startsWith('temp_')) {
      const repeatableFieldName = task.template?.repeatable_field_name
      const repeatableData = repeatableFieldName ? (task.task_data?.[repeatableFieldName] as any[]) : null
      
      if (repeatableData && Array.isArray(repeatableData)) {
        const tempIndex = parseInt(assetId.replace('temp_', ''))
        if (!isNaN(tempIndex) && repeatableData[tempIndex]) {
          const item = repeatableData[tempIndex]
          if (item.temp_min !== undefined || item.temp_max !== undefined) {
            range = {
              min: item.temp_min ?? null,
              max: item.temp_max ?? null
            }
            rangeSource = 'repeatable_field'
            console.log(`🌡️ [TEMPERATURE RANGE CHECK] Using repeatable field range for temp asset ${assetId}: ${range.min ?? 'no min'}°C – ${range.max ?? 'no max'}°C`)
          }
        }
      }
    }
    
    // Fallback: Check template temperature ranges from task_data.temperatures
    if (!range || (range.min === null && range.max === null)) {
      const taskData = task.task_data as any
      const templateTemp = taskData?.temperatures?.find((t: any) => t.assetId === assetId)
      
      if (templateTemp && (templateTemp.temp_min !== undefined || templateTemp.temp_max !== undefined)) {
        range = {
          min: templateTemp.temp_min ?? null,
          max: templateTemp.temp_max ?? null
        }
        rangeSource = 'template'
        console.log(`🌡️ [TEMPERATURE RANGE CHECK] Using template range for asset ${assetId}: ${range.min ?? 'no min'}°C – ${range.max ?? 'no max'}°C`)
      }
    }
    
    if (!range) {
      console.warn(`⚠️ [TEMPERATURE RANGE CHECK] No range found (asset card or template) for asset ${assetId}`)
      return false
    }
    
    const { min, max } = range
    if (min === null && max === null) {
      console.warn(`⚠️ [TEMPERATURE RANGE CHECK] Range has no min or max for asset ${assetId} (source: ${rangeSource})`)
      return false
    }
    
    // CRITICAL: Check if temperature is outside the working range
    // Handle inverted ranges for freezers (where min > max, e.g., min: -18, max: -20)
    // For freezers: range is actually max to min (colder to warmer), so -20°C to -18°C
    // For fridges: range is min to max (colder to warmer), so 3°C to 5°C
    let isOutOfRange = false
    
    // Check if range is inverted (min > max) - this happens for freezers
    const isInvertedRange = min !== null && max !== null && min > max
    
    if (isInvertedRange) {
      // Inverted range (freezer): actual range is max (colder) to min (warmer)
      // Example: {min: -18, max: -20} means range is -20°C to -18°C
      // Temperature is out of range if: temp < max (too cold) OR temp > min (too warm)
      if (max !== null && temp < max) {
        // Temperature is too cold (below the colder limit)
        // Example: -22 < -20 (too cold)
        isOutOfRange = true
        console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is BELOW minimum ${max}°C (too cold, out of range) [source: ${rangeSource}, inverted range]`)
      } else if (min !== null && temp > min) {
        // Temperature is too warm (above the warmer limit)
        // Example: -17 > -18 (too warm)
        isOutOfRange = true
        console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is ABOVE maximum ${min}°C (too warm, out of range) [source: ${rangeSource}, inverted range]`)
      }
    } else {
      // Normal range (fridge): range is min (colder) to max (warmer)
      // Example: {min: 3, max: 5} means range is 3°C to 5°C
      if (min !== null && temp < min) {
        // Temperature is below minimum (too cold)
        // Example: 2 < 3 (too cold)
        isOutOfRange = true
        console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is BELOW minimum ${min}°C (out of range) [source: ${rangeSource}]`)
      }
      
      if (max !== null && temp > max) {
        // Temperature is above maximum (too warm)
        // Example: 6 > 5 (too warm)
        isOutOfRange = true
        console.log(`🌡️ [TEMPERATURE RANGE CHECK] ${temp}°C is ABOVE maximum ${max}°C (out of range) [source: ${rangeSource}]`)
      }
    }
    
    if (!isOutOfRange) {
      if (isInvertedRange) {
        console.log(`✅ [TEMPERATURE RANGE CHECK] ${temp}°C is within range [${max}°C to ${min}°C] (inverted range) [source: ${rangeSource}]`)
      } else {
        console.log(`✅ [TEMPERATURE RANGE CHECK] ${temp}°C is within range [${min ?? 'no min'}, ${max ?? 'no max'}] [source: ${rangeSource}]`)
      }
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

  const handleSubmit = async (skipDocumentReview = false) => {
    // For document_expiry tasks, show document review modal instead of completing normally
    const taskData = task.task_data as any
    if (!skipDocumentReview && taskData?.source_type === 'document_expiry' && documentData) {
      setShowDocumentReviewModal(true)
      return
    }
    if (!task.template) return

    // CRITICAL: Log formData state at submission time
    const tempKeysAtSubmit = Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action');
    const tempValuesAtSubmit = tempKeysAtSubmit.reduce((acc: any, key) => {
      acc[key] = formData[key];
      return acc;
    }, {});
    
    console.log('🚀 [TASK COMPLETION] Starting handleSubmit:', {
      taskId: task.id,
      templateName: task.template?.name,
      formDataKeys: Object.keys(formData),
      tempKeysCount: tempKeysAtSubmit.length,
      tempKeys: tempKeysAtSubmit,
      tempValues: tempValuesAtSubmit,
      hasEquipmentConfig: !!task.task_data?.equipment_config,
      equipmentConfigLength: task.task_data?.equipment_config?.length || 0,
      selectedAssetsCount: selectedAssets.length
    });

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
      
      // DEBUG: Log temperature field detection
      const allFormDataKeys = Object.keys(formData);
      const tempKeysInFormData = allFormDataKeys.filter(k => k.startsWith('temp_') && k !== 'temp_action');
      const tempValuesInFormData = tempKeysInFormData.reduce((acc: any, key) => {
        acc[key] = formData[key];
        return acc;
      }, {});
      
      console.log('🌡️ [TEMP LOGS] Checking for temperature data:', {
        hasRepeatableField: !!repeatableField,
        repeatableFieldName: repeatableField?.field_name,
        repeatableFieldValue: repeatableField ? formData[repeatableField.field_name] : undefined,
        hasTemperatureField: formData.temperature !== undefined,
        temperatureValue: formData.temperature,
        formDataKeys: allFormDataKeys,
        tempKeysInFormData: tempKeysInFormData,
        tempValuesInFormData: tempValuesInFormData,
        templateAssetId: task.template?.asset_id,
        companyId,
        siteId,
        profileId: profile?.id,
        hasEquipmentConfig: !!task.task_data?.equipment_config,
        equipmentConfigLength: task.task_data?.equipment_config?.length || 0,
        selectedAssetsCount: selectedAssets.length
      })
      
      // NEW APPROACH: Create temperature records from equipment_config (source of truth)
      // This happens BEFORE equipment_list building so we can use temperatureRecords as fallback
      let equipmentConfigForTempRecords = task.task_data?.equipment_config;
      
      // Fallback for legacy tasks: reconstruct equipment_config
      if (!equipmentConfigForTempRecords || !Array.isArray(equipmentConfigForTempRecords) || equipmentConfigForTempRecords.length === 0) {
        console.warn('⚠️ Legacy task detected: equipment_config missing, attempting to reconstruct from old structure');
        console.log('Task data:', task.task_data);
        
        // Try to build from temperatures array (most complete legacy data)
        if (task.task_data?.temperatures && Array.isArray(task.task_data.temperatures) && task.task_data.temperatures.length > 0) {
          equipmentConfigForTempRecords = task.task_data.temperatures.map((temp: any) => ({
            assetId: temp.assetId || temp.asset_id,
            equipment: temp.equipment || temp.asset_name || 'Unknown Equipment',
            nickname: temp.nickname || '',
            temp_min: temp.temp_min,
            temp_max: temp.temp_max
          })).filter((item: any) => item.assetId);
          
          console.log('✅ Reconstructed equipment_config from temperatures array:', equipmentConfigForTempRecords);
        }
        // Fallback: Build from selectedAssets array
        else if (task.task_data?.selectedAssets && Array.isArray(task.task_data.selectedAssets) && task.task_data.selectedAssets.length > 0) {
          equipmentConfigForTempRecords = task.task_data.selectedAssets.map((assetId: string) => {
            const assetRange = assetTempRanges.get(assetId);
            return {
              assetId: assetId,
              equipment: assetsMap.get(assetId)?.name || 'Unknown Equipment',
              nickname: '',
              temp_min: assetRange?.min ?? undefined,
              temp_max: assetRange?.max ?? undefined
            };
          });
          
          console.log('✅ Reconstructed equipment_config from selectedAssets:', equipmentConfigForTempRecords);
        }
        // Fallback: Check if there's a single asset_id in template
        else if (task.template?.asset_id) {
          const assetId = task.template.asset_id;
          const assetRange = assetTempRanges.get(assetId);
          equipmentConfigForTempRecords = [{
            assetId: assetId,
            equipment: assetsMap.get(assetId)?.name || 'Unknown Equipment',
            nickname: '',
            temp_min: assetRange?.min ?? undefined,
            temp_max: assetRange?.max ?? undefined
          }];
          
          console.log('✅ Reconstructed equipment_config from template asset_id:', equipmentConfigForTempRecords);
        }
        // Fallback: Check if asset_name array exists (legacy format)
        else if (task.task_data?.asset_name && Array.isArray(task.task_data.asset_name) && task.task_data.asset_name.length > 0) {
          console.log('⚠️ Found asset_name array, attempting to match with assets:', task.task_data.asset_name);
          
          // Try to match asset_name entries with actual assets
          equipmentConfigForTempRecords = task.task_data.asset_name
            .map((assetNameOrId: any) => {
              // asset_name could be a string (name or ID) or an object
              let assetId: string | null = null;
              let equipmentName: string = 'Unknown Equipment';
              
              if (typeof assetNameOrId === 'string') {
                // Try to find asset by name first
                const assetByName = Array.from(assetsMap.values()).find(a => a.name === assetNameOrId);
                if (assetByName) {
                  assetId = assetByName.id;
                  equipmentName = assetByName.name;
                } else {
                  // Try as ID
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidRegex.test(assetNameOrId)) {
                    assetId = assetNameOrId;
                    equipmentName = assetsMap.get(assetNameOrId)?.name || assetNameOrId;
                  }
                }
              } else if (typeof assetNameOrId === 'object' && assetNameOrId !== null) {
                assetId = assetNameOrId.id || assetNameOrId.asset_id || assetNameOrId.assetId || assetNameOrId.value;
                equipmentName = assetNameOrId.name || assetNameOrId.asset_name || assetNameOrId.label || 'Unknown Equipment';
              }
              
              if (!assetId) return null;
              
              const assetRange = assetTempRanges.get(assetId);
              return {
                assetId: assetId,
                equipment: equipmentName,
                nickname: '',
                temp_min: assetRange?.min ?? undefined,
                temp_max: assetRange?.max ?? undefined
              };
            })
            .filter((item: any) => item !== null && item.assetId);
          
          if (equipmentConfigForTempRecords.length > 0) {
            console.log('✅ Reconstructed equipment_config from asset_name array:', equipmentConfigForTempRecords);
          }
        }
        // Fallback: Check repeatable field in task_data
        if ((!equipmentConfigForTempRecords || equipmentConfigForTempRecords.length === 0) && repeatableField) {
          const repeatableFieldName = repeatableField.field_name;
          const repeatableData = task.task_data?.[repeatableFieldName];
          
          if (repeatableData && Array.isArray(repeatableData) && repeatableData.length > 0) {
            console.log('⚠️ Found repeatable field data, attempting to extract asset IDs:', repeatableData);
            
            equipmentConfigForTempRecords = repeatableData
              .map((item: any) => {
                // Extract asset ID from various possible structures
                let assetId: string | null = null;
                let equipmentName: string = 'Unknown Equipment';
                
                if (typeof item === 'string') {
                  // Try as UUID first
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidRegex.test(item)) {
                    assetId = item;
                    equipmentName = assetsMap.get(item)?.name || item;
                  }
                } else if (typeof item === 'object' && item !== null) {
                  assetId = item.value || item.asset_id || item.id || item.assetId;
                  equipmentName = item.label || item.name || item.asset_name || item.equipment || 'Unknown Equipment';
                  
                  // Handle nested structures
                  if (!assetId && item.id && typeof item.id === 'object') {
                    assetId = item.id.id || item.id.value || item.id.assetId;
                  }
                  if (!assetId && item.value && typeof item.value === 'object') {
                    assetId = item.value.id || item.value.value || item.value.assetId;
                  }
                }
                
                if (!assetId) return null;
                
                const assetRange = assetTempRanges.get(assetId);
                return {
                  assetId: assetId,
                  equipment: equipmentName,
                  nickname: '',
                  temp_min: assetRange?.min ?? undefined,
                  temp_max: assetRange?.max ?? undefined
                };
              })
              .filter((item: any) => item !== null && item.assetId);
            
            if (equipmentConfigForTempRecords.length > 0) {
              console.log('✅ Reconstructed equipment_config from repeatable field:', equipmentConfigForTempRecords);
            }
          }
        }
        // Last resort: Build from formData temp_* keys
        if ((!equipmentConfigForTempRecords || equipmentConfigForTempRecords.length === 0)) {
          const tempKeys = Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action' && formData[k] !== undefined && formData[k] !== null && formData[k] !== '');
          if (tempKeys.length > 0) {
            console.log('⚠️ Building equipment_config from formData temp_* keys as last resort:', tempKeys);
            equipmentConfigForTempRecords = tempKeys.map((tempKey) => {
              const keyAssetId = tempKey.replace('temp_', '');
              const assetRange = assetTempRanges.get(keyAssetId);
              return {
                assetId: keyAssetId,
                equipment: assetsMap.get(keyAssetId)?.name || 'Unknown Equipment',
                nickname: '',
                temp_min: assetRange?.min ?? undefined,
                temp_max: assetRange?.max ?? undefined
              };
            }).filter((item: any) => item.assetId);
            
            console.log('✅ Reconstructed equipment_config from formData temp keys:', equipmentConfigForTempRecords);
          }
        }
      }
      
      // Create temperature records from equipment_config
      if (equipmentConfigForTempRecords && Array.isArray(equipmentConfigForTempRecords) && equipmentConfigForTempRecords.length > 0) {
        console.log('🌡️ [TEMP LOGS] Creating temperature records from equipment_config:', equipmentConfigForTempRecords.length, 'items');
        console.log('🌡️ [TEMP LOGS] Available formData temp keys:', Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action'));
        console.log('🌡️ [TEMP LOGS] FormData temp values:', Object.keys(formData)
          .filter(k => k.startsWith('temp_') && k !== 'temp_action')
          .reduce((acc: any, key) => {
            acc[key] = formData[key];
            return acc;
          }, {}));
        
        for (const configItem of equipmentConfigForTempRecords) {
          const assetId = configItem.assetId || configItem.asset_id;
          if (!assetId) {
            console.warn('⚠️ [TEMP LOGS] Skipping config item without assetId:', configItem);
            continue;
          }
          
          // Get temperature from formData (temp_${assetId})
          const tempKey = `temp_${assetId}`;
          let tempValue = formData[tempKey];
          
          // If not found, try scanning all temp_* keys and match by assetId
          if ((tempValue === undefined || tempValue === null || tempValue === '') && assetId) {
            Object.keys(formData).forEach(key => {
              if (key.startsWith('temp_') && key !== 'temp_action') {
                const keyAssetId = key.replace('temp_', '');
                // Try multiple matching strategies (ensure both are strings before trim)
                const assetIdStr = String(assetId || '');
                const keyAssetIdStr = String(keyAssetId || '');
                if (keyAssetId === assetId || 
                    keyAssetIdStr === assetIdStr ||
                    (assetIdStr && keyAssetIdStr && keyAssetIdStr.trim() === assetIdStr.trim())) {
                  tempValue = formData[key];
                  console.log(`🔍 [TEMP LOGS] Found temperature via key match: ${key} = ${tempValue} for asset ${assetId}`);
                }
              }
            });
          }
          
          if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
            const temp = parseFloat(String(tempValue));
            if (isNaN(temp) || !isFinite(temp)) {
              console.warn(`⚠️ [TEMP LOGS] Invalid temperature value for asset ${assetId}:`, tempValue);
              continue;
            }
            
            // Calculate status using same logic as equipment_list
            const min = configItem.temp_min;
            const max = configItem.temp_max;
            let status = 'ok';
            
            if (min !== undefined && max !== undefined && min !== null && max !== null) {
              const isInvertedRange = min > max;
              if (isInvertedRange) {
                status = (temp >= max && temp <= min) ? 'ok' : 'out_of_range';
              } else {
                status = (temp >= min && temp <= max) ? 'ok' : 'out_of_range';
              }
            }
            
            temperatureRecords.push({
              company_id: companyId,
              site_id: siteId,
              asset_id: assetId,
              recorded_by: profile.id,
              reading: temp,
              unit: '°C',
              recorded_at: completedAt,
              day_part: task.daypart || null,
              status,
              notes: `Recorded via task: ${task.template.name}`,
              // Note: photo_url column doesn't exist in temperature_logs table
              // Photos are stored in task_completion_records.completion_data instead
            });
            
            console.log(`✅ [TEMP LOGS] Created temperature record: ${temp}°C for asset ${assetId} (${configItem.equipment || configItem.asset_name || 'Unknown'}) with status ${status}`);
          } else {
            console.warn(`⚠️ [TEMP LOGS] No temperature found in formData for asset ${assetId}. Checked key: ${tempKey}`);
          }
        }
        
        // CRITICAL FALLBACK: If we still have temp_* keys in formData that weren't matched,
        // create temperature records for them anyway (match by index or create new records)
        const allFormDataTempKeys = Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action');
        const unmatchedTempKeys = allFormDataTempKeys.filter(key => {
          const keyAssetId = key.replace('temp_', '');
          return !temperatureRecords.some(tr => 
            tr.asset_id === keyAssetId || 
            String(tr.asset_id) === String(keyAssetId)
          );
        });
        
        if (unmatchedTempKeys.length > 0) {
          console.log(`⚠️ [TEMP LOGS] Found ${unmatchedTempKeys.length} unmatched temperature keys. Creating records by index matching...`);
          
          unmatchedTempKeys.forEach((tempKey, index) => {
            const keyAssetId = tempKey.replace('temp_', '');
            const tempValue = formData[tempKey];
            
            if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
              const temp = parseFloat(String(tempValue));
              if (isNaN(temp) || !isFinite(temp)) return;
              
              // Try to find matching asset in equipment_config by index
              const configItem = equipmentConfigForTempRecords[index];
              if (configItem) {
                const assetId = configItem.assetId || configItem.asset_id || keyAssetId;
                const min = configItem.temp_min;
                const max = configItem.temp_max;
                let status = 'ok';
                
                if (min !== undefined && max !== undefined && min !== null && max !== null) {
                  const isInvertedRange = min > max;
                  if (isInvertedRange) {
                    status = (temp >= max && temp <= min) ? 'ok' : 'out_of_range';
                  } else {
                    status = (temp >= min && temp <= max) ? 'ok' : 'out_of_range';
                  }
                }
                
                temperatureRecords.push({
                  company_id: companyId,
                  site_id: siteId,
                  asset_id: assetId,
                  recorded_by: profile.id,
                  reading: temp,
                  unit: '°C',
                  recorded_at: completedAt,
                  day_part: task.daypart || null,
                  status,
                  notes: `Recorded via task: ${task.template.name}`
                  // Note: photo_url column doesn't exist in temperature_logs table
                });
                
                console.log(`✅ [TEMP LOGS FALLBACK] Created temperature record by index: ${temp}°C for asset ${assetId} from ${tempKey}`);
              } else {
                // Last resort: create record with the keyAssetId itself
                temperatureRecords.push({
                  company_id: companyId,
                  site_id: siteId,
                  asset_id: keyAssetId,
                  recorded_by: profile.id,
                  reading: temp,
                  unit: '°C',
                  recorded_at: completedAt,
                  day_part: task.daypart || null,
                  status: 'ok',
                  notes: `Recorded via task: ${task.template.name}`
                  // Note: photo_url column doesn't exist in temperature_logs table
                });
                
                console.log(`✅ [TEMP LOGS FALLBACK] Created temperature record with keyAssetId: ${temp}°C for asset ${keyAssetId} from ${tempKey}`);
              }
            }
          });
        }
      } else {
        console.warn('⚠️ [TEMP LOGS] No equipment_config available for temperature records creation');
      }
      
      // LEGACY FALLBACK: Check if this is a temperature task with equipment fields (old approach)
      if (temperatureRecords.length === 0 && repeatableField && formData[repeatableField.field_name]) {
        // Handle repeatable equipment list (e.g., multiple fridges)
        const equipmentList = formData[repeatableField.field_name] || []
        for (const equipment of equipmentList) {
          // Extract asset ID - handle nested structures where id/value/asset_id might be objects
          let assetId: string | null = null
          
          // Check direct properties first
          if (typeof equipment.value === 'string') {
            assetId = equipment.value
          } else if (typeof equipment.asset_id === 'string') {
            assetId = equipment.asset_id
          } else if (typeof equipment.id === 'string') {
            assetId = equipment.id
          }
          // Check nested structures (objects with assetId property)
          else if (equipment.id && typeof equipment.id === 'object' && equipment.id.assetId) {
            assetId = equipment.id.assetId
          } else if (equipment.value && typeof equipment.value === 'object' && equipment.value.assetId) {
            assetId = equipment.value.assetId
          } else if (equipment.asset_id && typeof equipment.asset_id === 'object' && equipment.asset_id.assetId) {
            assetId = equipment.asset_id.assetId
          } else if (equipment.assetId && typeof equipment.assetId === 'object' && equipment.assetId.assetId) {
            assetId = equipment.assetId.assetId
          } else if (typeof equipment === 'string') {
            assetId = equipment
          }
          
          if (!assetId) {
            console.warn('⚠️ Could not extract asset ID from equipment:', equipment)
            continue
          }
          
          // Try to get temperature from formData - check multiple possible key formats
          let tempValue = formData[`temp_${assetId}`]
          
          // If not found, try scanning all temp_* keys
          if ((tempValue === undefined || tempValue === null || tempValue === '') && assetId) {
            Object.keys(formData).forEach(key => {
              if (key.startsWith('temp_') && key !== 'temp_action') {
                const keyAssetId = key.replace('temp_', '')
                if (keyAssetId === assetId || String(keyAssetId) === String(assetId)) {
                  tempValue = formData[key]
                }
              }
            })
          }
          
          if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
            const assetName = assetsMap.get(assetId)?.name || 'Unknown Equipment'
            
            // Get asset temperature range to determine status
            // Handle inverted ranges for freezers (where min > max, e.g., min: -18, max: -20)
            const assetRange = assetTempRanges.get(assetId)
            let status = 'ok'
            if (assetRange) {
              const { min, max } = assetRange
              const temp = parseFloat(String(tempValue))
              const tolerance = 2
              const warningTolerance = 1
              
              // Check if range is inverted (min > max) - this happens for freezers
              const isInvertedRange = min !== null && max !== null && min > max
              
              if (isInvertedRange) {
                // Inverted range (freezer): actual range is max (colder) to min (warmer)
                if ((max !== null && temp < max - tolerance) || (min !== null && temp > min + tolerance)) {
                  status = 'failed'
                } else if ((max !== null && temp < max - warningTolerance) || (min !== null && temp > min + warningTolerance)) {
                  status = 'warning'
                } else if ((max !== null && temp < max) || (min !== null && temp > min)) {
                  status = 'warning'
                }
              } else {
                // Normal range (fridge): range is min (colder) to max (warmer)
                if ((min !== null && temp < min - tolerance) || (max !== null && temp > max + tolerance)) {
                  status = 'failed'
                } else if ((min !== null && temp < min - warningTolerance) || (max !== null && temp > max + warningTolerance)) {
                  status = 'warning'
                } else if ((min !== null && temp < min) || (max !== null && temp > max)) {
                  status = 'warning'
                }
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
      } 
      
      // Also check for any field with "temp" in the name (case-insensitive)
      const tempFieldKeys = Object.keys(formData).filter(k => 
        k.toLowerCase().includes('temp') && 
        k !== 'temp_action' && 
        formData[k] !== undefined && 
        formData[k] !== null && 
        formData[k] !== ''
      )
      
      if (tempFieldKeys.length > 0 && temperatureRecords.length === 0) {
        console.log('🌡️ [TEMP LOGS] Found temperature fields by name search:', tempFieldKeys)
        for (const tempKey of tempFieldKeys) {
          const tempValue = formData[tempKey]
          const assetId = task.template?.asset_id
          
          if (assetId && tempValue) {
            console.log('🌡️ [TEMP LOGS] Creating temp log from field:', tempKey, 'value:', tempValue, 'asset:', assetId)
            const assetRange = assetTempRanges.get(assetId)
            let status = 'ok'
            if (assetRange) {
              const { min, max } = assetRange
              const temp = parseFloat(String(tempValue))
              const tolerance = 2
              const warningTolerance = 1
              
              // Check if range is inverted (min > max) - this happens for freezers
              const isInvertedRange = min !== null && max !== null && min > max
              
              if (isInvertedRange) {
                // Inverted range (freezer): actual range is max (colder) to min (warmer)
                if ((max !== null && temp < max - tolerance) || (min !== null && temp > min + tolerance)) {
                  status = 'failed'
                } else if ((max !== null && temp < max - warningTolerance) || (min !== null && temp > min + warningTolerance)) {
                  status = 'warning'
                } else if ((max !== null && temp < max) || (min !== null && temp > min)) {
                  status = 'warning'
                }
              } else {
                // Normal range (fridge): range is min (colder) to max (warmer)
                if ((min !== null && temp < min - tolerance) || (max !== null && temp > max + tolerance)) {
                  status = 'failed'
                } else if ((min !== null && temp < min - warningTolerance) || (max !== null && temp > max + warningTolerance)) {
                  status = 'warning'
                } else if ((min !== null && temp < min) || (max !== null && temp > max)) {
                  status = 'warning'
                }
              }
            }
            
            temperatureRecords.push({
              company_id: companyId,
              site_id: siteId,
              asset_id: assetId,
              recorded_by: profile.id,
              reading: parseFloat(String(tempValue)),
              unit: '°C',
              recorded_at: completedAt,
              day_part: task.daypart || null,
              status,
              notes: `Recorded via task: ${task.template.name}`
              // Note: photo_url column doesn't exist in temperature_logs table
            })
          }
        }
      }
      
      if (formData.temperature !== undefined && formData.temperature !== null && formData.temperature !== '') {
        // Handle single temperature field (template's linked asset)
        const assetId = task.template.asset_id
        if (assetId) {
          console.log('🌡️ [TEMP LOGS] Creating temp log from formData.temperature:', formData.temperature, 'asset:', assetId)
          const assetRange = assetTempRanges.get(assetId)
          let status = 'ok'
          if (assetRange) {
            const { min, max } = assetRange
            const temp = parseFloat(String(formData.temperature))
            const tolerance = 2
            const warningTolerance = 1
            
            // Check if range is inverted (min > max) - this happens for freezers
            const isInvertedRange = min !== null && max !== null && min > max
            
            if (isInvertedRange) {
              // Inverted range (freezer): actual range is max (colder) to min (warmer)
              if ((max !== null && temp < max - tolerance) || (min !== null && temp > min + tolerance)) {
                status = 'failed'
              } else if ((max !== null && temp < max - warningTolerance) || (min !== null && temp > min + warningTolerance)) {
                status = 'warning'
              } else if ((max !== null && temp < max) || (min !== null && temp > min)) {
                status = 'warning'
              }
            } else {
              // Normal range (fridge): range is min (colder) to max (warmer)
              if ((min !== null && temp < min - tolerance) || (max !== null && temp > max + tolerance)) {
                status = 'failed'
              } else if ((min !== null && temp < min - warningTolerance) || (max !== null && temp > max + warningTolerance)) {
                status = 'warning'
              } else if ((min !== null && temp < min) || (max !== null && temp > max)) {
                status = 'warning'
              }
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
            notes: `Recorded via task: ${task.template.name}`
            // Note: photo_url column doesn't exist in temperature_logs table
          })
        }
      }

      // FINAL FALLBACK: If we still have no temperature records but formData has temp_* keys,
      // create records for ALL temp_* keys (even if they don't match equipment_config perfectly)
      if (temperatureRecords.length === 0) {
        const allTempKeys = Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action');
        console.log('⚠️ [TEMP LOGS] No temperature records created yet, but found temp keys in formData:', allTempKeys);
        
        if (allTempKeys.length > 0) {
          console.log('🔄 [TEMP LOGS] Creating temperature records from ALL formData temp keys as final fallback...');
          
          for (const tempKey of allTempKeys) {
            const keyAssetId = tempKey.replace('temp_', '');
            const tempValue = formData[tempKey];
            
            if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
              const temp = parseFloat(String(tempValue));
              if (isNaN(temp) || !isFinite(temp)) continue;
              
              // Try to get asset info from assetsMap
              const asset = assetsMap.get(keyAssetId);
              const assetRange = assetTempRanges.get(keyAssetId);
              
              let status = 'ok';
              if (assetRange) {
                const { min, max } = assetRange;
                if (min !== undefined && max !== undefined && min !== null && max !== null) {
                  const isInvertedRange = min > max;
                  if (isInvertedRange) {
                    status = (temp >= max && temp <= min) ? 'ok' : 'out_of_range';
                  } else {
                    status = (temp >= min && temp <= max) ? 'ok' : 'out_of_range';
                  }
                }
              }
              
              temperatureRecords.push({
                company_id: companyId,
                site_id: siteId,
                asset_id: keyAssetId,
                recorded_by: profile.id,
                reading: temp,
                unit: '°C',
                recorded_at: completedAt,
                day_part: task.daypart || null,
                status,
                notes: `Recorded via task: ${task.template.name}`
                // Note: photo_url column doesn't exist in temperature_logs table
              });
              
              console.log(`✅ [TEMP LOGS FINAL FALLBACK] Created temperature record: ${temp}°C for asset ${keyAssetId} (${asset?.name || 'Unknown'})`);
            }
          }
        }
      }
      
      // Insert temperature records
      if (temperatureRecords.length > 0) {
        console.log('🌡️ [TEMP LOGS] Attempting to insert temperature records:', {
          count: temperatureRecords.length,
          records: temperatureRecords.map(r => ({
            asset_id: r.asset_id,
            reading: r.reading,
            company_id: r.company_id,
            site_id: r.site_id,
            recorded_by: r.recorded_by,
            status: r.status,
            recorded_at: r.recorded_at
          }))
        })
        
        // Insert temperature records one at a time to avoid conflicts and get better error messages
        const insertedIds: string[] = [];
        const errors: any[] = [];
        
        for (const record of temperatureRecords) {
          try {
            const { data: insertedData, error: tempError } = await supabase
              .from('temperature_logs')
              .insert(record)
              .select()
              .single();

            if (tempError) {
              // Handle 409 Conflict (duplicate) gracefully - this is non-critical
              // The temperature data is already saved in completion_data.equipment_list
              const isConflict = tempError.code === '23505' || 
                                tempError.code === 'PGRST204' || 
                                tempError.status === 409 ||
                                tempError.message?.includes('duplicate') || 
                                tempError.message?.includes('unique') ||
                                tempError.message?.includes('Conflict') ||
                                tempError.message?.toLowerCase().includes('already exists');
              
              if (isConflict) {
                // Don't log as error - this is expected for duplicates
                console.log(`ℹ️ [TEMP LOGS] Duplicate record detected for asset ${record.asset_id} (409 Conflict). Skipping (non-critical).`)
                errors.push({ record, error: tempError, type: 'duplicate' });
              } else {
                console.error(`❌ Temperature logs insert error for asset ${record.asset_id}:`, tempError)
                console.error('❌ Error details:', {
                  message: tempError.message,
                  details: tempError.details,
                  hint: tempError.hint,
                  code: tempError.code,
                  status: tempError.status,
                  record
                })
                errors.push({ record, error: tempError, type: 'error' });
              }
            } else if (insertedData) {
              insertedIds.push(insertedData.id);
              console.log(`✅ [TEMP LOGS] Inserted record for asset ${record.asset_id}: ${record.reading}°C (status: ${record.status})`)
            }
          } catch (err: any) {
            console.error(`❌ Unexpected error inserting temperature record for asset ${record.asset_id}:`, err)
            errors.push({ record, error: err, type: 'exception' });
          }
        }
        
        if (insertedIds.length > 0) {
          console.log(`✅ [TEMP LOGS] Successfully created ${insertedIds.length} of ${temperatureRecords.length} temperature record(s)`)
        }
        
        if (errors.length > 0) {
          const duplicateCount = errors.filter(e => e.type === 'duplicate').length;
          const errorCount = errors.filter(e => e.type !== 'duplicate').length;
          if (duplicateCount > 0) {
            console.log(`ℹ️ [TEMP LOGS] ${duplicateCount} duplicate record(s) skipped (non-critical - data saved in completion_data)`)
          }
          if (errorCount > 0) {
            console.error(`❌ [TEMP LOGS] ${errorCount} record(s) failed to insert`)
          } else {
            // All errors were duplicates, which is fine
            console.log(`✅ [TEMP LOGS] All temperature records processed (${duplicateCount} duplicates skipped, ${insertedIds.length} new records created)`)
          }
        }
        
        // Don't fail the whole operation - temperature data is saved in completion_data.equipment_list
        // Note: Temperature logs insertion failure doesn't prevent task completion
      } else {
        console.warn('⚠️ [TEMP LOGS] No temperature records to insert!', {
          formDataKeys: Object.keys(formData),
          formDataTempKeys: Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action'),
          formDataTempValues: Object.keys(formData)
            .filter(k => k.startsWith('temp_') && k !== 'temp_action')
            .reduce((acc: any, key) => {
              acc[key] = formData[key];
              return acc;
            }, {}),
          hasRepeatableField: !!repeatableField,
          templateAssetId: task.template?.asset_id,
          equipmentConfigLength: equipmentConfigForTempRecords?.length || 0,
          selectedAssetsCount: selectedAssets.length
        })
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

      // ============================================
      // BUILD EQUIPMENT LIST FROM SOURCE OF TRUTH
      // ============================================
      // equipment_config comes from task creation and contains:
      // - Asset IDs, nicknames, temp ranges, equipment names
      // We just add temperature readings from user input during completion

      // Helper function for temperature status calculation (binary: ok or out_of_range)
      const calculateTemperatureStatus = (
        temp: number | null,
        min: number | null | undefined,
        max: number | null | undefined
      ): string => {
        if (temp === null || temp === undefined) return 'not_recorded';
        if (min === undefined || max === undefined || min === null || max === null) {
          return 'recorded'; // No range to compare
        }
        
        const isInvertedRange = min > max; // Freezer case
        
        if (isInvertedRange) {
          // Freezer: valid range is max (colder) to min (warmer)
          return (temp >= max && temp <= min) ? 'ok' : 'out_of_range';
        } else {
          // Normal: valid range is min to max
          return (temp >= min && temp <= max) ? 'ok' : 'out_of_range';
        }
      };

      // Build equipment_list from equipment_config (source of truth)
      let equipmentList: any[] = [];

      // Check if equipment_config exists (new structure)
      let equipmentConfig = task.task_data?.equipment_config;
      
      // Fallback: Reconstruct equipment_config from legacy task data
      if (!equipmentConfig || !Array.isArray(equipmentConfig)) {
        console.warn('⚠️ Legacy task detected: equipment_config missing, attempting to reconstruct from old structure');
        console.log('Task data:', task.task_data);
        
        // Try to build from temperatures array (most complete legacy data)
        if (task.task_data?.temperatures && Array.isArray(task.task_data.temperatures) && task.task_data.temperatures.length > 0) {
          equipmentConfig = task.task_data.temperatures.map((temp: any) => ({
            assetId: temp.assetId || temp.asset_id,
            equipment: temp.equipment || temp.asset_name || 'Unknown Equipment',
            nickname: temp.nickname || '',
            temp_min: temp.temp_min,
            temp_max: temp.temp_max
          })).filter((item: any) => item.assetId); // Only include items with assetId
          
          console.log('✅ Reconstructed equipment_config from temperatures array:', equipmentConfig);
        }
        // Fallback: Build from selectedAssets array
        else if (task.task_data?.selectedAssets && Array.isArray(task.task_data.selectedAssets) && task.task_data.selectedAssets.length > 0) {
          equipmentConfig = task.task_data.selectedAssets.map((assetId: string) => {
            const asset = assetsMap.get(assetId);
            // Try to get temp range from assetTempRanges
            const assetRange = assetTempRanges.get(assetId);
            return {
              assetId: assetId,
              equipment: asset?.name || 'Unknown Equipment',
              nickname: '',
              temp_min: assetRange?.min ?? undefined,
              temp_max: assetRange?.max ?? undefined
            };
          });
          
          console.log('✅ Reconstructed equipment_config from selectedAssets:', equipmentConfig);
        }
        // Fallback: Check if asset_name array exists (legacy format)
        else if (task.task_data?.asset_name && Array.isArray(task.task_data.asset_name) && task.task_data.asset_name.length > 0) {
          console.log('⚠️ Found asset_name array in equipment_list building, attempting to match with assets:', task.task_data.asset_name);
          
          // Try to match asset_name entries with actual assets
          equipmentConfig = task.task_data.asset_name
            .map((assetNameOrId: any) => {
              // asset_name could be a string (name or ID) or an object
              let assetId: string | null = null;
              let equipmentName: string = 'Unknown Equipment';
              
              if (typeof assetNameOrId === 'string') {
                // Try to find asset by name first
                const assetByName = Array.from(assetsMap.values()).find(a => a.name === assetNameOrId);
                if (assetByName) {
                  assetId = assetByName.id;
                  equipmentName = assetByName.name;
                } else {
                  // Try as ID
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidRegex.test(assetNameOrId)) {
                    assetId = assetNameOrId;
                    equipmentName = assetsMap.get(assetNameOrId)?.name || assetNameOrId;
                  }
                }
              } else if (typeof assetNameOrId === 'object' && assetNameOrId !== null) {
                assetId = assetNameOrId.id || assetNameOrId.asset_id || assetNameOrId.assetId || assetNameOrId.value;
                equipmentName = assetNameOrId.name || assetNameOrId.asset_name || assetNameOrId.label || 'Unknown Equipment';
              }
              
              if (!assetId) return null;
              
              const assetRange = assetTempRanges.get(assetId);
              return {
                assetId: assetId,
                equipment: equipmentName,
                nickname: '',
                temp_min: assetRange?.min ?? undefined,
                temp_max: assetRange?.max ?? undefined
              };
            })
            .filter((item: any) => item !== null && item.assetId);
          
          if (equipmentConfig.length > 0) {
            console.log('✅ Reconstructed equipment_config from asset_name array:', equipmentConfig);
          }
        }
        // Last resort: Check if there's a single asset_id in template
        else if (task.template?.asset_id) {
          const assetId = task.template.asset_id;
          const asset = assetsMap.get(assetId);
          const assetRange = assetTempRanges.get(assetId);
          equipmentConfig = [{
            assetId: assetId,
            equipment: asset?.name || 'Unknown Equipment',
            nickname: '',
            temp_min: assetRange?.min ?? undefined,
            temp_max: assetRange?.max ?? undefined
          }];
          
          console.log('✅ Reconstructed equipment_config from template asset_id:', equipmentConfig);
        }
        // Final fallback: Check repeatable field
        else if (repeatableField) {
          const repeatableFieldName = repeatableField.field_name;
          const repeatableData = task.task_data?.[repeatableFieldName];
          
          if (repeatableData && Array.isArray(repeatableData) && repeatableData.length > 0) {
            console.log('⚠️ Found repeatable field data in equipment_list building, attempting to extract asset IDs:', repeatableData);
            
            equipmentConfig = repeatableData
              .map((item: any) => {
                // Extract asset ID from various possible structures
                let assetId: string | null = null;
                let equipmentName: string = 'Unknown Equipment';
                
                if (typeof item === 'string') {
                  // Try as UUID first
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                  if (uuidRegex.test(item)) {
                    assetId = item;
                    equipmentName = assetsMap.get(item)?.name || item;
                  }
                } else if (typeof item === 'object' && item !== null) {
                  assetId = item.value || item.asset_id || item.id || item.assetId;
                  equipmentName = item.label || item.name || item.asset_name || item.equipment || 'Unknown Equipment';
                  
                  // Handle nested structures
                  if (!assetId && item.id && typeof item.id === 'object') {
                    assetId = item.id.id || item.id.value || item.id.assetId;
                  }
                  if (!assetId && item.value && typeof item.value === 'object') {
                    assetId = item.value.id || item.value.value || item.value.assetId;
                  }
                }
                
                if (!assetId) return null;
                
                const assetRange = assetTempRanges.get(assetId);
                return {
                  assetId: assetId,
                  equipment: equipmentName,
                  nickname: '',
                  temp_min: assetRange?.min ?? undefined,
                  temp_max: assetRange?.max ?? undefined
                };
              })
              .filter((item: any) => item !== null && item.assetId);
            
            if (equipmentConfig.length > 0) {
              console.log('✅ Reconstructed equipment_config from repeatable field:', equipmentConfig);
            }
          }
        }
      }

      // Final validation: equipment_config must exist after fallback attempts
      if (!equipmentConfig || !Array.isArray(equipmentConfig) || equipmentConfig.length === 0) {
        console.error('🚨 CRITICAL: Could not determine equipment configuration from task_data');
        console.error('Task ID:', task.id);
        console.error('Task data:', task.task_data);
        
        showToast({
          variant: 'destructive',
          title: 'Task Configuration Error',
          description: 'This task is missing equipment configuration. Please contact support.'
        });
        setLoading(false);
        return;
      }

      console.log('📦 Building equipment_list from equipment_config (source of truth)');
      console.log('Equipment config:', equipmentConfig);

      // Build equipment list by enriching equipment_config with temperature readings
      equipmentList = equipmentConfig.map((configItem: any) => {
        const assetId = configItem.assetId || configItem.asset_id;
        
        // Strict validation: corrupted data should throw error, not be silently filtered
        if (!assetId) {
          console.error('🚨 CORRUPTED DATA: equipment_config missing asset ID');
          console.error('Task:', task.id);
          console.error('Config item:', configItem);
          throw new Error(`Task ${task.id} has corrupted equipment_config - missing asset ID`);
        }
        
        // Extract temperature reading from formData (primary source)
        let tempReading: number | null = null;
        
        // Primary: temp_${assetId} (user input from form)
        const tempKey = `temp_${assetId}`;
        if (formData[tempKey] !== undefined && formData[tempKey] !== null && formData[tempKey] !== '') {
          const numValue = typeof formData[tempKey] === 'string' 
            ? parseFloat(formData[tempKey]) 
            : formData[tempKey];
          if (!isNaN(numValue) && isFinite(numValue)) {
            tempReading = numValue;
            console.log(`✅ [EQUIPMENT_LIST] Found temperature ${tempReading}°C for asset ${assetId} from formData[${tempKey}]`);
          }
        }
        
        // If not found, try scanning all temp_* keys (handle case where assetId format might differ)
        if (tempReading === null && assetId) {
                Object.keys(formData).forEach(key => {
                  if (key.startsWith('temp_') && key !== 'temp_action') {
                    const keyAssetId = key.replace('temp_', '');
                    // Try multiple matching strategies (ensure both are strings before trim)
                    const assetIdStr = String(assetId || '');
                    const keyAssetIdStr = String(keyAssetId || '');
                    if (keyAssetId === assetId || 
                        keyAssetIdStr === assetIdStr ||
                        (assetIdStr && keyAssetIdStr && keyAssetIdStr.trim() === assetIdStr.trim())) {
                      const numValue = typeof formData[key] === 'string' 
                        ? parseFloat(formData[key])
                        : formData[key];
                if (!isNaN(numValue) && isFinite(numValue)) {
                  tempReading = numValue;
                  console.log(`✅ [EQUIPMENT_LIST] Found temperature ${tempReading}°C for asset ${assetId} via key scan: ${key}`);
                }
              }
            }
          });
        }
        
        // Fallback: Check temperatureRecords (derived from formData, used for DB logging)
        if (tempReading === null) {
          const recordedTemp = temperatureRecords.find(tr => tr.asset_id === assetId);
          if (recordedTemp) {
            tempReading = recordedTemp.reading;
            console.log(`✅ [EQUIPMENT_LIST] Found temperature ${tempReading}°C for asset ${assetId} from temperatureRecords`);
          }
        }
        
        if (tempReading === null) {
          console.warn(`⚠️ [EQUIPMENT_LIST] No temperature found for asset ${assetId}. Checked formData[${tempKey}] and temperatureRecords`);
        }
        
        // Get asset name from assetsMap or use equipment name from config
        const assetName = assetsMap.get(assetId)?.name || 
                          configItem.equipment || 
                          configItem.asset_name || 
                          'Unknown Equipment';
        
        // Calculate status
        const status = calculateTemperatureStatus(
          tempReading,
          configItem.temp_min,
          configItem.temp_max
        );
        
        // Build complete equipment record
        return {
          // Asset identification
          value: assetId,
          asset_id: assetId,
          id: assetId,
          
          // Asset details (from equipment_config - preserved)
          asset_name: assetName,
          equipment: configItem.equipment || assetName,
          nickname: configItem.nickname || '',
          
          // Temperature configuration (from equipment_config - preserved)
          temp_min: configItem.temp_min,
          temp_max: configItem.temp_max,
          
          // Temperature reading (from user input)
          temperature: tempReading,
          reading: tempReading,
          temp: tempReading,
          
          // Status (calculated)
          status: status,
          recorded_at: tempReading !== null ? completedAt : null
        };
      }); // No filter needed - all items are valid (errors thrown above)

      // CRITICAL FALLBACK: If any equipment_list items are missing temperatures, 
      // scan ALL formData temp_* keys and try to match them by asset name or other means
      const equipmentListWithTemps = equipmentList.filter((eq: any) => 
        eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== ''
      );
      const formDataTempKeys = Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action');
      
      if (equipmentListWithTemps.length < equipmentList.length && formDataTempKeys.length > 0) {
        console.log('⚠️ [EQUIPMENT_LIST] Some equipment missing temperatures. Attempting fallback matching...');
        console.log('   Equipment without temps:', equipmentList.length - equipmentListWithTemps.length);
        console.log('   Available temp keys in formData:', formDataTempKeys);
        
        // For each temp_* key in formData, try to find matching equipment
        formDataTempKeys.forEach(tempKey => {
          const keyAssetId = tempKey.replace('temp_', '');
          const tempValue = formData[tempKey];
          
          if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
            const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue;
            if (isNaN(numValue) || !isFinite(numValue)) return;
            
            // Try to find equipment that matches this temp key
            // First try exact assetId match
            let matchedEq = equipmentList.find((eq: any) => 
              eq.asset_id === keyAssetId || 
              String(eq.asset_id) === String(keyAssetId) ||
              eq.id === keyAssetId ||
              String(eq.id) === String(keyAssetId)
            );
            
            // If not found, try matching by asset name (in case assetId format differs)
            if (!matchedEq) {
              const assetFromKey = assetsMap.get(keyAssetId);
              if (assetFromKey) {
                matchedEq = equipmentList.find((eq: any) => 
                  eq.asset_name === assetFromKey.name ||
                  eq.equipment === assetFromKey.name
                );
              }
            }
            
            if (matchedEq && (matchedEq.temperature === null || matchedEq.temperature === undefined || matchedEq.temperature === '')) {
              matchedEq.temperature = numValue;
              matchedEq.reading = numValue;
              matchedEq.temp = numValue;
              
              // Recalculate status
              const min = matchedEq.temp_min;
              const max = matchedEq.temp_max;
              if (min !== undefined && max !== undefined && min !== null && max !== null) {
                const isInvertedRange = min > max;
                if (isInvertedRange) {
                  matchedEq.status = (numValue >= max && numValue <= min) ? 'ok' : 'out_of_range';
                } else {
                  matchedEq.status = (numValue >= min && numValue <= max) ? 'ok' : 'out_of_range';
                }
              }
              
              console.log(`✅ [EQUIPMENT_LIST FALLBACK] Matched temperature ${numValue}°C from ${tempKey} to equipment ${matchedEq.asset_name || matchedEq.equipment}`);
            } else if (!matchedEq) {
              // Last resort: match by index (first temp to first equipment without temp, etc.)
              const equipmentWithoutTemp = equipmentList.filter((eq: any) => 
                eq.temperature === null || eq.temperature === undefined || eq.temperature === ''
              );
              const tempKeyIndex = formDataTempKeys.indexOf(tempKey);
              if (equipmentWithoutTemp.length > 0 && tempKeyIndex < equipmentWithoutTemp.length) {
                const matchedByIndex = equipmentWithoutTemp[tempKeyIndex];
                matchedByIndex.temperature = numValue;
                matchedByIndex.reading = numValue;
                matchedByIndex.temp = numValue;
                
                // Recalculate status
                const min = matchedByIndex.temp_min;
                const max = matchedByIndex.temp_max;
                if (min !== undefined && max !== undefined && min !== null && max !== null) {
                  const isInvertedRange = min > max;
                  if (isInvertedRange) {
                    matchedByIndex.status = (numValue >= max && numValue <= min) ? 'ok' : 'out_of_range';
                  } else {
                    matchedByIndex.status = (numValue >= min && numValue <= max) ? 'ok' : 'out_of_range';
                  }
                }
                
                console.log(`✅ [EQUIPMENT_LIST FALLBACK INDEX] Matched temperature ${numValue}°C from ${tempKey} to equipment ${matchedByIndex.asset_name || matchedByIndex.equipment} by index`);
              }
            }
          }
        });
      }

      console.log(`✅ Built equipment_list: ${equipmentList.length} items`, equipmentList);
      console.log(`✅ Equipment with temperatures: ${equipmentList.filter((eq: any) => eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== '').length} items`);

      // Validation: equipment_list should match equipment_config length
      if (equipmentList.length !== equipmentConfig.length) {
        console.warn('⚠️ Equipment list length mismatch:', {
          configLength: equipmentConfig.length,
          builtLength: equipmentList.length
        });
      }
      
      // Debug logging - CRITICAL: Verify what data is being saved
      console.log('📋 COMPLETION DATA BEING SAVED:', {
        equipmentCount: equipmentList.length,
        equipmentList: equipmentList.map((eq: any) => ({
          asset_id: eq.asset_id,
          asset_name: eq.asset_name,
          temperature: eq.temperature,
          reading: eq.reading,
          temp: eq.temp,
          status: eq.status,
          hasTemperature: eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== ''
        })),
        equipmentListWithTemps: equipmentList.filter((eq: any) => eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== ''),
        equipmentListWithoutTemps: equipmentList.filter((eq: any) => eq.temperature === null || eq.temperature === undefined || eq.temperature === ''),
        temperatureRecordsCount: temperatureRecords.length,
        temperatureRecords,
        formDataTempKeys: Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action'),
        formDataTempValues: Object.keys(formData)
          .filter(k => k.startsWith('temp_') && k !== 'temp_action')
          .reduce((acc: any, key) => {
            acc[key] = formData[key]
            return acc
          }, {}),
        formDataKeys: Object.keys(formData),
        taskData: task.task_data,
        repeatableFieldName: repeatableField?.field_name,
        selectedAssets: selectedAssets.length,
        checklistItems: formData.checklist_items?.length || 0,
        yesNoItems: formData.yes_no_checklist_items?.length || 0,
        notes: formData.notes,
        photos: photoUrls.length
      })
      
      // CRITICAL: Warn if this is a temperature task but no temperatures were captured
      const isTemperatureTask = task.template?.evidence_types?.includes('temperature') || 
                                task.template?.name?.toLowerCase().includes('temperature') ||
                                task.template?.name?.toLowerCase().includes('fridge') ||
                                task.template?.name?.toLowerCase().includes('freezer')
      
      if (isTemperatureTask && equipmentList.length > 0) {
        const tempsWithReadings = equipmentList.filter((eq: any) => 
          eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== ''
        )
        if (tempsWithReadings.length === 0) {
          console.warn('⚠️ TEMPERATURE TASK WARNING: This is a temperature task but NO temperatures were captured in equipment_list!', {
            equipmentCount: equipmentList.length,
            equipmentList: equipmentList,
            formDataTempKeys: Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action'),
            formDataTempValues: Object.keys(formData)
              .filter(k => k.startsWith('temp_') && k !== 'temp_action')
              .reduce((acc: any, key) => {
                acc[key] = formData[key]
                return acc
              }, {})
          })
        } else {
          console.log('✅ TEMPERATURE TASK: Successfully captured', tempsWithReadings.length, 'temperature reading(s)')
        }
      }

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

      // CRITICAL: Log what we're about to save - VERIFY TEMPERATURES ARE INCLUDED
      const equipmentListWithTempsForLogging = completionData.equipment_list?.filter((eq: any) => 
        eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== ''
      ) || []
      
      console.log('💾 SAVING COMPLETION RECORD:', {
        task_id: completionRecord.task_id,
        equipment_list_count: completionData.equipment_list?.length || 0,
        equipment_list_with_temps_count: equipmentListWithTempsForLogging.length,
        equipment_list_with_temps: equipmentListWithTempsForLogging.map((eq: any) => ({
          asset_id: eq.asset_id,
          asset_name: eq.asset_name,
          temperature: eq.temperature,
          reading: eq.reading,
          temp: eq.temp,
          status: eq.status
        })),
        equipment_list_without_temps: completionData.equipment_list?.filter((eq: any) => 
          eq.temperature === null || eq.temperature === undefined || eq.temperature === ''
        ) || [],
        full_equipment_list: completionData.equipment_list,
        temperature_records_count: completionData.temperature_records_count,
        checklist_items_count: completionData.checklist_items?.length || 0,
        yes_no_items_count: completionData.yes_no_checklist_items?.length || 0,
        monitoring_task_id: completionData.monitoring_task_id,
        callout_id: completionData.callout_id,
        has_notes: !!completionData.notes,
        photos_count: completionData.photos?.length || 0,
        completion_data_keys: Object.keys(completionData)
      })
      
      // Final verification: Ensure temperatures are in equipment_list before saving
      if (isTemperatureTask && equipmentListWithTempsForLogging.length === 0 && completionData.equipment_list?.length > 0) {
        console.error('❌ CRITICAL: Temperature task has equipment but NO temperatures in equipment_list!', {
          equipment_list: completionData.equipment_list,
          formData_temp_keys: Object.keys(formData).filter(k => k.startsWith('temp_') && k !== 'temp_action')
        })
      }

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
        // Only create alert if companyId is available (required for RLS policy)
        if (companyId) {
          try {
            const { error: alertError, data } = await supabase
              .from('notifications')
              .insert({
                company_id: companyId,
                profile_id: profile.id,
                type: 'task',
                title: 'Task Completed Late',
                message: `Task "${task.template.name}" was completed late (after ${task.due_time || 'due time'} + 1 hour). Completed at ${completedAtDate.toLocaleString()}.`,
                severity: 'warning', // Required field - must be 'info', 'warning', or 'critical'
                status: 'active',
              })
              .select()
            
            if (alertError) {
              // Better error logging - serialize the error object properly
              const errorMessage = alertError.message || 'Unknown error';
              const errorCode = alertError.code || 'NO_CODE';
              const errorDetails = alertError.details || null;
              const errorHint = alertError.hint || null;
              
              // Build a meaningful error message
              let fullErrorMessage = `Error creating late completion alert: ${errorMessage}`;
              if (errorCode !== 'NO_CODE') {
                fullErrorMessage += ` (code: ${errorCode})`;
              }
              if (errorDetails) {
                fullErrorMessage += ` - Details: ${errorDetails}`;
              }
              if (errorHint) {
                fullErrorMessage += ` - Hint: ${errorHint}`;
              }
              
              // Log the error with proper serialization
              let serializedError = 'Unable to serialize error';
              try {
                // Try to serialize the error object, including all own properties
                const errorKeys = Object.getOwnPropertyNames(alertError);
                serializedError = JSON.stringify(alertError, errorKeys.length > 0 ? errorKeys : undefined);
              } catch (serializeErr) {
                // Fallback: create a simple object representation
                serializedError = `{message: "${errorMessage}", code: "${errorCode}"}`;
              }
              
              console.error(fullErrorMessage, {
                message: errorMessage,
                code: errorCode,
                details: errorDetails,
                hint: errorHint,
                fullError: serializedError
              });
            } else {
              console.log('✅ Late completion alert created', data)
            }
          } catch (alertErr) {
            // Handle unexpected errors
            const errorMessage = alertErr instanceof Error 
              ? alertErr.message 
              : typeof alertErr === 'object' && alertErr !== null
              ? JSON.stringify(alertErr, Object.getOwnPropertyNames(alertErr), 2)
              : String(alertErr)
            console.error('Error creating late completion alert (unexpected error):', errorMessage, alertErr)
          }
        } else {
          console.warn('⚠️ Cannot create late completion alert: companyId is missing')
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

      // Dispatch custom event to notify other components (like completed tasks page)
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: {
          taskId: task.id,
          completedAt: new Date().toISOString()
        }
      }))
      
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
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.06] rounded-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-white/[0.06] p-4 sm:p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-pink-600 dark:text-magenta-400">{(task.custom_name || task.template?.name || 'Unknown Task')?.replace(' (Draft)', '')}</h2>
            {task.template?.compliance_standard && (
              <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
                {task.template.compliance_standard}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-all p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
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
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg">
              <button
                onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-300 uppercase tracking-wide">
                  Instructions
                </h3>
                {instructionsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                )}
              </button>
              {instructionsExpanded && (
                <div className="px-4 pb-4">
                  <div className="text-gray-700 dark:text-white/80 text-sm whitespace-pre-line">
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
            {task.template?.evidence_types?.includes('temperature') && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Temperature Readings
                </label>
                {selectedAssets.length === 0 ? (
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.03]">
                    <p className="text-sm text-gray-600 dark:text-white/60">
                      Loading assets... If assets don't appear, they may not have been selected when the task was created.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAssets.map((asset: any) => {
                    // Get saved temperature from task_data if available
                    const savedTemp = task.task_data?.temperatures?.find((t: any) => t.assetId === asset.id)
                    // Check nickname from multiple sources: 
                    // 1. asset.nickname (for constructed assets or assets loaded with nickname) - PRIORITY
                    // 2. savedTemp.nickname (from task completion data)
                    // 3. repeatable field data (from task_data) - match by ID or by index for temp IDs
                    const repeatableFieldName = task.template?.repeatable_field_name
                    const repeatableData = repeatableFieldName ? (task.task_data?.[repeatableFieldName] as any[]) : null
                    let repeatableItem = null
                    
                    if (repeatableData) {
                      // Try to match by ID first
                      // Handle nested structure where id/value/asset_id might be objects with assetId property
                      repeatableItem = repeatableData.find((item: any) => {
                        // Extract asset ID from various possible structures
                        let itemId: string | null = null
                        
                        // Check direct properties first
                        if (typeof item.assetId === 'string') {
                          itemId = item.assetId
                        } else if (typeof item.asset_id === 'string') {
                          itemId = item.asset_id
                        } else if (typeof item.id === 'string') {
                          itemId = item.id
                        } else if (typeof item.value === 'string') {
                          itemId = item.value
                        }
                        // Check nested structures (objects with assetId property)
                        else if (item.id && typeof item.id === 'object' && item.id.assetId) {
                          itemId = item.id.assetId
                        } else if (item.value && typeof item.value === 'object' && item.value.assetId) {
                          itemId = item.value.assetId
                        } else if (item.asset_id && typeof item.asset_id === 'object' && item.asset_id.assetId) {
                          itemId = item.asset_id.assetId
                        } else if (item.assetId && typeof item.assetId === 'object' && item.assetId.assetId) {
                          itemId = item.assetId.assetId
                        }
                        
                        return itemId === asset.id
                      })
                      
                      // If no match by ID and asset has temp ID, try to match by index
                      if (!repeatableItem && asset.id?.startsWith('temp_')) {
                        const tempIndex = parseInt(asset.id.replace('temp_', ''))
                        if (!isNaN(tempIndex) && repeatableData[tempIndex]) {
                          repeatableItem = repeatableData[tempIndex]
                        }
                      }
                      
                      // Also check _originalData if asset was constructed
                      if (!repeatableItem && asset._originalData) {
                        repeatableItem = asset._originalData
                      }
                    }
                    
                    // Extract nickname - check multiple sources with priority:
                    // 1. asset.nickname (loaded from repeatable field/equipment_config when asset was loaded) - HIGHEST PRIORITY
                    // 2. repeatableItem.nickname (from current repeatable field data)
                    // 3. Nested structures in repeatableItem
                    // 4. equipment_config (fallback for monitoring tasks where repeatable field might be empty)
                    // 5. savedTemp.nickname (from completion data)
                    // 6. Empty string as fallback
                    let nickname = asset.nickname || 
                                   repeatableItem?.nickname ||
                                   (repeatableItem?.id && typeof repeatableItem.id === 'object' ? repeatableItem.id.nickname : null) ||
                                   (repeatableItem?.value && typeof repeatableItem.value === 'object' ? repeatableItem.value.nickname : null) ||
                                   (repeatableItem?.asset_id && typeof repeatableItem.asset_id === 'object' ? repeatableItem.asset_id.nickname : null) ||
                                   ''
                    
                    // FALLBACK 1: Check equipment_config from task_data (especially for monitoring tasks)
                    if (!nickname && task.task_data?.equipment_config && Array.isArray(task.task_data.equipment_config)) {
                      const configItem = task.task_data.equipment_config.find((item: any) => {
                        const itemId = item.assetId || item.asset_id || item.id || item.value
                        const itemIdStr = typeof itemId === 'string' 
                          ? itemId 
                          : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                        return itemIdStr === assetId || String(itemIdStr) === String(assetId)
                      })
                      
                      if (configItem) {
                        nickname = configItem.nickname || 
                                  (configItem.id && typeof configItem.id === 'object' ? configItem.id.nickname : null) ||
                                  (configItem.value && typeof configItem.value === 'object' ? configItem.value.nickname : null) ||
                                  ''
                      }
                    }
                    
                    // FALLBACK 2: Check site_checklist equipment_config (for monitoring tasks where task_data is empty)
                    if (!nickname && siteChecklistEquipmentConfig.length > 0) {
                      const configItem = siteChecklistEquipmentConfig.find((item: any) => {
                        const itemId = item.assetId || item.asset_id || item.id || item.value
                        const itemIdStr = typeof itemId === 'string' 
                          ? itemId 
                          : (itemId && typeof itemId === 'object' ? (itemId.id || itemId.value || itemId.assetId) : null)
                        return itemIdStr === assetId || String(itemIdStr) === String(assetId)
                      })
                      
                      if (configItem) {
                        nickname = configItem.nickname || ''
                        console.log(`✅ [NICKNAME] Found nickname "${nickname}" from site_checklist equipment_config for asset ${assetId}`)
                      } else {
                        console.log(`⚠️ [NICKNAME] Asset ${assetId} not found in site_checklist equipment_config (${siteChecklistEquipmentConfig.length} items)`)
                      }
                    } else if (!nickname && isMonitoringTask) {
                      console.log(`⚠️ [NICKNAME] No site_checklist equipment_config available for monitoring task (length: ${siteChecklistEquipmentConfig.length})`)
                    }
                    
                    // FINAL FALLBACK: Check savedTemp
                    if (!nickname) {
                      nickname = savedTemp?.nickname || ''
                      if (nickname) {
                        console.log(`✅ [NICKNAME] Found nickname "${nickname}" from savedTemp for asset ${assetId}`)
                      }
                    }
                    
                    // CRITICAL DEBUG: Log final nickname status
                    if (!nickname && isMonitoringTask) {
                      console.error(`❌ [NICKNAME] CRITICAL: No nickname found for monitoring task asset ${assetId} after all fallbacks!`, {
                        assetNickname: asset.nickname,
                        repeatableItemNickname: repeatableItem?.nickname,
                        hasRepeatableItem: !!repeatableItem,
                        hasEquipmentConfig: !!task.task_data?.equipment_config,
                        equipmentConfigLength: task.task_data?.equipment_config?.length || 0,
                        siteChecklistConfigLength: siteChecklistEquipmentConfig.length,
                        savedTempNickname: savedTemp?.nickname
                      })
                    }
                    const displayLabel = nickname 
                      ? `${asset.name} | ${nickname}`
                      : asset.name
                    
                    const assetId = asset.id
                    let range = assetTempRanges.get(assetId)
                    
                    // Debug logging for nickname and range
                    if (!nickname) {
                      console.log(`⚠️ [TEMP FIELD] No nickname found for asset ${assetId}:`, {
                        assetNickname: asset.nickname,
                        savedTempNickname: savedTemp?.nickname,
                        repeatableItemNickname: repeatableItem?.nickname,
                        nestedNicknameFromId: repeatableItem?.id && typeof repeatableItem.id === 'object' ? repeatableItem.id.nickname : null,
                        nestedNicknameFromValue: repeatableItem?.value && typeof repeatableItem.value === 'object' ? repeatableItem.value.nickname : null,
                        hasRepeatableItem: !!repeatableItem,
                        repeatableItemKeys: repeatableItem ? Object.keys(repeatableItem) : null,
                        assetName: asset.name
                      })
                    }
                    if (!range) {
                      console.log(`⚠️ [TEMP FIELD] No range found for asset ${assetId}:`, {
                        hasRangeInMap: assetTempRanges.has(assetId),
                        isTempId: assetId?.startsWith('temp_'),
                        hasRepeatableItem: !!repeatableItem,
                        repeatableItemKeys: repeatableItem ? Object.keys(repeatableItem) : null,
                        nestedTempMinFromId: repeatableItem?.id && typeof repeatableItem.id === 'object' ? repeatableItem.id.temp_min : null,
                        nestedTempMaxFromId: repeatableItem?.id && typeof repeatableItem.id === 'object' ? repeatableItem.id.temp_max : null,
                        nestedTempMinFromValue: repeatableItem?.value && typeof repeatableItem.value === 'object' ? repeatableItem.value.temp_min : null,
                        nestedTempMaxFromValue: repeatableItem?.value && typeof repeatableItem.value === 'object' ? repeatableItem.value.temp_max : null
                      })
                    }
                    
                    // Fallback: If range not found in map, try multiple sources
                    if (!range) {
                      // PRIORITY 1: Check equipment_config (saved when task was created from template)
                      const equipmentConfig = task.task_data?.equipment_config
                      if (equipmentConfig && Array.isArray(equipmentConfig)) {
                        let configItem = null
                        // Try to match by asset ID first
                        configItem = equipmentConfig.find((item: any) => {
                          const itemId = item.assetId || item.asset_id || item.id
                          return itemId === assetId
                        })
                        // If no match and it's a temp ID, try by index
                        if (!configItem && assetId?.startsWith('temp_')) {
                          const tempIndex = parseInt(assetId.replace('temp_', ''))
                          if (!isNaN(tempIndex) && equipmentConfig[tempIndex]) {
                            configItem = equipmentConfig[tempIndex]
                          }
                        }
                        // Also check if asset has _originalData that matches
                        if (!configItem && asset._originalData) {
                          const originalId = asset._originalData.assetId || asset._originalData.asset_id || asset._originalData.id
                          configItem = equipmentConfig.find((item: any) => {
                            const itemId = item.assetId || item.asset_id || item.id
                            return itemId === originalId
                          })
                        }
                        
                        if (configItem) {
                          const tempMin = configItem.temp_min !== undefined ? configItem.temp_min : null
                          const tempMax = configItem.temp_max !== undefined ? configItem.temp_max : null
                          if (tempMin !== null || tempMax !== null) {
                            range = { min: tempMin, max: tempMax }
                            setAssetTempRanges(prev => {
                              const newMap = new Map(prev)
                              newMap.set(assetId, range!)
                              return newMap
                            })
                            console.log(`✅ [TEMP FIELD] Loaded range from equipment_config for ${assetId}:`, range)
                          }
                        }
                      }
                      
                      // PRIORITY 2: Try repeatableItem (already matched above)
                      // Handle nested structure where temp_min/temp_max might be in id/value/asset_id objects
                      if (!range && repeatableItem) {
                        let tempMin: number | null = null
                        let tempMax: number | null = null
                        
                        // Check direct properties first
                        if (repeatableItem.temp_min !== undefined) {
                          tempMin = repeatableItem.temp_min
                        }
                        if (repeatableItem.temp_max !== undefined) {
                          tempMax = repeatableItem.temp_max
                        }
                        
                        // Check nested structures (objects with temp_min/temp_max properties)
                        if (tempMin === null || tempMax === null) {
                          const nestedSource = repeatableItem.id || repeatableItem.value || repeatableItem.asset_id
                          if (nestedSource && typeof nestedSource === 'object') {
                            if (tempMin === null && nestedSource.temp_min !== undefined) {
                              tempMin = nestedSource.temp_min
                            }
                            if (tempMax === null && nestedSource.temp_max !== undefined) {
                              tempMax = nestedSource.temp_max
                            }
                          }
                        }
                        
                        if (tempMin !== null || tempMax !== null) {
                          range = { min: tempMin, max: tempMax }
                          setAssetTempRanges(prev => {
                            const newMap = new Map(prev)
                            newMap.set(assetId, range!)
                            return newMap
                          })
                          console.log(`✅ [TEMP FIELD] Loaded range from repeatableItem for ${assetId}:`, range)
                        }
                      }
                      
                      // PRIORITY 3: If still no range and it's a temp ID, try to get from repeatableData by index
                      // Handle nested structure where temp_min/temp_max might be in id/value/asset_id objects
                      if (!range && assetId?.startsWith('temp_') && repeatableData) {
                        const tempIndex = parseInt(assetId.replace('temp_', ''))
                        if (!isNaN(tempIndex) && repeatableData[tempIndex]) {
                          const item = repeatableData[tempIndex]
                          let tempMin: number | null = null
                          let tempMax: number | null = null
                          
                          // Check direct properties first
                          if (item.temp_min !== undefined) {
                            tempMin = item.temp_min
                          }
                          if (item.temp_max !== undefined) {
                            tempMax = item.temp_max
                          }
                          
                          // Check nested structures
                          if (tempMin === null || tempMax === null) {
                            const nestedSource = item.id || item.value || item.asset_id
                            if (nestedSource && typeof nestedSource === 'object') {
                              if (tempMin === null && nestedSource.temp_min !== undefined) {
                                tempMin = nestedSource.temp_min
                              }
                              if (tempMax === null && nestedSource.temp_max !== undefined) {
                                tempMax = nestedSource.temp_max
                              }
                            }
                          }
                          
                          if (tempMin !== null || tempMax !== null) {
                            range = { min: tempMin, max: tempMax }
                            setAssetTempRanges(prev => {
                              const newMap = new Map(prev)
                              newMap.set(assetId, range!)
                              return newMap
                            })
                            console.log(`✅ [TEMP FIELD] Loaded range from repeatableData by index for ${assetId}:`, range)
                          }
                        }
                      }
                    }
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
                      <div key={assetId} className="space-y-3 border border-gray-200 dark:border-white/[0.08] rounded-lg p-4 bg-gray-50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                          {/* Asset Name | Nickname */}
                          <div className="flex-1 min-w-0">
                            {nickname ? (
                              <div className="flex items-baseline gap-2">
                                <p className="text-pink-600 dark:text-magenta-400 font-medium">{asset.name}</p>
                                <span className="text-pink-600 dark:text-magenta-400 font-bold text-xl">|</span>
                                <p className="text-pink-500 dark:text-magenta-300 font-bold text-xl">{nickname}</p>
                              </div>
                            ) : (
                              <p className="text-pink-600 dark:text-magenta-400 font-medium">{asset.name}</p>
                            )}
                            {asset.site_name && (
                              <p className="text-xs text-gray-600 dark:text-white/60 mt-0.5">{asset.site_name}</p>
                            )}
                            {/* Temperature Range - CRITICAL for monitoring tasks */}
                            {range && (range.min !== null || range.max !== null) && (
                              <p className="text-xs text-gray-600 dark:text-white/60 mt-1">
                                Range: {
                                  range.min !== null && range.max !== null
                                    ? `${range.min}°C - ${range.max}°C`
                                    : range.min !== null
                                    ? `≥ ${range.min}°C`
                                    : range.max !== null
                                    ? `≤ ${range.max}°C`
                                    : ''
                                }
                              </p>
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
                              className={`w-24 px-3 py-2 bg-white dark:bg-white/[0.03] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none transition-colors text-sm text-center ${
                                outOfRangeAssets.has(assetId)
                                  ? 'border-red-500 focus:border-red-500'
                                  : 'border-gray-300 dark:border-white/[0.06] focus:border-pink-500'
                              }`}
                            />
                            <span className="text-sm text-gray-600 dark:text-white/60">°C</span>
                          </div>
                        </div>
                        
                        {/* Temperature Warning - Show for out of range asset */}
                        {(() => {
                          // Debug: Log when warning should show
                          if (outOfRangeAssets.has(assetId)) {
                            console.log(`🚨 Rendering warning for asset ${assetId} - temp: ${tempValue}°C, range:`, range)
                          }
                          return null
                        })()}
                        {outOfRangeAssets.has(assetId) && (
                          <div className="ml-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                                  Temperature Out of Range
                                </p>
                                <p className="text-xs text-red-700/90 dark:text-red-300/80 mb-3">
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
                                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-yellow-500/20 border border-orange-300 dark:border-yellow-500/50 text-orange-700 dark:text-yellow-400 rounded-lg hover:bg-orange-100 dark:hover:bg-yellow-500/30 transition-colors text-xs font-medium"
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
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors text-xs font-medium"
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
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06] space-y-3">
                            <p className="text-xs font-medium text-gray-700 dark:text-white/70 uppercase tracking-wide">Questions</p>
                            {assetRelatedQuestions.map((item: any, idx: number) => {
                              const itemText = item.text || `Question ${idx + 1}`;
                              const currentAnswer = item.answer || null;
                              const questionKey = `yesno_${assetId}_${idx}`;
                              const showActions = showActionOptions.get(questionKey) || false;
                              const selectedAction = selectedActions.get(questionKey);
                              
                              return (
                                <div key={idx} className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg p-3">
                                  <p className="text-gray-900 dark:text-white/90 text-sm mb-2">{itemText}</p>
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
                                          ? 'bg-green-50 dark:bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400'
                                          : 'bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
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
                                          ? 'bg-red-50 dark:bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400'
                                          : 'bg-white dark:bg-white/[0.03] border-gray-300 dark:border-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
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
                )}
              </div>
            )}
            
            {/* Temperature Field - Show when template has temperature evidence */}
            {(task.template?.evidence_types?.includes('temperature') ||
              task.template?.slug === 'hot_holding_temperature_verification' ||
              task.template?.slug === 'hot-holding-temps' ||
              (task.template?.name && task.template.name.toLowerCase().includes('hot holding'))
            ) && (() => {
              // Check for equipment select fields (legacy and new field names)
              // Note: asset_name can be both a select field AND a repeatable field name
              // We need to check if it's used as a select dropdown (has options) vs asset selection
              const equipmentField = templateFields.find((f: any) => 
                f.field_type === 'select' && 
                (f.field_name === 'fridge_name' || 
                 f.field_name === 'hot_holding_unit' || 
                 f.field_name === 'equipment_name' ||
                 f.field_name === 'asset_name')
              )
              const temperatureField = templateFields.find((f: any) => 
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
                temperatureFieldFound: !!temperatureField,
                temperatureFieldName: temperatureField?.field_name,
                equipmentFieldFound: !!equipmentField,
                equipmentFieldName: equipmentField?.field_name,
                equipmentOptionsCount: equipmentOptions.length,
                selectedAssetsCount: selectedAssets.length,
                repeatableFieldName: task.template?.repeatable_field_name
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
              
              // Only hide if using asset selection AND no temperature field exists
              // If temperature field exists, always show it (even if using asset selection)
              if (usesAssetSelection && isRepeatableAssetSelection && !equipmentFieldHasOptions && !temperatureField) {
                return null
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
                              {nickname ? (
                                <div className="flex items-baseline gap-2">
                                  <p className="text-magenta-400 font-medium">{assetName}</p>
                                  <span className="text-magenta-400 font-bold text-xl">|</span>
                                  <p className="text-magenta-300 font-bold text-xl">{nickname}</p>
                                </div>
                              ) : (
                                <p className="text-magenta-400 font-medium">{typeof equipmentLabel === 'string' ? equipmentLabel : assetName}</p>
                              )}
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
                                      const tempField = temperatureField ?? templateFields.find((f: any) => 
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
                            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' 
                            : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                              isFailed ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                            }`} />
                            <div className="flex-1">
                              <h4 className={`text-sm font-semibold mb-1 ${
                                isFailed ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {isFailed ? 'Temperature Critical' : 'Temperature Out of Range'} - {displayName}
                              </h4>
                              <p className={`text-sm mb-2 ${
                                isFailed ? 'text-red-700/90 dark:text-red-300/80' : 'text-yellow-700/90 dark:text-yellow-300/80'
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
                                    isFailed ? 'text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300' : 'text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300'
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
                                    ? 'bg-orange-50 dark:bg-yellow-500/20 border-orange-300 dark:border-yellow-500/50'
                                    : 'bg-orange-50/50 dark:bg-yellow-500/10 border-orange-200 dark:border-yellow-500/30 hover:bg-orange-100 dark:hover:bg-yellow-500/20'
                                }`}
                              >
                                <Monitor className="h-5 w-5 text-orange-600 dark:text-yellow-400" />
                                <div>
                                  <p className="text-sm font-medium text-orange-900 dark:text-white">Monitor</p>
                                  <p className="text-xs text-orange-700/80 dark:text-white/60">Schedule a follow-up check</p>
                                </div>
                              </button>
                              <button
                                onClick={() => handleCalloutAction(assetId)}
                                className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors text-left ${
                                  selectedActionForAsset === 'callout'
                                    ? 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/50'
                                    : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                                }`}
                              >
                                <PhoneCall className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <div>
                                  <p className="text-sm font-medium text-red-900 dark:text-white">Place Callout</p>
                                  <p className="text-xs text-red-700/80 dark:text-white/60">Contact contractor immediately</p>
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
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' 
                          : 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30'
                      }`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                            isCritical
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`} />
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold mb-1 ${
                              isCritical
                                ? 'text-red-700 dark:text-red-400' 
                                : 'text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {isCritical ? 'Temperature Critical' : 'Temperature Out of Range'}
                            </h4>
                            <p className={`text-sm mb-2 ${
                              isCritical
                                ? 'text-red-700/90 dark:text-red-300/80' 
                                : 'text-yellow-700/90 dark:text-yellow-300/80'
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
                                  isCritical ? 'text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300' : 'text-yellow-700 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300'
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
                                ? 'bg-orange-50 dark:bg-yellow-500/20 border-orange-300 dark:border-yellow-500/50'
                                : 'bg-orange-50/50 dark:bg-yellow-500/10 border-orange-200 dark:border-yellow-500/30 hover:bg-orange-100 dark:hover:bg-yellow-500/20'
                            }`}
                          >
                            <Monitor className="h-5 w-5 text-orange-600 dark:text-yellow-400" />
                            <div>
                              <p className="text-sm font-medium text-orange-900 dark:text-white">Monitor</p>
                              <p className="text-xs text-orange-700/80 dark:text-white/60">Schedule a follow-up check</p>
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
                                ? 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/50'
                                : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                            }`}
                          >
                            <PhoneCall className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <div>
                              <p className="text-sm font-medium text-red-900 dark:text-white">Place Callout</p>
                              <p className="text-xs text-red-700/80 dark:text-white/60">Contact contractor immediately</p>
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
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="Add any additional notes or observations..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
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
                  // PPM tasks should not show "View PPM Schedule" - user should place callout first
                  // Return null to hide this quick navigation section
                  return null
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
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-all"
                  >
                    <Camera className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    <span className="text-gray-900 dark:text-white/90 font-medium">Add Photos</span>
                  </label>
                  
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-white/[0.06]"
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
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-white/[0.06] p-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-transparent text-pink-600 dark:text-magenta-400 border border-pink-500 dark:border-magenta-500 rounded-lg hover:bg-pink-50 dark:hover:shadow-lg dark:hover:shadow-pink-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            {loading ? 'Completing...' : 'Complete Task'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-300 dark:border-white/[0.06] text-gray-900 dark:text-white/90 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          initialCalloutType={(() => {
            // PPM tasks should use 'ppm' callout type for preventative maintenance
            const taskData = task.task_data as any
            const isPPMTask = taskData?.source_type === 'ppm_overdue' || taskData?.source_type === 'ppm_service'
            return isPPMTask ? 'ppm' : 'reactive'
          })()}
          requireTroubleshoot={(() => {
            // PPM tasks should NOT require troubleshooting - they're scheduled maintenance
            const taskData = task.task_data as any
            const isPPMTask = taskData?.source_type === 'ppm_overdue' || taskData?.source_type === 'ppm_service'
            
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

      {/* Document Review Modal */}
      {documentData && (
        <DocumentReviewModal
          isOpen={showDocumentReviewModal}
          onClose={() => {
            setShowDocumentReviewModal(false)
          }}
          documentId={documentData.id}
          documentName={documentData.name}
          currentExpiryDate={documentData.expiry_date}
          currentVersion={documentData.version}
          currentFilePath={documentData.file_path}
          onSuccess={async () => {
            // After document review is complete, mark the task as completed
            setShowDocumentReviewModal(false)
            // Complete the task normally (skip document review check)
            await handleSubmit(true)
          }}
        />
      )}
    </div>
  )
}
