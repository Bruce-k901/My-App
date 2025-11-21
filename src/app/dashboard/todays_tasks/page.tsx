'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import ChecklistsHeader from '@/components/checklists/ChecklistsHeader'
import TaskCard from '@/components/checklists/TaskCard'
import TaskCompletionModal from '@/components/checklists/TaskCompletionModal'
import CompletedTaskCard from '@/components/checklists/CompletedTaskCard'
import { useAppContext } from '@/context/AppContext'
import { Button } from '@/components/ui/Button'
import { TemperatureBreachAction, TemperatureLogWithMeta } from '@/types/temperature'
import { toast } from 'sonner'
import { enrichTemplateWithDefinition } from '@/lib/templates/enrich-template'
import { buildTaskQueryFilter, isTaskDueNow } from '@/lib/shift-utils'
import { calculateTaskTiming } from '@/utils/taskTiming'

// Daypart chronological order (for sorting)
const DAYPART_ORDER: Record<string, number> = {
  'before_open': 1,
  'during_service': 2,
  'after_service': 3,
  'anytime': 4
}

// Helper function to get daypart sort order
function getDaypartSortOrder(daypart: string | null | undefined): number {
  if (!daypart) return 999 // Put null/undefined at the end
  return DAYPART_ORDER[daypart] || 999
}

// Helper function to parse daypart(s) - could be string, array, or comma-separated
function parseDayparts(daypart: any): string[] {
  if (!daypart) return []
  
  // If it's already an array
  if (Array.isArray(daypart)) {
    return daypart.filter(d => d && typeof d === 'string')
  }
  
  // If it's a string, check if it's comma-separated
  if (typeof daypart === 'string') {
    if (daypart.includes(',')) {
      return daypart.split(',').map(d => d.trim()).filter(d => d)
    }
    return [daypart]
  }
  
  return []
}

type CompletedTaskWithRecord = ChecklistTaskWithTemplate & {
  completion_record?: {
    id: string
    completion_data: Record<string, any>
    evidence_attachments?: string[]
    completed_at: string
    completed_by: string
    duration_seconds?: number | null
  } | null
}

