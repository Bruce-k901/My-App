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
  const [showWarning, setShowWarning] = useState(false)
  const [showActionOptions, setShowActionOptions] = useState(false)
  const [templateFields, setTemplateFields] = useState<any[]>([])
  const [assetsMap, setAssetsMap] = useState<Map<string, any>>(new Map())
  const [assetTempRanges, setAssetTempRanges] = useState<Map<string, { min: number | null, max: number | null }>>(new Map())
  const [outOfRangeAssetId, setOutOfRangeAssetId] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<'monitor' | 'callout' | null>(null)
  const [showMonitorDurationModal, setShowMonitorDurationModal] = useState(false)
  const [showCalloutModal, setShowCalloutModal] = useState(false)
  const [calloutAsset, setCalloutAsset] = useState<any>(null)
  const { companyId, siteId } = useAppContext()
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      const initialize = async () => {
        await loadTemplateFields()
        await loadAssetTempRanges()
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
      setShowWarning(false)
      setShowActionOptions(false)
      setOutOfRangeAssetId(null)
      setSelectedAction(null)
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
      
      // Load assets for equipment information
      const equipmentField = data?.find((f: any) => f.field_type === 'select' && f.field_name === 'fridge_name')
      if (equipmentField?.options && Array.isArray(equipmentField.options)) {
        const assetIds = equipmentField.options.map((opt: any) => opt.value)
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
      
      const equipmentField = currentFields.find((f: any) => f.field_type === 'select' && f.field_name === 'fridge_name')
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

  const handleMonitorAction = () => {
    setSelectedAction('monitor')
    setShowMonitorDurationModal(true)
  }

  const createMonitoringTask = async (durationMinutes: number) => {
    if (!task.template || !outOfRangeAssetId || !companyId || !siteId) {
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
      const assetName = assetsMap.get(outOfRangeAssetId)?.name || 'Equipment'
      const tempValue = formData[`temp_${outOfRangeAssetId}`] || formData.temperature

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
        temp_action_asset_id: outOfRangeAssetId,
        monitoring_task_id: monitoringTask.id
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

  const handleCalloutAction = async () => {
    setSelectedAction('callout')
    
    if (!outOfRangeAssetId) {
      showToast({ 
        title: 'Error', 
        description: 'No asset selected for callout',
        type: 'error' 
      })
      return
    }

    // Fetch asset details for callout modal with site and contractor relationships
    try {
      // Use simple query first (more reliable than complex joins)
      // Load relationships separately if needed
      const { data: simpleAsset, error: simpleError } = await supabase
        .from('assets')
        .select('id, name, serial_number, warranty_end, install_date, category, site_id, ppm_contractor_id, reactive_contractor_id, warranty_contractor_id')
        .eq('id', outOfRangeAssetId)
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
        temp_action_asset_id: outOfRangeAssetId
      }))

      // Create alert for callout
      const assetName = assetForCallout.name || 'Equipment'
      const tempValue = formData[`temp_${outOfRangeAssetId}`] || formData.temperature
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
                  <p className="text-white/80 text-sm">{task.template.instructions}</p>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Fields */}
          <div className="space-y-6">
            {/* Temperature Field with Equipment List */}
            {task.template?.evidence_types?.includes('temperature') && (() => {
              const equipmentField = templateFields.find((f: any) => f.field_type === 'select' && f.field_name === 'fridge_name')
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
                        const assetName = assetsMap.get(equipment.value)?.name || 'Equipment'
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            {/* Equipment Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-magenta-400 font-medium truncate">{assetName}</p>
                            </div>
                            {/* Nickname */}
                            <div className="flex-shrink-0">
                              <p className="text-magenta-400 font-medium">{equipment.label}</p>
                            </div>
                            {/* Temperature Input - Small */}
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
                                  const isOutOfRange = checkTemperatureRange(temp, assetId)
                                  
                                  if (isOutOfRange) {
                                    setShowWarning(true)
                                    setOutOfRangeAssetId(assetId)
                                    setShowActionOptions(false) // Reset action selection
                                    setSelectedAction(null)
                                  } else {
                                    setShowWarning(false)
                                    setOutOfRangeAssetId(null)
                                  }
                                }}
                                className={`w-20 px-2 py-2 bg-white/[0.03] border rounded-lg text-white placeholder-neutral-500 focus:outline-none transition-colors text-sm text-center ${
                                  outOfRangeAssetId === equipment.value && showWarning
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-white/[0.06] focus:border-pink-500'
                                }`}
        />
      </div>

      {/* Monitor Duration Modal */}
      <MonitorDurationModal
        isOpen={showMonitorDurationModal}
        onClose={() => setShowMonitorDurationModal(false)}
        onConfirm={createMonitoringTask}
        assetName={outOfRangeAssetId ? assetsMap.get(outOfRangeAssetId)?.name : undefined}
      />
    </div>
  )
})}
                    </div>
                    
                    {/* Temperature Warning - Show for any out of range asset */}
                    {showWarning && outOfRangeAssetId && (() => {
                      const assetName = assetsMap.get(outOfRangeAssetId)?.name || 'Equipment'
                      const range = assetTempRanges.get(outOfRangeAssetId)
                      const tempValue = formData[`temp_${outOfRangeAssetId}`] || formData.temperature
                      const isFailed = range && (
                        (range.min !== null && tempValue < range.min - 2) ||
                        (range.max !== null && tempValue > range.max + 2)
                      )
                      
                      return (
                        <div className={`mt-3 p-4 border rounded-lg ${
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
                                Temperature Out of Range - {assetName}
                              </h4>
                              <p className={`text-sm mb-2 ${
                                isFailed ? 'text-red-300/80' : 'text-yellow-300/80'
                              }`}>
                                Reading: <strong>{tempValue}°C</strong> 
                                {range && (
                                  <span className="ml-2">
                                    (Normal range: {range.min !== null ? range.min : 'N/A'}°C to {range.max !== null ? range.max : 'N/A'}°C)
                                  </span>
                                )}
                              </p>
                              {!showActionOptions && (
                                <button
                                  onClick={() => setShowActionOptions(true)}
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
                          {showActionOptions && (
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
                      )
                    })()}
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
                            setShowActionOptions(false)
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
                          {!showActionOptions && (
                            <button
                              onClick={() => setShowActionOptions(true)}
                              className={`text-sm underline ${
                                selectedAction === 'callout' ? 'text-red-400 hover:text-red-300' : 'text-yellow-400 hover:text-yellow-300'
                              }`}
                            >
                              Choose action →
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {showActionOptions && (
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


            {/* Text Note Field */}
            {task.template?.evidence_types?.includes('text_note') && (
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
          }}
          asset={calloutAsset}
          requireTroubleshoot={true} // Always require troubleshooting when opened from task
        />
      )}
    </div>
  )
}
