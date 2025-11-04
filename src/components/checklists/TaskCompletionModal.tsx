'use client'

import { X, Camera, Thermometer, FileText, CheckCircle2, AlertCircle, Save, ChevronDown, ChevronUp, Monitor, PhoneCall, ExternalLink, Download } from 'lucide-react'
import { ChecklistTaskWithTemplate, TaskCompletionPayload } from '@/types/checklist-types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppContext } from '@/context/AppContext'
import MonitorDurationModal from './MonitorDurationModal'
import { useToast } from '@/components/ui/ToastProvider'
import { isCompletedOutsideWindow, isCompletedLate } from '@/utils/taskTiming'
import CalloutModal from '@/components/modals/CalloutModal'
import { handleWorkflow } from './workflows'
import type { ComplianceTemplate } from '@/data/compliance-templates'
import Image from 'next/image'
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
      
      // Initialize form data with task data FIRST (before loading template fields)
      const initialData: Record<string, any> = {}
      
      // CRITICAL: Load repeatable field data (selected assets) from task_data
      // This is essential for equipment_list to be built correctly
      if (task.template?.repeatable_field_name) {
        const repeatableFieldName = task.template.repeatable_field_name
        if (taskData[repeatableFieldName] && Array.isArray(taskData[repeatableFieldName])) {
          // Load assets from task_data (assets chosen when task was created)
          initialData[repeatableFieldName] = taskData[repeatableFieldName]
          console.log('📦 Loaded repeatable field data from task_data:', {
            fieldName: repeatableFieldName,
            assetCount: taskData[repeatableFieldName].length,
            assets: taskData[repeatableFieldName]
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
      }
      
      // Load temperature logs from task data
      // Initialize temperature values for each asset from saved temperatures
      if (taskData.temperatures && Array.isArray(taskData.temperatures)) {
        initialData.temperatures = taskData.temperatures;
        // Map temperatures to formData by assetId for quick access
        taskData.temperatures.forEach((temp: any) => {
          if (temp.assetId) {
            initialData[`temp_${temp.assetId}`] = temp.temp;
          }
        });
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
      loadTaskResources(taskData).then(() => {
        // Load asset temp ranges after assets are loaded
        loadAssetTempRanges();
      })
      
      // Then load template fields (which will preserve existing formData)
      const initialize = async () => {
        await loadTemplateFields()
        // Asset temp ranges will be loaded after assets are loaded in loadTaskResources
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task])

  // Load task resources (assets, libraries, SOPs, RAs) from task_data
  async function loadTaskResources(taskData: Record<string, any>) {
    try {
      // Load selected assets
      if (taskData.selectedAssets && Array.isArray(taskData.selectedAssets) && taskData.selectedAssets.length > 0) {
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, name, category, site_id, sites(id, name)')
          .in('id', taskData.selectedAssets);
        
        if (!assetsError && assetsData) {
          const assetsWithSite = assetsData.map((asset: any) => {
            const site = Array.isArray(asset.sites) ? asset.sites[0] : asset.sites;
            return {
              ...asset,
              site_name: site?.name || 'No site assigned'
            };
          });
          setSelectedAssets(assetsWithSite);
        }
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
            .select('id, drink_name, category')
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
      const { data, error } = await supabase
        .from('template_fields')
        .select('*')
        .eq('template_id', task.template_id)
        .order('field_order')
      
      if (error) throw error
      
      setTemplateFields(data || [])
      
      // Initialize form data with default values for each field type
      // IMPORTANT: Preserve existing formData (like checklist_items from task_data)
      // Use functional update to ensure we're working with the latest formData
      setFormData(prevFormData => {
        const initialFormData: Record<string, any> = { ...prevFormData }
        data?.forEach((field: any) => {
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
      
      // Load assets for equipment information (check both fridge_name and hot_holding_unit)
      const equipmentField = data?.find((f: any) => 
        f.field_type === 'select' && 
        (f.field_name === 'fridge_name' || f.field_name === 'hot_holding_unit')
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

  const loadAssetTempRanges = async () => {
    try {
      const ranges = new Map<string, { min: number | null, max: number | null }>()
      const assets = new Map<string, { name: string }>()
      
      // Load asset temperature ranges for template's linked asset
      if (task.template?.asset_id) {
        const { data: asset, error } = await supabase
          .from('assets')
          .select('id, name, working_temp_min, working_temp_max')
          .eq('id', task.template.asset_id)
          .single()
        
        if (!error && asset) {
          ranges.set(asset.id, { min: asset.working_temp_min, max: asset.working_temp_max })
          assets.set(asset.id, { name: asset.name })
        }
      }

      // Load ranges for selected assets from task_data
      if (selectedAssets.length > 0) {
        const assetIds = selectedAssets.map(a => a.id).filter(Boolean)
        if (assetIds.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from('assets')
            .select('id, name, working_temp_min, working_temp_max')
            .in('id', assetIds)
          
          if (!assetsError && assetsData) {
            assetsData.forEach(a => {
              ranges.set(a.id, { min: a.working_temp_min, max: a.working_temp_max })
              assets.set(a.id, { name: a.name })
            })
          }
        }
      }

      // Also load ranges for assets referenced in repeatable fields (equipment lists) - legacy support
      const currentFields = templateFields.length > 0 ? templateFields : await (async () => {
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
        const assetIds = equipmentField.options.map((opt: any) => opt.value).filter(Boolean)
        if (assetIds.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from('assets')
            .select('id, name, working_temp_min, working_temp_max')
            .in('id', assetIds)
          
          if (!assetsError && assetsData) {
            assetsData.forEach(a => {
              ranges.set(a.id, { min: a.working_temp_min, max: a.working_temp_max })
              assets.set(a.id, { name: a.name })
            })
          }
        }
      }
      
      setAssetTempRanges(ranges)
      setAssetsMap(prev => new Map([...prev, ...assets]))
    } catch (error) {
      console.error('Error loading asset temperature ranges:', error)
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

      // Copy original task's task_data to preserve all assets, temperatures, and features
      // This ensures the monitoring task has the same look and feel as the original
      let monitoringTaskData: Record<string, any> = {}
      if (task.task_data && typeof task.task_data === 'object') {
        // Deep copy the original task_data
        monitoringTaskData = JSON.parse(JSON.stringify(task.task_data))
        
        // Update the temperature that triggered this monitoring task
        if (monitoringTaskData.temperatures && Array.isArray(monitoringTaskData.temperatures)) {
          const tempIndex = monitoringTaskData.temperatures.findIndex((t: any) => t.assetId === targetAssetId)
          if (tempIndex !== -1) {
            // Update existing temperature entry
            monitoringTaskData.temperatures[tempIndex] = {
              ...monitoringTaskData.temperatures[tempIndex],
              temp: tempValue,
              recorded_at: now.toISOString()
            }
          } else {
            // Add new temperature entry if not found
            monitoringTaskData.temperatures.push({
              assetId: targetAssetId,
              temp: tempValue,
              nickname: '',
              recorded_at: now.toISOString()
            })
          }
        } else {
          // Initialize temperatures array if it doesn't exist
          monitoringTaskData.temperatures = [{
            assetId: targetAssetId,
            temp: tempValue,
            nickname: '',
            recorded_at: now.toISOString()
          }]
        }
        
        // Preserve selectedAssets, libraries, SOPs, RAs, etc. - all from original task
        // This ensures monitoring task shows the same assets with temperature fields, warnings, etc.
      } else {
        // If no task_data, create basic structure with the asset that triggered monitoring
        monitoringTaskData = {
          selectedAssets: task.task_data?.selectedAssets || selectedAssets.map(a => a.id),
          temperatures: [{
            assetId: targetAssetId,
            temp: tempValue,
            nickname: '',
            recorded_at: now.toISOString()
          }]
        }
      }

      // Create monitoring task based on original template
      const { data: monitoringTask, error: taskError } = await supabase
        .from('checklist_tasks')
        .insert({
          template_id: task.template_id,
          company_id: companyId,
          site_id: siteId,
          due_date: now.toISOString().split('T')[0], // Today's date
          due_time: dueDate.toTimeString().slice(0, 5), // HH:MM format
          daypart: task.daypart || 'during_service',
          assigned_to_role: task.template.assigned_to_role || null,
          assigned_to_user_id: task.assigned_to_user_id || null,
          status: 'pending',
          priority: 'high', // Monitoring tasks are high priority
          flagged: true,
          flag_reason: 'monitoring', // Mark as monitoring task
          generated_at: new Date().toISOString(),
          expires_at: dueDate.toISOString(),
          task_data: monitoringTaskData, // Include all assets, temperatures, and features from original task
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

  const checkTemperatureRange = (temp: number, assetId: string | null): boolean => {
    if (!assetId || isNaN(temp)) return false
    
    const range = assetTempRanges.get(assetId)
    if (!range) return false
    
    const { min, max } = range
    if (min === null && max === null) return false
    
    // Check if temperature is outside the working range
    const isOutOfRange = 
      (min !== null && temp < min) || 
      (max !== null && temp > max)
    
    return isOutOfRange
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Check for temperature warnings
    if (fieldName === 'temperature') {
      // Check against template's linked asset
      if (task.template?.asset_id) {
        const isOutOfRange = checkTemperatureRange(value, task.template.asset_id)
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
        temp_action_asset_id: formData.temp_action_asset_id || null
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

      const { data: insertedRecord, error: completionError } = await supabase
        .from('task_completion_records')
        .insert(completionRecord)
        .select()
        .single()

      if (completionError) {
        const errorDetails = {
          message: completionError.message || 'Unknown error',
          code: completionError.code || 'UNKNOWN',
          details: completionError.details || null,
          hint: completionError.hint || null,
          attemptedData: completionRecord
        }
        console.error('❌ Task completion record error:', JSON.stringify(errorDetails, null, 2))
        throw new Error(`Failed to create completion record: ${completionError.message}`)
      }

      // Verify the record was saved correctly
      if (insertedRecord) {
        console.log('✅ COMPLETION RECORD SAVED SUCCESSFULLY:', {
          record_id: insertedRecord.id,
          task_id: insertedRecord.task_id,
          equipment_list_in_db: insertedRecord.completion_data?.equipment_list?.length || 0,
          completion_data_keys: Object.keys(insertedRecord.completion_data || {})
        })
      } else {
        console.warn('⚠️ Completion record inserted but no data returned')
      }

      // Update task status to completed
      const { error: updateError } = await supabase
        .from('checklist_tasks')
        .update({
          status: 'completed',
          completed_at: completedAt,
          completed_by: profile.id
        })
        .eq('id', task.id)

      if (updateError) {
        console.error('Task update error:', updateError)
        throw new Error(`Failed to update task status: ${updateError.message}`)
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
      const isMonitoringTask = task.flag_reason === 'monitoring'
      
      if (isMonitoringTask) {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-white/[0.06] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/[0.06] p-6 flex items-start justify-between">
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
                    const tempValue = formData[`temp_${assetId}`] || savedTemp?.temp || ''
                    
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
                              step="0.1"
                              placeholder="°C"
                              value={tempValue}
                              onChange={(e) => {
                                const inputValue = e.target.value
                                // Handle empty string or parse the number (supports negative numbers)
                                const temp = inputValue === '' ? NaN : parseFloat(inputValue)
                                const isValidTemp = !isNaN(temp) && inputValue !== ''
                                
                                // Only update form data if we have a valid number
                                if (isValidTemp) {
                                  handleFieldChange(`temp_${assetId}`, temp)
                                } else if (inputValue === '') {
                                  // Clear the field if empty
                                  handleFieldChange(`temp_${assetId}`, '')
                                }
                                
                                // Check if temp is out of range using asset's working temperature ranges from assets table
                                let isOutOfRange = false
                                
                                // Only check range if we have a valid temperature and a range to check against
                                if (isValidTemp && range && (range.min !== null || range.max !== null)) {
                                  // Check if temperature is below minimum (works for negative numbers like -20 < -18)
                                  if (range.min !== null && temp < range.min) {
                                    isOutOfRange = true
                                  }
                                  // Check if temperature is above maximum
                                  if (range.max !== null && temp > range.max) {
                                    isOutOfRange = true
                                  }
                                } else if (isValidTemp && !range) {
                                  // Debug: Log if range is missing for this asset
                                  console.warn(`No temperature range loaded for asset ${assetId}`)
                                }
                                
                                // Update out-of-range assets set independently
                                // Support both positive and negative temperatures (e.g., freezers at -18°C)
                                if (isOutOfRange && isValidTemp) {
                                  // Add to out-of-range set - this triggers the warning display
                                  setOutOfRangeAssets(prev => {
                                    const newSet = new Set(prev)
                                    newSet.add(assetId)
                                    return newSet
                                  })
                                  // Don't auto-show action options - let user choose when they're ready
                                  // User will see the warning and can click the buttons to choose Monitor or Callout
                                } else if (isValidTemp) {
                                  // Temperature is valid and in range - remove from out-of-range set
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
                                
                                {/* Action Options */}
                                {!showActionOptions.get(assetId) ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowActionOptions(prev => new Map(prev).set(assetId, true))
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-xs"
                                    >
                                      <Monitor className="w-3 h-3" />
                                      Schedule Monitor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCalloutAction(assetId)}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                      Place Callout
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs text-white/60 mb-2">Choose an action:</p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedActions(prev => new Map(prev).set(assetId, 'monitor'))
                                        setOutOfRangeAssetId(assetId)
                                        handleMonitorAction(assetId)
                                      }}
                                      className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                        selectedActions.get(assetId) === 'monitor'
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
                                      onClick={() => handleCalloutAction(assetId)}
                                      className={`w-full flex items-center gap-2 p-2 border rounded-lg transition-colors text-left text-sm ${
                                        selectedActions.get(assetId) === 'callout'
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
            
            {/* Legacy Temperature Field - Only show if no selected assets but template has temperature evidence */}
            {task.template?.evidence_types?.includes('temperature') && selectedAssets.length === 0 && (() => {
              const equipmentField = templateFields.find((f: any) => 
                f.field_type === 'select' && 
                (f.field_name === 'fridge_name' || f.field_name === 'hot_holding_unit')
              )
              const temperatureField = templateFields.find((f: any) => f.field_type === 'number')
              const equipmentOptions = equipmentField?.options || []
              
              // Render equipment list with temperature inputs (legacy support)
              if (equipmentOptions.length > 0) {
                return (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Temperature Readings
                    </label>
                    <div className="space-y-3">
                      {equipmentOptions.map((equipment: any, idx: number) => {
                        const assetName = equipment.assetName || assetsMap.get(equipment.value)?.name || 'Equipment'
                        const nickname = equipment.nickname || (equipment.label?.includes('(') 
                          ? equipment.label.match(/\(([^)]+)\)/)?.[1] 
                          : '') || ''
                        const displayLabel = nickname 
                          ? `${assetName} | ${nickname}`
                          : assetName
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-magenta-400 font-medium">{displayLabel}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="°C"
                                value={formData[`temp_${equipment.value}`] || ''}
                                onChange={(e) => {
                                  const temp = parseFloat(e.target.value)
                                  handleFieldChange(`temp_${equipment.value}`, temp)
                                  
                                  const assetId = equipment.value
                                  let isOutOfRange = checkTemperatureRange(temp, assetId)
                                  
                                  if (!isOutOfRange) {
                                    const tempField = temperatureField || templateFields.find((f: any) => 
                                      f.field_type === 'number' && f.field_name === 'temperature'
                                    )
                                    
                                    if (tempField) {
                                      const minValue = tempField.min_value
                                      const maxValue = tempField.max_value
                                      
                                      if (minValue !== null && temp < minValue) {
                                        isOutOfRange = true
                                      }
                                      if (maxValue !== null && temp > maxValue) {
                                        isOutOfRange = true
                                      }
                                      
                                      if (equipmentField?.field_name === 'hot_holding_unit') {
                                        if (temp < 63) {
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
                                  outOfRangeAssets.has(equipment.value)
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
                    {Array.from(outOfRangeAssets).map((assetId) => {
                      const equipmentOption = equipmentOptions.find((opt: any) => opt.value === assetId)
                      const assetName = equipmentOption?.assetName || assetsMap.get(assetId)?.name || 'Equipment'
                      const nickname = equipmentOption?.nickname || ''
                      const displayName = nickname ? `${assetName} (${nickname})` : assetName
                      const range = assetTempRanges.get(assetId)
                      const tempValue = formData[`temp_${assetId}`] || formData.temperature
                      const showActionOptionsForAsset = showActionOptions.get(assetId) || false
                      const selectedActionForAsset = selectedActions.get(assetId)
                      
                      let isFailed = false
                      let minThreshold = null
                      let maxThreshold = null
                      
                      if (range && (range.min !== null || range.max !== null)) {
                        minThreshold = range.min
                        maxThreshold = range.max
                        isFailed = (
                          (range.min !== null && tempValue < range.min - 2) ||
                          (range.max !== null && tempValue > range.max + 2)
                        )
                      } else {
                        if (equipmentField?.field_name === 'hot_holding_unit') {
                          minThreshold = 63
                          maxThreshold = null
                          isFailed = tempValue < 60 // Critical below 60°C
                        } else if (temperatureField) {
                          minThreshold = temperatureField.min_value
                          maxThreshold = temperatureField.max_value
                          if (minThreshold !== null && tempValue < minThreshold - 2) {
                            isFailed = true
                          }
                          if (maxThreshold !== null && tempValue > maxThreshold + 2) {
                            isFailed = true
                          }
                        }
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
                                Temperature Out of Range - {displayName}
                            </h4>
                              <p className={`text-sm mb-2 ${
                                isFailed ? 'text-red-300/80' : 'text-yellow-300/80'
                              }`}>
                                Reading: <strong>{tempValue}°C</strong> 
                                {(minThreshold !== null || maxThreshold !== null) && (
                                  <span className="ml-2">
                                    {equipmentField?.field_name === 'hot_holding_unit' 
                                      ? `(Minimum required: 63°C)`
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
              
              // Fallback to single temperature field if no equipment
              return (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Temperature Reading
                  </label>
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-neutral-400" />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter temperature"
                      value={formData.temperature || ''}
                      onChange={(e) => {
                        const temp = parseFloat(e.target.value)
                        handleFieldChange('temperature', temp)
                        
                        // Check against template's linked asset if available
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
                      }}
                      className={`flex-1 px-4 py-3 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors ${
                        showWarning && outOfRangeAssetId === task.template?.asset_id
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-white/[0.06] focus:border-pink-500'
                      }`}
                    />
                    <span className="text-sm text-white/60">°C</span>
                  </div>
                  
                  {/* Temperature Warning for single field */}
                  {showWarning && outOfRangeAssetId === task.template?.asset_id && (
                    <div className={`mt-3 p-4 border rounded-lg ${
                      selectedAction === 'callout' || (assetTempRanges.get(outOfRangeAssetId) && (
                        (assetTempRanges.get(outOfRangeAssetId)!.min !== null && formData.temperature < assetTempRanges.get(outOfRangeAssetId)!.min! - 2) ||
                        (assetTempRanges.get(outOfRangeAssetId)!.max !== null && formData.temperature > assetTempRanges.get(outOfRangeAssetId)!.max! + 2)
                      ))
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          selectedAction === 'callout' ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <div className="flex-1">
                          <h4 className={`text-sm font-semibold mb-1 ${
                            selectedAction === 'callout' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            Temperature Out of Range
                          </h4>
                          <p className={`text-sm mb-2 ${
                            selectedAction === 'callout' ? 'text-red-300/80' : 'text-yellow-300/80'
                          }`}>
                            Reading: <strong>{formData.temperature}°C</strong>
                            {assetTempRanges.get(outOfRangeAssetId) && (
                              <span className="ml-2">
                                (Normal range: {assetTempRanges.get(outOfRangeAssetId)!.min !== null ? assetTempRanges.get(outOfRangeAssetId)!.min : 'N/A'}°C to {assetTempRanges.get(outOfRangeAssetId)!.max !== null ? assetTempRanges.get(outOfRangeAssetId)!.max : 'N/A'}°C)
                              </span>
                            )}
                          </p>
                          {!showActionOptionsSingle && (
                            <button
                              onClick={() => setShowActionOptionsSingle(true)}
                              className={`text-sm underline ${
                                selectedAction === 'callout' ? 'text-red-400 hover:text-red-300' : 'text-yellow-400 hover:text-yellow-300'
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
                            onClick={handleMonitorAction}
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
                            onClick={handleCalloutAction}
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
                  )}
                </div>
              )
            })()}


            {/* Notes Section - Replaces dropdown fields */}
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
          requireTroubleshoot={true} // Always require troubleshooting when opened from task
        />
      )}
    </div>
  )
}