export default function DailyChecklistPage() {
  const [tasks, setTasks] = useState<ChecklistTaskWithTemplate[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTaskWithRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ChecklistTaskWithTemplate | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [upcomingTasks, setUpcomingTasks] = useState<ChecklistTaskWithTemplate[]>([])
  const { siteId, companyId } = useAppContext()
  const [breachActions, setBreachActions] = useState<TemperatureBreachAction[]>([])
  const [breachLoading, setBreachLoading] = useState(false)

  // Use ref to store latest fetchTodaysTasks function
  const fetchTodaysTasksRef = useRef<() => Promise<void>>()

  // Define loadBreachActions first (needed by fetchTodaysTasks)
  const loadBreachActions = useCallback(async () => {
    if (!siteId) {
      setBreachActions([])
      return
    }

    try {
      setBreachLoading(true)
      const today = new Date()
      const weekAgo = new Date(today.getTime())
      weekAgo.setDate(weekAgo.getDate() - 7)

      let query = supabase
        .from('temperature_breach_actions')
        .select(
          `
            id,
            action_type,
            status,
            due_at,
            completed_at,
            notes,
            metadata,
            created_at,
            temperature_log:temperature_logs(
              id,
              recorded_at,
              reading,
              unit,
              status,
              meta
            )
          `
        )
        .in('status', ['pending', 'acknowledged'])
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })

      if (siteId) {
        query = query.eq('site_id', siteId)
      }

      const { data, error } = await query

      if (error) throw error
      setBreachActions((data || []).map((row) => ({
        id: row.id,
        action_type: row.action_type,
        status: row.status,
        due_at: row.due_at,
        completed_at: row.completed_at,
        notes: row.notes,
        metadata: row.metadata ?? {},
        created_at: row.created_at,
        temperature_log: row.temperature_log as TemperatureLogWithMeta | null,
      })))
    } catch (error: any) {
      console.error('Failed to load breach actions', error?.message ?? error)
    } finally {
      setBreachLoading(false)
    }
  }, [siteId])

  // Define fetchUpcomingTasks (needed by useEffect)
  const fetchUpcomingTasks = useCallback(async () => {
    try {
      // CRITICAL: Check companyId before fetching
      if (!companyId) {
        console.warn('⚠️ No companyId available, cannot fetch upcoming tasks')
        setUpcomingTasks([])
        return
      }
      
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch tasks for next 7 days
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekDate = nextWeek.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('company_id', companyId) // CRITICAL: Filter by company_id
        .eq('flag_reason', 'callout_followup')
        .gte('due_date', today)
        .lte('due_date', nextWeekDate)
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true })

      if (error) {
        console.error('Error fetching upcoming tasks:', error)
        return
      }

      setUpcomingTasks(data || [])
    } catch (error) {
      console.error('Failed to fetch upcoming tasks:', error)
    }
  }, [companyId])

  // Define fetchTodaysTasks (needed by useEffect) - must be defined before useEffect
  const fetchTodaysTasks = useCallback(async () => {
    try {
      console.log('🔄 fetchTodaysTasks called at:', new Date().toISOString())
      
      // CRITICAL: Check companyId before fetching
      if (!companyId) {
        console.warn('⚠️ No companyId available, cannot fetch tasks')
        setLoading(false)
        setTasks([])
        return
      }
      
      setLoading(true)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      console.log('🔍 Fetching tasks for:', { today: todayStr, siteId, companyId })
      
      // Apply shift-based filtering
      const shiftFilter = await buildTaskQueryFilter()
      console.log('🕐 Shift filter applied:', shiftFilter)
      
      // If staff is not on shift, return empty tasks array
      if (!shiftFilter.showAll && !shiftFilter.siteId) {
        console.log('⏸️ Staff not on shift - no tasks to show')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Fetch ONLY today's tasks that are pending or in_progress
      // Completed and missed tasks are shown in the Completed Tasks page
      // CRITICAL: We also need to check completion records to filter out tasks that have been completed
      // even if their status hasn't been updated yet (defensive filtering)
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        // CRITICAL: Filter by company_id first
        .eq('company_id', companyId)
        // CRITICAL: Only show pending and in_progress tasks - explicitly exclude completed/missed/skipped
        // This is the primary filter - database should enforce this
        .in('status', ['pending', 'in_progress'])
        // CRITICAL: Also exclude tasks with completed_at timestamp set (defensive)
        // This catches tasks that were completed but status wasn't updated
        .is('completed_at', null)
        // Only show tasks due TODAY
        .eq('due_date', todayStr)
      
      // Apply shift-based site filtering
      // Managers/admins see all sites, staff only see their current site when on shift
      if (shiftFilter.showAll) {
        // Managers/admins: filter by siteId from context if available, otherwise show all
        if (siteId) {
          query = query.eq('site_id', siteId)
        }
      } else {
        // Staff on shift: only show tasks for their current site
        if (shiftFilter.siteId) {
          query = query.eq('site_id', shiftFilter.siteId)
        }
      }
      
      const { data: allTasks, error } = await query
      
      // Check for error FIRST before processing data
      if (error) {
        // Try to get more details about the error
        const errorDetails: any = {
          message: error?.message || 'No message',
          code: error?.code || 'NO_CODE',
          details: error?.details || 'No details',
          hint: error?.hint || 'No hint',
        }
        
        // Try to serialize the error object
        try {
          errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        } catch (e) {
          errorDetails.fullError = 'Could not serialize error'
        }
        
        // Try to get error as string
        try {
          errorDetails.errorString = String(error)
        } catch (e) {
          errorDetails.errorString = 'Could not convert to string'
        }
        
        console.error('❌ Supabase query error:', errorDetails)
        throw error
      }
      
      console.log('📥 Raw tasks from database:', {
        total: allTasks?.length || 0,
        tasks: allTasks?.map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          flag_reason: t.flag_reason,
          completed_at: t.completed_at 
        }))
      })
      
      // CRITICAL: Defensive filter - remove any tasks that have completed_at set
      // This catches any tasks that might have slipped through the database query
      const tasksWithoutCompletedAt = (allTasks || []).filter((task: any) => {
        if (task.completed_at) {
          console.log(`❌ Task ${task.id} filtered: has completed_at timestamp (should not appear in query)`)
          return false
        }
        return true
      })
      
      if (tasksWithoutCompletedAt.length !== (allTasks || []).length) {
        console.warn('⚠️ Filtered out', (allTasks || []).length - tasksWithoutCompletedAt.length, 'tasks with completed_at timestamp')
      }
      
      // Use filtered tasks for the rest of the processing
      const allTasksFiltered = tasksWithoutCompletedAt
      
      // Fetch templates separately if we have tasks
      // CRITICAL: Load ALL required fields needed by TaskCompletionModal
      // This includes: evidence_types, asset_id, repeatable_field_name, instructions, etc.
      let templatesMap: Record<string, any> = {}
      if (allTasksFiltered && allTasksFiltered.length > 0) {
        const templateIds = [...new Set(allTasksFiltered.map((t: any) => t.template_id).filter(Boolean))]
        if (templateIds.length > 0) {
          const { data: templates, error: templatesError } = await supabase
            .from('task_templates')
            .select(`
              id, name, slug, description, category, frequency, compliance_standard, is_critical, 
              evidence_types, repeatable_field_name, instructions, dayparts, recurrence_pattern, 
              asset_id, time_of_day,
              template_fields (*)
            `)
            .in('id', templateIds)
          
          if (!templatesError && templates) {
            console.log('✅ [TEMPLATE LOADING] Fetched templates from database:', {
              count: templates.length,
              templateIds: templates.map((t: any) => t.id),
              templateNames: templates.map((t: any) => t.name)
            })
            
            templatesMap = templates.reduce((acc: Record<string, any>, template: any) => {
              // CRITICAL: Log template_fields BEFORE enrichment to see what Supabase returns
              console.log('📋 [TEMPLATE LOADING] Template before enrichment:', {
                id: template.id,
                name: template.name,
                template_fields_type: typeof template.template_fields,
                template_fields_isArray: Array.isArray(template.template_fields),
                template_fields_length: Array.isArray(template.template_fields) ? template.template_fields.length : 'N/A',
                template_fields_raw: template.template_fields
              })
              
              const enriched = enrichTemplateWithDefinition(template)
              
              // CRITICAL: Ensure template_fields is always an array
              // Supabase might return it as null, undefined, or in different formats
              if (enriched.template_fields) {
                if (!Array.isArray(enriched.template_fields)) {
                  // If it's not an array, try to convert it
                  console.warn('⚠️ Template fields is not an array for template:', enriched.id, 'type:', typeof enriched.template_fields)
                  enriched.template_fields = []
                } else {
                  console.log('✅ [TEMPLATE LOADING] Template fields preserved after enrichment:', {
                    templateId: enriched.id,
                    templateName: enriched.name,
                    fieldsCount: enriched.template_fields.length,
                    fieldNames: enriched.template_fields.map((f: any) => f.field_name || f.fieldName || 'unknown')
                  })
                }
              } else {
                console.warn('⚠️ [TEMPLATE LOADING] Template fields missing after enrichment for template:', {
                  id: enriched.id,
                  name: enriched.name,
                  hadFieldsBefore: !!template.template_fields
                })
                enriched.template_fields = []
              }
              acc[enriched.id] = enriched
              return acc
            }, {})
            
            console.log('✅ [TEMPLATE LOADING] TemplatesMap created:', {
              size: Object.keys(templatesMap).length,
              templateIds: Object.keys(templatesMap),
              templatesWithFields: Object.values(templatesMap).filter((t: any) => t.template_fields && t.template_fields.length > 0).length
            })
          } else if (templatesError) {
            console.error('❌ [TEMPLATE LOADING] Error fetching templates:', templatesError)
          } else {
            console.warn('⚠️ [TEMPLATE LOADING] No templates returned (templates is null/undefined)')
          }
        }
      }
      
      // Filter tasks - only show tasks due TODAY
      // Database query already filters by due_date = today, but double-check here
      const data = (allTasksFiltered || []).filter(task => {
        // CRITICAL: Only show tasks due TODAY (database should already filter, but verify)
        if (task.due_date !== todayStr) {
          console.log(`❌ Task ${task.id} filtered: due_date ${task.due_date} !== today ${todayStr}`)
          return false
        }
        
        // Exclude callout_followup tasks - they're shown in the upcoming section
        if (task.flag_reason === 'callout_followup') {
          return false
        }
        
        // For staff on shift: only show tasks that are due now (within 2 hours window)
        // Managers/admins see all tasks regardless of timing
        if (!shiftFilter.showAll && shiftFilter.siteId) {
          const isDueNow = isTaskDueNow(task)
          if (!isDueNow) {
            console.log(`⏰ Task ${task.id} filtered: not due now (due_time: ${task.due_time})`)
            return false
          }
        }
        
        return true
      })
      
      if (!data || data.length === 0) {
        console.log('⚠️ No tasks found for today')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Fetch full template details for remaining tasks that weren't in the initial fetch
      // (This handles edge cases where new templates were added between fetches)
      const filteredTemplateIds = [...new Set(data.map((t: any) => t.template_id).filter((id): id is string => id !== null && !templatesMap[id]))]
      if (filteredTemplateIds.length > 0) {
        const { data: fullTemplates } = await supabase
          .from('task_templates')
          .select(`
            id, name, slug, description, category, frequency, compliance_standard, is_critical, 
            evidence_types, repeatable_field_name, instructions, dayparts, recurrence_pattern, 
            asset_id, time_of_day,
            template_fields (*)
          `)
          .in('id', filteredTemplateIds)
        
        if (fullTemplates) {
          fullTemplates.forEach(t => {
            // CRITICAL: Enrich template with definition (same as first fetch)
            const enriched = enrichTemplateWithDefinition(t)
            
            // CRITICAL: Ensure template_fields is always an array
            if (enriched.template_fields) {
              if (!Array.isArray(enriched.template_fields)) {
                console.warn('⚠️ Template fields is not an array for template:', enriched.id, 'type:', typeof enriched.template_fields)
                enriched.template_fields = []
              }
            } else {
              enriched.template_fields = []
            }
            
            templatesMap[enriched.id] = enriched
            console.log('✅ [TEMPLATE LOADING] Added template from second fetch:', {
              templateId: enriched.id,
              templateName: enriched.name,
              templateFieldsCount: enriched.template_fields?.length || 0
            })
          })
        }
      }
      
      // Map tasks with templates
      const tasksWithTemplates = data.map((task: any) => {
        const template = task.template_id ? templatesMap[task.template_id] : null
        
        // CRITICAL: Log template attachment for debugging
        if (!template && task.template_id) {
          console.warn('⚠️ [TEMPLATE ATTACHMENT] Template not found in templatesMap:', {
            taskId: task.id,
            templateId: task.template_id,
            templatesMapKeys: Object.keys(templatesMap),
            templatesMapSize: Object.keys(templatesMap).length
          })
        } else if (template) {
          console.log('✅ [TEMPLATE ATTACHMENT] Template attached to task:', {
            taskId: task.id,
            templateId: task.template_id,
            templateName: template.name,
            templateFieldsCount: template.template_fields?.length || 0
          })
        }
        
        return {
          ...task,
          template: template
        }
      })
      
      // Filter out tasks with missing templates (orphaned tasks)
      const validTasks = tasksWithTemplates.filter(task => {
        if (task.template_id && !task.template) {
          console.warn('⚠️ Task has template_id but template not found:', {
            task_id: task.id,
            template_id: task.template_id
          });
          return false; // Exclude orphaned tasks
        }
        return true;
      });
      
      console.log('📦 Tasks with templates:', {
        total: tasksWithTemplates.length,
        valid: validTasks.length,
        orphaned: tasksWithTemplates.length - validTasks.length,
        tasks: validTasks.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, template_id: t.template_id }))
      })
      
      // CRITICAL: Handle tasks with multiple dayparts
      // IMPORTANT: The cron job already creates separate task records for each daypart.
      // So if a task has a daypart field set, it's already a single instance - don't expand it.
      // Only expand if the task has NO daypart but has multiple dayparts in task_data or template.
      // Use validTasks instead of tasksWithTemplates to exclude orphaned tasks
      let expandedTasks: ChecklistTaskWithTemplate[] = []
      
      // Helper function to normalize daypart names (handle legacy/invalid dayparts)
      const normalizeDaypart = (daypart: string | null | undefined): string => {
        if (!daypart || typeof daypart !== 'string') {
          return 'anytime' // Default if null/undefined
        }
        const normalized = daypart.toLowerCase().trim()
        // Map common variations to standard dayparts
        const daypartMap: Record<string, string> = {
          'afternoon': 'during_service',
          'morning': 'before_open',
          'evening': 'after_service',
          'night': 'after_service',
          'lunch': 'during_service',
          'dinner': 'during_service'
        }
        return daypartMap[normalized] || normalized
      }
      
      // Helper function to get default time for daypart
      // IMPORTANT: Only override time if task doesn't have a specific time set
      // If task has a due_time already, preserve it (user-specified times take precedence)
      const getDaypartTime = (daypart: string, templateTime: string | null, existingTime: string | null): string => {
        // If task already has a specific time, use it (don't override user-specified times)
        if (existingTime && existingTime.trim() !== '') {
          // Convert to HH:MM format if needed (remove seconds)
          const timeStr = existingTime.includes(':') ? existingTime.split(':').slice(0, 2).join(':') : existingTime
          return timeStr
        }
        
        // Normalize daypart first
        const normalizedDaypart = normalizeDaypart(daypart)
        
        // If template has a specific time, use it as base
        // Otherwise, use default times per daypart
        const defaultTimes: Record<string, string> = {
          'before_open': '08:00',
          'during_service': '12:00',
          'after_service': '18:00',
          'anytime': templateTime || '09:00'
        }
        
        // If template has a time, try to adjust it based on daypart
        if (templateTime) {
          const [hours, minutes] = templateTime.split(':').map(Number)
          
          // Adjust based on daypart if needed
          if (normalizedDaypart === 'before_open' && hours >= 9) {
            return '08:00' // Earlier for before open
          } else if (normalizedDaypart === 'during_service' && hours < 11) {
            return '12:00' // Midday for during service
          } else if (normalizedDaypart === 'after_service' && hours < 17) {
            return '18:00' // Evening for after service
          }
          
          // Use template time if it's already appropriate
          return templateTime
        }
        
        return defaultTimes[normalizedDaypart] || '09:00'
      }
      
      validTasks.forEach(task => {
        // Check if task has multiple dayparts in task_data that need expansion
        // Even if task.daypart is set, we should expand if task_data.dayparts has multiple entries
        const taskData = task.task_data || {}
        let daypartsInData: any[] = []
        
        // DEBUG: Log task data to see what we're working with
        console.log('🔍 Checking task for expansion:', {
          taskId: task.id,
          taskName: task.custom_name || task.template?.name,
          daypartField: task.daypart,
          due_time: task.due_time,
          taskDataKeys: Object.keys(taskData),
          taskDataDayparts: taskData.dayparts,
          taskDataDaypartsType: typeof taskData.dayparts,
          taskDataDaypartsIsArray: Array.isArray(taskData.dayparts)
        })
        
        // Check task_data for dayparts array (could be array of strings or array of objects with daypart/due_time)
        if (taskData.dayparts && Array.isArray(taskData.dayparts)) {
          daypartsInData = taskData.dayparts
          console.log('✅ Found dayparts array in task_data:', {
            count: daypartsInData.length,
            dayparts: daypartsInData
          })
        } else {
          console.log('⚠️ No dayparts array found in task_data or not an array')
        }
        
        // If task has multiple dayparts in task_data, expand it even if daypart field is set
        // This handles manually created tasks that have daypart set to first daypart but multiple dayparts in task_data
        if (daypartsInData.length > 1) {
          console.log('🔄 Expanding task with multiple dayparts in task_data:', {
            taskId: task.id,
            taskName: task.custom_name || task.template?.name,
            daypartField: task.daypart,
            daypartsInData: daypartsInData.length,
            dayparts: daypartsInData
          })
          
          // Expand into multiple instances, one per daypart
          daypartsInData.forEach((dp: any, index: number) => {
            // Handle both string format and object format { daypart: string, due_time: string }
            const daypartStr = typeof dp === 'string' ? dp : (dp.daypart || dp)
            const daypartTime = typeof dp === 'object' && dp.due_time ? dp.due_time : null
            const normalizedDaypart = normalizeDaypart(daypartStr)
            const templateTime = task.template?.time_of_day || null
            
            // Use daypart-specific time if provided, otherwise calculate
            const finalTime = daypartTime || getDaypartTime(normalizedDaypart, templateTime, task.due_time)
            
            console.log(`  → Creating instance ${index + 1}:`, {
              daypart: normalizedDaypart,
              due_time: finalTime,
              originalDaypartTime: daypartTime
            })
            
            expandedTasks.push({
              ...task,
              daypart: normalizedDaypart,
              due_time: finalTime,
              _expandedKey: `${task.id}_${normalizedDaypart}_${index}`,
              // CRITICAL: Explicitly preserve template to ensure it's not lost during expansion
              template: task.template
            })
          })
          console.log(`✅ Expanded task into ${daypartsInData.length} instances`)
          return // Skip further processing for this task
        } else if (daypartsInData.length === 1) {
          console.log('ℹ️ Task has only 1 daypart in task_data, not expanding:', {
            taskId: task.id,
            daypart: daypartsInData[0]
          })
        }
        
        // If task already has a daypart set and no multiple dayparts in task_data,
        // it's already a separate instance from cron generation
        // Use it as-is, but ensure it has the correct time for its daypart
        if (task.daypart && typeof task.daypart === 'string') {
          const daypartStr = normalizeDaypart(task.daypart) // Normalize daypart
          const templateTime = task.template?.time_of_day || null
          // Preserve existing time if set, otherwise calculate based on daypart
          const daypartTime = getDaypartTime(daypartStr, templateTime, task.due_time)
          
          console.log('🕐 Setting daypart time:', {
            taskId: task.id,
            originalDaypart: task.daypart,
            normalizedDaypart: daypartStr,
            originalTime: task.due_time,
            templateTime: templateTime,
            calculatedTime: daypartTime,
            preservingTime: task.due_time ? 'yes' : 'no'
          })
          
          // Preserve existing time if task has one, otherwise use daypart-based time
          expandedTasks.push({
            ...task,
            daypart: daypartStr, // Store normalized daypart
            due_time: daypartTime, // Use existing time if set, otherwise calculated
            _expandedKey: `${task.id}_${daypartStr}`,
            // CRITICAL: Explicitly preserve template to ensure it's not lost during expansion
            template: task.template
          })
          return // Skip expansion for this task
        }
        
        // Task doesn't have daypart set - check if it needs expansion
        // This handles legacy tasks or manually created tasks without daypart
        let dayparts: string[] = []
        
        // Priority 1: Check task_data for dayparts
        if (task.task_data && typeof task.task_data === 'object') {
          if (task.task_data.dayparts && Array.isArray(task.task_data.dayparts)) {
            dayparts = task.task_data.dayparts
          } else if (task.task_data.daypart) {
            dayparts = parseDayparts(task.task_data.daypart)
          }
        }
        
        // Priority 2: Check template's dayparts array
        if (dayparts.length === 0 && task.template?.dayparts) {
          dayparts = parseDayparts(task.template.dayparts)
        }
        
        // If still no dayparts, use 'anytime' as default
        if (dayparts.length === 0) {
          dayparts = ['anytime']
        }
        
        // Create one task instance for each daypart (only for tasks without daypart set)
        dayparts.forEach((daypart, daypartIndex) => {
          // Ensure daypart is a string for the key
          const daypartStr = typeof daypart === 'string' ? daypart : String(daypart)
          const templateTime = task.template?.time_of_day || null
          const daypartTime = getDaypartTime(daypartStr, templateTime)
          
          expandedTasks.push({
            ...task,
            daypart: daypartStr, // Set the specific daypart for this instance
            due_time: daypartTime, // Set appropriate time for this daypart
            // Create a unique key for React rendering
            _expandedKey: `${task.id}_${daypartStr}_${daypartIndex}`,
            // CRITICAL: Explicitly preserve template to ensure it's not lost during expansion
            template: task.template
          })
        })
      })
      
      console.log('🔄 Before deduplication:', {
        count: expandedTasks.length,
        tasks: expandedTasks.map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          due_time: t.due_time,
          due_date: t.due_date,
          template_id: t.template_id,
          _expandedKey: (t as any)._expandedKey
        }))
      })
      
      // CRITICAL: Deduplicate tasks to prevent duplicates from cron or expansion
      // Use a composite key: template_id + site_id + daypart + due_time + due_date
      // This catches duplicates even if they have different IDs
      const seen = new Map<string, ChecklistTaskWithTemplate>()
      const deduplicatedTasks = expandedTasks.filter(task => {
        // Create a unique key based on task properties (not just ID)
        // This catches duplicates from cron that have different IDs
        const compositeKey = `${task.template_id || 'no-template'}_${task.site_id || 'no-site'}_${task.daypart || 'no-daypart'}_${task.due_time || 'no-time'}_${task.due_date || 'no-date'}`
        
        // Also check _expandedKey for expanded tasks
        const expandedKey = (task as any)._expandedKey
        
        // Use composite key for deduplication (more reliable than just ID)
        const key = expandedKey || compositeKey
        
        if (seen.has(key)) {
          // Already seen this exact task pattern - skip it (true duplicate)
          console.log('⚠️ Duplicate task filtered:', { 
            key, 
            compositeKey,
            taskId: task.id, 
            daypart: task.daypart,
            due_time: task.due_time,
            due_date: task.due_date,
            template_id: task.template_id,
            status: task.status 
          })
          return false
        }
        seen.set(key, task)
        return true
      })
      
      console.log('🔄 After deduplication:', {
        count: deduplicatedTasks.length,
        tasks: deduplicatedTasks.map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          due_time: t.due_time,
          due_date: t.due_date,
          template_id: t.template_id,
          _expandedKey: (t as any)._expandedKey
        }))
      })
      
      // Sort deduplicated tasks chronologically by daypart, then by due_time
      // We'll do a final sort after all processing to ensure correct order
      
      // Use deduplicated tasks for the rest of the logic
      expandedTasks = deduplicatedTasks
      
      // Load profiles for completed tasks
      const completedByUserIds = expandedTasks
        .filter(t => (t.status === 'completed' || t.status === 'missed') && t.completed_at)
        .map(t => t.completed_by)
        .filter((id): id is string => id !== null)
      
      let profilesMap = new Map()
      if (completedByUserIds.length > 0) {
        const uniqueUserIds = [...new Set(completedByUserIds)];
        const query = supabase
          .from('profiles')
          .select('id, full_name, email');
        const { data: profiles } = uniqueUserIds.length === 1
          ? await query.eq('id', uniqueUserIds[0])
          : await query.in('id', uniqueUserIds)
        
        if (profiles) {
          profilesMap = new Map(profiles.map(p => [p.id, p]))
        }
      }
      
      const tasksWithProfiles = expandedTasks.map(task => ({
        ...task,
        completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) : null,
        // CRITICAL: Explicitly preserve template to ensure it's not lost during mapping
        template: task.template
      }))
      
      // CRITICAL: For tasks with multiple dayparts, we need to check completion per instance
      // Fetch ALL completion records for ALL tasks due today (not just pending/in_progress)
      // This ensures we catch all completed tasks even if their status wasn't updated (defensive filtering)
      const allTaskIds = tasksWithProfiles.map(t => t.id)
      let allCompletionRecords: any[] = []
      
      // CRITICAL: Fetch completion records for ALL tasks due today, not just the ones in our query
      // This is essential because:
      // 1. Tasks with status='pending' might have completion records (status wasn't updated)
      // 2. We need to filter them out from active tasks
      // 3. We also need them for the completed tasks list
      // 
      // Strategy: Fetch all completion records for today, then filter by task_id and site_id
      console.log('🔍 Fetching ALL completion records for today:', { today: todayStr, siteId, companyId })
      
      // First, get ALL task IDs for today (including completed ones) to ensure we fetch all completion records
      // This is a separate query to get all task IDs due today
      let allTodayTaskIds: string[] = []
      try {
        let allTodayTasksQuery = supabase
          .from('checklist_tasks')
          .select('id')
          .eq('company_id', companyId)
          .eq('due_date', todayStr)
        
        // Apply site filtering if available
        if (siteId) {
          allTodayTasksQuery = allTodayTasksQuery.eq('site_id', siteId)
        }
        
        const { data: allTodayTasks, error: allTodayError } = await allTodayTasksQuery
        
        if (!allTodayError && allTodayTasks) {
          allTodayTaskIds = allTodayTasks.map((t: any) => t.id).filter(Boolean)
          console.log('📋 Found', allTodayTaskIds.length, 'tasks due today (all statuses)')
        }
      } catch (error) {
        console.error('❌ Error fetching all today tasks:', error)
        // Fallback to using task IDs from our filtered query
        allTodayTaskIds = allTaskIds
      }
      
      // Use all today task IDs if we got them, otherwise fall back to filtered task IDs
      const taskIdsToCheck = allTodayTaskIds.length > 0 ? allTodayTaskIds : allTaskIds
      
      if (taskIdsToCheck.length > 0) {
        console.log('🔍 Fetching completion records for task IDs:', taskIdsToCheck.slice(0, 5), '... (total:', taskIdsToCheck.length, ')')
        
        // Fetch completion records for today's tasks
        // CRITICAL: Filter by company_id and completed_at date to ensure we get all relevant completion records
        // Don't filter by site_id initially - we'll filter in JS to be more permissive
        // IMPORTANT: Use date range to catch all records for today, regardless of timezone issues
        // Use a wider date range to catch any edge cases (yesterday 23:00 to tomorrow 01:00)
        // This ensures we don't miss completion records due to timezone differences
        // CRITICAL: Use todayStr to build dates consistently (avoids timezone issues)
        const todayDate = new Date(todayStr + 'T12:00:00') // Use noon to avoid timezone edge cases
        const yesterday = new Date(todayDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const tomorrow = new Date(todayDate)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const startDate = yesterday.toISOString().split('T')[0] + 'T23:00:00'
        const endDate = tomorrow.toISOString().split('T')[0] + 'T01:00:00'
        
        console.log('📅 [COMPLETION RECORDS] Date range for query:', {
          todayStr,
          startDate,
          endDate,
          taskIdsCount: taskIdsToCheck.length
        })
        
        let completionQuery = supabase
          .from('task_completion_records')
          .select('*')
          .eq('company_id', companyId)
          .in('task_id', taskIdsToCheck)
          // Use wider date range to catch all records for today (handles timezone issues)
          .gte('completed_at', startDate)
          .lte('completed_at', endDate)
          .order('completed_at', { ascending: false })
        
        const { data: completionRecords, error: completionError } = await completionQuery
        
        if (completionError) {
          console.error('❌ Error fetching completion records:', completionError)
          console.error('Error details:', JSON.stringify(completionError, null, 2))
        } else {
          console.log('✅ Fetched completion records:', completionRecords?.length || 0)
          
          // Filter by site_id in JavaScript (more permissive - include records with null site_id)
          // CRITICAL: Include records with null site_id for backwards compatibility
          // This ensures we don't miss completion records that were created before site_id was required
          // ALSO filter by date to ensure we only include records for today (not yesterday/tomorrow from wider query)
          let filteredRecords = completionRecords || []
          if (completionRecords) {
            // First, filter by date to only include records for today
            filteredRecords = completionRecords.filter(r => {
              if (!r.completed_at) return false
              const completedDate = new Date(r.completed_at).toISOString().split('T')[0]
              return completedDate === todayStr
            })
            
            console.log('🔍 Filtered by date (today only):', {
              before: completionRecords.length,
              after: filteredRecords.length,
              todayStr
            })
            
            // Then filter by site_id if available
            if (siteId && filteredRecords.length > 0) {
              // Include records that match site_id OR have null site_id (for backwards compatibility)
              const beforeSiteFilter = filteredRecords.length
              filteredRecords = filteredRecords.filter(r => !r.site_id || r.site_id === siteId)
              console.log('🔍 Filtered by site_id:', {
                before: beforeSiteFilter,
                after: filteredRecords.length,
                siteId,
                recordsWithNullSiteId: filteredRecords.filter(r => !r.site_id).length
              })
            }
          }
          
          if (filteredRecords.length > 0) {
            allCompletionRecords = filteredRecords
            console.log('📝 Completion records details:', {
              total: filteredRecords.length,
              records: filteredRecords.map(r => ({
                id: r.id,
                task_id: r.task_id,
                completed_at: r.completed_at,
                completedDate: r.completed_at ? new Date(r.completed_at).toISOString().split('T')[0] : 'N/A',
                company_id: r.company_id,
                site_id: r.site_id,
                completed_by: r.completed_by,
                completed_daypart: r.completion_data?.completed_daypart || 'N/A'
              }))
            })
          } else {
            // This is normal for pending tasks - only log if we expected records but they were filtered out
            if (completionRecords && completionRecords.length > 0) {
              console.warn('⚠️ Records exist but were filtered out:', {
                totalBeforeFilter: completionRecords.length,
                totalAfterFilter: filteredRecords.length,
                filteredOut: completionRecords.length - filteredRecords.length,
                sampleFilteredOut: completionRecords.filter(r => !filteredRecords.includes(r)).slice(0, 3).map(r => ({
                  task_id: r.task_id,
                  site_id: r.site_id,
                  expected_site_id: siteId,
                  completed_at: r.completed_at,
                  completedDate: r.completed_at ? new Date(r.completed_at).toISOString().split('T')[0] : 'N/A'
                }))
              })
            } else {
              console.log('ℹ️ No completion records found for today (this is normal for pending tasks)')
            }
          }
        }
      } else {
        console.log('ℹ️ No task IDs to check for completion records')
      }
      
      // Build a map of completed dayparts per task
      // Key: task_id, Value: Set of completed dayparts
      // CRITICAL: For multi-daypart tasks, multiple instances share the same task.id
      // so we need to track which specific daypart instances were completed
      const completedDaypartsMap = new Map<string, Set<string>>()
      // Also track tasks that have completion records but no daypart (single-daypart tasks)
      const tasksCompletedWithoutDaypart = new Set<string>()
      
      allCompletionRecords.forEach(record => {
        const taskId = record.task_id
        if (!taskId) return
        
        const completedDaypart = record.completion_data?.completed_daypart
        if (completedDaypart) {
          // Multi-daypart task - track which daypart was completed
          if (!completedDaypartsMap.has(taskId)) {
            completedDaypartsMap.set(taskId, new Set())
          }
          const normalizedDaypart = normalizeDaypart(completedDaypart)
          completedDaypartsMap.get(taskId)!.add(normalizedDaypart)
          console.log('📝 Mapped completion:', {
            taskId,
            completedDaypart,
            normalizedDaypart,
            allCompletedDayparts: Array.from(completedDaypartsMap.get(taskId)!)
          })
        } else {
          // Single-daypart task - no daypart in completion_data means the whole task was completed
          tasksCompletedWithoutDaypart.add(taskId)
          console.log('📝 Task completed without daypart (single-daypart task):', taskId)
        }
      })
      
      console.log('📊 Completed dayparts map:', {
        totalTasks: completedDaypartsMap.size,
        tasksCompletedWithoutDaypart: tasksCompletedWithoutDaypart.size,
        details: Array.from(completedDaypartsMap.entries()).map(([taskId, dayparts]) => ({
          taskId,
          completedDayparts: Array.from(dayparts)
        })),
        tasksWithoutDaypart: Array.from(tasksCompletedWithoutDaypart)
      })
      
      // Build a set of task IDs that have completion records
      const tasksWithCompletionRecords = new Set(allCompletionRecords.map(r => r.task_id))
      
      console.log('🔍 Filtering tasks:', {
        totalTasks: tasksWithProfiles.length,
        completionRecordsFound: allCompletionRecords.length,
        tasksWithCompletionRecords: Array.from(tasksWithCompletionRecords),
        tasksCompletedWithoutDaypart: Array.from(tasksCompletedWithoutDaypart),
        completedDaypartsMapSize: completedDaypartsMap.size,
        sampleTaskChecks: tasksWithProfiles.slice(0, 5).map(t => {
          const taskData = t.task_data || {}
          const daypartsInData = taskData.dayparts || []
          const hasMultipleDayparts = Array.isArray(daypartsInData) && daypartsInData.length > 1
          const completedDayparts = completedDaypartsMap.get(t.id)
          const hasRecord = tasksWithCompletionRecords.has(t.id)
          const completedWithoutDaypart = tasksCompletedWithoutDaypart.has(t.id)
          return { 
            id: t.id, 
            status: t.status,
            daypart: t.daypart,
            hasRecord,
            completedWithoutDaypart,
            hasMultipleDayparts,
            completedDayparts: completedDayparts ? Array.from(completedDayparts) : null,
            willBeFiltered: hasMultipleDayparts && completedDayparts && t.daypart 
              ? completedDayparts.has(normalizeDaypart(t.daypart))
              : (hasRecord || completedWithoutDaypart)
          }
        })
      })
      
      // Filter out completed tasks from active tasks
      // CRITICAL: For multi-daypart tasks, we need to check per-daypart completion
      // For single-daypart tasks, we check if the task itself has a completion record
      // IMPORTANT: Check status FIRST, then completion records
      let activeTasks = tasksWithProfiles.filter(task => {
        // Check 0: CRITICAL - Check completed_at FIRST (most reliable indicator)
        // This must be the first check to catch any tasks that slipped through the database query
        if (task.completed_at && task.completed_at !== null && task.completed_at !== undefined) {
          const completedDate = new Date(task.completed_at).toISOString().split('T')[0]
          if (completedDate === todayStr) {
            console.log(`❌ Task ${task.id} filtered: has completed_at timestamp for today (${task.completed_at})`)
            return false
          }
        }
        
        // Check 1: CRITICAL - Skip if task status is completed, missed, or skipped
        // This should never happen since query filters by status, but defensive check
        if (task.status === 'completed' || task.status === 'missed' || task.status === 'skipped') {
          console.log(`❌ Task ${task.id} filtered: status is ${task.status} (should not appear in query)`)
          return false
        }
        
        // Check 1.5: Additional defensive check - ensure status is pending or in_progress
        // This catches any edge cases where status might be something else
        if (task.status !== 'pending' && task.status !== 'in_progress') {
          console.log(`❌ Task ${task.id} filtered: invalid status ${task.status}`)
          return false
        }
        
        // Check 3: For multi-daypart tasks, check per-daypart completion
        // This MUST come before the general completion check
        const taskData = task.task_data || {}
        const daypartsInData = taskData.dayparts || []
        const hasMultipleDayparts = Array.isArray(daypartsInData) && daypartsInData.length > 1
        
        if (hasMultipleDayparts && task.daypart) {
          // For multi-daypart tasks, check if THIS specific daypart instance was completed
          const completedDayparts = completedDaypartsMap.get(task.id)
          if (completedDayparts) {
            const normalizedDaypart = normalizeDaypart(task.daypart)
            if (completedDayparts.has(normalizedDaypart)) {
              // This specific daypart instance was completed, hide it
              console.log(`❌ Task ${task.id} filtered: daypart ${task.daypart} (normalized: ${normalizedDaypart}) was completed`)
              return false
            }
          }
          // If this daypart wasn't completed, show it (even if other dayparts were completed)
          return true
        }
        
        // Check 4: For single-daypart tasks (or tasks without daypart data), 
        // skip if task has ANY completion record for today
        // CRITICAL: Check completion records directly to ensure we catch all completed tasks
        const hasCompletionRecordForToday = allCompletionRecords.some(record => {
          if (record.task_id !== task.id) return false
          // Verify the completion record is for today
          if (record.completed_at) {
            const recordDate = new Date(record.completed_at).toISOString().split('T')[0]
            if (recordDate !== todayStr) return false
          }
          // For single-daypart tasks, any completion record for today means the task is completed
          return true
        })
        
        // Also check the sets for quick lookup
        const hasCompletionRecord = tasksWithCompletionRecords.has(task.id) || tasksCompletedWithoutDaypart.has(task.id)
        
        // CRITICAL: Filter out if ANY completion indicator is present
        if (hasCompletionRecord || hasCompletionRecordForToday) {
          console.log(`❌ Task ${task.id} filtered: has completion indicator (status: ${task.status}, hasRecord: ${hasCompletionRecord}, hasRecordForToday: ${hasCompletionRecordForToday})`)
          return false
        }
        
        // Task passed all filters - it's active
        return true
      })
      
      console.log('✅ Filtered tasks:', {
        before: tasksWithProfiles.length,
        after: activeTasks.length,
        filteredOut: tasksWithProfiles.length - activeTasks.length,
        allCompletionRecordsCount: allCompletionRecords.length,
        tasksWithCompletionRecordsCount: tasksWithCompletionRecords.size,
        tasksCompletedWithoutDaypartCount: tasksCompletedWithoutDaypart.size,
        completedDaypartsMapSize: completedDaypartsMap.size,
        sampleFilteredTasks: activeTasks.slice(0, 3).map(t => ({
          id: t.id,
          status: t.status,
          daypart: t.daypart,
          templateName: t.template?.name
        })),
        sampleFilteredOutTasks: tasksWithProfiles.filter(t => !activeTasks.includes(t)).slice(0, 3).map(t => ({
          id: t.id,
          status: t.status,
          daypart: t.daypart,
          templateName: t.template?.name,
          hasCompletionRecord: tasksWithCompletionRecords.has(t.id),
          hasCompletedAt: !!(t.completed_at && t.completed_at !== null)
        }))
      })
      
      // Create one entry per completion record (not just one per task)
      // This ensures all completion records are shown, even for multi-daypart tasks
      const completedTasksWithRecords = allCompletionRecords
        .map(record => {
          const task = tasksWithProfiles.find(t => t.id === record.task_id)
          if (!task) return null
          
          return {
            ...task,
            completion_record: record,
            // CRITICAL: Explicitly preserve template to ensure it's not lost
            template: task.template
          }
        })
        .filter((task): task is ChecklistTaskWithTemplate & { completion_record: any } => task !== null)
      
      // Sort both active and completed tasks chronologically
      // PRIMARY: Sort by due_time (actual time is the anchor) - this ensures tasks are sorted
      //          by their actual scheduled time, NOT by daypart order
      //          Example: If before_open=10:00, during_service=09:00, after_service=11:00,
      //          they will display as: 09:00, 10:00, 11:00 (chronological), not by daypart order
      // SECONDARY: Use daypart order as tie-breaker ONLY when times are exactly the same
      const sortChronologically = (a: ChecklistTaskWithTemplate, b: ChecklistTaskWithTemplate) => {
        // Get times, default to end of day if missing
        const timeA = a.due_time || '23:59:59'
        const timeB = b.due_time || '23:59:59'
        
        // PRIMARY: Compare times first (HH:MM format works for string comparison)
        // This ensures chronological order regardless of daypart order
        if (timeA < timeB) return -1
        if (timeA > timeB) return 1
        
        // SECONDARY: If times are the same, use daypart order as tie-breaker
        const daypartOrderA = getDaypartSortOrder(a.daypart)
        const daypartOrderB = getDaypartSortOrder(b.daypart)
        
        return daypartOrderA - daypartOrderB
      }
      
      activeTasks.sort(sortChronologically)
      completedTasksWithRecords.sort(sortChronologically)
      
      console.log('📋 Tasks Debug:', {
        totalTasks: tasksWithProfiles.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasksWithRecords.length,
        allCompletionRecordsCount: allCompletionRecords.length,
        tasksWithCompletionRecordsCount: tasksWithCompletionRecords.size,
        taskStatuses: tasksWithProfiles.map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          due_time: t.due_time,
          templateId: t.template_id,
          templateName: t.template?.name,
          hasCompletionRecord: tasksWithCompletionRecords.has(t.id)
        })),
        completionRecords: allCompletionRecords.map(r => ({
          id: r.id,
          task_id: r.task_id,
          completed_at: r.completed_at,
          completed_daypart: r.completion_data?.completed_daypart
        }))
      })
      
      // CRITICAL: Final verification - ensure all active tasks have templates attached
      const tasksWithVerifiedTemplates = activeTasks.map(task => {
        if (!task.template && task.template_id) {
          console.error('❌ [FINAL CHECK] Task missing template before setting state:', {
            taskId: task.id,
            templateId: task.template_id,
            templatesMapHasTemplate: !!templatesMap[task.template_id],
            templatesMapKeys: Object.keys(templatesMap)
          })
          // Try to get template from map one more time
          const template = templatesMap[task.template_id]
          if (template) {
            return { ...task, template }
          }
        }
        return task
      })
      
      // Verify all tasks have templates
      const tasksWithoutTemplates = tasksWithVerifiedTemplates.filter(t => t.template_id && !t.template)
      if (tasksWithoutTemplates.length > 0) {
        console.error('❌ [FINAL CHECK] Tasks without templates:', tasksWithoutTemplates.map(t => ({
          taskId: t.id,
          templateId: t.template_id
        })))
      } else {
        console.log('✅ [FINAL CHECK] All tasks have templates attached')
      }
      
      console.log('✅ Setting tasks (sorted chronologically):', {
        activeTasksCount: tasksWithVerifiedTemplates.length,
        completedTasksCount: completedTasksWithRecords.length,
        activeTasks: tasksWithVerifiedTemplates.slice(0, 5).map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          due_time: t.due_time,
          name: t.template?.name || 'Unknown',
          hasTemplate: !!t.template,
          templateFieldsCount: t.template?.template_fields?.length || 0
        }))
      })
      
      // CRITICAL: Verify templates are attached before setting state
      // Log a sample task to verify template structure
      if (tasksWithVerifiedTemplates.length > 0) {
        const sampleTask = tasksWithVerifiedTemplates[0]
        console.log('🔍 [STATE SET] Sample task before setTasks:', {
          taskId: sampleTask.id,
          templateId: sampleTask.template_id,
          hasTemplate: !!sampleTask.template,
          templateName: sampleTask.template?.name,
          templateFieldsCount: sampleTask.template?.template_fields?.length || 0,
          templateFieldsType: typeof sampleTask.template?.template_fields,
          templateFieldsIsArray: Array.isArray(sampleTask.template?.template_fields)
        })
      }
      
      setTasks(tasksWithVerifiedTemplates)
      setCompletedTasks(completedTasksWithRecords)
      await loadBreachActions()
    } catch (error: any) {
      // Enhanced error logging with better serialization
      const errorDetails: any = {
        message: error?.message || 'Unknown error',
        code: error?.code || 'NO_CODE',
        details: error?.details || 'No details',
        hint: error?.hint || 'No hint',
      }
      
      // Try to serialize the error object
      try {
        errorDetails.fullError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      } catch (e) {
        errorDetails.fullError = 'Could not serialize error'
      }
      
      // Try to get error as string
      try {
        errorDetails.errorString = String(error)
      } catch (e) {
        errorDetails.errorString = 'Could not convert to string'
      }
      
      // Add stack trace if available
      if (error?.stack) {
        errorDetails.stack = error.stack
      }
      
      console.error('❌ Failed to fetch today\'s tasks:', errorDetails)
      toast.error('Failed to load tasks. Please refresh the page.')
      setTasks([])
      setCompletedTasks([])
    } finally {
      setLoading(false)
    }
  }, [companyId, siteId, loadBreachActions]) // Dependencies for fetchTodaysTasks

  // Update ref whenever fetchTodaysTasks changes
  useEffect(() => {
    fetchTodaysTasksRef.current = fetchTodaysTasks
  }, [fetchTodaysTasks])

  // Now define the useEffect that uses these functions
  useEffect(() => {
    if (companyId) {
      fetchTodaysTasks()
      fetchUpcomingTasks()
      loadBreachActions()
    } else {
      setLoading(false)
      setTasks([])
    }
  }, [siteId, companyId, fetchTodaysTasks, fetchUpcomingTasks, loadBreachActions])

  // Listen for refresh events (e.g., after clock-in)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Refreshing tasks after clock-in/out')
      if (fetchTodaysTasksRef.current) {
        fetchTodaysTasksRef.current()
        fetchUpcomingTasks()
      }
    }

    window.addEventListener('refresh-tasks', handleRefresh)
    return () => window.removeEventListener('refresh-tasks', handleRefresh)
  }, [fetchUpcomingTasks]) // Include fetchUpcomingTasks in deps

  const getStatusColor = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') {
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    }
    
    // Calculate timing status for non-completed tasks with grace period
    const taskData = task.task_data as any
    const template = task.template as any
    const recurrencePattern = template?.recurrence_pattern || {}
    const gracePeriodDays = taskData?.grace_period_days ?? recurrencePattern?.grace_period_days ?? 0
    const timing = calculateTaskTiming(task.due_date, task.due_time || null, new Date(), gracePeriodDays)
    if (timing.status === 'overdue') return 'bg-red-600/20 text-red-300 border-red-600/40' // More urgent red
    if (timing.status === 'grace_period') return 'bg-orange-500/10 text-orange-400 border-orange-500/20' // Orange for grace period
    if (timing.status === 'late') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (timing.status === 'due') return 'bg-green-500/10 text-green-400 border-green-500/20'
    if (timing.status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  const getStatusIcon = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') return <CheckCircle2 className="w-4 h-4" />
    
    const taskData = task.task_data as any
    const template = task.template as any
    const recurrencePattern = template?.recurrence_pattern || {}
    const gracePeriodDays = taskData?.grace_period_days ?? recurrencePattern?.grace_period_days ?? 0
    const timing = calculateTaskTiming(task.due_date, task.due_time || null, new Date(), gracePeriodDays)
    if (timing.status === 'overdue' || timing.status === 'grace_period') return <AlertCircle className="w-4 h-4" />
    if (timing.status === 'late') return <AlertCircle className="w-4 h-4" />
    if (timing.status === 'due') return <Clock className="w-4 h-4" />
    if (timing.status === 'pending') return <Clock className="w-4 h-4" />
    
    return <Clock className="w-4 h-4" />
    }
  
  const getStatusLabel = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') return 'COMPLETED'
    
    const taskData = task.task_data as any
    const template = task.template as any
    const recurrencePattern = template?.recurrence_pattern || {}
    const gracePeriodDays = taskData?.grace_period_days ?? recurrencePattern?.grace_period_days ?? 0
    const timing = calculateTaskTiming(task.due_date, task.due_time || null, new Date(), gracePeriodDays)
    if (timing.status === 'overdue') return `OVERDUE (${timing.daysPastDue}d)`
    if (timing.status === 'grace_period') return `LATE (${timing.daysPastDue}d past due)`
    if (timing.status === 'late') return 'LATE'
    if (timing.status === 'due') return 'DUE'
    if (timing.status === 'pending') return 'PENDING'
    
    return task.status.toUpperCase().replace('_', ' ')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'food_safety': 'bg-green-500/10 text-green-400',
      'h_and_s': 'bg-blue-500/10 text-blue-400',
      'fire': 'bg-red-500/10 text-red-400',
      'cleaning': 'bg-purple-500/10 text-purple-400',
      'compliance': 'bg-yellow-500/10 text-yellow-400'
    }
    return colors[category] || 'bg-gray-500/10 text-gray-400'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Today's Tasks
        </h1>
        <p className="text-neutral-400 text-sm sm:text-base">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 Manual refresh clicked')
            fetchTodaysTasks()
            fetchUpcomingTasks()
          }}
          className="px-4 py-2 bg-magenta-500/20 hover:bg-magenta-500/30 border border-magenta-500/50 text-magenta-400 rounded-lg transition-colors text-sm"
        >
          🔄 Refresh Tasks
        </button>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {upcomingTasks.length > 0 && (
            <button
              onClick={() => {
                setShowUpcoming(!showUpcoming)
                if (!showUpcoming) {
                  fetchUpcomingTasks()
                }
              }}
              className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                showUpcoming
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <Calendar className={`h-4 w-4 ${showUpcoming ? 'text-orange-400' : 'text-white/60'}`} />
              {showUpcoming ? 'Hide' : 'Show'} Upcoming
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                showUpcoming 
                  ? 'bg-orange-500/20 text-orange-300' 
                  : 'bg-white/10 text-white/80'
              }`}>
                {upcomingTasks.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
              showCompleted
                ? 'bg-green-500/10 border-green-500/50 text-green-400'
                : 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06] hover:border-white/[0.12]'
            } ${completedTasks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={completedTasks.length === 0}
          >
            <CheckCircle2 className={`h-4 w-4 ${showCompleted ? 'text-green-400' : 'text-white/60'}`} />
            {showCompleted ? 'Hide' : 'Show'} Completed
            {completedTasks.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                showCompleted 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-white/10 text-white/80'
              }`}>
                {completedTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading tasks...</h3>
        </div>
      ) : tasks.length === 0 && completedTasks.length > 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">All done for now! 🎉</h2>
            <p className="text-white/60 text-lg mb-4">
              You've completed all your tasks for today.
            </p>
            <p className="text-white/40 text-sm">
              Check back later for new tasks or create a template to add more.
            </p>
          </div>
        </div>
      ) : tasks.length === 0 && completedTasks.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6">
              <Calendar className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No tasks for today</h2>
            <p className="text-white/60 text-lg mb-4">
              There are no tasks scheduled for today.
            </p>
            <p className="text-white/40 text-sm">
              Check back later or create a template to add tasks.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            // Use expandedKey if available, otherwise use task.id + index for uniqueness
            // Ensure key is always a string and unique
            const expandedKey = (task as any)._expandedKey
            const key = expandedKey 
              ? String(expandedKey) 
              : `${task.id}_${index}`
            // Render TaskCard for all tasks
            return (
              <TaskCard
                key={key}
                task={task}
                onClick={() => {
                  // CRITICAL: Create a deep copy of the task to ensure template is preserved
                  // React state updates might lose nested properties if we just pass the reference
                  const taskWithTemplate = {
                    ...task,
                    template: task.template ? {
                      ...task.template,
                      template_fields: task.template.template_fields ? [...task.template.template_fields] : []
                    } : null
                  }
                  
                  // CRITICAL: Verify template is attached before setting selected task
                  console.log('🔍 [TASK SELECTION] Setting selected task:', {
                    taskId: taskWithTemplate.id,
                    templateId: taskWithTemplate.template_id,
                    hasTemplate: !!taskWithTemplate.template,
                    templateName: taskWithTemplate.template?.name,
                    templateFieldsCount: taskWithTemplate.template?.template_fields?.length || 0,
                    templateFields: taskWithTemplate.template?.template_fields
                  })
                  
                  // Set window.selectedTask for debugging
                  if (typeof window !== 'undefined') {
                    (window as any).selectedTask = taskWithTemplate
                  }
                  
                  setSelectedTask(taskWithTemplate)
                  setShowCompletion(true)
                }}
              />
            )
          })}
        </div>
      )}

      {/* Upcoming Callout Follow-up Tasks Section */}
      {showUpcoming && upcomingTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Upcoming Callout Follow-ups</h2>
          <div className="space-y-3">
            {upcomingTasks.map((task, index) => {
              // Use task.id + index for unique keys (callout follow-up tasks)
              const uniqueKey = `callout-followup-${task.id}-${index}`;
              return (
                <TaskCard
                  key={uniqueKey}
                  task={task}
                  onClick={() => {
                    // CRITICAL: Create a deep copy of the task to ensure template is preserved
                    // React state updates might lose nested properties if we just pass the reference
                    const taskWithTemplate = {
                      ...task,
                      template: task.template ? {
                        ...task.template,
                        template_fields: task.template.template_fields ? [...task.template.template_fields] : []
                      } : null
                    }
                    
                    // CRITICAL: Verify template is attached before setting selected task
                    console.log('🔍 [TASK SELECTION] Setting selected task (upcoming):', {
                      taskId: taskWithTemplate.id,
                      templateId: taskWithTemplate.template_id,
                      hasTemplate: !!taskWithTemplate.template,
                      templateName: taskWithTemplate.template?.name,
                      templateFieldsCount: taskWithTemplate.template?.template_fields?.length || 0,
                      templateFields: taskWithTemplate.template?.template_fields
                    })
                    
                    // Set window.selectedTask for debugging
                    if (typeof window !== 'undefined') {
                      (window as any).selectedTask = taskWithTemplate
                    }
                    
                    setSelectedTask(taskWithTemplate)
                    setShowCompletion(true)
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Tasks Section */}
      {showCompleted && completedTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Completed Tasks</h2>
          <div className="space-y-3">
            {completedTasks.map((task) => {
              // Use completion_record.id as key if available, otherwise use task.id + completion_record.id
              // This ensures uniqueness even if the same task has multiple completion records
              const uniqueKey = task.completion_record?.id 
                ? `completed-${task.completion_record.id}` 
                : `completed-${task.id}-${task.completed_at || Date.now()}`;
              return (
                <CompletedTaskCard
                  key={uniqueKey}
                  task={task}
                  completionRecord={task.completion_record}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Temperature Breach Follow-up Section */}
      {breachActions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Temperature Breach Follow-ups</h2>
          <div className="space-y-3">
            {breachActions.map((action) => {
              const log = action.temperature_log
              const evaluation = log?.meta?.evaluation
              return (
                <div key={action.id} className="border border-white/10 rounded-lg p-3 text-sm text-white/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">
                      {action.action_type === 'monitor' ? 'Monitor temperature' : 'Callout contractor'}
                    </div>
                    <div className="text-xs text-white/50">
                      Created {new Date(action.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-white/60 space-x-3">
                    <span>Status: <span className="text-white/80">{action.status}</span></span>
                    {action.due_at && (
                      <span>Due: <span className="text-white/80">{new Date(action.due_at).toLocaleString()}</span></span>
                    )}
                    {log?.recorded_at && (
                      <span>Reading taken: <span className="text-white/80">{new Date(log.recorded_at).toLocaleString()}</span></span>
                    )}
                  </div>
                  {evaluation?.reason && (
                    <p className="mt-2 text-xs text-white/60">Reason: {evaluation.reason}</p>
                  )}
                  {action.notes && (
                    <p className="mt-2 text-xs text-white/60">Notes: {action.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {selectedTask && showCompletion && (
        <TaskCompletionModal
          task={selectedTask}
          isOpen={showCompletion}
          onClose={() => {
            setShowCompletion(false)
            setSelectedTask(null)
          }}
          onComplete={async () => {
            console.log('🔄 onComplete called - refreshing tasks...')
            setShowCompletion(false)
            setSelectedTask(null)
            // Force a longer delay to ensure database updates have propagated
            // Also force a cache-busting refresh
            await new Promise(resolve => setTimeout(resolve, 2000))
            console.log('🔄 Calling fetchTodaysTasks after delay...')
            // Force refresh by clearing state first
            setTasks([])
            setCompletedTasks([])
            await fetchTodaysTasks() // Refresh tasks to show completed task
            console.log('✅ fetchTodaysTasks completed')
            await loadBreachActions() // Refresh breach actions after task completion
          }}
          onMonitoringTaskCreated={() => {
            // Refresh tasks list immediately when monitoring task is created
            fetchTodaysTasks()
            loadBreachActions() // Refresh breach actions after monitoring task creation
          }}
        />
      )}
    </div>
  )
}
