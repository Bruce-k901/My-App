'use client'

import { useState, useMemo, useEffect } from 'react'
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
  const [temperatureLogs, setTemperatureLogs] = useState<any[]>([])

  // Fetch temperature_logs for this task completion
  // Only fetch if this is a temperature-related task
  useEffect(() => {
    const fetchTemperatureLogs = async () => {
      // Only fetch for temperature tasks - check if task has temperature data in completion_data
      const hasTemperatureData = completionRecord?.completion_data?.equipment_list?.some(
        (item: any) => item.temperature !== null && item.temperature !== undefined
      )
      
      // Skip if no temperature data and no recorded_by/completed_at
      if (!hasTemperatureData && (!completionRecord?.completed_by || !completionRecord?.completed_at)) {
        return
      }

      try {
        // Fetch temperature_logs that match:
        // 1. Same user (recorded_by)
        // 2. Same time window (within 5 minutes of completion)
        // 3. Same company/site (if available)
        const completionTime = new Date(completionRecord.completed_at)
        const timeWindowStart = new Date(completionTime.getTime() - 5 * 60 * 1000) // 5 minutes before
        const timeWindowEnd = new Date(completionTime.getTime() + 5 * 60 * 1000) // 5 minutes after

        // Simplified query without foreign key join (fetch asset names separately if needed)
        let query = supabase
          .from('temperature_logs')
          .select('id, asset_id, reading, unit, recorded_at, status, notes')
          .eq('recorded_by', completionRecord.completed_by)
          .gte('recorded_at', timeWindowStart.toISOString())
          .lte('recorded_at', timeWindowEnd.toISOString())
          .order('recorded_at', { ascending: false })
          .limit(10) // Limit to prevent excessive queries

        // If we have site_id from task, filter by it
        if (task.site_id) {
          query = query.eq('site_id', task.site_id)
        }

        const { data, error } = await query

        if (error) {
          // Only log errors that aren't expected (like RLS blocking or no data)
          // PGRST301 = RLS policy violation, PGRST116 = no rows returned (not really an error)
          if (error.code !== 'PGRST116' && !error.message?.includes('permission') && !error.message?.includes('policy')) {
            console.warn('⚠️ Error fetching temperature_logs (non-critical):', error.message || error.code)
          }
          // Silently handle expected errors (no data, RLS blocking)
        } else if (data && data.length > 0) {
          // Fetch asset names separately if needed
          const assetIds = [...new Set(data.map((log: any) => log.asset_id).filter(Boolean))]
          if (assetIds.length > 0) {
            const { data: assets } = await supabase
              .from('assets')
              .select('id, name')
              .in('id', assetIds)
            
            const assetMap = new Map((assets || []).map((a: any) => [a.id, a.name]))
            
            // Enrich temperature logs with asset names
            const enrichedLogs = data.map((log: any) => ({
              ...log,
              asset_name: assetMap.get(log.asset_id) || 'Unknown Asset'
            }))
            
            setTemperatureLogs(enrichedLogs)
          } else {
            setTemperatureLogs(data)
          }
        }
        // Silently handle no data case - this is expected for many tasks
      } catch (error: any) {
        // Only log unexpected errors
        if (error?.code !== 'PGRST116' && !error?.message?.includes('permission')) {
          console.warn('⚠️ Error in fetchTemperatureLogs (non-critical):', error?.message || error)
        }
      }
    }

    fetchTemperatureLogs()
  }, [completionRecord?.completed_by, completionRecord?.completed_at, completionRecord?.completion_data, task.site_id])

  // Check both completion_data and task_data for recorded information
  const completionData = completionRecord?.completion_data || {}
  const taskData = task.task_data || {}
  
  // Merge data from both sources (completion_data takes precedence)
  const allData = { ...taskData, ...completionData }
  
  // CRITICAL DEBUG: Log the raw completion data structure
  const equipmentListWithTemps = Array.isArray(completionData.equipment_list) 
    ? completionData.equipment_list.filter((eq: any) => 
        eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== '' ||
        eq.reading !== null && eq.reading !== undefined && eq.reading !== '' ||
        eq.temp !== null && eq.temp !== undefined && eq.temp !== ''
      )
    : []
  
  console.log('🔍 RAW COMPLETION DATA STRUCTURE:', {
    taskId: task.id,
    taskName: task.custom_name || task.template?.name,
    hasCompletionRecord: !!completionRecord,
    completionRecordId: completionRecord?.id,
    completionDataKeys: Object.keys(completionData),
    equipment_list: completionData.equipment_list,
    equipment_list_type: typeof completionData.equipment_list,
    equipment_list_isArray: Array.isArray(completionData.equipment_list),
    equipment_list_length: Array.isArray(completionData.equipment_list) ? completionData.equipment_list.length : 0,
    equipment_list_with_temps_count: equipmentListWithTemps.length,
    equipment_list_with_temps: equipmentListWithTemps.map((eq: any) => ({
      asset_id: eq.asset_id || eq.assetId || eq.id || eq.value,
      asset_name: eq.asset_name || eq.name || eq.label,
      temperature: eq.temperature,
      reading: eq.reading,
      temp: eq.temp,
      status: eq.status
    })),
    equipment_list_details: Array.isArray(completionData.equipment_list) ? completionData.equipment_list.map((eq: any, idx: number) => ({
      index: idx,
      asset_id: eq.asset_id || eq.assetId || eq.id || eq.value,
      asset_name: eq.asset_name || eq.name || eq.label,
      temperature: eq.temperature,
      reading: eq.reading,
      temp: eq.temp,
      status: eq.status,
      hasTemperature: eq.temperature !== null && eq.temperature !== undefined && eq.temperature !== '' ||
                      eq.reading !== null && eq.reading !== undefined && eq.reading !== '' ||
                      eq.temp !== null && eq.temp !== undefined && eq.temp !== '',
      all_keys: Object.keys(eq)
    })) : null,
    temperature_records_count: completionData.temperature_records_count,
    temperatures_array: completionData.temperatures,
    taskData: taskData,
    taskDataKeys: Object.keys(taskData)
  })
  
  // Warn if equipment_list exists but has no temperatures (for temperature tasks)
  const isTemperatureTask = task.template?.evidence_types?.includes('temperature') || 
                            task.template?.name?.toLowerCase().includes('temperature') ||
                            task.template?.name?.toLowerCase().includes('fridge') ||
                            task.template?.name?.toLowerCase().includes('freezer')
  
  if (isTemperatureTask && Array.isArray(completionData.equipment_list) && completionData.equipment_list.length > 0 && equipmentListWithTemps.length === 0) {
    console.warn('⚠️ DISPLAY WARNING: Temperature task has equipment_list but NO temperatures found!', {
      equipment_list: completionData.equipment_list,
      taskId: task.id
    })
  }
  
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
        // Extract string ID from various formats
        let assetId: string | null = null
        if (item.value) {
          assetId = typeof item.value === 'string' ? item.value : (item.value?.id || item.value?.value || item.value?.asset_id || String(item.value))
        } else if (item.asset_id) {
          assetId = typeof item.asset_id === 'string' ? item.asset_id : (item.asset_id?.id || item.asset_id?.value || String(item.asset_id))
        } else if (item.id) {
          assetId = typeof item.id === 'string' ? item.id : (item.id?.id || item.id?.value || String(item.id))
        }
        
        // Only proceed if we have a valid string ID
        if (!assetId || typeof assetId !== 'string') {
          return null
        }
        
        const assetFromDb = assetsMap.get(assetId)
        return {
          asset_id: assetId,
          asset_name: assetFromDb?.name || item.label || item.name || item.asset_name || 'Unknown Equipment',
          nickname: item.nickname || null
        }
      }).filter(Boolean) as any[] // Filter out null entries
    }
  }
  
  // Step 2: Get recorded temperatures from completion_data
  // CRITICAL: Check ALL possible locations where temperatures might be stored
  const recordedTemps = new Map<string, any>()
  
  // METHOD 1: From equipment_list (preferred format) - check multiple possible field names for temperature
  if (completionData.equipment_list && Array.isArray(completionData.equipment_list)) {
    console.log('🔍 METHOD 1: Processing equipment_list with', completionData.equipment_list.length, 'items')
    completionData.equipment_list.forEach((eq: any, index: number) => {
      console.log(`🔍 METHOD 1: Processing equipment_list item ${index}:`, eq)
      
      // Try multiple possible asset ID field names and ensure it's a string
      // CRITICAL: Handle "[object Object]" which can occur if asset_id was incorrectly saved
      let assetId: string | null = null
      const rawId = eq.asset_id || eq.assetId || eq.id || eq.value
      if (rawId) {
        if (typeof rawId === 'string') {
          // Skip if it's "[object Object]" - try to find real ID from other fields
          if (rawId === '[object Object]' || rawId.includes('[object')) {
            // Try to find real asset ID from other fields or task_data
            const taskDataAssets = taskData[task.template?.repeatable_field_name || ''] || []
            if (Array.isArray(taskDataAssets) && taskDataAssets.length > index) {
              const taskDataAsset = taskDataAssets[index]
              if (taskDataAsset) {
                const realId = taskDataAsset.value || taskDataAsset.id || taskDataAsset.asset_id
                if (realId && typeof realId === 'string' && !realId.includes('[object')) {
                  assetId = realId
                } else if (realId && typeof realId === 'object' && realId.id) {
                  assetId = realId.id
                }
              }
            }
            // If still no valid ID, try to match by asset_name
            if (!assetId && eq.asset_name) {
              // Try to find asset by name in assetsMap
              for (const [id, asset] of assetsMap.entries()) {
                if (asset.name === eq.asset_name) {
                  assetId = id
                  break
                }
              }
            }
          } else {
            assetId = rawId
          }
        } else if (typeof rawId === 'object' && rawId !== null) {
          // Extract from nested object
          assetId = rawId.id || rawId.value || rawId.asset_id
          // Never use String() on objects - it creates "[object Object]"
          if (!assetId && rawId.id && typeof rawId.id === 'string') assetId = rawId.id
          if (!assetId && rawId.value && typeof rawId.value === 'string') assetId = rawId.value
        }
      }
      
      console.log(`🔍 METHOD 1: Extracted assetId: ${assetId} (type: ${typeof assetId}, rawId: ${rawId})`)
      
      // Skip if assetId is invalid
      if (assetId && typeof assetId === 'string' && !assetId.includes('[object')) {
        const assetFromDb = assetsMap.get(assetId)
        // Check multiple possible field names for temperature value
        // IMPORTANT: Check for 0 as a valid temperature reading
        let tempValue = null
        console.log(`🔍 METHOD 1: Checking temperature fields for ${assetId}:`, {
          temperature: eq.temperature,
          reading: eq.reading,
          temp: eq.temp,
          allFields: Object.keys(eq)
        })
        
        if (eq.temperature !== undefined && eq.temperature !== null && eq.temperature !== '') {
          tempValue = eq.temperature
          console.log(`✅ METHOD 1: Found temperature from 'temperature' field: ${tempValue}`)
        } else if (eq.reading !== undefined && eq.reading !== null && eq.reading !== '') {
          tempValue = eq.reading
          console.log(`✅ METHOD 1: Found temperature from 'reading' field: ${tempValue}`)
        } else if (eq.temp !== undefined && eq.temp !== null && eq.temp !== '') {
          tempValue = eq.temp
          console.log(`✅ METHOD 1: Found temperature from 'temp' field: ${tempValue}`)
        }
        
        // Handle 0 as a valid temperature (fridge/freezer can be 0°C)
        if (tempValue === 0 || tempValue === '0') {
          tempValue = 0
          console.log(`✅ METHOD 1: Temperature is 0 (valid reading)`)
        }
        
        if (tempValue !== null && tempValue !== undefined && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            recordedTemps.set(assetId, {
              temp: numValue,
              status: eq.status || 'ok',
              time: eq.recorded_at || completionRecord?.completed_at,
              asset_name: assetFromDb?.name || eq.asset_name || eq.name || 'Unknown Equipment',
              nickname: eq.nickname || null
            })
            console.log(`✅ METHOD 1: SUCCESS - Set temperature ${numValue}°C for asset ${assetId} (${eq.asset_name || assetFromDb?.name || 'Unknown'})`)
          } else {
            console.log(`⚠️ METHOD 1: Temperature value ${tempValue} is not a valid number`)
          }
        } else {
          console.log(`⚠️ METHOD 1: No temperature value found in equipment_list item for asset ${assetId}. Full item:`, JSON.stringify(eq, null, 2))
        }
      } else {
        console.log(`⚠️ METHOD 1: Could not extract valid assetId from equipment_list item:`, eq)
      }
    })
  } else {
    console.log('⚠️ METHOD 1: equipment_list is not an array or does not exist:', {
      exists: !!completionData.equipment_list,
      type: typeof completionData.equipment_list,
      isArray: Array.isArray(completionData.equipment_list),
      value: completionData.equipment_list
    })
  }
  
  // METHOD 2: From temperatures array
  if (completionData.temperatures && Array.isArray(completionData.temperatures)) {
    completionData.temperatures.forEach((temp: any) => {
      // Extract string ID from various formats
      let assetId: string | null = null
      const rawId = temp.assetId || temp.asset_id
      if (rawId) {
        if (typeof rawId === 'string') {
          assetId = rawId
        } else if (typeof rawId === 'object' && rawId !== null) {
          assetId = rawId.id || rawId.value || rawId.asset_id || String(rawId)
        } else {
          assetId = String(rawId)
        }
      }
      
      if (assetId && typeof assetId === 'string') {
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
  // Also check for temp IDs (temp_0, temp_1, etc.) used for constructed assets
  assetsFromTaskData.forEach((asset) => {
    // Ensure asset_id is a string
    let assetId = asset.asset_id
    if (assetId && typeof assetId !== 'string') {
      // If it's an object, try to extract the ID
      if (typeof assetId === 'object' && assetId !== null) {
        assetId = assetId.id || assetId.value || assetId.asset_id || String(assetId)
      } else {
        assetId = String(assetId)
      }
    }
    
    if (assetId && typeof assetId === 'string' && !recordedTemps.has(assetId)) {
      // Try both the actual asset ID and temp ID format
      const tempKey = `temp_${assetId}`
      // Check both completionData and allData (merged data)
      let tempValue = completionData[tempKey] !== undefined ? completionData[tempKey] 
        : (allData[tempKey] !== undefined ? allData[tempKey] : null)
      
      // Also check if assetId is a temp ID (temp_0, temp_1, etc.) and look for it directly
      if ((tempValue === null || tempValue === undefined || tempValue === '') && typeof assetId === 'string' && assetId.startsWith('temp_')) {
        tempValue = completionData[assetId] !== undefined ? completionData[assetId]
          : (allData[assetId] !== undefined ? allData[assetId] : null)
      }
      
      if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
        // Convert to number if it's a string
        const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
        if (!isNaN(numValue)) {
          recordedTemps.set(assetId, {
            temp: numValue,
            status: 'ok',
            time: completionRecord?.completed_at,
            asset_name: asset.asset_name,
            nickname: asset.nickname || null
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
      if (assetId && typeof assetId === 'string' && !recordedTemps.has(assetId)) {
        const tempValue = completionData[key]
        if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            // Try to find asset name from assetsFromTaskData (ensure string comparison)
            const asset = assetsFromTaskData.find(a => {
              const aId = typeof a.asset_id === 'string' ? a.asset_id : String(a.asset_id)
              return aId === assetId
            })
            recordedTemps.set(assetId, {
              temp: numValue,
              status: 'ok',
              time: completionRecord?.completed_at,
              asset_name: asset?.asset_name || 'Unknown Equipment',
              nickname: asset?.nickname || null
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
      if (assetId && typeof assetId === 'string' && !recordedTemps.has(assetId)) {
        const tempValue = allData[key]
        if (tempValue !== undefined && tempValue !== null && tempValue !== '') {
          const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
          if (!isNaN(numValue)) {
            // Try to find asset name from assetsFromTaskData (ensure string comparison)
            const asset = assetsFromTaskData.find(a => {
              const aId = typeof a.asset_id === 'string' ? a.asset_id : String(a.asset_id)
              return aId === assetId
            })
            recordedTemps.set(assetId, {
              temp: numValue,
              status: 'ok',
              time: completionRecord?.completed_at,
              asset_name: asset?.asset_name || 'Unknown Equipment',
              nickname: asset?.nickname || null
            })
          }
        }
      }
    }
  })
  
  // METHOD 6: Check for temperatures stored directly by asset ID (not temp_ prefix)
  // This handles cases where temperatures might be stored as { assetId: temperature }
  Object.keys(completionData).forEach((key) => {
    // Skip if it's already a temp_ key or known field
    if (key.startsWith('temp_') || ['equipment_list', 'temperatures', 'checklist_items', 'yes_no_checklist_items', 'checklistItems', 'photos', 'evidence_attachments', 'notes', 'pass_fail_result'].includes(key)) {
      return
    }
    
    // Check if this key matches an asset ID from task data
    // Ensure we're comparing strings
    const matchingAsset = assetsFromTaskData.find(a => {
      const aId = typeof a.asset_id === 'string' ? a.asset_id : String(a.asset_id)
      return aId === key
    })
    if (matchingAsset && !recordedTemps.has(key)) {
      const tempValue = completionData[key]
      // Handle 0 as valid temperature
      if ((tempValue === 0 || tempValue === '0') || (tempValue !== undefined && tempValue !== null && tempValue !== '')) {
        const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
        if (!isNaN(numValue)) {
          recordedTemps.set(key, {
            temp: numValue,
            status: 'ok',
            time: completionRecord?.completed_at,
            asset_name: matchingAsset.asset_name,
            nickname: matchingAsset.nickname || null
          })
          console.log(`✅ METHOD 6: Found temperature ${numValue}°C for asset ${key} (${matchingAsset.asset_name})`)
        }
      }
    }
  })
  
  // METHOD 7: Final fallback - check if formData was spread into completionData
  // Sometimes temperatures are stored directly in formData keys
  if (assetsFromTaskData.length > 0 && recordedTemps.size === 0) {
    console.log('⚠️ No temperatures found via previous methods, checking formData keys...')
    assetsFromTaskData.forEach((asset) => {
      const assetIdStr = typeof asset.asset_id === 'string' ? asset.asset_id : String(asset.asset_id)
      if (!recordedTemps.has(assetIdStr)) {
        // Check for any key that might contain this asset's temperature
        Object.keys(completionData).forEach((key) => {
          if (key.includes(assetIdStr) || key.includes(asset.asset_name) || (asset.nickname && key.includes(asset.nickname))) {
            const value = completionData[key]
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
              const numValue = typeof value === 'string' ? parseFloat(value) : value
              if (!isNaN(numValue) && !recordedTemps.has(assetIdStr)) {
                recordedTemps.set(assetIdStr, {
                  temp: numValue,
                  status: 'ok',
                  time: completionRecord?.completed_at,
                  asset_name: asset.asset_name,
                  nickname: asset.nickname || null
                })
                console.log(`✅ METHOD 7: Found temperature ${numValue}°C for asset ${assetIdStr} via key ${key}`)
              }
            }
          }
        })
      }
    })
  }
  
  // Debug logging for temperature extraction - COMPREHENSIVE
  console.log('🌡️ Temperature Extraction Debug:', {
    taskId: task.id,
    assetsFromTaskData: assetsFromTaskData.length,
    assetsFromTaskDataIds: assetsFromTaskData.map(a => a.asset_id),
    assetsFromTaskDataDetails: assetsFromTaskData.map(a => ({
      asset_id: a.asset_id,
      asset_name: a.asset_name,
      nickname: a.nickname
    })),
    recordedTempsSize: recordedTemps.size,
    recordedTemps: Array.from(recordedTemps.entries()),
    equipment_list: completionData.equipment_list?.length || 0,
    equipment_list_data: completionData.equipment_list,
    temperatures_array: completionData.temperatures?.length || 0,
    temperatures_array_data: completionData.temperatures,
    completionDataKeys: Object.keys(completionData).filter(k => k.startsWith('temp_')),
    allDataKeys: Object.keys(allData).filter(k => k.startsWith('temp_')),
    taskDataRepeatableField: task.template?.repeatable_field_name ? taskData[task.template.repeatable_field_name] : null,
    fullCompletionData: completionData // Full data for debugging
  })
  
  // Step 3: Get temperature ranges from task_data (equipment_config or repeatable field data)
  const tempRanges = new Map<string, { min: number | null; max: number | null }>()
  
  // Check equipment_config first (saved when task was created)
  if (taskData.equipment_config && Array.isArray(taskData.equipment_config)) {
    taskData.equipment_config.forEach((item: any, index: number) => {
      const assetId = item.assetId || item.asset_id || item.value || item.id
      if (assetId) {
        const tempMin = item.temp_min !== undefined && item.temp_min !== null ? item.temp_min : null
        const tempMax = item.temp_max !== undefined && item.temp_max !== null ? item.temp_max : null
        if (tempMin !== null || tempMax !== null) {
          tempRanges.set(assetId, { min: tempMin, max: tempMax })
        }
      }
    })
  }
  
  // Check repeatable field data (fallback)
  const repeatableFieldName = task.template?.repeatable_field_name
  if (repeatableFieldName && taskData[repeatableFieldName] && Array.isArray(taskData[repeatableFieldName])) {
    taskData[repeatableFieldName].forEach((item: any) => {
      const assetId = item.assetId || item.asset_id || item.value || item.id
      if (assetId && !tempRanges.has(assetId)) {
        const tempMin = item.temp_min !== undefined && item.temp_min !== null ? item.temp_min : null
        const tempMax = item.temp_max !== undefined && item.temp_max !== null ? item.temp_max : null
        if (tempMin !== null || tempMax !== null) {
          tempRanges.set(assetId, { min: tempMin, max: tempMax })
        }
      }
    })
  }
  
  // Helper function to check if temperature is out of range
  // Handle inverted ranges for freezers (where min > max, e.g., min: -18, max: -20)
  const checkTemperatureRange = (temp: number | null, assetId: string): 'ok' | 'warning' | 'failed' => {
    if (temp === null || temp === undefined || isNaN(temp)) return 'ok'
    
    const range = tempRanges.get(assetId)
    if (!range || (range.min === null && range.max === null)) return 'ok'
    
    const { min, max } = range
    const isInvertedRange = min !== null && max !== null && min > max
    
    let isOutOfRange = false
    if (isInvertedRange) {
      // Inverted range (freezer): actual range is max (colder) to min (warmer)
      // Temperature is out of range if: temp < max (too cold) OR temp > min (too warm)
      isOutOfRange = (max !== null && temp < max) || (min !== null && temp > min)
    } else {
      // Normal range (fridge): range is min (colder) to max (warmer)
      isOutOfRange = (min !== null && temp < min) || (max !== null && temp > max)
    }
    
    if (isOutOfRange) {
      return 'failed' // Out of range
    }
    
    // Check if close to limits (within 2°C) - this could be 'warning' but for now we'll use 'failed' for any out of range
    return 'ok'
  }
  
  // Step 4: Combine assets from task_data with recorded temperatures and check ranges
  // CRITICAL: Always show temperatures from equipment_list, even if they don't match task_data assets
  let temperatures: any[] = []
  
  console.log('🔍 Before combining: recordedTemps.size =', recordedTemps.size, 'assetsFromTaskData.length =', assetsFromTaskData.length)
  
  // FIRST PRIORITY: If we have equipment_list with temperatures, use those directly
  // This ensures we ALWAYS show recorded temperatures, even if asset IDs don't match
  if (completionData.equipment_list && Array.isArray(completionData.equipment_list) && completionData.equipment_list.length > 0) {
    console.log('🔍 PRIORITY: Using equipment_list directly to ensure all temperatures are shown')
    temperatures = completionData.equipment_list.map((eq: any, idx: number) => {
      // Extract asset ID
      let assetId: string | null = null
      const rawId = eq.asset_id || eq.assetId || eq.id || eq.value
      if (rawId) {
        if (typeof rawId === 'string') {
          assetId = rawId
        } else if (typeof rawId === 'object' && rawId !== null) {
          assetId = rawId.id || rawId.value || rawId.asset_id || String(rawId)
        } else {
          assetId = String(rawId)
        }
      }
      
      // Extract temperature from multiple possible field names
      let tempValue = null
      if (eq.temperature !== undefined && eq.temperature !== null && eq.temperature !== '') {
        tempValue = eq.temperature
      } else if (eq.reading !== undefined && eq.reading !== null && eq.reading !== '') {
        tempValue = eq.reading
      } else if (eq.temp !== undefined && eq.temp !== null && eq.temp !== '') {
        tempValue = eq.temp
      }
      
      // Handle 0 as valid temperature
      if (tempValue === 0 || tempValue === '0') {
        tempValue = 0
      }
      
      // Convert to number if it's a string
      const numValue = (tempValue !== null && tempValue !== undefined && tempValue !== '') 
        ? (typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue)
        : null
      
      // Get asset name
      const assetName = eq.asset_name || eq.name || eq.label || 'Unknown Equipment'
      const assetNickname = eq.nickname || null
      const equipmentDisplay = assetNickname ? `${assetName} | ${assetNickname}` : assetName
      
      // Get asset from DB if we have asset ID
      const assetFromDb = assetId ? assetsMap.get(assetId) : null
      const finalAssetName = assetFromDb?.name || assetName
      const finalEquipmentDisplay = assetNickname ? `${finalAssetName} | ${assetNickname}` : finalAssetName
      
      // Determine status
      let status = eq.status || 'ok'
      if (numValue !== null && !isNaN(numValue) && assetId) {
        const rangeStatus = checkTemperatureRange(numValue, assetId)
        if (rangeStatus !== 'ok') {
          status = rangeStatus
        }
      }
      
      return {
        asset_id: assetId || `eq_${idx}`,
        equipment: finalEquipmentDisplay,
        temp: (!isNaN(numValue) && numValue !== null) ? numValue : null,
        status: status,
        time: eq.recorded_at || completionRecord?.completed_at,
        range: assetId ? tempRanges.get(assetId) || null : null
      }
    })
    
    console.log('✅ PRIORITY: Created temperatures array from equipment_list:', temperatures.length, 'items')
    
    // CRITICAL: If equipment_list has no temperatures, try to get them from temperature_logs
    const tempsWithValues = temperatures.filter(t => t.temp !== null && t.temp !== undefined)
    if (tempsWithValues.length === 0 && temperatureLogs.length > 0) {
      console.log('⚠️ Equipment_list has no temperatures, but temperature_logs found. Merging temperature_logs data...')
      temperatureLogs.forEach((log: any) => {
        const assetId = log.asset_id
        const assetName = log.assets?.name || 'Unknown Equipment'
        const reading = log.reading
        
        // Check if we already have this asset in temperatures array
        const existingIndex = temperatures.findIndex(t => 
          t.asset_id === assetId || 
          (t.equipment && t.equipment.includes(assetName))
        )
        
        if (existingIndex >= 0) {
          // Update existing entry with temperature from logs
          temperatures[existingIndex].temp = reading
          temperatures[existingIndex].status = log.status || temperatures[existingIndex].status
          temperatures[existingIndex].time = log.recorded_at || temperatures[existingIndex].time
          console.log(`✅ Updated temperature for ${assetName} from temperature_logs: ${reading}°C`)
        } else {
          // Add new entry from temperature_logs
          temperatures.push({
            asset_id: assetId,
            equipment: assetName,
            temp: reading,
            status: log.status || 'ok',
            time: log.recorded_at || completionRecord?.completed_at,
            range: assetId ? tempRanges.get(assetId) || null : null
          })
          console.log(`✅ Added temperature for ${assetName} from temperature_logs: ${reading}°C`)
        }
      })
    }
  } else if (assetsFromTaskData.length > 0) {
    // FALLBACK: Use assets from task_data and try to match with recorded temperatures
    temperatures = assetsFromTaskData.map((asset) => {
      const assetIdStr = typeof asset.asset_id === 'string' ? asset.asset_id : String(asset.asset_id)
      
      // Try to find recorded temp by asset_id
      let recorded = recordedTemps.get(assetIdStr) || {}
      
      // If no direct match, try to find by asset name or ID in equipment_list
      if (!recorded.temp && completionData.equipment_list && Array.isArray(completionData.equipment_list)) {
        console.log(`🔍 Searching equipment_list for asset ${asset.asset_name} (ID: ${assetIdStr})`)
        const matchingEq = completionData.equipment_list.find((eq: any) => {
          // Extract and normalize asset ID from equipment_list item
          let eqAssetId: string | null = null
          const rawEqId = eq.asset_id || eq.assetId || eq.id || eq.value
          if (rawEqId) {
            if (typeof rawEqId === 'string') {
              // Skip "[object Object]" - try to match by name instead
              if (rawEqId === '[object Object]' || rawEqId.includes('[object')) {
                eqAssetId = null // Will match by name instead
              } else {
                eqAssetId = rawEqId
              }
            } else if (typeof rawEqId === 'object' && rawEqId !== null) {
              // Extract from nested object - never use String() on objects
              eqAssetId = rawEqId.id || rawEqId.value || rawEqId.asset_id
            }
          }
          
          const eqAssetName = eq.asset_name || eq.name || eq.label || ''
          const assetNameMatch = eqAssetName === asset.asset_name || 
                                 eqAssetName?.includes(asset.asset_name) ||
                                 asset.asset_name?.includes(eqAssetName)
          const nicknameMatch = asset.nickname && (eqAssetName?.includes(asset.nickname) || asset.nickname.includes(eqAssetName))
          const idMatch = eqAssetId === assetIdStr
          
          const matches = idMatch || assetNameMatch || nicknameMatch
          if (matches) {
            console.log(`✅ Found match in equipment_list:`, {
              eqAssetId,
              eqAssetName,
              assetIdStr,
              assetName: asset.asset_name,
              idMatch,
              assetNameMatch,
              nicknameMatch,
              eqItem: eq
            })
          }
          return matches
        })
        
        if (matchingEq) {
          console.log(`🔍 Matching equipment_list item found:`, matchingEq)
          // Try multiple field names for temperature
          let tempValue = null
          if (matchingEq.temperature !== undefined && matchingEq.temperature !== null && matchingEq.temperature !== '') {
            tempValue = matchingEq.temperature
          } else if (matchingEq.reading !== undefined && matchingEq.reading !== null && matchingEq.reading !== '') {
            tempValue = matchingEq.reading
          } else if (matchingEq.temp !== undefined && matchingEq.temp !== null && matchingEq.temp !== '') {
            tempValue = matchingEq.temp
          }
          
          // Handle 0 as valid temperature
          if (tempValue === 0 || tempValue === '0') {
            tempValue = 0
          }
          
          console.log(`🔍 Extracted tempValue: ${tempValue} (type: ${typeof tempValue})`)
          
          // Also check if temperature is 0 (valid reading)
          if (tempValue !== null && tempValue !== undefined && tempValue !== '') {
            const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
            if (!isNaN(numValue)) {
              recorded = {
                temp: numValue,
                status: matchingEq.status || 'ok',
                time: matchingEq.recorded_at || completionRecord?.completed_at,
                asset_name: matchingEq.asset_name || asset.asset_name,
                nickname: matchingEq.nickname || asset.nickname || null
              }
              console.log(`✅ SUCCESS: Found temperature for ${asset.asset_name}: ${numValue}°C from equipment_list`)
            } else {
              console.log(`⚠️ Temperature value ${tempValue} is not a valid number`)
            }
          } else {
            console.log(`⚠️ No temperature value found in equipment_list for ${asset.asset_name}. Full item:`, JSON.stringify(matchingEq, null, 2))
          }
        } else {
          console.log(`⚠️ No matching equipment_list item found for asset ${asset.asset_name} (ID: ${assetIdStr})`)
          console.log(`🔍 Available equipment_list items:`, completionData.equipment_list.map((eq: any) => ({
            asset_id: eq.asset_id || eq.assetId || eq.id || eq.value,
            asset_name: eq.asset_name || eq.name || eq.label,
            temperature: eq.temperature,
            reading: eq.reading,
            temp: eq.temp
          })))
        }
      }
      
      const tempValue = recorded.temp !== undefined && recorded.temp !== null ? recorded.temp : null
      const status = recorded.status || checkTemperatureRange(tempValue, assetIdStr)
      
      return {
        asset_id: assetIdStr,
        equipment: asset.nickname ? `${asset.asset_name} | ${asset.nickname}` : asset.asset_name,
        temp: tempValue,
        status: status,
        time: recorded.time || completionRecord?.completed_at,
        range: tempRanges.get(assetIdStr) || null
      }
    })
    
    // CRITICAL FALLBACK: If still no temperatures, check temperature_logs
    const tempsWithValues = temperatures.filter(t => t.temp !== null && t.temp !== undefined)
    if (tempsWithValues.length === 0 && temperatureLogs.length > 0) {
      console.log('⚠️ No temperatures from task_data/equipment_list, but temperature_logs found. Using temperature_logs...')
      temperatureLogs.forEach((log: any) => {
        const assetId = log.asset_id
        const assetName = log.assets?.name || 'Unknown Equipment'
        const reading = log.reading
        
        // Check if we already have this asset
        const existingIndex = temperatures.findIndex(t => 
          t.asset_id === assetId || 
          (t.equipment && t.equipment.includes(assetName))
        )
        
        if (existingIndex >= 0) {
          temperatures[existingIndex].temp = reading
          temperatures[existingIndex].status = log.status || temperatures[existingIndex].status
          temperatures[existingIndex].time = log.recorded_at || temperatures[existingIndex].time
        } else {
          temperatures.push({
            asset_id: assetId,
            equipment: assetName,
            temp: reading,
            status: log.status || 'ok',
            time: log.recorded_at || completionRecord?.completed_at,
            range: assetId ? tempRanges.get(assetId) || null : null
          })
        }
      })
      console.log(`✅ Added ${temperatureLogs.length} temperature(s) from temperature_logs table`)
    }
  } else if (temperatureLogs.length > 0) {
    // LAST RESORT: If no equipment_list and no task_data assets, use temperature_logs directly
    console.log('⚠️ No equipment_list or task_data assets, using temperature_logs directly...')
    temperatures = temperatureLogs.map((log: any) => {
      const assetId = log.asset_id
      const assetName = log.assets?.name || 'Unknown Equipment'
      const reading = log.reading
      
      return {
        asset_id: assetId,
        equipment: assetName,
        temp: reading,
        status: log.status || 'ok',
        time: log.recorded_at || completionRecord?.completed_at,
        range: assetId ? tempRanges.get(assetId) || null : null
      }
    })
    console.log(`✅ Created temperatures array from temperature_logs: ${temperatures.length} items`)
  } else if (recordedTemps.size > 0) {
    // Fallback: if no task_data assets, use what we have from completion_data
    recordedTemps.forEach((recorded, assetId) => {
      const assetFromDb = assetsMap.get(assetId)
      const status = recorded.status || checkTemperatureRange(recorded.temp, assetId)
      
      temperatures.push({
        asset_id: assetId,
        equipment: recorded.asset_name || assetFromDb?.name || 'Unknown Equipment',
        temp: recorded.temp,
        status: status,
        time: recorded.time,
        range: tempRanges.get(assetId) || null
      })
    })
  }
  
  // Final summary log
  console.log('🌡️ Final Temperature Summary:', {
    taskId: task.id,
    totalTemperatures: temperatures.length,
    temperaturesWithReadings: temperatures.filter(t => t.temp !== null && t.temp !== undefined).length,
    temperaturesWithoutReadings: temperatures.filter(t => t.temp === null || t.temp === undefined).length,
    temperatureDetails: temperatures.map(t => ({
      asset: t.equipment,
      temp: t.temp,
      status: t.status,
      hasRange: !!t.range
    }))
  })
  
  // Get equipment/assets from task template or task data
  const equipmentAssets = task.template?.asset_id ? [task.template.asset_id] : []
  
  // Extract follow-up actions - CRITICAL for compliance reporting
  const tempAction = completionData.temp_action || task.flag_reason
  const monitoringTaskId = completionData.monitoring_task_id
  const calloutId = completionData.callout_id
  const flagReason = task.flag_reason || completionRecord?.completion_data?.flag_reason || completionData.flag_reason
  const followUpDetails = completionData.follow_up_details || completionData.followUpDetails || {}
  
  // Check if this is a monitoring/follow-up task
  const isMonitoringTask = flagReason === 'monitoring' || task.flag_reason === 'monitoring'
  
  // Extract historical context for monitoring tasks (why the follow-up was created)
  let originalTemperature: number | null = null
  let originalAssetId: string | null = null
  let originalAssetName: string | null = null
  let taskCreatedAt: string | null = null
  
  if (isMonitoringTask && taskData.temperatures && Array.isArray(taskData.temperatures) && taskData.temperatures.length > 0) {
    // Get the original temperature that triggered this follow-up (from task_data when monitoring task was created)
    const originalTempData = taskData.temperatures[0]
    originalTemperature = originalTempData.temp !== undefined && originalTempData.temp !== null ? originalTempData.temp : null
    originalAssetId = originalTempData.assetId || originalTempData.asset_id || null
    originalAssetName = originalTempData.nickname 
      ? `${assetsMap.get(originalAssetId || '')?.name || 'Unknown Equipment'} | ${originalTempData.nickname}`
      : (assetsMap.get(originalAssetId || '')?.name || originalTempData.asset_name || 'Unknown Equipment')
  }
  
  // Get task creation time (when follow-up was created)
  if (isMonitoringTask && task.generated_at) {
    taskCreatedAt = task.generated_at
  } else if (isMonitoringTask && task.created_at) {
    taskCreatedAt = task.created_at
  }
  
  // For monitoring tasks, ensure we extract the NEW temperature from completion_data.equipment_list
  // This is the temperature that was recorded when the follow-up task was completed
  // CRITICAL: For monitoring tasks, temperatures should already be in the temperatures array from equipment_list
  // But we'll also extract it separately for the "New Temperature Recording" section
  let newTemperatureFromCompletion: any = null
  if (isMonitoringTask && completionData.equipment_list && Array.isArray(completionData.equipment_list) && completionData.equipment_list.length > 0) {
    // For monitoring tasks, use the first equipment item (they typically only have one asset)
    // But also try to match by original asset ID if available
    let matchingEquipment = null
    
    if (originalAssetId) {
      // Try to find by original asset ID first
      matchingEquipment = completionData.equipment_list.find((eq: any) => {
        const eqAssetId = eq.asset_id || eq.assetId || eq.id || eq.value
        return eqAssetId === originalAssetId || (originalAssetId && eqAssetId && String(eqAssetId) === String(originalAssetId))
      })
    }
    
    // If no match by ID, use the first item (monitoring tasks typically only have one asset)
    if (!matchingEquipment && completionData.equipment_list.length > 0) {
      matchingEquipment = completionData.equipment_list[0]
    }
    
    if (matchingEquipment) {
      // Extract temperature from multiple possible field names
      let tempValue = null
      if (matchingEquipment.temperature !== undefined && matchingEquipment.temperature !== null && matchingEquipment.temperature !== '') {
        tempValue = matchingEquipment.temperature
      } else if (matchingEquipment.reading !== undefined && matchingEquipment.reading !== null && matchingEquipment.reading !== '') {
        tempValue = matchingEquipment.reading
      } else if (matchingEquipment.temp !== undefined && matchingEquipment.temp !== null && matchingEquipment.temp !== '') {
        tempValue = matchingEquipment.temp
      }
      
      // Handle 0 as a valid temperature reading
      if (tempValue === 0 || tempValue === '0') {
        tempValue = 0
      }
      
      if (tempValue !== null && tempValue !== undefined && tempValue !== '') {
        const numValue = typeof tempValue === 'string' ? parseFloat(tempValue) : tempValue
        if (!isNaN(numValue) && isFinite(numValue)) {
          const assetName = matchingEquipment.asset_name || matchingEquipment.name || originalAssetName || 'Asset'
          const assetId = matchingEquipment.asset_id || matchingEquipment.assetId || originalAssetId
          
          newTemperatureFromCompletion = {
            temp: numValue,
            status: matchingEquipment.status || 'ok',
            time: matchingEquipment.recorded_at || completionRecord?.completed_at,
            asset_name: assetName,
            equipment: assetName,
            asset_id: assetId
          }
          console.log('✅ Found new temperature for monitoring task from completion_data:', newTemperatureFromCompletion)
        } else {
          console.warn('⚠️ Monitoring task: Temperature value is not a valid number:', tempValue)
        }
      } else {
        console.warn('⚠️ Monitoring task: No temperature value found in equipment_list item:', matchingEquipment)
      }
    } else {
      console.warn('⚠️ Monitoring task: No matching equipment found in equipment_list:', {
        equipment_list: completionData.equipment_list,
        originalAssetId: originalAssetId
      })
    }
  }
  
  // Get monitoring task details if available
  const monitoringDetails = completionData.monitoring_task_details || followUpDetails.monitoring_task || {}
  const calloutDetails = completionData.callout_details || followUpDetails.callout || {}
  
  // Extract monitoring duration and asset info
  const monitoringDuration = monitoringDetails.duration || completionData.monitoring_duration || completionData.monitoring_duration_minutes
  const monitoringAssetId = monitoringDetails.asset_id || completionData.monitoring_asset_id || originalAssetId
  const monitoringAssetName = monitoringDetails.asset_name || completionData.monitoring_asset_name || originalAssetName
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
      cardBorder: 'border-green-200 dark:border-green-500/20',
      cardBg: 'bg-green-50 dark:bg-green-500/5',
      headerHover: 'hover:bg-green-100 dark:hover:bg-green-500/10',
      badge: 'bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400 border-green-300 dark:border-green-500/20',
      expanded: 'border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/5'
    },
    yellow: {
      cardBorder: 'border-yellow-200 dark:border-yellow-500/30',
      cardBg: 'bg-yellow-50 dark:bg-yellow-500/5',
      headerHover: 'hover:bg-yellow-100 dark:hover:bg-yellow-500/10',
      badge: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/20',
      expanded: 'border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/5'
    },
    red: {
      cardBorder: 'border-red-200 dark:border-red-500/30',
      cardBg: 'bg-red-50 dark:bg-red-500/5',
      headerHover: 'hover:bg-red-100 dark:hover:bg-red-500/10',
      badge: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border-red-300 dark:border-red-500/20',
      expanded: 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5'
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {task.custom_name || task.template?.name || 'Untitled Task'}
            </h3>
            {task.status === 'missed' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40">
                <AlertTriangle className="w-3 h-3" />
                Missed
              </span>
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusBadgeColor}`}>
              <StatusIcon className="w-4 h-4" />
              {statusLabel.toUpperCase()}
            </span>
            {task.template?.category && (
              <span className="px-2 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/70">
                {task.template.category.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {task.template?.frequency && (
              <span className="px-2 py-1 rounded-full text-xs font-medium border border-blue-300 dark:border-blue-500/30 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                {task.template.frequency.charAt(0).toUpperCase() + task.template.frequency.slice(1)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-3">
            {task.completed_by_profile && (
              <div className="flex items-center gap-1">
                <span>Completed by:</span>
                <span className="text-[rgb(var(--text-primary))] dark:text-white/80 font-medium">{task.completed_by_profile.full_name || task.completed_by_profile.email || 'Unknown'}</span>
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
            <div className="rounded-lg border border-amber-300 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-100/90 text-sm p-4 flex gap-3 mb-4">
              <Lightbulb className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Template note</p>
                <p className="whitespace-pre-wrap leading-relaxed text-amber-800 dark:text-amber-100/90">{templateNote}</p>
              </div>
            </div>
          )}

          {/* Preview of recorded data - always visible */}
          {!isExpanded && hasRecordedData && (
            <div className="mt-3 space-y-2">
              {/* Temperature preview - Show out of range issues prominently */}
              {temperatures.length > 0 && (
                <div className="space-y-2">
                  {/* Show out of range temperatures first with alert styling */}
                  {temperatures.filter((t: any) => t.status === 'failed' || t.status === 'warning').length > 0 && (
                    <div className="rounded-lg border-2 border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 flex-shrink-0" />
                        <span className="text-sm font-bold text-red-800 dark:text-red-400">Temperature Out of Range</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {temperatures.filter((t: any) => t.status === 'failed' || t.status === 'warning').map((t: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-red-900 dark:text-red-300 font-semibold">{t.equipment}:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-red-800 dark:text-red-400 font-bold text-base">
                                {t.temp !== null && t.temp !== undefined ? `${t.temp}°C` : 'No reading'}
                              </span>
                              {t.range && (
                                <span className="text-xs text-red-700 dark:text-red-400/80">
                                  (Range: {t.range.min !== null ? `${t.range.min}°C` : 'No min'} - {t.range.max !== null ? `${t.range.max}°C` : 'No max'})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show in-range temperatures normally */}
                  {temperatures.filter((t: any) => t.status === 'ok').length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Thermometer className="w-4 h-4 text-green-700 dark:text-green-400" />
                      <span className="text-gray-800 dark:text-white/80">
                        {previewTemps.filter((t: any) => t.status === 'ok').map((t: any, i: number) => (
                          <span key={i}>
                            {t.equipment}: <span className="font-medium">{t.temp !== null && t.temp !== undefined ? `${t.temp}°C` : 'No reading'}</span>
                            {i < previewTemps.filter((t: any) => t.status === 'ok').length - 1 ? ', ' : ''}
                          </span>
                        ))}
                        {temperatures.filter((t: any) => t.status === 'ok').length > 3 && (
                          <span className="text-gray-600 dark:text-white/60">
                            {' '}+{temperatures.filter((t: any) => t.status === 'ok').length - 3} more
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Checklist preview */}
              {checklistItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-[rgb(var(--text-primary))] dark:text-white/80">
                    {completedChecklistCount} of {checklistItems.length} checklist items completed
                  </span>
                </div>
              )}
              
              {/* Yes/No checklist preview */}
              {yesNoChecklistItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-[rgb(var(--text-primary))] dark:text-white/80">
                    {yesNoChecklistItems.length} yes/no question{yesNoChecklistItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              
              {/* Result preview */}
              {passFailResult && (
                <div className="flex items-center gap-2 text-sm">
                  {passFailResult === 'pass' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-[rgb(var(--text-primary))] dark:text-white/80 font-medium">Result: {passFailResult.toUpperCase()}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex items-center">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-white/60" />
          )}
        </div>
      </button>

      {/* Expandable Content - Read-Only View */}
      {isExpanded && (
        <div className={`px-6 pb-6 border-t ${variantStyle.expanded}`}>
          <div className="pt-6 space-y-6">
            {/* PRIMARY: Assets Checked with Temperatures - MOST IMPORTANT FOR EHO */}
            {temperatures.length > 0 ? (
              <div>
                <h4 className="text-lg font-bold text-[rgb(var(--text-primary))] dark:text-white mb-4 flex items-center gap-2">
                  <Thermometer className="w-5 h-5" />
                  Assets Checked with Temperature Readings
                </h4>
                <div className="space-y-3">
                  {temperatures.map((temp: any, idx: number) => {
                    const statusColor = temp.status === 'failed' 
                      ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' 
                      : temp.status === 'warning' 
                      ? 'border-orange-300 dark:border-orange-500/50 bg-orange-50 dark:bg-orange-500/10' 
                      : 'border-green-300 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10'
                    
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
                      <div key={idx} className={`rounded-lg p-4 border-2 ${
                        temp.status === 'failed' 
                          ? 'border-red-300 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10' 
                          : temp.status === 'warning' 
                          ? 'border-orange-300 dark:border-orange-500/50 bg-orange-50 dark:bg-orange-500/10' 
                          : 'border-green-300 dark:border-green-500/50 bg-green-50 dark:bg-green-500/10'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Thermometer className={`w-6 h-6 ${
                              temp.status === 'failed' 
                                ? 'text-red-600 dark:text-red-400' 
                                : temp.status === 'warning' 
                                ? 'text-orange-600 dark:text-orange-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`} />
                            <div>
                              <p className={`text-base font-bold ${
                                temp.status === 'failed' 
                                  ? 'text-red-900 dark:text-white' 
                                  : temp.status === 'warning' 
                                  ? 'text-orange-900 dark:text-white' 
                                  : 'text-green-900 dark:text-white'
                              }`}>{temp.equipment || 'Unknown Equipment'}</p>
                            </div>
                          </div>
                          <span className={`text-sm px-3 py-1 rounded-full font-bold ${
                            temp.status === 'failed' 
                              ? 'bg-red-500/30 dark:bg-red-500/30 text-red-800 dark:text-red-300 border border-red-500/50 dark:border-red-500/50' 
                              : temp.status === 'warning' 
                              ? 'bg-orange-500/30 dark:bg-orange-500/30 text-orange-800 dark:text-orange-300 border border-orange-500/50 dark:border-orange-500/50' 
                              : 'bg-green-500/30 dark:bg-green-500/30 text-green-800 dark:text-green-300 border border-green-500/50 dark:border-green-500/50'
                          }`}>
                            {statusText}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className={`text-xs mb-1 ${
                            temp.status === 'failed' 
                              ? 'text-red-700 dark:text-white/60' 
                              : temp.status === 'warning' 
                              ? 'text-orange-700 dark:text-white/60' 
                              : 'text-green-700 dark:text-white/60'
                          }`}>Temperature Reading</p>
                          <p className={`text-2xl font-bold ${
                            temp.status === 'failed' 
                              ? 'text-red-700 dark:text-red-300' 
                              : temp.status === 'warning' 
                              ? 'text-orange-700 dark:text-orange-300' 
                              : 'text-green-700 dark:text-white'
                          }`}>
                            {temp.temp !== undefined && temp.temp !== null && temp.temp !== '' ? `${temp.temp}°C` : (
                              <span className="text-gray-500 dark:text-white/40 italic text-lg">No reading recorded</span>
                            )}
                          </p>
                          {temp.range && (
                            <p className={`text-xs mt-1 ${
                              temp.status === 'failed' 
                                ? 'text-red-600 dark:text-white/60' 
                                : temp.status === 'warning' 
                                ? 'text-orange-600 dark:text-white/60' 
                                : 'text-green-600 dark:text-white/60'
                            }`}>
                              Expected range: {temp.range.min !== null ? `${temp.range.min}°C` : 'No min'} - {temp.range.max !== null ? `${temp.range.max}°C` : 'No max'}
                            </p>
                          )}
                          {temp.status === 'failed' && temp.range && temp.temp !== null && (
                            <div className="mt-3 p-3 bg-red-100 dark:bg-red-500/20 border-2 border-red-300 dark:border-red-500/50 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-700 dark:text-red-300 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-red-800 dark:text-red-200 mb-1">
                                    Temperature Out of Range
                                  </p>
                                  {temp.range.min !== null && temp.temp < temp.range.min && (
                                    <p className="text-red-800 dark:text-red-200 text-sm">
                                      <span className="font-bold text-red-900 dark:text-red-100">{temp.temp}°C</span> is <span className="font-bold">below minimum</span> of {temp.range.min}°C
                                    </p>
                                  )}
                                  {temp.range.max !== null && temp.temp > temp.range.max && (
                                    <p className="text-red-800 dark:text-red-200 text-sm">
                                      <span className="font-bold text-red-900 dark:text-red-100">{temp.temp}°C</span> is <span className="font-bold">above maximum</span> of {temp.range.max}°C
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              // Show message if no temperatures were recorded (for temperature tasks)
              (task.template?.evidence_types?.includes('temperature') || task.template?.name?.toLowerCase().includes('temperature')) && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-300 dark:border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
                    <div>
                      <p className="text-sm font-bold text-yellow-900 dark:text-yellow-300">No Temperature Readings Recorded</p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-400/80 mt-1">
                        This temperature check task was completed but no temperature readings were recorded.
                      </p>
                    </div>
                  </div>
                </div>
              )
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
                      <p className="text-gray-600 dark:text-white/60 text-xs mb-1">Callout Type</p>
                      <p className="text-gray-900 dark:text-white/90 font-medium capitalize">{calloutType}</p>
                    </div>
                  )}
                  
                  {calloutFaultDescription && (
                    <div>
                      <p className="text-gray-600 dark:text-white/60 text-xs mb-1">Fault Description</p>
                      <p className="text-gray-900 dark:text-white/90 font-medium whitespace-pre-line bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm">
                        {calloutFaultDescription}
                      </p>
                    </div>
                  )}
                  
                  {/* Troubleshooting Questions with Answers */}
                  {troubleshootingQuestions.length > 0 && (
                    <div>
                      <p className="text-gray-600 dark:text-white/60 text-xs mb-3 font-medium">Troubleshooting Questions & Answers</p>
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
                            ? { text: 'Yes', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-500/20', border: 'border-green-300 dark:border-green-500/30' }
                            : answer === 'no' || answer === false
                            ? { text: 'No', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', border: 'border-red-300 dark:border-red-500/30' }
                            : answer
                            ? { text: String(answer), color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/20', border: 'border-yellow-300 dark:border-yellow-500/30' }
                            : { text: 'No answer recorded', color: 'text-gray-500 dark:text-white/40', bg: 'bg-gray-100 dark:bg-white/5', border: 'border-gray-300 dark:border-white/10' }
                          
                          return (
                            <div key={idx} className={`bg-white dark:bg-white/5 border ${answerDisplay.border} rounded-lg p-3`}>
                              <p className="text-gray-900 dark:text-white/90 text-sm font-medium mb-2">{question}</p>
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
                      <p className="text-gray-600 dark:text-white/60 text-xs mb-1">Additional Notes</p>
                      <p className="text-gray-800 dark:text-white/70 whitespace-pre-line bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-sm">
                        {calloutNotes}
                      </p>
                    </div>
                  )}
                  
                  {calloutId && (
                    <div>
                      <p className="text-gray-600 dark:text-white/60 text-xs mb-1">Callout ID</p>
                      <p className="text-gray-900 dark:text-white/90 font-mono text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-2 inline-block">
                        {calloutId}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Follow-Up Actions - DETAILED for Compliance Reporting */}
            {(tempAction || monitoringTaskId || calloutId || flagReason) && !isCalloutReport && (
              <div className="bg-orange-50 dark:bg-orange-500/10 border-2 border-orange-300 dark:border-orange-500/50 rounded-lg p-4">
                <h4 className="text-base font-bold text-orange-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                  Follow-Up Actions & Outcomes
                </h4>
                <div className="space-y-4 text-sm">
                  {/* Show historical context for monitoring tasks (why follow-up was created) */}
                  {isMonitoringTask && (originalTemperature !== null || originalAssetName || taskCreatedAt) && (
                    <div className="bg-red-50 dark:bg-red-500/20 border-2 border-red-300 dark:border-red-500/50 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-bold text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Why This Follow-Up Was Created
                      </h5>
                      <div className="space-y-2">
                        {taskCreatedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-700 dark:text-red-400" />
                            <span className="text-red-900 dark:text-red-200 text-sm">
                              <span className="font-medium">Follow-up created:</span> {new Date(taskCreatedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {originalAssetName && (
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-red-700 dark:text-red-400" />
                            <span className="text-red-900 dark:text-red-200 text-sm">
                              <span className="font-medium">Asset:</span> {originalAssetName}
                            </span>
                          </div>
                        )}
                        {originalTemperature !== null && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
                            <span className="text-red-900 dark:text-red-200 text-sm font-bold">
                              <span className="font-medium">Original temperature (out of range):</span> {originalTemperature}°C
                            </span>
                          </div>
                        )}
                        {originalTemperature !== null && (
                          <p className="text-xs text-red-800 dark:text-red-300/80 mt-2 italic">
                            This follow-up task was created because the temperature was out of the acceptable range.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show new temperature recording from this follow-up completion - ALWAYS show for monitoring tasks */}
                  {isMonitoringTask && (
                    <div className="bg-green-50 dark:bg-green-500/20 border-2 border-green-300 dark:border-green-500/50 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-bold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        New Temperature Recording
                      </h5>
                      <div className="space-y-2">
                        {/* CRITICAL: Use temperatures array first (from equipment_list), then newTemperatureFromCompletion as fallback */}
                        {temperatures.length > 0 ? (
                          temperatures.map((temp: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Thermometer className="w-4 h-4 text-green-700 dark:text-green-400" />
                                <span className="text-green-900 dark:text-green-200 text-sm font-medium">
                                  {temp.equipment || temp.asset_name || originalAssetName || 'Asset'}:
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${
                                  temp.status === 'failed' 
                                    ? 'text-red-700 dark:text-red-400' 
                                    : temp.status === 'warning'
                                    ? 'text-orange-700 dark:text-orange-400'
                                    : 'text-green-700 dark:text-green-300'
                                }`}>
                                  {temp.temp !== null && temp.temp !== undefined && temp.temp !== '' ? `${temp.temp}°C` : 'No reading'}
                                </span>
                                {temp.status === 'failed' && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/30 text-red-800 dark:text-red-300 border border-red-500/50">
                                    OUT OF RANGE
                                  </span>
                                )}
                                {temp.status === 'ok' && temp.temp !== null && temp.temp !== undefined && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/30 text-green-800 dark:text-green-300 border border-green-500/50">
                                    OK
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : newTemperatureFromCompletion ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-green-700 dark:text-green-400" />
                              <span className="text-green-900 dark:text-green-200 text-sm font-medium">
                                {newTemperatureFromCompletion.equipment || newTemperatureFromCompletion.asset_name || originalAssetName || 'Asset'}:
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${
                                newTemperatureFromCompletion.status === 'failed' 
                                  ? 'text-red-700 dark:text-red-400' 
                                  : newTemperatureFromCompletion.status === 'warning'
                                  ? 'text-orange-700 dark:text-orange-400'
                                  : 'text-green-700 dark:text-green-300'
                              }`}>
                                {newTemperatureFromCompletion.temp !== null && newTemperatureFromCompletion.temp !== undefined && newTemperatureFromCompletion.temp !== '' ? `${newTemperatureFromCompletion.temp}°C` : 'No reading'}
                              </span>
                              {newTemperatureFromCompletion.status === 'failed' && (
                                <span className="text-xs px-2 py-1 rounded-full bg-red-500/30 text-red-800 dark:text-red-300 border border-red-500/50">
                                  OUT OF RANGE
                                </span>
                              )}
                              {newTemperatureFromCompletion.status === 'ok' && newTemperatureFromCompletion.temp !== null && newTemperatureFromCompletion.temp !== undefined && (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-500/30 text-green-800 dark:text-green-300 border border-green-500/50">
                                  OK
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm italic">No temperature reading found in completion data</span>
                          </div>
                        )}
                        {(newTemperatureFromCompletion?.time || temperatures[0]?.time) && (
                          <p className="text-xs text-green-800 dark:text-green-300/80 mt-2">
                            Recorded at: {new Date(newTemperatureFromCompletion?.time || temperatures[0]?.time).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {tempAction === 'monitor' && !isMonitoringTask && (
                    <div className="bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-orange-800 dark:text-orange-300">Monitoring Task Created</span>
                      </div>
                      {monitoringAssetName && (
                        <p className="text-gray-900 dark:text-white/90 text-sm font-medium mb-1">
                          Asset: {monitoringAssetName}
                        </p>
                      )}
                      {monitoringDuration && (
                        <p className="text-gray-700 dark:text-white/80 text-sm">
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
                        <p className="text-gray-700 dark:text-white/80 text-sm">
                          <span className="font-medium">Duration:</span> 1 hour (default)
                        </p>
                      )}
                      {monitoringDetails.result && (
                        <p className="text-gray-700 dark:text-white/80 text-sm mt-2">
                          <span className="font-medium">Result:</span> {monitoringDetails.result}
                        </p>
                      )}
                      {monitoringDetails.follow_up_temp !== undefined && monitoringDetails.follow_up_temp !== null && (
                        <p className="text-gray-700 dark:text-white/80 text-sm mt-2">
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
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Checklist Items ({completedChecklistCount} of {checklistItems.length} completed)
                </h4>
                <div className="space-y-2">
                  {checklistItems.map((item: any, idx: number) => {
                    const itemText = typeof item === 'string' ? item : (item.label || item.text || item.name || `Item ${idx + 1}`)
                    const isCompleted = typeof item === 'object' ? (item.completed !== false) : false
                    
                    return (
                      <div key={idx} className={`flex items-start gap-3 rounded-lg p-3 border ${
                        isCompleted 
                          ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30' 
                          : 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900 dark:text-white/90' : 'text-gray-700 dark:text-white/60'}`}>
                            {itemText}
                          </p>
                          {typeof item === 'object' && item.description && (
                            <p className="text-xs text-gray-600 dark:text-white/50 mt-1">{item.description}</p>
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
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Yes/No Questions ({yesNoChecklistItems.filter((item: any) => item.answer).length} of {yesNoChecklistItems.length} answered)
                </h4>
                <div className="space-y-2">
                  {yesNoChecklistItems.map((item: any, idx: number) => {
                    const itemText = item.text || item.question || item.label || `Question ${idx + 1}`
                    const answer = item.answer || null
                    
                    return (
                      <div key={idx} className={`flex items-start gap-3 rounded-lg p-3 border ${
                        answer === 'yes' 
                          ? 'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/30' 
                          : answer === 'no' 
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30' 
                          : 'bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]'
                      }`}>
                        {answer === 'yes' ? (
                          <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : answer === 'no' ? (
                          <X className="w-5 h-5 text-red-700 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-5 h-5 flex-shrink-0 mt-0.5 border-2 border-gray-300 dark:border-white/20 rounded-full" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white/90">{itemText}</p>
                          {answer ? (
                            <p className={`text-sm mt-1 font-semibold ${
                              answer === 'yes' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                            }`}>
                              Answer: {answer.toUpperCase()}
                              {answer === 'no' && item.action && (
                                <span className="ml-2 text-orange-700 dark:text-orange-400 text-xs">⚠️ {item.action}</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs mt-1 text-gray-500 dark:text-white/40 italic">No answer recorded</p>
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


            {/* Instructions - Hide for completed follow-up tasks, show for others */}
            {(task.custom_instructions || task.template?.instructions) && !isMonitoringTask && (
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

