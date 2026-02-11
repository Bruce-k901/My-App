'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar } from '@/components/ui/icons'
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
    if (!siteId || siteId === 'all') {
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

      if (siteId && siteId !== 'all') {
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
      // console.log('🔄 fetchTodaysTasks called at:', new Date().toISOString())
      
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
      
      // console.log('🔍 Fetching tasks for:', { today: todayStr, siteId, companyId })
      
      // Apply shift-based filtering
      const shiftFilter = await buildTaskQueryFilter()
      // console.log('🕐 Shift filter applied:', shiftFilter)
      
      // If staff is not on shift, return empty tasks array
      if (!shiftFilter.showAll && !shiftFilter.siteId) {
        // console.log('⏸️ Staff not on shift - no tasks to show')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Fetch tasks with visibility window logic:
      // Tasks are visible if:
      // 1. due_date is within visibility window (due_date - visibility_before <= today <= due_date + visibility_after)
      // 2. OR task has no visibility window settings (backwards compatibility - show only today's tasks)
      // 3. site_id matches (if set)
      // 4. Exclude callout_followup tasks (shown separately)
      
      // Build query to get all potentially visible tasks
      // We'll filter by visibility window in JavaScript after fetching template data
      // Note: Using a simpler approach - fetch a wider date range to catch all visibility windows
      
      // Calculate date range: from 30 days ago to 30 days in the future
      const dateRangeStart = new Date(today)
      dateRangeStart.setDate(dateRangeStart.getDate() - 30)
      const dateRangeStartStr = dateRangeStart.toISOString().split('T')[0]
      
      const dateRangeEnd = new Date(today)
      dateRangeEnd.setDate(dateRangeEnd.getDate() + 30)
      const dateRangeEndStr = dateRangeEnd.toISOString().split('T')[0]
      
      // Fetch tasks without relationship query (fetch templates separately)
      // NOTE: We fetch ALL tasks (including completed) and filter in JavaScript
      // This ensures we can show completed tasks in the completed section
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        // CRITICAL: Filter by company_id first
        .eq('company_id', companyId)
        // Fetch a wider date range to catch all visibility windows
        // We'll filter by visibility windows in JavaScript
        .gte('due_date', dateRangeStartStr)
        .lte('due_date', dateRangeEndStr)
        // Don't filter by status here - we'll filter in JavaScript to show completed tasks separately
      
      // Apply shift-based site filtering
      // Managers/admins see all sites, staff only see their current site when on shift
      if (shiftFilter.showAll) {
        // Managers/admins: filter by siteId from context if available and valid, otherwise show all
        if (siteId && siteId !== 'all') {
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
      
      // console.log('📥 Raw tasks from database:', {
      //   total: allTasks?.length || 0,
      //   tasks: allTasks?.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, flag_reason: t.flag_reason }))
      // })
      
      // Fetch templates separately if we have tasks
      // CRITICAL: Load ALL required fields needed by TaskCompletionModal
      // This includes: evidence_types, asset_id, repeatable_field_name, instructions, etc.
      let templatesMap: Record<string, any> = {}
      if (allTasks && allTasks.length > 0) {
        const templateIds = [...new Set(allTasks.map((t: any) => t.template_id).filter(Boolean))]
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
          
          if (templatesError) {
            console.error('❌ Error fetching templates:', {
              error: templatesError,
              message: templatesError.message,
              code: templatesError.code,
              details: templatesError.details,
              templateIds: templateIds,
              templateIdsCount: templateIds.length
            })
          }
          
          if (!templatesError && templates) {
            templatesMap = templates.reduce((acc: Record<string, any>, template: any) => {
              const enriched = enrichTemplateWithDefinition(template)
              acc[enriched.id] = enriched
              return acc
            }, {})
            
            // Log if we didn't get all templates
            const foundTemplateIds = new Set(templates.map((t: any) => t.id))
            const missingTemplateIds = templateIds.filter(id => !foundTemplateIds.has(id))
            if (missingTemplateIds.length > 0) {
              console.warn('⚠️ Some templates not found:', {
                requested: templateIds.length,
                found: templates.length,
                missing: missingTemplateIds,
                missingCount: missingTemplateIds.length
              })
            }
          }
        }
      }
      
      // Filter tasks by visibility windows and shift-based timing
      // CRITICAL: Only show tasks from "My Tasks" (site_checklists), NOT directly from templates
      // Templates should never appear in "Today's Tasks" - only task instances from site_checklists
      const data = (allTasks || []).filter(task => {
        // CRITICAL: Exclude tasks that have template_id but no site_checklist_id
        // These are templates that were incorrectly created as tasks
        if ((task as any).template_id && !(task as any).site_checklist_id) {
          console.log('❌ Excluding template without site_checklist_id (should not appear in Today\'s Tasks):', {
            id: task.id,
            custom_name: (task as any).custom_name,
            template_id: (task as any).template_id,
            site_checklist_id: (task as any).site_checklist_id
          });
          return false;
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
            // console.log(`⏰ Task ${task.id} filtered: not due now (due_time: ${task.due_time})`)
            return false
          }
        }
        
        // Get visibility window settings from template or task_data
        const template = (task as any).template_id ? templatesMap[(task as any).template_id] : null
        const taskData = task.task_data as any
        const recurrencePattern = template?.recurrence_pattern || {}
        
        // Get template frequency - daily tasks should show EVERY DAY regardless of due_date
        const frequency = template?.frequency
        
        // Daily tasks: Always show (they're due every day)
        // But only if template exists - if no template, fall back to due_date check
        if (frequency === 'daily' && template) {
          // console.log(`✅ Daily task showing: ${task.id} (template: ${template.name}, due_date: ${task.due_date})`)
          return true
        }
        
        // Debug: Log why tasks are being filtered
        if (!template && (task as any).template_id) {
          // console.log(`⚠️ Task ${task.id} has template_id ${(task as any).template_id} but template not found in map`)
        }
        
        // Get visibility settings (from task_data if stored there, otherwise from template)
        const visibilityBefore = taskData?.visibility_window_days_before ?? 
                                 recurrencePattern?.visibility_window_days_before ?? 
                                 0
        const visibilityAfter = taskData?.visibility_window_days_after ?? 
                                recurrencePattern?.visibility_window_days_after ?? 
                                0
        
        // Get actual due date (from task_data if stored, otherwise from due_date)
        const actualDueDate = taskData?.actual_due_date ? 
                              new Date(taskData.actual_due_date) : 
                              new Date(task.due_date)
        
        // Calculate visibility window
        const windowStart = new Date(actualDueDate)
        windowStart.setDate(windowStart.getDate() - visibilityBefore)
        
        const windowEnd = new Date(actualDueDate)
        windowEnd.setDate(windowEnd.getDate() + visibilityAfter)
        
        // Task is visible if today is within the visibility window
        const isVisible = today >= windowStart && today <= windowEnd
        
        // If no visibility window settings (backwards compatibility), only show tasks due today
        if (visibilityBefore === 0 && visibilityAfter === 0) {
          const matches = task.due_date === todayStr
          if (!matches) {
            // console.log(`❌ Task ${task.id} filtered: due_date ${task.due_date} !== today ${todayStr} (no visibility window)`)
          }
          return matches
        }
        
        if (!isVisible) {
          // console.log(`❌ Task ${task.id} filtered: not in visibility window (due_date: ${task.due_date}, window: ${windowStart.toISOString().split('T')[0]} to ${windowEnd.toISOString().split('T')[0]})`)
        }
        return isVisible
      })
      
      if (!data || data.length === 0) {
        // console.log('⚠️ No tasks found for today')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Fetch full template details for remaining tasks that weren't in the initial fetch
      // (This handles edge cases where new templates were added between fetches)
      const filteredTemplateIds = [...new Set(data.map((t: any) => t.template_id).filter((id): id is string => id !== null && !templatesMap[id]))]
      if (filteredTemplateIds.length > 0) {
        const { data: fullTemplates, error: fullTemplatesError } = await supabase
          .from('task_templates')
          .select(`
            id, name, slug, description, category, frequency, compliance_standard, is_critical, 
            evidence_types, repeatable_field_name, instructions, dayparts, recurrence_pattern, 
            asset_id, time_of_day,
            template_fields (*)
          `)
          .in('id', filteredTemplateIds)
        
        if (fullTemplatesError) {
          console.error('❌ Error fetching additional templates:', {
            error: fullTemplatesError,
            message: fullTemplatesError.message,
            code: fullTemplatesError.code,
            templateIds: filteredTemplateIds
          })
        }
        
        if (fullTemplates) {
          fullTemplates.forEach(t => {
            templatesMap[t.id] = t
          })
        }
      }
      
      // Fetch assets to check which ones are archived
      // Collect all unique asset_ids from:
      // 1. Templates (template.asset_id)
      // 2. Task data (task_data.asset_id - for PPM tasks, etc.)
      const assetIdsFromTemplates = [...new Set(
        Object.values(templatesMap)
          .map((t: any) => t.asset_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )]
      
      const assetIdsFromTaskData = [...new Set(
        data
          .map((task: any) => task.task_data?.asset_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )]
      
      // Combine all asset IDs
      const allAssetIds = [...new Set([...assetIdsFromTemplates, ...assetIdsFromTaskData])]
      
      // Fetch assets to check archived status
      let archivedAssetIds = new Set<string>()
      if (allAssetIds.length > 0) {
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, archived, name')
          .in('id', allAssetIds)
        
        if (assetsError) {
          console.error('❌ Error fetching assets for archived check:', assetsError)
        } else if (assets) {
          // Build set of archived asset IDs
          assets.forEach(asset => {
            if (asset.archived) {
              archivedAssetIds.add(asset.id)
              // console.log(`🏷️ Asset "${asset.name}" (${asset.id}) is archived - will exclude related tasks`)
            }
          })
        }
      }
      
      // Map tasks with templates
      const tasksWithTemplates = data.map((task: any) => ({
        ...task,
        template: task.template_id ? templatesMap[task.template_id] : null
      }))
      
      // Filter out tasks with missing templates (orphaned tasks)
      // NOTE: We're temporarily showing orphaned tasks with a warning instead of hiding them
      // This helps diagnose why templates aren't being found (RLS issue, missing templates, etc.)
      // Also filter out tasks linked to archived assets
      const validTasks = tasksWithTemplates.filter(task => {
        if (task.template_id && !task.template) {
          console.warn(`⚠️ Task has template_id but template not found: task_id=${task.id}, template_id=${task.template_id}`);
          // Temporarily include orphaned tasks so we can see them and diagnose the issue
          // TODO: Once templates are loading correctly, change this back to `return false`
          return true; // Include orphaned tasks for now
        }
        
        // Exclude tasks linked to archived assets (check both template.asset_id and task_data.asset_id)
        if (task.template?.asset_id && archivedAssetIds.has(task.template.asset_id)) {
          // console.log(`🚫 Task ${task.id} filtered: linked to archived asset ${task.template.asset_id}`)
          return false
        }
        
        // Also check task_data.asset_id (for PPM tasks, etc.)
        if (task.task_data?.asset_id && archivedAssetIds.has(task.task_data.asset_id)) {
          // console.log(`🚫 Task ${task.id} filtered: linked to archived asset ${task.task_data.asset_id}`)
          return false
        }
        
        return true;
      });
      
      // console.log('📦 Tasks with templates:', {
      //   total: tasksWithTemplates.length,
      //   valid: validTasks.length,
      //   orphaned: tasksWithTemplates.length - validTasks.length,
      //   tasks: validTasks.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, template_id: t.template_id }))
      // })
      
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
        // console.log('🔍 Checking task for expansion:', {
        //   taskId: task.id,
        //   taskName: task.custom_name || task.template?.name,
        //   daypartField: task.daypart,
        //   due_time: task.due_time,
        //   taskDataKeys: Object.keys(taskData),
        //   taskDataDayparts: taskData.dayparts,
        //   taskDataDaypartsType: typeof taskData.dayparts,
        //   taskDataDaypartsIsArray: Array.isArray(taskData.dayparts)
        // })
        
        // Check task_data for dayparts array (could be array of strings or array of objects with daypart/due_time)
        if (taskData.dayparts && Array.isArray(taskData.dayparts)) {
          daypartsInData = taskData.dayparts
          // console.log('✅ Found dayparts array in task_data:', {
          //   count: daypartsInData.length,
          //   dayparts: daypartsInData
          // })
        } else {
          // console.log('⚠️ No dayparts array found in task_data or not an array')
        }
        
        // If task has multiple dayparts in task_data, expand it even if daypart field is set
        // This handles manually created tasks that have daypart set to first daypart but multiple dayparts in task_data
        if (daypartsInData.length > 1) {
          // console.log('🔄 Expanding task with multiple dayparts in task_data:', {
          //   taskId: task.id,
          //   taskName: task.custom_name || task.template?.name,
          //   daypartField: task.daypart,
          //   daypartsInData: daypartsInData.length,
          //   dayparts: daypartsInData
          // })
          
          // Expand into multiple instances, one per daypart
          daypartsInData.forEach((dp: any, index: number) => {
            // Handle both string format and object format { daypart: string, due_time: string }
            const daypartStr = typeof dp === 'string' ? dp : (dp.daypart || dp)
            const daypartTime = typeof dp === 'object' && dp.due_time ? dp.due_time : null
            const normalizedDaypart = normalizeDaypart(daypartStr)
            const templateTime = task.template?.time_of_day || null
            
            // Use daypart-specific time if provided, otherwise calculate
            const finalTime = daypartTime || getDaypartTime(normalizedDaypart, templateTime, task.due_time)
            
            // console.log(`  → Creating instance ${index + 1}:`, {
            //   daypart: normalizedDaypart,
            //   due_time: finalTime,
            //   originalDaypartTime: daypartTime
            // })
            
            expandedTasks.push({
              ...task,
              daypart: normalizedDaypart,
              due_time: finalTime,
              _expandedKey: `${task.id}_${normalizedDaypart}_${index}`
            })
          })
          // console.log(`✅ Expanded task into ${daypartsInData.length} instances`)
          return // Skip further processing for this task
        } else if (daypartsInData.length === 1) {
          // console.log('ℹ️ Task has only 1 daypart in task_data, not expanding:', {
          //   taskId: task.id,
          //   daypart: daypartsInData[0]
          // })
        }
        
        // If task already has a daypart set and no multiple dayparts in task_data,
        // it's already a separate instance from cron generation
        // Use it as-is, but ensure it has the correct time for its daypart
        if (task.daypart && typeof task.daypart === 'string') {
          const daypartStr = normalizeDaypart(task.daypart) // Normalize daypart
          const templateTime = task.template?.time_of_day || null
          // Preserve existing time if set, otherwise calculate based on daypart
          const daypartTime = getDaypartTime(daypartStr, templateTime, task.due_time)
          
          // console.log('🕐 Setting daypart time:', {
          //   taskId: task.id,
          //   originalDaypart: task.daypart,
          //   normalizedDaypart: daypartStr,
          //   originalTime: task.due_time,
          //   templateTime: templateTime,
          //   calculatedTime: daypartTime,
          //   preservingTime: task.due_time ? 'yes' : 'no'
          // })
          
          // Preserve existing time if task has one, otherwise use daypart-based time
          expandedTasks.push({
            ...task,
            daypart: daypartStr, // Store normalized daypart
            due_time: daypartTime, // Use existing time if set, otherwise calculated
            _expandedKey: `${task.id}_${daypartStr}`
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
            _expandedKey: `${task.id}_${daypartStr}_${daypartIndex}`
          })
        })
      })
      
      // console.log('🔄 Before deduplication:', {
      //   count: expandedTasks.length,
      //   tasks: expandedTasks.map(t => ({ 
      //     id: t.id, 
      //     status: t.status, 
      //     daypart: t.daypart, 
      //     due_time: t.due_time,
      //     due_date: t.due_date,
      //     template_id: t.template_id,
      //     _expandedKey: (t as any)._expandedKey
      //   }))
      // })
      
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
          // console.log('⚠️ Duplicate task filtered:', { 
          //   key, 
          //   compositeKey,
          //   taskId: task.id, 
          //   daypart: task.daypart,
          //   due_time: task.due_time,
          //   due_date: task.due_date,
          //   template_id: task.template_id,
          //   status: task.status 
          // })
          return false
        }
        seen.set(key, task)
        return true
      })
      
      // console.log('🔄 After deduplication:', {
      //   count: deduplicatedTasks.length,
      //   tasks: deduplicatedTasks.map(t => ({ 
      //     id: t.id, 
      //     status: t.status, 
      //     daypart: t.daypart, 
      //     due_time: t.due_time,
      //     due_date: t.due_date,
      //     template_id: t.template_id,
      //     _expandedKey: (t as any)._expandedKey
      //   }))
      // })
      
      // Sort deduplicated tasks chronologically by daypart, then by due_time
      // We'll do a final sort after all processing to ensure correct order
      
      // Use deduplicated tasks for the rest of the logic
      expandedTasks = deduplicatedTasks
      
      // Load profiles for completed tasks
      const completedByUserIds = expandedTasks
        .filter(t => t.status === 'completed' && t.completed_by)
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
        completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) : null
      }))
      
      // CRITICAL: For tasks with multiple dayparts, we need to check completion per instance
      // Fetch ALL completion records (not just for completed tasks) to check per-daypart completion
      const allTaskIds = tasksWithProfiles.map(t => t.id)
      let allCompletionRecords: any[] = []
      
      if (allTaskIds.length > 0) {
        // console.log('🔍 Fetching completion records for task IDs:', allTaskIds.slice(0, 5), '... (total:', allTaskIds.length, ')', 'siteId:', siteId)
        
        // Batch queries if there are too many task IDs to avoid URL length limits
        // Supabase/PostgREST has limits on URL length, so we'll batch in chunks of 100
        const BATCH_SIZE = 100
        let allCompletionRecords: any[] = []
        let hasError = false
        
        for (let i = 0; i < allTaskIds.length; i += BATCH_SIZE) {
          const batch = allTaskIds.slice(i, i + BATCH_SIZE)
          
          try {
            const { data: batchRecords, error: batchError } = await supabase
              .from('task_completion_records')
              .select('*')
              .in('task_id', batch)
              .order('completed_at', { ascending: false })
            
            if (batchError) {
              // Check if it's an empty error object or a known schema/RLS error
              const errorStr = JSON.stringify(batchError).toLowerCase();
              const errorCode = batchError.code || '';
              const errorMessage = (batchError.message || '').toLowerCase();
              const isEmptyError = Object.keys(batchError).length === 0 || errorStr === '{}';
              
              // Check for PostgreSQL schema errors or RLS errors
              const isSchemaError = errorCode === '42703' || // undefined_column
                                   errorCode === '42883' || // undefined_function
                                   errorCode === '42P01' ||  // undefined_table
                                   errorCode === '42501' ||  // insufficient_privilege (RLS)
                                   errorCode === 'PGRST204' || // PostgREST bad request
                                   errorMessage.includes('does not exist') ||
                                   errorMessage.includes('permission denied') ||
                                   errorMessage.includes('row-level security') ||
                                   errorMessage.includes('bad request') ||
                                   errorMessage === 'bad request';
              
              // Silently handle empty error objects and known schema/RLS issues
              // Don't log these errors to avoid console spam
              if (!isEmptyError && !isSchemaError) {
                console.error(`❌ Error fetching completion records (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, batchError)
              }
              
              // Mark that we had an error but continue with other batches
              hasError = true
            } else {
              if (batchRecords) {
                allCompletionRecords = [...allCompletionRecords, ...batchRecords]
              }
            }
          } catch (err: any) {
            // Silently handle errors in batching
            hasError = true
          }
        }
        
        // If we had errors but got some records, continue with what we have
        // If we had errors and no records, set to empty array
        if (hasError && allCompletionRecords.length === 0) {
          allCompletionRecords = []
        }
        
        // Filter by site_id in JavaScript if needed (more permissive)
        let filteredRecords = allCompletionRecords
        if (siteId && allCompletionRecords.length > 0) {
          // Filter by site_id in JS, but also include records with null site_id
          filteredRecords = allCompletionRecords.filter(r => !r.site_id || r.site_id === siteId)
          // console.log('🔍 Filtered by site_id:', {
          //   before: allCompletionRecords.length,
          //   after: filteredRecords.length,
          //   siteId
          // })
        }
        
        if (filteredRecords.length > 0) {
          allCompletionRecords = filteredRecords
          // console.log('📝 Completion records details:', filteredRecords.map(r => ({
          //   id: r.id,
          //   task_id: r.task_id,
          //   completed_at: r.completed_at,
          //   company_id: r.company_id,
          //   site_id: r.site_id,
          //   completed_by: r.completed_by
          // })).slice(0, 3))
        } else {
          allCompletionRecords = []
        }
      } else {
        allCompletionRecords = []
      }
      
      // Build a map of completed dayparts per task
      // Key: task_id, Value: Set of completed dayparts
      // CRITICAL: For multi-daypart tasks, multiple instances share the same task.id
      // so we need to track which specific daypart instances were completed
      const completedDaypartsMap = new Map<string, Set<string>>()
      allCompletionRecords.forEach(record => {
        const taskId = record.task_id
        const completedDaypart = record.completion_data?.completed_daypart
        if (completedDaypart && taskId) {
          if (!completedDaypartsMap.has(taskId)) {
            completedDaypartsMap.set(taskId, new Set())
          }
          const normalizedDaypart = normalizeDaypart(completedDaypart)
          completedDaypartsMap.get(taskId)!.add(normalizedDaypart)
          // console.log('📝 Mapped completion:', {
          //   taskId,
          //   completedDaypart,
          //   normalizedDaypart,
          //   allCompletedDayparts: Array.from(completedDaypartsMap.get(taskId)!)
          // })
        }
      })
      
      // console.log('📊 Completed dayparts map:', {
      //   totalTasks: completedDaypartsMap.size,
      //   details: Array.from(completedDaypartsMap.entries()).map(([taskId, dayparts]) => ({
      //     taskId,
      //     completedDayparts: Array.from(dayparts)
      //   }))
      // })
      
      // Build a set of task IDs that have completion records
      const tasksWithCompletionRecords = new Set(allCompletionRecords.map(r => r.task_id))
      
      // console.log('🔍 Filtering tasks:', {
      //   totalTasks: tasksWithProfiles.length,
      //   completionRecordsFound: allCompletionRecords.length,
      //   tasksWithCompletionRecords: Array.from(tasksWithCompletionRecords),
      //   completedDaypartsMapSize: completedDaypartsMap.size,
      //   sampleTaskChecks: tasksWithProfiles.slice(0, 5).map(t => {
      //     const taskData = t.task_data || {}
      //     const daypartsInData = taskData.dayparts || []
      //     const hasMultipleDayparts = Array.isArray(daypartsInData) && daypartsInData.length > 1
      //     const completedDayparts = completedDaypartsMap.get(t.id)
      //     return { 
      //       id: t.id, 
      //       status: t.status,
      //       daypart: t.daypart,
      //       hasRecord: tasksWithCompletionRecords.has(t.id),
      //       hasMultipleDayparts,
      //       completedDayparts: completedDayparts ? Array.from(completedDayparts) : null,
      //       willBeFiltered: hasMultipleDayparts && completedDayparts && t.daypart 
      //         ? completedDayparts.has(normalizeDaypart(t.daypart))
      //         : tasksWithCompletionRecords.has(t.id)
      //     }
      //   })
      // })
      
      // Filter out completed tasks from active tasks
      // CRITICAL: For multi-daypart tasks, we need to check per-daypart completion
      // For single-daypart tasks, we check if the task itself has a completion record
      let activeTasks = tasksWithProfiles.filter(task => {
        // Check 1: Skip if task status is completed or skipped
        if (task.status === 'completed' || task.status === 'skipped') {
          return false
        }
        
        // Check 2: For multi-daypart tasks, check per-daypart completion
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
              return false
            }
          }
          // If this daypart wasn't completed, show it (even if other dayparts were completed)
          return true
        }
        
        // Check 3: For single-daypart tasks (or tasks without daypart data), 
        // skip if task has ANY completion record
        // This only applies to non-multi-daypart tasks
        if (tasksWithCompletionRecords.has(task.id)) {
          return false
        }
        
        return true
      })
      
      // console.log('✅ Filtered tasks:', {
      //   before: tasksWithProfiles.length,
      //   after: activeTasks.length,
      //   filteredOut: tasksWithProfiles.length - activeTasks.length
      // })
      
      // Create one entry per completion record (not just one per task)
      // This ensures all completion records are shown, even for multi-daypart tasks
      const completedTasksWithRecords = allCompletionRecords
        .map(record => {
          const task = tasksWithProfiles.find(t => t.id === record.task_id)
          if (!task) return null
          
          return {
            ...task,
            completion_record: record
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
      
      // console.log('📋 Tasks Debug:', {
      //   totalTasks: tasksWithProfiles.length,
      //   activeTasks: activeTasks.length,
      //   completedTasks: completedTasksWithRecords.length,
      //   allCompletionRecordsCount: allCompletionRecords.length,
      //   tasksWithCompletionRecordsCount: tasksWithCompletionRecords.size,
      //   taskStatuses: tasksWithProfiles.map(t => ({ 
      //     id: t.id, 
      //     status: t.status, 
      //     daypart: t.daypart, 
      //     due_time: t.due_time,
      //     templateId: t.template_id,
      //     templateName: t.template?.name,
      //     hasCompletionRecord: tasksWithCompletionRecords.has(t.id)
      //   })),
      //   completionRecords: allCompletionRecords.map(r => ({
      //     id: r.id,
      //     task_id: r.task_id,
      //     completed_at: r.completed_at,
      //     completed_daypart: r.completion_data?.completed_daypart
      //   }))
      // })
      
      // console.log('✅ Setting tasks (sorted chronologically):', {
      //   activeTasksCount: activeTasks.length,
      //   completedTasksCount: completedTasksWithRecords.length,
      //   activeTasks: activeTasks.slice(0, 5).map(t => ({ 
      //     id: t.id, 
      //     status: t.status, 
      //     daypart: t.daypart, 
      //     due_time: t.due_time,
      //     name: t.template?.name || 'Unknown'
      //   }))
      // })
      
      setTasks(activeTasks)
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
      // console.log('🔄 Refreshing tasks after clock-in/out')
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
            // console.log('🔄 Manual refresh clicked')
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#D37E91]/15 mb-4">
            <Clock className="w-8 h-8 text-[#D37E91] animate-spin" />
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
                  setSelectedTask(task)
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
                    setSelectedTask(task)
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
            // console.log('🔄 onComplete called - refreshing tasks...')
            setShowCompletion(false)
            setSelectedTask(null)
            // Force a longer delay to ensure database updates have propagated
            // Also force a cache-busting refresh
            await new Promise(resolve => setTimeout(resolve, 2000))
            // console.log('🔄 Calling fetchTodaysTasks after delay...')
            // Force refresh by clearing state first
            setTasks([])
            setCompletedTasks([])
            await fetchTodaysTasks() // Refresh tasks to show completed task
            // console.log('✅ fetchTodaysTasks completed')
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
