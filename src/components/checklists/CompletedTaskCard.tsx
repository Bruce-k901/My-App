'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Calendar, Thermometer, Camera, FileText, CheckCircle, X, AlertTriangle, ExternalLink, Lightbulb } from 'lucide-react'
import { isCompletedOutsideWindow, isCompletedLate } from '@/utils/taskTiming'
import { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface CompletedTaskCardProps {
  task: ChecklistTaskWithTemplate & {
    assets_map?: Map<string, { id: string; name: string }>
  }
  completionRecord?: {
    id: string
    completion_data: Record<string, any>
    evidence_attachments?: string[]
    completed_at: string
    completed_by: string
    duration_seconds?: number | null
  } | null
}

export default function CompletedTaskCard({ task, completionRecord }: CompletedTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Check both completion_data and task_data for recorded information
  const completionData = completionRecord?.completion_data || {}
  const taskData = task.task_data || {}
  
  // Merge data from both sources (completion_data takes precedence)
  const allData = { ...taskData, ...completionData }
  
  // Handle checklist items - can be in different formats
  let checklistItems: any[] = []
  if (allData.checklist_items && Array.isArray(allData.checklist_items)) {
    checklistItems = allData.checklist_items
  } else if (allData.checklistItems && Array.isArray(allData.checklistItems)) {
    checklistItems = allData.checklistItems
  }
  
  // Handle yes/no checklist items
  let yesNoChecklistItems: any[] = []
  if (allData.yes_no_checklist_items && Array.isArray(allData.yes_no_checklist_items)) {
    yesNoChecklistItems = allData.yes_no_checklist_items
  } else if (allData.yesNoChecklistItems && Array.isArray(allData.yesNoChecklistItems)) {
    yesNoChecklistItems = allData.yesNoChecklistItems
  }
  
  // CRITICAL: Build temperatures from task_data assets + completion_data temperatures
  // Step 1: Get all assets from task_data (these are the assets chosen when task was created)
  let assetsFromTaskData: any[] = []
  const assetsMap = task.assets_map || new Map()
  
  // Check repeatable field (for tasks with multiple equipment like fridge/freezer)
  if (task.template?.repeatable_field_name && taskData[task.template.repeatable_field_name]) {
    const repeatableField = taskData[task.template.repeatable_field_name]
    if (Array.isArray(repeatableField)) {
      assetsFromTaskData = repeatableField.map((item: any) => {
        const assetId = item.value || item.asset_id || item.id
        const assetFromDb = assetsMap.get(assetId)
        return {
          asset_id: assetId,
          asset_name: assetFromDb?.name || item.label || item.name || item.asset_name || 'Unknown Equipment',
          nickname: item.nickname || null
        }
      })
    }
  }
  
  // Step 2: Get recorded temperatures from completion_data
  // CRITICAL: Check ALL possible locations where temperatures might be stored
  const recordedTemps = new Map<string, any>()
  
  // METHOD 1: From equipment_list (preferred format) - check multiple possible field names for temperature
  if (completionData.equipment_list && Array.isArray(completionData.equipment_list)) {
    completionData.equipment_list.forEach((eq: any) => {
      const assetId = eq.asset_id
      if (assetId) {
        const assetFromDb = assetsMap.get(assetId)
        // Check multiple possible field names for temperature value
        const tempValue = eq.temperature !== undefined && eq.temperature !== null ? eq.temperature 
          : (eq.reading !== undefined && eq.reading !== null ? eq.reading 
          : (eq.temp !== undefined && eq.temp !== null ? eq.temp : null))
        
        if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            recordedTemps.set(assetId, {
              temp: numValue,
              status: eq.status || 'ok',
              time: eq.recorded_at || completionRecord?.completed_at,
              asset_name: assetFromDb?.name || eq.asset_name || eq.name || 'Unknown Equipment'
            })
          }
        }
      }
    })
  }
  
  // METHOD 2: From temperatures array
  if (completionData.temperatures && Array.isArray(completionData.temperatures)) {
    completionData.temperatures.forEach((temp: any) => {
      const assetId = temp.assetId || temp.asset_id
      if (assetId) {
        const tempValue = temp.temp !== undefined && temp.temp !== null ? temp.temp 
          : (temp.temperature !== undefined && temp.temperature !== null ? temp.temperature 
          : (temp.reading !== undefined && temp.reading !== null ? temp.reading : null))
        
        if (tempValue !== undefined && tempValue !== null && tempValue !== '' && !recordedTemps.has(assetId)) {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            recordedTemps.set(assetId, {
              temp: numValue,
              status: temp.status || 'ok',
              time: temp.recorded_at || temp.time || completionRecord?.completed_at
            })
          }
        }
      }
    })
  }
  
  // METHOD 3: Check for temp_${assetId} format in completion_data (formData format)
  // This is how temperatures are stored when user enters them in the form
  assetsFromTaskData.forEach((asset) => {
    if (asset.asset_id && !recordedTemps.has(asset.asset_id)) {
      const tempKey = `temp_${asset.asset_id}`
      // Check both completionData and allData (merged data)
      const tempValue = completionData[tempKey] !== undefined ? completionData[tempKey] 
        : (allData[tempKey] !== undefined ? allData[tempKey] : null)
      
      if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
        // Convert to number if it's a string
        const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
        if (!isNaN(numValue)) {
          recordedTemps.set(asset.asset_id, {
            temp: numValue,
            status: 'ok',
            time: completionRecord?.completed_at
          })
        }
      }
    }
  })
  
  // METHOD 4: Check formData keys directly (in case temp is stored differently)
  // Look through all keys in completionData that match temp_ pattern
  Object.keys(completionData).forEach((key) => {
    if (key.startsWith('temp_')) {
      const assetId = key.replace('temp_', '')
      if (assetId && !recordedTemps.has(assetId)) {
        const tempValue = completionData[key]
        if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            recordedTemps.set(assetId, {
              temp: numValue,
              status: 'ok',
              time: completionRecord?.completed_at
            })
          }
        }
      }
    }
  })
  
  // METHOD 5: Check allData (merged task_data + completion_data) for temp_ keys
  Object.keys(allData).forEach((key) => {
    if (key.startsWith('temp_')) {
      const assetId = key.replace('temp_', '')
      if (assetId && !recordedTemps.has(assetId)) {
        const tempValue = allData[key]
        if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            recordedTemps.set(assetId, {
              temp: numValue,
              status: 'ok',
              time: completionRecord?.completed_at
            })
          }
        }
      }
    }
  })
  
  // Debug logging for temperature extraction - COMPREHENSIVE
  console.log('🌡️ Temperature Extraction Debug:', {
    assetsFromTaskData: assetsFromTaskData.length,
    assetsFromTaskDataIds: assetsFromTaskData.map(a => a.asset_id),
    recordedTempsSize: recordedTemps.size,
    recordedTemps: Array.from(recordedTemps.entries()),
    equipment_list: completionData.equipment_list?.length || 0,
    equipment_list_data: completionData.equipment_list,
    temperatures_array: completionData.temperatures?.length || 0,
    temperatures_array_data: completionData.temperatures,
    completionDataKeys: Object.keys(completionData).filter(k => k.startsWith('temp_')),
    allDataKeys: Object.keys(allData).filter(k => k.startsWith('temp_')),
    fullCompletionData: completionData // Full data for debugging
  })
  
  // Step 3: Combine assets from task_data with recorded temperatures
  let temperatures: any[] = []
  
  if (assetsFromTaskData.length > 0) {
    // Use assets from task_data (these are the assets chosen when task was created)
    temperatures = assetsFromTaskData.map((asset) => {
      const recorded = recordedTemps.get(asset.asset_id) || {}
      return {
        asset_id: asset.asset_id,
        equipment: asset.nickname ? `${asset.asset_name} | ${asset.nickname}` : asset.asset_name,
        temp: recorded.temp !== undefined && recorded.temp !== null ? recorded.temp : null,
        status: recorded.status || 'ok',
        time: recorded.time || completionRecord?.completed_at
      }
    })
  } else if (recordedTemps.size > 0) {
    // Fallback: if no task_data assets, use what we have from completion_data
    recordedTemps.forEach((recorded, assetId) => {
      const assetFromDb = assetsMap.get(assetId)
      temperatures.push({
        asset_id: assetId,
        equipment: recorded.asset_name || assetFromDb?.name || 'Unknown Equipment',
        temp: recorded.temp,
        status: recorded.status || 'ok',
        time: recorded.time
      })
    })
  }
  
  // Get equipment/assets from task template or task data
  const equipmentAssets = task.template?.asset_id ? [task.template.asset_id] : []
  
  // Extract follow-up actions - CRITICAL for compliance reporting
  const tempAction = completionData.temp_action || task.flag_reason
  const monitoringTaskId = completionData.monitoring_task_id
  const calloutId = completionData.callout_id
  const flagReason = task.flag_reason || completionRecord?.completion_data?.flag_reason || completionData.flag_reason
  const followUpDetails = completionData.follow_up_details || completionData.followUpDetails || {}
  
  // Get monitoring task details if available
  const monitoringDetails = completionData.monitoring_task_details || followUpDetails.monitoring_task || {}
  const calloutDetails = completionData.callout_details || followUpDetails.callout || {}
  
  // Extract monitoring duration and asset info
  const monitoringDuration = monitoringDetails.duration || completionData.monitoring_duration || completionData.monitoring_duration_minutes
  const monitoringAssetId = monitoringDetails.asset_id || completionData.monitoring_asset_id
  const monitoringAssetName = monitoringDetails.asset_name || completionData.monitoring_asset_name
  const contractorName = calloutDetails.contractor_name || completionData.contractor_name || calloutDetails.contractorName || completionData.contractorName
  
  // 🔒 LOCKED: Callout report detection and data extraction
  // DO NOT MODIFY without updating CALLOUT_SYSTEM_LOCKED.md
  // Callout reports are identified by flag_reason === 'callout_report'
  const isCalloutReport = flagReason === 'callout_report' || task.flag_reason === 'callout_report'
  const calloutReportData = isCalloutReport ? completionData : null
  const calloutFaultDescription = calloutReportData?.fault_description || calloutDetails.fault_description || completionData.fault_description
  const calloutType = calloutReportData?.callout_type || calloutDetails.callout_type || completionData.callout_type
  
  // Get asset info from callout report
  const calloutAssetId = calloutReportData?.asset_id || completionData.asset_id
  const calloutAssetName = calloutReportData?.asset_name || completionData.asset_name || (calloutAssetId ? assetsMap.get(calloutAssetId)?.name : null)
  
  // Get contractor info from callout report
  const calloutContractorId = calloutReportData?.contractor_id || completionData.contractor_id
  const calloutContractorName = calloutReportData?.contractor_name || completionData.contractor_name || contractorName
  const calloutContractorEmail = calloutReportData?.manual_contractor_email || completionData.manual_contractor_email || completionData.contractor_email
  
  // Get troubleshooting data - answers might be stored as array or object with question/answer pairs
  const troubleshootingQuestions = calloutReportData?.troubleshooting_questions || completionData.troubleshooting_questions || []
  const troubleshootingAnswers = calloutReportData?.troubleshooting_answers || completionData.troubleshooting_answers || []
  // Troubleshooting might also be stored as an object with question-answer pairs
  const troubleshootingData = calloutReportData?.troubleshooting || completionData.troubleshooting || {}
  
  const calloutNotes = calloutReportData?.notes || calloutDetails.notes || completionData.notes || ''
