'use client'

import { X, Camera, Thermometer, FileText, CheckCircle2, AlertCircle, Save, ChevronDown, ChevronUp, Monitor, PhoneCall } from 'lucide-react'
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

  useEffect(() => {
    if (isOpen) {
      const initialize = async () => {
        await loadTemplateFields()
        await loadAssetTempRanges()
        
        // Debug: Log instructions to see what's being loaded
        if (task.template?.instructions) {
          console.log('📋 Template instructions loaded:', {
            hasInstructions: !!task.template.instructions,
            length: task.template.instructions.length,
            preview: task.template.instructions.substring(0, 100),
            startsWithHowTo: task.template.instructions.startsWith('How to successfully')
          })
        } else {
          console.warn('⚠️ No instructions found in template:', task.template?.name)
        }
      }
      initialize()
      
      // Initialize form data based on template fields
      const initialData: Record<string, any> = {}
      if (task.template?.repeatable_field_name) {
        initialData[task.template.repeatable_field_name] = []
      }
      setFormData(initialData)
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task])

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
      const initialFormData: Record<string, any> = { ...formData }
      data?.forEach((field: any) => {
        if (!(field.field_name in initialFormData)) {
          if (field.field_type === 'checkbox') {
            initialFormData[field.field_name] = false
          } else if (field.field_type === 'select' || field.field_type === 'pass_fail') {
            initialFormData[field.field_name] = ''
          } else if (field.field_type === 'text') {
            initialFormData[field.field_name] = ''
          }
        }
      })
      setFormData(initialFormData)
      
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

      // Also load ranges for assets referenced in repeatable fields (equipment lists)
      // Get fresh templateFields from state or reload them
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
    const targetAssetId = outOfRangeAssetId || (outOfRangeAssets.size > 0 ? Array.from(outOfRangeAssets)[0] : null)
    if (!task.template || !targetAssetId || !companyId || !siteId) {
      showToast({ title: 'Error', description: 'Missing required information', type: 'error' })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Calculate due time (current time + duration)
      const now = new Date()
      const dueDate = new Date(now.getTime() + durationMinutes * 60 * 1000)

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
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Create notification/alert
      const assetName = assetsMap.get(targetAssetId)?.name || 'Equipment'
      const tempValue = formData[`temp_${targetAssetId}`] || formData.temperature

      await createAlert('monitor', assetName, tempValue, monitoringTask.id)

      showToast({ 
        title: 'Monitoring task created', 
        description: `Follow-up check scheduled in ${durationMinutes} minutes`,
        type: 'success' 
      })

      // Record action in form data
      setFormData(prev => ({
        ...prev,
        temp_action: 'monitor',
        temp_action_asset_id: targetAssetId,
        monitoring_task_id: monitoringTask.id,
        [`temp_action_${targetAssetId}`]: 'monitor',
        [`monitoring_task_id_${targetAssetId}`]: monitoringTask.id
      }))

      // Close duration modal and trigger parent refresh
      setShowMonitorDurationModal(false)
      
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

  const handleCalloutAction = async (assetId?: string) => {
    const targetAssetId = assetId || outOfRangeAssetId
    if (!targetAssetId) {
      showToast({ 
        title: 'Error', 
        description: 'No asset selected for callout',
        type: 'error' 
      })
      return
    }
    
    if (assetId) {
      // Multi-asset mode
      setSelectedActions(prev => new Map(prev).set(assetId, 'callout'))
    } else {
      // Single asset mode (legacy)
      setSelectedAction('callout')
    }

    // Fetch asset details for callout modal with site and contractor relationships
    try {
      // Use simple query first (more reliable than complex joins)
      // Load relationships separately if needed
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

      const assetForCallout = {
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

      setCalloutAsset(assetForCallout)
      setShowCalloutModal(true)
      
      // Record action in form data
      setFormData(prev => ({
        ...prev,
        temp_action: 'callout',
        temp_action_asset_id: targetAssetId,
        [`temp_action_${targetAssetId}`]: 'callout'
      }))

      // Create alert for callout
      const assetName = assetForCallout.name || 'Equipment'
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

      // Save temperature records for each equipment/temperature entry
      const temperatureRecords: any[] = []
      
      // Check if this is a temperature task with equipment fields
      const repeatableField = templateFields.find(f => f.field_name === task.template?.repeatable_field_name)
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

      // Create completion record with proper schema structure
      const completionRecord = {
        task_id: task.id,
        template_id: task.template_id,
        company_id: companyId!,
        site_id: siteId!,
        completed_by: profile.id,
        completed_at: completedAt,
        completion_data: {
          ...formData,
          photos: photoUrls,
          temperature_records_count: temperatureRecords.length,
          equipment_list: temperatureRecords.map(tr => ({
            asset_id: tr.asset_id,
            asset_name: assetsMap.get(tr.asset_id)?.name || 'Unknown',
            temperature: tr.reading,
            status: tr.status
          }))
        },
        evidence_attachments: photoUrls,
        flagged: completedOutsideWindow || formData.temp_action === 'monitor' || formData.temp_action === 'callout',
        flag_reason: completedOutsideWindow 
          ? (completedLate ? 'completed_late' : 'completed_early') 
          : (formData.temp_action || null)
      }

      const { error: completionError } = await supabase
        .from('task_completion_records')
        .insert(completionRecord)

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
            <h2 className="text-2xl font-bold text-magenta-400">{task.template?.name?.replace(' (Draft)', '')}</h2>
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
          {task.template?.instructions && (
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
                    {task.template.instructions}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Show warning only if instructions are truly missing or very minimal (just equipment names) */}
          {(() => {
            const hasInstructions = task.template?.instructions && task.template.instructions.trim().length > 0;
            // Check if instructions appear to be just equipment names (very short, no verbs/action words)
            const isMinimalInstructions = hasInstructions && (
              task.template.instructions.length < 50 || // Very short (likely just equipment names)
              (!task.template.instructions.toLowerCase().includes('how') && 
               !task.template.instructions.toLowerCase().includes('step') &&
               !task.template.instructions.toLowerCase().includes('record') &&
               !task.template.instructions.toLowerCase().includes('insert') &&
               !task.template.instructions.toLowerCase().includes('take') &&
               !task.template.instructions.toLowerCase().includes('check') &&
               !task.template.instructions.toLowerCase().includes('locate'))
            );
            
            return !hasInstructions || isMinimalInstructions;
          })() && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                ⚠️ Instructions are missing or need to be updated. Please edit the template in "My Tasks" to update the instructions with proper "How to" guidance.
              </p>
            </div>
          )}

          {/* Dynamic Fields */}
          <div className="space-y-6">
            {/* Temperature Field with Equipment List */}
            {task.template?.evidence_types?.includes('temperature') && (() => {
              const equipmentField = templateFields.find((f: any) => 
                f.field_type === 'select' && 
                (f.field_name === 'fridge_name' || f.field_name === 'hot_holding_unit')
              )
              const temperatureField = templateFields.find((f: any) => f.field_type === 'number')
              const equipmentOptions = equipmentField?.options || []
              
              // Render equipment list with temperature inputs
              if (equipmentOptions.length > 0) {
                return (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Temperature Readings
                    </label>
                    <div className="space-y-3">
                      {equipmentOptions.map((equipment: any, idx: number) => {
                        // Extract asset name and nickname from equipment options
                        // For hot holding: options have { value, label, assetName, nickname }
                        // For temperature: options have { value, label } where label may contain nickname
                        const assetName = equipment.assetName || assetsMap.get(equipment.value)?.name || 'Equipment'
                        const nickname = equipment.nickname || (equipment.label?.includes('(') 
                          ? equipment.label.match(/\(([^)]+)\)/)?.[1] 
                          : '') || ''
                        
                        // Format: "Asset Name | Nickname | Input"
                        const displayLabel = nickname 
                          ? `${assetName} | ${nickname}`
                          : assetName
                        
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            {/* Equipment Name | Nickname */}
                            <div className="flex-1 min-w-0">
                              <p className="text-magenta-400 font-medium">{displayLabel}</p>
                            </div>
                            {/* Temperature Input */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="°C"
                                value={formData[`temp_${equipment.value}`] || ''}
                                onChange={(e) => {
                                  const temp = parseFloat(e.target.value)
                                  handleFieldChange(`temp_${equipment.value}`, temp)
                                  
                                  // Check if temp is out of range using asset's working temperature ranges
                                  const assetId = equipment.value
                                  let isOutOfRange = checkTemperatureRange(temp, assetId)
                                  
                                  // Fallback: If asset ranges aren't set, use template field validation
                                  if (!isOutOfRange) {
                                    const tempField = temperatureField || templateFields.find((f: any) => 
                                      f.field_type === 'number' && f.field_name === 'temperature'
                                    )
                                    
                                    if (tempField) {
                                      // Check against template field min/max values
                                      const minValue = tempField.min_value
                                      const maxValue = tempField.max_value
                                      
                                      if (minValue !== null && temp < minValue) {
                                        isOutOfRange = true
                                      }
                                      if (maxValue !== null && temp > maxValue) {
                                        isOutOfRange = true
                                      }
                                      
                                      // For hot holding specifically: check if below 63°C
                                      if (equipmentField?.field_name === 'hot_holding_unit') {
                                        if (temp < 63) {
                                          isOutOfRange = true
                                        }
                                      }
                                    }
                                  }
                                  
                                  // Update out-of-range assets set independently
                                  if (isOutOfRange) {
                                    setOutOfRangeAssets(prev => {
                                      const newSet = new Set(prev)
                                      newSet.add(assetId)
                                      return newSet
                                    })
                                    // Reset action selection for this asset
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
                                    // Remove from out-of-range set if now in range
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
                      // Find the equipment option to get nickname
                      const equipmentOption = equipmentOptions.find((opt: any) => opt.value === assetId)
                      const assetName = equipmentOption?.assetName || assetsMap.get(assetId)?.name || 'Equipment'
                      const nickname = equipmentOption?.nickname || ''
                      const displayName = nickname ? `${assetName} (${nickname})` : assetName
                      const range = assetTempRanges.get(assetId)
                      const tempValue = formData[`temp_${assetId}`] || formData.temperature
                      const showActionOptionsForAsset = showActionOptions.get(assetId) || false
                      const selectedActionForAsset = selectedActions.get(assetId)
                      
                      // Determine if it's a failure (critical) or warning
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
                        // Fallback to template field validation or hot holding threshold
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


            {/* Dynamic Template Fields - Render all template fields that aren't temperature-related */}
            {templateFields
              .filter((field: any) => {
                // Exclude temperature fields (handled above) and equipment select fields
                // Also exclude old 'test_result' and 'emergency_lights_working' checkbox fields
                // Exclude pass_fail fields (not required in task modals)
                // Exclude initial/manager_initials fields (not required in task modals)
                return field.field_type !== 'number' && 
                       field.field_name !== 'fridge_name' && 
                       field.field_name !== 'hot_holding_unit' &&
                       field.field_name !== 'test_result' && // Exclude old generic test_result field
                       field.field_name !== 'emergency_lights_working' && // Exclude old checkbox field
                       field.field_type !== 'pass_fail' && // Exclude pass/fail fields
                       !field.field_name?.toLowerCase().includes('initial') // Exclude initial/manager_initials fields
              })
              .map((field: any) => {
                // Select field (e.g., call point selector)
                if (field.field_type === 'select') {
                  const isFireAlarmCallPoint = field.field_name === 'fire_alarm_call_point'
                  
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
                        value={formData[field.field_name] || ''}
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
                      {isFireAlarmCallPoint && (
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
                      )}
                      
                    </div>
                  )
                }

                // Pass/Fail field - REMOVED per user request
                // Pass/fail buttons are not required in task modals
                if (field.field_type === 'pass_fail') {
                  return null // Skip rendering pass/fail fields
                }
                
                // Legacy pass/fail field handler (kept for reference but not rendered)
                if (false && field.field_type === 'pass_fail') {
                  const isFail = formData[field.field_name] === 'fail'
                  const isFireAlarmField = field.field_name === 'fire_alarm_test_result'
                  const isEmergencyLightsField = field.field_name === 'emergency_lights_test_result'
                  
                  return (
                    <div key={field.id || field.field_name} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-4">
                      <label className="block text-sm font-semibold text-white mb-2">
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
                          onClick={() => {
                            handleFieldChange(field.field_name, 'fail')
                            // Trigger callout prompt when fail is selected
                            if (isFireAlarmField) {
                              handleFireAlarmFailure()
                            } else if (isEmergencyLightsField) {
                              handleEmergencyLightsFailure()
                            }
                          }}
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
                      {/* Failure Warning */}
                      {isFail && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400 font-medium">
                            ⚠️ Test failed. {isFireAlarmField ? 'Fire panel company' : isEmergencyLightsField ? 'Electrician' : 'Contractor'} callout will be created on task completion.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }

                // Checkbox field (e.g., emergency lights working)
                if (field.field_type === 'checkbox') {
                  return (
                    <div key={field.id || field.field_name} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={field.field_name}
                        checked={formData[field.field_name] === true || formData[field.field_name] === 'true'}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-white/[0.06] bg-white/[0.03] text-pink-500 focus:ring-pink-500 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <label htmlFor={field.field_name} className="block text-sm font-medium text-white cursor-pointer">
                          {field.label || field.field_label || field.field_name}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.help_text && (
                          <p className="text-xs text-white/60 mt-1">{field.help_text}</p>
                        )}
                      </div>
                    </div>
                  )
                }

                // Text field
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
                      <textarea
                        placeholder={field.help_text || `Enter ${field.label || field.field_name}...`}
                        value={formData[field.field_name] || ''}
                        onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                        required={field.required}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                      />
                    </div>
                  )
                }

                return null
              })}

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

            {/* Text Note Field (fallback for evidence_types) */}
            {task.template?.evidence_types?.includes('text_note') && !templateFields.find((f: any) => f.field_type === 'text' && f.field_name === 'notes') && (
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
        isOpen={showMonitorDurationModal}
        onClose={() => setShowMonitorDurationModal(false)}
        onConfirm={createMonitoringTask}
        assetName={outOfRangeAssetId ? assetsMap.get(outOfRangeAssetId)?.name : undefined}
      />

      {/* Callout Modal */}
      {calloutAsset && (
        <CalloutModal
          open={showCalloutModal}
          onClose={() => {
            setShowCalloutModal(false)
            setCalloutAsset(null)
            // Process next callout in queue after a short delay
            setTimeout(() => {
              if (calloutQueue.length > 0) {
                const nextCallout = calloutQueue[0]
                setCalloutAsset(nextCallout.asset)
                setShowCalloutModal(true)
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
