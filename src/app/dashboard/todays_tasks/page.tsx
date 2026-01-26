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
  const { siteId, companyId, selectedSiteId } = useAppContext()
  const [breachActions, setBreachActions] = useState<TemperatureBreachAction[]>([])
  const [breachLoading, setBreachLoading] = useState(false)
  // Use ref to store latest fetchTodaysTasks function
  const fetchTodaysTasksRef = useRef<() => Promise<void>>()

  // Format date - use suppressHydrationWarning to prevent mismatch
  // Server and client may format dates slightly differently, but that's OK
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

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
      
      // Get user's home site - "Today's Tasks" should only show tasks from "My Tasks" (home site tasks)
      // NOT tasks directly from templates or active tasks
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Get user profile to find home site
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, app_role, home_site')
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
      
      if (!userProfile) {
        console.warn('⚠️ User profile not found')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Determine which site to filter by
      let filterSiteId: string | null = null;
      
      // Managers/admins: can see all sites or filter by selected site
      const managerRoles = ['manager', 'general_manager', 'admin', 'owner'];
      const isManager = userProfile.app_role && managerRoles.includes(userProfile.app_role.toLowerCase());
      
      if (isManager) {
        // Managers/admins: filter by selectedSiteId from header dropdown if set
        if (selectedSiteId && selectedSiteId !== 'all') {
          filterSiteId = selectedSiteId;
          console.log('🔍 Manager: Filtering tasks by selected site:', filterSiteId);
        } else {
          // Show all company tasks for managers/admins when "All Sites" is selected
          console.log('🔍 Manager: Showing all company tasks (All Sites selected)');
        }
      } else {
        // Staff: always use their home site (same as "My Tasks")
        filterSiteId = userProfile.home_site || null;
        if (!filterSiteId) {
          console.warn('⚠️ Staff member has no home site assigned - no tasks to show');
          setTasks([])
          setCompletedTasks([])
          setLoading(false)
          return
        }
        console.log('🔍 Staff: Filtering tasks by home site:', filterSiteId);
      }
      
      // First, let's check what tasks exist for debugging
      let debugQuery = supabase
        .from('checklist_tasks')
        .select('id, status, due_date, site_id, site_checklist_id, template_id, task_data, custom_name, company_id')
        .eq('company_id', companyId)
        .eq('due_date', todayStr)
      
      if (filterSiteId) {
        debugQuery = debugQuery.eq('site_id', filterSiteId)
      }
      
      const { data: debugTasks } = await debugQuery
      console.log('🔍 DEBUG: All tasks for today (any status):', {
        count: debugTasks?.length || 0,
        tasks: debugTasks?.map(t => ({
          id: t.id,
          status: t.status,
          due_date: t.due_date,
          site_id: t.site_id,
          site_checklist_id: t.site_checklist_id,
          template_id: t.template_id,
          custom_name: t.custom_name,
          task_data_type: t.task_data?.type,
          task_data_source_type: t.task_data?.source_type,
          task_data_source: t.task_data?.source
        })) || []
      })
      
      // Also check for tasks in a wider date range to see if they exist with different dates
      const { data: recentTasks } = await supabase
        .from('checklist_tasks')
        .select('id, status, due_date, site_id, site_checklist_id, template_id, custom_name, task_data, company_id')
        .eq('company_id', companyId)
        .gte('due_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 7 days
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Next 7 days
        .order('due_date', { ascending: true })
        .limit(50)
      
      console.log('🔍 DEBUG: Recent tasks (last 7 days to next 7 days):', {
        count: recentTasks?.length || 0,
        today: todayStr,
        tasks: recentTasks?.map(t => ({
          id: t.id,
          status: t.status,
          due_date: t.due_date,
          site_id: t.site_id,
          site_checklist_id: t.site_checklist_id ? 'YES' : 'NO',
          template_id: t.template_id,
          custom_name: t.custom_name,
          task_data_type: t.task_data?.type,
          task_data_source_type: t.task_data?.source_type,
          task_data_source: t.task_data?.source,
          isToday: t.due_date === todayStr,
          isSelectedSite: t.site_id === filterSiteId
        })) || []
      })
      
      // Show summary of tasks by date
      const tasksByDate = (recentTasks || []).reduce((acc: Record<string, number>, task: any) => {
        const date = task.due_date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📅 Tasks by date:', tasksByDate);
      
      // Show tasks for today specifically (if any)
      const todayTasks = (recentTasks || []).filter((t: any) => t.due_date === todayStr);
      console.log('📋 Tasks specifically for today:', {
        count: todayTasks.length,
        tasks: todayTasks.map((t: any) => ({
          id: t.id,
          status: t.status,
          site_id: t.site_id,
          site_checklist_id: t.site_checklist_id,
          template_id: t.template_id,
          custom_name: t.custom_name,
          task_data: t.task_data
        }))
      });
      
      // Show tasks for the selected site (any date)
      const siteTasks = (recentTasks || []).filter((t: any) => t.site_id === filterSiteId);
      console.log('🏢 Tasks for selected site (any date):', {
        count: siteTasks.length,
        site_id: filterSiteId,
        tasks: siteTasks.map((t: any) => ({
          id: t.id,
          status: t.status,
          due_date: t.due_date,
          site_checklist_id: t.site_checklist_id ? 'YES' : 'NO',
          template_id: t.template_id,
          custom_name: t.custom_name,
          task_data_type: t.task_data?.type,
          task_data_source_type: t.task_data?.source_type,
          task_data_source: t.task_data?.source,
          generated_at: t.generated_at
        }))
      });
      
      console.log('⚠️ ISSUE DETECTED: All tasks are from 2026-01-20, not today (2026-01-25). The cron job may not have run since then, or is creating tasks with the wrong date.');
      
      // Fetch today's tasks including completed ones (needed to match with completion records)
      // These are task instances from "My Tasks", NOT templates or active tasks
      // Completed tasks will be filtered out from active list but used for completion record matching
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        // CRITICAL: Filter by company_id first
        .eq('company_id', companyId)
        // Include pending, in_progress, AND completed tasks (completed needed for completion record matching)
        .in('status', ['pending', 'in_progress', 'completed', 'missed'])
        // Only show tasks due TODAY
        .eq('due_date', todayStr)
      
      // Apply site filtering (home site for staff, selected site for managers)
      if (filterSiteId) {
        query = query.eq('site_id', filterSiteId)
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
          due_date: t.due_date,
          site_checklist_id: t.site_checklist_id,
          template_id: t.template_id,
          task_data: t.task_data,
          site_id: t.site_id
        }))
      })
      
      // Role-based task type filtering
      // CRITICAL: Only show tasks from "My Tasks" (site_checklists), NOT directly from templates
      // Templates should never appear in "Today's Tasks" - only task instances from site_checklists
      let filteredTasks = allTasks || [];
      
      if (isManager) {
        // Managers+: Template tasks + Expiry tasks + Monitoring tasks
        // Template tasks MUST have site_checklist_id (from "My Tasks" configurations)
        // Expiry tasks have source_type in (sop_review, ra_review, certificate_expiry, policy_expiry, document_expiry)
        // Monitoring tasks have flag_reason = 'monitoring'
        // Note: Approval tasks (stock counts, rotas, payroll) don't appear here - they go to calendar/msgly
        
        filteredTasks = (allTasks || []).filter((task: any) => {
          // PRIORITY 1: Include monitoring tasks FIRST (they may have template_id but no site_checklist_id)
          // Monitoring tasks are special - they're created from out-of-range temperatures and should always appear
          if (task.flag_reason === 'monitoring') {
            console.log('✅ Including monitoring task:', task.id, task.custom_name);
            return true;
          }
          
          // PRIORITY 2: Include expiry tasks (they may also have template_id but no site_checklist_id)
          const sourceType = task.task_data?.source_type || task.task_data?.type;
          const expiryTypes = ['sop_review', 'ra_review', 'certificate_expiry', 'policy_expiry', 'document_expiry', 'training_certificate'];
          if (expiryTypes.includes(sourceType)) {
            console.log('✅ Including expiry task:', task.id, sourceType, task.custom_name);
            return true;
          }
          
          // PRIORITY 3: CRITICAL: Exclude tasks that have template_id but no site_checklist_id
          // These are templates that were incorrectly created as tasks
          // BUT: Only exclude if they're NOT monitoring or expiry tasks (already handled above)
          if (task.template_id && !task.site_checklist_id) {
            console.log('❌ Excluding template without site_checklist_id (should not appear in Today\'s Tasks):', {
              id: task.id,
              custom_name: task.custom_name,
              template_id: task.template_id,
              site_checklist_id: task.site_checklist_id
            });
            return false;
          }
          
          // PRIORITY 4: Include template tasks (have site_checklist_id - from "My Tasks")
          if (task.site_checklist_id) {
            console.log('✅ Including template task from "My Tasks":', task.id, task.custom_name || task.template?.name);
            return true;
          }
          
          // Log excluded tasks for debugging
          if (task.task_data) {
            console.log('❌ Excluding task (not template, monitoring, or expiry):', {
              id: task.id,
              custom_name: task.custom_name,
              flag_reason: task.flag_reason,
              source_type: task.task_data?.source_type,
              type: task.task_data?.type,
              task_data: task.task_data
            });
          }
          
          // Exclude everything else (approval tasks, etc.)
          return false;
        });
        
        console.log(`Manager view: ${filteredTasks.length} template + monitoring + expiry tasks (filtered from ${allTasks?.length || 0} total)`);
      } else {
        // Staff: Template tasks (have site_checklist_id - from "My Tasks") + Monitoring tasks
        filteredTasks = (allTasks || []).filter((task: any) => {
          // PRIORITY 1: Include monitoring tasks FIRST (they may have template_id but no site_checklist_id)
          // Monitoring tasks are special - they're created from out-of-range temperatures and should always appear
          if (task.flag_reason === 'monitoring') {
            console.log('✅ Including monitoring task for staff:', task.id, task.custom_name);
            return true;
          }
          
          // PRIORITY 2: CRITICAL: Exclude tasks that have template_id but no site_checklist_id
          // These are templates that were incorrectly created as tasks
          // BUT: Only exclude if they're NOT monitoring tasks (already handled above)
          if (task.template_id && !task.site_checklist_id) {
            console.log('❌ Excluding template without site_checklist_id (should not appear in Today\'s Tasks):', {
              id: task.id,
              custom_name: task.custom_name,
              template_id: task.template_id,
              site_checklist_id: task.site_checklist_id
            });
            return false;
          }
          
          // PRIORITY 3: Include template tasks (have site_checklist_id - from "My Tasks")
          if (task.site_checklist_id !== null) {
            return true;
          }
          return false;
        });
        console.log(`Staff view: ${filteredTasks.length} template + monitoring tasks (filtered from ${allTasks?.length || 0} total)`);
      }
      
      // Fetch templates separately if we have tasks
      // CRITICAL: Load ALL required fields needed by TaskCompletionModal
      // This includes: evidence_types, asset_id, repeatable_field_name, instructions, etc.
      let templatesMap: Record<string, any> = {}
      if (filteredTasks && filteredTasks.length > 0) {
        const templateIds = [...new Set(filteredTasks.map((t: any) => t.template_id).filter(Boolean))]
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
      
      // Filter tasks - only show tasks due TODAY
      // Database query already filters by due_date = today, but double-check here
      // Use filteredTasks (already filtered by role) instead of allTasks
      const data = (filteredTasks || []).filter((task: any) => {
        // CRITICAL: Only show tasks due TODAY (database should already filter, but verify)
        if (task.due_date !== todayStr) {
          console.log(`❌ Task ${task.id} filtered: due_date ${task.due_date} !== today ${todayStr}`)
          return false
        }
        
        // Exclude callout_followup tasks - they're shown in the upcoming section
        if (task.flag_reason === 'callout_followup') {
          return false
        }
        
        // No timing filter - show all tasks from "My Tasks" that are due today
        // "Today's Tasks" is simply "My Tasks" filtered by due_date = today
        return true
      })
      
      if (!data || data.length === 0) {
        console.log('⚠️ No tasks found for today after filtering', {
          todayStr,
          filteredTasksCount: filteredTasks?.length || 0,
          allTasksCount: allTasks?.length || 0,
          filterSiteId,
          isManager,
          sampleTask: allTasks?.[0] ? {
            id: allTasks[0].id,
            status: allTasks[0].status,
            due_date: allTasks[0].due_date,
            site_checklist_id: allTasks[0].site_checklist_id,
            task_data_source_type: allTasks[0].task_data?.source_type,
            site_id: allTasks[0].site_id
          } : null
        })
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      console.log('✅ Tasks after date filtering:', {
        count: data.length,
        tasks: data.map(t => ({
          id: t.id,
          name: t.custom_name || t.template?.name,
          status: t.status,
          due_date: t.due_date,
          site_checklist_id: t.site_checklist_id,
          task_data_source_type: t.task_data?.source_type
        }))
      })
      
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
      console.log('🔍 Checking for archived assets in tasks...')
      const assetIdsFromTemplates = [...new Set(
        Object.values(templatesMap)
          .map((t: any) => t.asset_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )]
      
      // Extract asset IDs from task_data - handle multiple formats:
      // 1. Direct asset_id (for PPM tasks, etc.)
      // 2. From ppm_id (look up asset from ppm_schedule)
      // 3. From callout_id (look up asset from callouts)
      const assetIdsFromTaskData = new Set<string>()
      const ppmIdsToLookup = new Set<string>()
      const calloutIdsToLookup = new Set<string>()
      
      data.forEach((task: any) => {
        const taskData = task.task_data || {}
        
        // Helper to safely extract string ID from potentially object value
        const extractId = (value: any): string | null => {
          if (!value) return null
          if (typeof value === 'string') return value
          if (typeof value === 'object' && value.id) return String(value.id)
          return String(value)
        }
        
        // Direct asset_id (if present)
        const assetId = extractId(taskData.asset_id)
        if (assetId) {
          assetIdsFromTaskData.add(assetId)
        }
        
        // PPM overdue tasks: source_id IS the asset_id directly
        // (From TaskCompletionModal: "PPM tasks use source_id (not asset_id) - this is the asset ID")
        const ppmSourceId = extractId(taskData.source_id)
        if (taskData.source_type === 'ppm_overdue' && ppmSourceId) {
          assetIdsFromTaskData.add(ppmSourceId)
        }
        
        // PPM service tasks (from cron job): look up asset from ppm_schedule using ppm_id
        if (taskData.source_type === 'ppm_service') {
          const ppmId = extractId(taskData.ppm_id)
          if (ppmId) {
            ppmIdsToLookup.add(ppmId)
          }
          if (ppmSourceId) {
            ppmIdsToLookup.add(ppmSourceId)
          }
        }
        
        // Callout follow-up tasks: source_id is the callout_id, need to look up asset from callouts
        if (taskData.source_type === 'callout_followup' && ppmSourceId) {
          calloutIdsToLookup.add(ppmSourceId)
        }
        
        // Also check for direct callout_id (if present)
        const calloutId = extractId(taskData.callout_id)
        if (calloutId) {
          calloutIdsToLookup.add(calloutId)
        }
      })
      
      // Log detailed task_data for PPM and callout tasks
      const ppmTasks = data.filter((t: any) => t.task_data?.source_type === 'ppm_service' || t.custom_name?.includes('PPM Required'))
      const calloutTasks = data.filter((t: any) => t.task_data?.callout_id || t.custom_name?.includes('Follow up'))
      
      console.log('📋 Asset IDs found (initial):', {
        fromTemplates: assetIdsFromTemplates.length,
        fromTaskDataDirect: assetIdsFromTaskData.size,
        ppmIdsToLookup: ppmIdsToLookup.size,
        calloutIdsToLookup: calloutIdsToLookup.size,
        ppmTasksCount: ppmTasks.length,
        calloutTasksCount: calloutTasks.length,
        samplePPMTasks: ppmTasks.slice(0, 2).map((t: any) => ({
          id: t.id,
          name: t.custom_name,
          source_type: t.task_data?.source_type,
          task_data_asset_id: t.task_data?.asset_id,
          task_data_ppm_id: t.task_data?.ppm_id,
          full_task_data: JSON.stringify(t.task_data, null, 2)
        })),
        sampleCalloutTasks: calloutTasks.slice(0, 2).map((t: any) => ({
          id: t.id,
          name: t.custom_name,
          task_data_callout_id: t.task_data?.callout_id,
          full_task_data: JSON.stringify(t.task_data, null, 2)
        })),
        allTaskDataKeys: [...new Set(data.flatMap((t: any) => Object.keys(t.task_data || {})))]
      })
      
      // Look up asset_ids from ppm_schedule for PPM tasks
      if (ppmIdsToLookup.size > 0) {
        console.log(`🔍 Looking up ${ppmIdsToLookup.size} PPM schedules to find asset_ids...`)
        const { data: ppmSchedules, error: ppmError } = await supabase
          .from('ppm_schedule')
          .select('id, asset_id')
          .in('id', Array.from(ppmIdsToLookup))
        
        if (ppmError) {
          console.error('❌ Error fetching PPM schedules:', ppmError)
        } else if (ppmSchedules) {
          ppmSchedules.forEach((ppm: any) => {
            if (ppm.asset_id) {
              assetIdsFromTaskData.add(ppm.asset_id)
              console.log(`✅ Found asset_id ${ppm.asset_id} for PPM ${ppm.id}`)
            }
          })
        }
      }
      
      // Look up asset_ids from callouts for callout follow-up tasks
      // Also create a mapping of callout_id -> asset_id for filtering (needed for filter step)
      const calloutToAssetMap = new Map<string, string>()
      
      if (calloutIdsToLookup.size > 0) {
        console.log(`🔍 Looking up ${calloutIdsToLookup.size} callouts to find asset_ids...`)
        const { data: callouts, error: calloutError } = await supabase
          .from('callouts')
          .select('id, asset_id')
          .in('id', Array.from(calloutIdsToLookup))
        
        if (calloutError) {
          console.error('❌ Error fetching callouts:', calloutError)
        } else if (callouts) {
          callouts.forEach((callout: any) => {
            if (callout.asset_id) {
              assetIdsFromTaskData.add(callout.asset_id)
              calloutToAssetMap.set(callout.id, callout.asset_id)
              console.log(`✅ Found asset_id ${callout.asset_id} for callout ${callout.id}`)
            }
          })
        }
      }
      
      const allAssetIdsFromTaskData = Array.from(assetIdsFromTaskData)
      
      console.log('📋 Asset IDs found (after lookups):', {
        fromTemplates: assetIdsFromTemplates.length,
        fromTaskData: allAssetIdsFromTaskData.length,
        templateIds: assetIdsFromTemplates,
        taskDataIds: allAssetIdsFromTaskData
      })
      
      // Combine all asset IDs and ensure they're all strings (not objects)
      const allAssetIds = [...new Set([
        ...assetIdsFromTemplates.map(id => typeof id === 'string' ? id : String(id)),
        ...allAssetIdsFromTaskData.map(id => typeof id === 'string' ? id : String(id))
      ])].filter(id => id && id !== 'null' && id !== 'undefined' && id !== '[object Object]')
      
      // Fetch assets to check archived status
      let archivedAssetIds = new Set<string>()
      if (allAssetIds.length > 0) {
        console.log(`🔍 Fetching ${allAssetIds.length} assets to check archived status...`, { assetIds: allAssetIds })
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('id, archived, name')
          .in('id', allAssetIds)
        
        if (assetsError) {
          console.error('❌ Error fetching assets for archived check:', assetsError)
        } else if (assets) {
          console.log(`✅ Fetched ${assets.length} assets for archived check`)
          // Build set of archived asset IDs
          assets.forEach(asset => {
            if (asset.archived) {
              archivedAssetIds.add(asset.id)
              console.log(`🏷️ Asset "${asset.name}" (${asset.id}) is archived - will exclude related tasks`)
            }
          })
          console.log(`📊 Archived assets found: ${archivedAssetIds.size} out of ${assets.length} total`)
        } else {
          console.warn('⚠️ No assets returned from query (might be RLS issue)')
        }
      } else {
        console.log('ℹ️ No asset IDs found in tasks - skipping archived asset check')
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
      console.log('🔍 Starting task filtering with archived assets:', {
        archivedAssetIdsCount: archivedAssetIds.size,
        archivedAssetIds: Array.from(archivedAssetIds),
        calloutToAssetMapSize: calloutToAssetMap.size,
        calloutToAssetMapEntries: Array.from(calloutToAssetMap.entries())
      })
      
      const validTasks = tasksWithTemplates.filter(task => {
        if (task.template_id && !task.template) {
          console.warn(`⚠️ Task has template_id but template not found: task_id=${task.id}, template_id=${task.template_id}`);
          // Temporarily include orphaned tasks so we can see them and diagnose the issue
          // TODO: Once templates are loading correctly, change this back to `return false`
          return true; // Include orphaned tasks for now
        }
        
        // Exclude tasks linked to archived assets (check multiple sources)
        // 1. Template asset_id
        if (task.template?.asset_id && archivedAssetIds.has(task.template.asset_id)) {
          console.log(`🚫 Task ${task.id} (${task.custom_name}) filtered: linked to archived asset ${task.template.asset_id} (from template)`)
          return false
        }
        
        // 2. task_data.asset_id (direct asset reference)
        if (task.task_data?.asset_id && archivedAssetIds.has(task.task_data.asset_id)) {
          console.log(`🚫 Task ${task.id} (${task.custom_name}) filtered: linked to archived asset ${task.task_data.asset_id} (from task_data.asset_id)`)
          return false
        }
        
        // 3. task_data.source_id for PPM overdue tasks (source_id IS the asset_id for ppm_overdue)
        if (task.task_data?.source_type === 'ppm_overdue' && task.task_data?.source_id) {
          const isArchived = archivedAssetIds.has(task.task_data.source_id)
          console.log(`🔍 Checking PPM overdue task ${task.id}: source_id=${task.task_data.source_id}, isArchived=${isArchived}, archivedAssetIds has it: ${archivedAssetIds.has(task.task_data.source_id)}`)
          if (isArchived) {
            console.log(`🚫 Task ${task.id} (${task.custom_name}) filtered: linked to archived asset ${task.task_data.source_id} (from task_data.source_id for ppm_overdue)`)
            return false
          }
        }
        
        // 4. For callout follow-up tasks, check if the callout's asset is archived
        // Use the calloutToAssetMap to get the asset_id from the callout_id (source_id)
        if (task.task_data?.source_type === 'callout_followup' && task.task_data?.source_id) {
          const calloutAssetId = calloutToAssetMap.get(task.task_data.source_id)
          if (calloutAssetId) {
            const isArchived = archivedAssetIds.has(calloutAssetId)
            console.log(`🔍 Checking callout task ${task.id}: callout_id=${task.task_data.source_id}, asset_id=${calloutAssetId}, isArchived=${isArchived}`)
            if (isArchived) {
              console.log(`🚫 Task ${task.id} (${task.custom_name}) filtered: linked to archived asset ${calloutAssetId} (from callout ${task.task_data.source_id})`)
              return false
            }
          }
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
              _expandedKey: `${task.id}_${normalizedDaypart}_${index}`
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
        completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) : null
      }))
      
      // CRITICAL: For tasks with multiple dayparts, we need to check completion per instance
      // Fetch ALL completion records (not just for completed tasks) to check per-daypart completion
      // ALSO: Fetch completion records for tasks that might not be in tasksWithProfiles (e.g., completed tasks from different dates)
      const allTaskIds = tasksWithProfiles.map(t => t.id)
      let allCompletionRecords: any[] = []
      
      // Also fetch completion records for today's date even if task isn't in tasksWithProfiles
      // This ensures we can display completed tasks with their completion records
      let todayCompletionQuery = supabase
        .from('task_completion_records')
        .select('*')
        .eq('company_id', companyId)
        .gte('completed_at', `${todayStr}T00:00:00`)
        .lt('completed_at', `${todayStr}T23:59:59`)
        .order('completed_at', { ascending: false })
      
      if (filterSiteId) {
        todayCompletionQuery = todayCompletionQuery.eq('site_id', filterSiteId)
      }
      
      const { data: todayCompletionRecords } = await todayCompletionQuery
      if (todayCompletionRecords && todayCompletionRecords.length > 0) {
        console.log('📝 Found completion records for today:', todayCompletionRecords.length, todayCompletionRecords.map(r => ({ task_id: r.task_id, completed_at: r.completed_at })))
        // Add these to allCompletionRecords immediately (they're for today, so we want them)
        allCompletionRecords.push(...todayCompletionRecords)
        
        // Also add task IDs to fetch tasks if they're not in tasksWithProfiles
        const existingTaskIds = new Set(allTaskIds)
        todayCompletionRecords.forEach(record => {
          if (!existingTaskIds.has(record.task_id)) {
            // Task not in tasksWithProfiles - fetch it separately
            allTaskIds.push(record.task_id)
            existingTaskIds.add(record.task_id)
            console.log('📥 Will fetch missing task:', record.task_id)
          }
        })
      }
      
      if (allTaskIds.length > 0) {
        console.log('🔍 Fetching completion records for task IDs:', allTaskIds.slice(0, 5), '... (total:', allTaskIds.length, ')', 'siteId:', siteId)
        
        // Try fetching WITHOUT site_id filter first to see if that's the issue
        let completionQuery = supabase
          .from('task_completion_records')
          .select('*')
          .in('task_id', allTaskIds)
          .order('completed_at', { ascending: false })
        
        // Filter by site_id if available (matches how we filter tasks)
        // BUT: Also try without site_id filter if we get no results, in case site_id doesn't match
        const { data: completionRecords, error: completionError } = await completionQuery
        
        if (completionError) {
          console.error('❌ Error fetching completion records:', completionError)
          console.error('Error details:', JSON.stringify(completionError, null, 2))
        } else {
          console.log('✅ Fetched completion records:', completionRecords?.length || 0)
          
          // Filter by site_id in JavaScript if needed (more permissive)
          let filteredRecords = completionRecords || []
          if (siteId && completionRecords) {
            // Filter by site_id in JS, but also include records with null site_id
            filteredRecords = completionRecords.filter(r => !r.site_id || r.site_id === siteId)
            console.log('🔍 Filtered by site_id:', {
              before: completionRecords.length,
              after: filteredRecords.length,
              siteId
            })
          }
          
          if (filteredRecords.length > 0) {
            // Merge with today's completion records (deduplicate by id)
            const existingRecordIds = new Set(allCompletionRecords.map(r => r.id))
            filteredRecords.forEach(record => {
              if (!existingRecordIds.has(record.id)) {
                allCompletionRecords.push(record)
                existingRecordIds.add(record.id)
              }
            })
            console.log('📝 Completion records details (merged):', allCompletionRecords.map(r => ({
              id: r.id,
              task_id: r.task_id,
              completed_at: r.completed_at,
              company_id: r.company_id,
              site_id: r.site_id,
              completed_by: r.completed_by
            })))
          } else {
            // This is normal for pending tasks - only log if we expected records but they were filtered out
            if (completionRecords && completionRecords.length > 0) {
              console.warn('⚠️ Records exist but were filtered out:', completionRecords.map(r => ({
                task_id: r.task_id,
                site_id: r.site_id,
                expected_site_id: siteId
              })))
            }
          }
        }
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
          console.log('📝 Mapped completion:', {
            taskId,
            completedDaypart,
            normalizedDaypart,
            allCompletedDayparts: Array.from(completedDaypartsMap.get(taskId)!)
          })
        }
      })
      
      console.log('📊 Completed dayparts map:', {
        totalTasks: completedDaypartsMap.size,
        details: Array.from(completedDaypartsMap.entries()).map(([taskId, dayparts]) => ({
          taskId,
          completedDayparts: Array.from(dayparts)
        }))
      })
      
      // Build a set of task IDs that have completion records
      const tasksWithCompletionRecords = new Set(allCompletionRecords.map(r => r.task_id))
      
      console.log('🔍 Filtering tasks:', {
        totalTasks: tasksWithProfiles.length,
        completionRecordsFound: allCompletionRecords.length,
        tasksWithCompletionRecords: Array.from(tasksWithCompletionRecords),
        completedDaypartsMapSize: completedDaypartsMap.size,
        sampleTaskChecks: tasksWithProfiles.slice(0, 5).map(t => {
          const taskData = t.task_data || {}
          const daypartsInData = taskData.dayparts || []
          const hasMultipleDayparts = Array.isArray(daypartsInData) && daypartsInData.length > 1
          const completedDayparts = completedDaypartsMap.get(t.id)
          return { 
            id: t.id, 
            status: t.status,
            daypart: t.daypart,
            hasRecord: tasksWithCompletionRecords.has(t.id),
            hasMultipleDayparts,
            completedDayparts: completedDayparts ? Array.from(completedDayparts) : null,
            willBeFiltered: hasMultipleDayparts && completedDayparts && t.daypart 
              ? completedDayparts.has(normalizeDaypart(t.daypart))
              : tasksWithCompletionRecords.has(t.id)
          }
        })
      })
      
      // Filter out completed tasks from active tasks
      // CRITICAL: For multi-daypart tasks, we need to check per-daypart completion
      // For single-daypart tasks, we check if the task itself has a completion record
      let activeTasks = tasksWithProfiles.filter(task => {
        // Check 1: Skip if task status is completed, missed, or skipped
        if (task.status === 'completed' || task.status === 'missed' || task.status === 'skipped') {
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
      
      console.log('✅ Filtered tasks:', {
        before: tasksWithProfiles.length,
        after: activeTasks.length,
        filteredOut: tasksWithProfiles.length - activeTasks.length
      })
      
      // Create one entry per completion record (not just one per task)
      // This ensures all completion records are shown, even for multi-daypart tasks
      // CRITICAL: If task isn't in tasksWithProfiles, fetch it separately
      const completedTasksWithRecords: any[] = []
      const tasksToFetch: string[] = []
      
      for (const record of allCompletionRecords) {
        let task = tasksWithProfiles.find(t => t.id === record.task_id)
        
        if (!task) {
          // Task not in tasksWithProfiles - need to fetch it
          tasksToFetch.push(record.task_id)
        } else {
          // Task found - add it with completion record
          completedTasksWithRecords.push({
            ...task,
            completion_record: record
          })
        }
      }
      
      // Fetch missing tasks if any
      if (tasksToFetch.length > 0) {
        console.log('📥 Fetching missing tasks for completion records:', tasksToFetch.length, tasksToFetch)
        const { data: missingTasks } = await supabase
          .from('checklist_tasks')
          .select('*, template: task_templates(*)')
          .in('id', tasksToFetch)
        
        if (missingTasks) {
          // Get templates for missing tasks
          const missingTemplateIds = missingTasks.map(t => t.template_id).filter(Boolean)
          const templatesMap = new Map()
          if (missingTemplateIds.length > 0) {
            const { data: templates } = await supabase
              .from('task_templates')
              .select('*')
              .in('id', missingTemplateIds)
            
            if (templates) {
              templates.forEach(t => templatesMap.set(t.id, t))
            }
          }
          
          // Match missing tasks with their completion records
          missingTasks.forEach(task => {
            const record = allCompletionRecords.find(r => r.task_id === task.id)
            if (record) {
              completedTasksWithRecords.push({
                ...task,
                template: templatesMap.get(task.template_id) || null,
                completion_record: record
              })
            }
          })
        }
      }
      
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
      
      console.log('✅ Setting tasks (sorted chronologically):', {
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasksWithRecords.length,
        activeTasks: activeTasks.slice(0, 5).map(t => ({ 
          id: t.id, 
          status: t.status, 
          daypart: t.daypart, 
          due_time: t.due_time,
          name: t.template?.name || 'Unknown'
        }))
      })
      
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
    // Note: loadBreachActions is called at the end but doesn't need to be in dependencies
    // since it's just a side effect, not used in the logic
     
  }, [companyId, siteId]) // Dependencies for fetchTodaysTasks

  // Update ref whenever fetchTodaysTasks changes
  useEffect(() => {
    fetchTodaysTasksRef.current = fetchTodaysTasks
  }, [fetchTodaysTasks])

  // Now define the useEffect that uses these functions
  // CRITICAL: Don't include the callback functions in dependencies to avoid infinite loops
  // The callbacks already have their own dependencies (companyId, siteId) which will trigger re-creation
  // We only need to depend on the actual values that should trigger a refresh
  useEffect(() => {
    if (companyId) {
      fetchTodaysTasks()
      fetchUpcomingTasks()
      loadBreachActions()
    } else {
      setLoading(false)
      setTasks([])
    }
     
  }, [siteId, companyId]) // Only depend on the actual values, not the callback functions

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
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-2">
          Today's Tasks
        </h1>
        <p className="text-[rgb(var(--text-secondary))] dark:text-neutral-400 text-sm sm:text-base" suppressHydrationWarning>
          {currentDate}
        </p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 Manual refresh clicked')
            fetchTodaysTasks()
            fetchUpcomingTasks()
          }}
          className="px-4 py-2 bg-[#EC4899]/10 dark:bg-magenta-500/20 hover:bg-[#EC4899]/20 dark:hover:bg-magenta-500/30 border border-[#EC4899]/50 dark:border-magenta-500/50 text-[#EC4899] dark:text-magenta-400 rounded-lg transition-colors text-sm"
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
                  ? 'bg-orange-500/10 border-orange-500/50 text-orange-600 dark:text-orange-400'
                  : 'bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]'
              }`}
            >
              <Calendar className={`h-4 w-4 ${showUpcoming ? 'text-orange-600 dark:text-orange-400' : 'text-[rgb(var(--text-tertiary))] dark:text-white/60'}`} />
              {showUpcoming ? 'Hide' : 'Show'} Upcoming
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                showUpcoming 
                  ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300' 
                  : 'bg-[rgb(var(--surface-elevated))] dark:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/80'
              }`}>
                {upcomingTasks.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
              showCompleted
                ? 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400'
                : 'bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border-[rgb(var(--border))] dark:border-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]'
            } ${completedTasks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={completedTasks.length === 0}
          >
            <CheckCircle2 className={`h-4 w-4 ${showCompleted ? 'text-green-600 dark:text-green-400' : 'text-[rgb(var(--text-tertiary))] dark:text-white/60'}`} />
            {showCompleted ? 'Hide' : 'Show'} Completed
            {completedTasks.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                showCompleted 
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300' 
                  : 'bg-[rgb(var(--surface-elevated))] dark:bg-white/10 text-[rgb(var(--text-secondary))] dark:text-white/80'
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#EC4899]/10 dark:bg-pink-500/10 mb-4">
            <Clock className="w-8 h-8 text-[#EC4899] dark:text-pink-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">Loading tasks...</h3>
        </div>
      ) : tasks.length === 0 && completedTasks.length > 0 ? (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-3">All done for now! 🎉</h2>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-lg mb-4">
              You've completed all your tasks for today.
            </p>
            <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
              Check back later for new tasks or create a template to add more.
            </p>
          </div>
        </div>
      ) : tasks.length === 0 && completedTasks.length === 0 ? (
        <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6">
              <Calendar className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-3">No tasks for today</h2>
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-lg mb-4">
              There are no tasks scheduled for today.
            </p>
            <p className="text-[rgb(var(--text-tertiary))] dark:text-white/40 text-sm">
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
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-4">Upcoming Callout Follow-ups</h2>
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
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-4">Completed Tasks</h2>
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
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-4">Temperature Breach Follow-ups</h2>
          <div className="space-y-3">
            {breachActions.map((action) => {
              const log = action.temperature_log
              const evaluation = log?.meta?.evaluation
              return (
                <div key={action.id} className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/10 rounded-lg p-3 text-sm text-[rgb(var(--text-secondary))] dark:text-white/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                      {action.action_type === 'monitor' ? 'Monitor temperature' : 'Callout contractor'}
                    </div>
                    <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/50">
                      Created {new Date(action.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/60 space-x-3">
                    <span>Status: <span className="text-[rgb(var(--text-primary))] dark:text-white/80">{action.status}</span></span>
                    {action.due_at && (
                      <span>Due: <span className="text-[rgb(var(--text-primary))] dark:text-white/80">{new Date(action.due_at).toLocaleString()}</span></span>
                    )}
                    {log?.recorded_at && (
                      <span>Reading taken: <span className="text-[rgb(var(--text-primary))] dark:text-white/80">{new Date(log.recorded_at).toLocaleString()}</span></span>
                    )}
                  </div>
                  {evaluation?.reason && (
                    <p className="mt-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">Reason: {evaluation.reason}</p>
                  )}
                  {action.notes && (
                    <p className="mt-2 text-xs text-[rgb(var(--text-secondary))] dark:text-white/60">Notes: {action.notes}</p>
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