const passFailResult = completionData.pass_fail_result || completionData.passFailStatus || allData.passFailStatus || null
const notes = completionData.notes ?? allData.notes ?? calloutNotes ?? ''

// 🔒 LOCKED: Evidence extraction (photos, attachments)
const photoPaths = completionRecord?.evidence_attachments || 
  completionData.photos ||
  completionData.callout_photos ||
  (isCalloutReport ? (completionData.photos || []) : []) ||
  []

  // 🔒 LOCKED: Issue detection for color coding
  const completedAtIso = completionRecord?.completed_at || task.completed_at || null
  const dueDate = task.due_date
  const dueTime = task.due_time || null
  const computedOutsideWindow = completedAtIso && dueDate
    ? isCompletedOutsideWindow(dueDate, dueTime, completedAtIso)
    : false
  const computedLate = completedAtIso && dueDate
    ? isCompletedLate(dueDate, dueTime, completedAtIso)
    : false
  const normalizedFlagReason = (flagReason || '').toLowerCase()
  const isLateCompletion = normalizedFlagReason === 'completed_late' || (!normalizedFlagReason && computedLate)
  const isEarlyCompletion = normalizedFlagReason === 'completed_early' || (!normalizedFlagReason && computedOutsideWindow && !computedLate)
  const hasTemperatureAlerts = Array.isArray(temperatures) && temperatures.some((t: any) => t.status === 'failed' || t.status === 'warning')
  const hasIncompleteChecklist = checklistItems.some((item: any) =>
    typeof item === 'object' ? item.completed === false : false
  )
  const hasFailedYesNo = yesNoChecklistItems.some((item: any) => item.answer === 'no')
  const hasNotesContent = typeof notes === 'string' && notes.trim().length > 0
  const hasFollowUpIssue = Boolean(
    (tempAction && ['monitor', 'callout'].includes(tempAction)) ||
    monitoringTaskId ||
    calloutId ||
    passFailResult === 'fail' ||
    isCalloutReport ||
    hasTemperatureAlerts ||
    hasIncompleteChecklist ||
    hasFailedYesNo ||
    (normalizedFlagReason && !['completed_late', 'completed_early'].includes(normalizedFlagReason)) ||
    (task.flagged && !['completed_late', 'completed_early'].includes(normalizedFlagReason))
  )
  const hasIssue = hasNotesContent || hasFollowUpIssue
  const statusVariant: 'green' | 'yellow' | 'red' = hasIssue
    ? 'red'
    : (isLateCompletion || isEarlyCompletion ? 'yellow' : 'green')
  const statusLabel =
    statusVariant === 'green'
      ? 'Completed On Time'
      : statusVariant === 'yellow'
        ? (isLateCompletion ? 'Completed Late' : 'Completed Early')
        : hasNotesContent
          ? 'Completed with Notes'
          : 'Follow-up Required'
  const StatusIcon = statusVariant === 'green' ? CheckCircle2 : statusVariant === 'yellow' ? Clock : AlertTriangle
  const variantStyles = {
    green: {
      cardBorder: 'border-green-500/20',
      cardBg: 'bg-green-500/5',
      headerHover: 'hover:bg-green-500/10',
      badge: 'bg-green-500/10 text-green-400 border-green-500/20',
      expanded: 'border-green-500/20 bg-green-500/5'
    },
    yellow: {
      cardBorder: 'border-yellow-500/30',
      cardBg: 'bg-yellow-500/5',
      headerHover: 'hover:bg-yellow-500/10',
      badge: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
      expanded: 'border-yellow-500/20 bg-yellow-500/5'
    },
    red: {
      cardBorder: 'border-red-500/30',
      cardBg: 'bg-red-500/5',
      headerHover: 'hover:bg-red-500/10',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      expanded: 'border-red-500/20 bg-red-500/5'
    }
  } as const
  const variantStyle = variantStyles[statusVariant]
  
  // Convert photo paths to public URLs if needed
  const photoUrls = useMemo(() => {
    return photoPaths.map((path: string) => {
      // If it's already a full URL, return as-is
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path
      }
      // Otherwise, construct public URL from storage path
      const { data } = supabase.storage.from('task-evidence').getPublicUrl(path)
      return data.publicUrl
    })
  }, [photoPaths])
  
  // Check if there are any recorded values to show
  const hasRecordedData = temperatures.length > 0 || checklistItems.length > 0 || yesNoChecklistItems.length > 0 || passFailResult || notes || photoUrls.length > 0

  // Get preview data for collapsed state
  const previewTemps = temperatures.slice(0, 3)
  const hasMoreTemps = temperatures.length > 3
  const completedChecklistCount = checklistItems.filter((item: any) => 
    typeof item === 'object' ? item.completed : false
  ).length

  // Color code based on whether there was an issue
  const cardBorderColor = variantStyle.cardBorder
  const cardBgColor = variantStyle.cardBg
  const headerHoverColor = variantStyle.headerHover
  const statusBadgeColor = variantStyle.badge

  const templateNote = task.template_notes || task.template?.notes || null

  return (
    <div className={`${cardBgColor} border ${cardBorderColor} rounded-xl overflow-hidden`}>
      {/* Header - Always Visible */}
        <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-6 flex items-start justify-between ${headerHoverColor} transition-colors text-left`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">
              {task.custom_name || task.template?.name || 'Untitled Task'}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusBadgeColor}`}>
              <StatusIcon className="w-4 h-4" />
              {statusLabel.toUpperCase()}
            </span>
            {task.template?.category && (
              <span className="px-2 py-1 rounded-full text-xs font-medium border border-white/20 bg-white/5 text-white/70">
                {task.template.category.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
            {task.completed_by_profile && (
              <div className="flex items-center gap-1">
                <span>Completed by:</span>
                <span className="text-white/80 font-medium">{task.completed_by_profile.full_name || task.completed_by_profile.email || 'Unknown'}</span>
              </div>
            )}
            {(completionRecord?.completed_at || task.completed_at) && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-medium">{new Date(completionRecord?.completed_at || task.completed_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {templateNote && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-100/90 text-sm p-4 flex gap-3 mb-4">
              <Lightbulb className="w-5 h-5 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-200">Template note</p>
                <p className="whitespace-pre-wrap leading-relaxed text-amber-100/90">{templateNote}</p>
              </div>
            </div>
          )}

          {/* Preview of recorded data - always visible */}
          {!isExpanded && hasRecordedData && (
            <div className="mt-3 space-y-2">
              {/* Temperature preview */}
              {temperatures.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <span className="text-white/80">
                    {previewTemps.map((t: any, i: number) => (
                      <span key={i}>
                        {t.equipment}: <span className="font-medium">{t.temp}°C</span>
                        {i < previewTemps.length - 1 || hasMoreTemps ? ', ' : ''}
                      </span>
                    ))}
                    {hasMoreTemps && <span className="text-white/60">+{temperatures.length - 3} more</span>}
                  </span>
                </div>
              )}
              
              {/* Checklist preview */}
              {checklistItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">
                    {completedChecklistCount} of {checklistItems.length} checklist items completed
                  </span>
                </div>
              )}
              
              {/* Yes/No checklist preview */}
              {yesNoChecklistItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-white/80">
                    {yesNoChecklistItems.length} yes/no question{yesNoChecklistItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {/* Result preview */}
              {passFailResult && (
                <div className="flex items-center gap-2 text-sm">
                  {passFailResult === 'pass' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-white/80 font-medium">Result: {passFailResult.toUpperCase()}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex items-center">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/60" />
          )}
        </div>
      </button>

      {/* Expandable Content - Read-Only View */}
      {isExpanded && (
        <div className={`px-6 pb-6 border-t ${variantStyle.expanded}`}>
          <div className="pt-6 space-y-6">
            {/* PRIMARY: Assets Checked with Temperatures - MOST IMPORTANT FOR EHO */}
            {temperatures.length > 0 && (
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Assets Checked</h4>
                <div className="space-y-3">
                  {temperatures.map((temp: any, idx: number) => {
                    const statusColor = temp.status === 'failed' 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : temp.status === 'warning' 
                      ? 'border-orange-500/50 bg-orange-500/10' 
                      : 'border-green-500/50 bg-green-500/10'
                    
                    const statusText = temp.status === 'failed' 
                      ? 'OUT OF RANGE' 
                      : temp.status === 'warning' 
                      ? 'WARNING' 
                      : 'OK'
                    
                    const statusIconColor = temp.status === 'failed' 
                      ? 'text-red-400' 
                      : temp.status === 'warning' 
                      ? 'text-orange-400' 
                      : 'text-green-400'
                    
                    return (
                      <div key={idx} className={`rounded-lg p-4 border-2 ${statusColor}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Thermometer className={`w-6 h-6 ${statusIconColor}`} />
                            <div>
                              <p className="text-base font-bold text-white">{temp.equipment || 'Unknown Equipment'}</p>
                            </div>
                          </div>
                          <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                            temp.status === 'failed' 
                              ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
                              : temp.status === 'warning' 
                              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' 
                              : 'bg-green-500/30 text-green-300 border border-green-500/50'
                          }`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-white/60 mb-1">Temperature Reading</p>
                          <p className="text-2xl font-bold text-white">
                            {temp.temp !== undefined && temp.temp !== null ? `${temp.temp}°C` : 'No reading recorded'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completion Information - Who and When (removed duplication - already shown in header) */}

            {/* Callout Report Data - Show all callout info if this is a callout report */}
            {isCalloutReport && calloutReportData && (
              <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-4 mb-6">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Callout Report Details
                </h4>
                <div className="space-y-4 text-sm">
                  {/* Asset Information */}
                  {(calloutAssetName || calloutAssetId) && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-2 font-medium">Asset Information</p>
                      {calloutAssetName && (
                        <p className="text-white/90 font-medium text-base mb-1">{calloutAssetName}</p>
                      )}
                      {calloutAssetId && (
                        <p className="text-white/60 text-xs font-mono">ID: {calloutAssetId}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Contractor Information */}
                  {(calloutContractorName || calloutContractorId || calloutContractorEmail) && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-white/60 text-xs mb-2 font-medium">Contractor Information</p>
                      {calloutContractorName && (
                        <p className="text-white/90 font-medium text-base mb-1">{calloutContractorName}</p>
                      )}
                      {calloutContractorEmail && (
                        <p className="text-white/70 text-xs mb-1">Email: {calloutContractorEmail}</p>
                      )}
                      {calloutContractorId && (
                        <p className="text-white/60 text-xs font-mono">ID: {calloutContractorId}</p>
                      )}
                    </div>
                  )}
                  
                  {calloutType && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Callout Type</p>
                      <p className="text-white/90 font-medium capitalize">{calloutType}</p>
                    </div>
                  )}
                  
                  {calloutFaultDescription && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Fault Description</p>
                      <p className="text-white/90 font-medium whitespace-pre-line bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                        {calloutFaultDescription}
                      </p>
                    </div>
                  )}
                  
                  {/* Troubleshooting Questions with Answers */}
                  {troubleshootingQuestions.length > 0 && (
                    <div>
                      <p className="text-white/60 text-xs mb-3 font-medium">Troubleshooting Questions & Answers</p>
                      <div className="space-y-3">
                        {troubleshootingQuestions.map((question: string, idx: number) => {
                          // Try to get answer from multiple sources
                          let answer = null
                          
                          // Check if troubleshootingData has this question as a key
                          if (typeof troubleshootingData === 'object' && troubleshootingData[question]) {
                            answer = troubleshootingData[question]
                          }
                          // Check if answers array has this index
                          else if (Array.isArray(troubleshootingAnswers) && troubleshootingAnswers[idx]) {
                            answer = troubleshootingAnswers[idx]
                          }
                          // Check if troubleshooting_answers is an object with question keys
                          else if (typeof troubleshootingAnswers === 'object' && troubleshootingAnswers[question]) {
                            answer = troubleshootingAnswers[question]
                          }
                          
                          // Determine answer display
                          const answerDisplay = answer === 'completed' || answer === 'yes' || answer === true 
                            ? { text: 'Yes', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
                            : answer === 'no' || answer === false
                            ? { text: 'No', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' }
                            : answer
                            ? { text: String(answer), color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' }
                            : { text: 'No answer recorded', color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' }
                          
                          return (
                            <div key={idx} className={`bg-white/5 border ${answerDisplay.border} rounded-lg p-3`}>
                              <p className="text-white/90 text-sm font-medium mb-2">{question}</p>
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${answerDisplay.bg} ${answerDisplay.border} border`}>
                                <span className={`text-xs font-semibold ${answerDisplay.color}`}>
                                  {answerDisplay.text === 'No answer recorded' ? (
                                    <span className="italic">{answerDisplay.text}</span>
                                  ) : (
                                    <>
                                      {answerDisplay.text === 'Yes' && '✓ '}
                                      {answerDisplay.text === 'No' && '✗ '}
                                      {answerDisplay.text}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {calloutNotes && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Additional Notes</p>
                      <p className="text-white/70 whitespace-pre-line bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                        {calloutNotes}
                      </p>
                    </div>
                  )}
                  
                  {calloutId && (
                    <div>
                      <p className="text-white/60 text-xs mb-1">Callout ID</p>
                      <p className="text-white/90 font-mono text-xs bg-white/5 border border-white/10 rounded-lg p-2 inline-block">
                        {calloutId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-Up Actions - DETAILED for Compliance Reporting */}
            {(tempAction || monitoringTaskId || calloutId || flagReason) && !isCalloutReport && (
              <div className="bg-orange-500/10 border-2 border-orange-500/50 rounded-lg p-4">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Follow-Up Actions & Outcomes
                </h4>
                <div className="space-y-4 text-sm">
                  {tempAction === 'monitor' && (
                    <div className="bg-orange-500/20 border border-orange-500/40 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-orange-300">Monitoring Task Created</span>
                      </div>
                      {monitoringAssetName && (
                        <p className="text-white/90 text-sm font-medium mb-1">
                          Asset: {monitoringAssetName}
                        </p>
                      )}
                      {monitoringDuration && (
                        <p className="text-white/80 text-sm">
                          <span className="font-medium">Duration:</span> {
                            typeof monitoringDuration === 'number' 
                              ? monitoringDuration === 60 
                                ? '1 hour' 
                                : monitoringDuration < 60 
                                  ? `${monitoringDuration} minutes`
                                  : `${Math.floor(monitoringDuration / 60)} hour${Math.floor(monitoringDuration / 60) !== 1 ? 's' : ''}`
                              : monitoringDuration
                          }
                        </p>
                      )}
                      {!monitoringDuration && (
                        <p className="text-white/80 text-sm">
                          <span className="font-medium">Duration:</span> 1 hour (default)
                        </p>
                      )}
                      {monitoringDetails.result && (
                        <p className="text-white/80 text-sm mt-2">
                          <span className="font-medium">Result:</span> {monitoringDetails.result}
                        </p>
                      )}
                      {monitoringDetails.follow_up_temp !== undefined && monitoringDetails.follow_up_temp !== null && (
                        <p className="text-white/80 text-sm mt-2">
                          <span className="font-medium">Follow-up Temperature:</span> {monitoringDetails.follow_up_temp}°C
                        </p>
                      )}
                    </div>
                  )}
                  {tempAction === 'callout' && (
                    <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-red-300">Contractor Callout Created</span>
                      </div>
                      {contractorName && (
                        <p className="text-white/90 text-sm font-medium mb-1">
                          Contractor: {contractorName}
                        </p>
                      )}
                      {calloutDetails.contractor_type && (
                        <p className="text-white/80 text-sm">
                          <span className="font-medium">Type:</span> {calloutDetails.contractor_type}
                        </p>
                      )}
                      {calloutDetails.status && (
                        <p className="text-white/80 text-sm mt-2">
                          <span className="font-medium">Status:</span> <span className="capitalize">{calloutDetails.status}</span>
                        </p>
                      )}
                      {calloutDetails.resolution && (
                        <p className="text-white/80 text-sm mt-2">
                          <span className="font-medium">Resolution:</span> {calloutDetails.resolution}
                        </p>
                      )}
                      {calloutDetails.resolved_at && (
                        <p className="text-white/80 text-sm mt-2">
                          <span className="font-medium">Resolved At:</span> {new Date(calloutDetails.resolved_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {flagReason === 'completed_late' && (
                    <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3">
                      <p className="text-yellow-300 font-medium">⚠️ Task was completed late</p>
                      {(completionRecord?.completed_at || task.completed_at) && task.due_date && (
                        <p className="text-white/80 text-xs mt-1">
                          Due: {new Date(task.due_date).toLocaleDateString()} | 
                          Completed: {new Date(completionRecord?.completed_at || task.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {flagReason === 'completed_early' && (
                    <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-3">
                      <p className="text-blue-300 font-medium">ℹ️ Task was completed early</p>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Checklist Items - Show ALL items with completion status */}
            {checklistItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Checklist Items ({completedChecklistCount} of {checklistItems.length} completed)
                </h4>
                <div className="space-y-2">
                  {checklistItems.map((item: any, idx: number) => {
                    const itemText = typeof item === 'string' ? item : (item.label || item.text || item.name || `Item ${idx + 1}`)
                    const isCompleted = typeof item === 'object' ? (item.completed !== false) : false
                    
                    return (
                      <div key={idx} className={`flex items-start gap-3 rounded-lg p-3 border ${
                        isCompleted 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCompleted ? 'text-white/90' : 'text-white/60'}`}>
                            {itemText}
                          </p>
                          {typeof item === 'object' && item.description && (
                            <p className="text-xs text-white/50 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Yes/No Checklist Items - Show ALL questions with answers */}
            {yesNoChecklistItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">
                  Yes/No Questions ({yesNoChecklistItems.filter((item: any) => item.answer).length} of {yesNoChecklistItems.length} answered)
                </h4>
                <div className="space-y-2">
                  {yesNoChecklistItems.map((item: any, idx: number) => {
                    const itemText = item.text || item.question || item.label || `Question ${idx + 1}`
                    const answer = item.answer || null
                    
                    return (
                      <div key={idx} className={`flex items-start gap-3 rounded-lg p-3 border ${
                        answer === 'yes' 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : answer === 'no' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-white/[0.03] border-white/[0.06]'
                      }`}>
                        {answer === 'yes' ? (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : answer === 'no' ? (
                          <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-5 h-5 flex-shrink-0 mt-0.5 border-2 border-white/20 rounded-full" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white/90">{itemText}</p>
                          {answer ? (
                            <p className={`text-sm mt-1 font-semibold ${
                              answer === 'yes' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              Answer: {answer.toUpperCase()}
                              {answer === 'no' && item.action && (
                                <span className="ml-2 text-orange-400 text-xs">⚠️ {item.action}</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs mt-1 text-white/40 italic">No answer recorded</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}


            {/* Pass/Fail Result */}
            {passFailResult && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Result</h4>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  passFailResult === 'pass' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}>
                  {passFailResult === 'pass' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span className="font-medium uppercase">{passFailResult}</span>
                </div>
              </div>
            )}

            {/* Photos */}
            {photoUrls.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Photos</h4>
                <div className="grid grid-cols-2 gap-3">
                  {photoUrls.map((photoUrl: string, idx: number) => (
                    <a
                      key={idx}
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/[0.06] hover:border-pink-500/50 transition-colors group"
                    >
                      <img
                        src={photoUrl}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-5 h-5 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2">Notes & Observations</h4>
                <p className="text-sm text-white/70 whitespace-pre-line bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                  {notes}
                </p>
              </div>
            )}


            {/* Instructions - Move to bottom, only show if there's no recorded data or user wants to see them */}
            {(task.custom_instructions || task.template?.instructions) && (
              <div className="pt-4 border-t border-white/[0.06]">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-white/60 hover:text-white/80 transition-colors list-none">
                    <div className="flex items-center gap-2">
                      <span>View Instructions</span>
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-sm text-white/70 whitespace-pre-line">
                      {task.custom_instructions || task.template?.instructions}
                    </p>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

