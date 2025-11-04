'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import TaskCompletionModal from '@/components/checklists/TaskCompletionModal'
import TaskCard from '@/components/checklists/TaskCard'
import CompletedTaskCard from '@/components/checklists/CompletedTaskCard'
import { useAppContext } from '@/context/AppContext'
import { calculateTaskTiming } from '@/utils/taskTiming'
import { DAYPARTS } from '@/types/constants'

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
  const { siteId } = useAppContext()

  useEffect(() => {
    fetchTodaysTasks()
    fetchUpcomingTasks()
  }, [siteId])

  async function fetchUpcomingTasks() {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch tasks for next 7 days
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekDate = nextWeek.toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('*')
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
  }

  async function fetchTodaysTasks() {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      console.log('🔍 Fetching tasks for:', { today, siteId })
      
      // Today's Tasks are filtered from Active Tasks by:
      // 1. due_date matches today
      // 2. site_id matches (if set)
      // 3. Exclude callout_followup tasks (shown separately)
      // 4. Exclude completed tasks from the main list (they go to Completed section)
      let query = supabase
        .from('checklist_tasks')
        .select('*')
        .eq('due_date', today)
        // Don't filter by status here - we'll filter completed tasks in display
      
      // Filter by site_id if available
      if (siteId) {
        query = query.eq('site_id', siteId)
      }
      
      const { data: allTasks, error } = await query
        .order('due_time', { ascending: true })
        .order('daypart', { ascending: true })
      
      console.log('📥 Raw tasks from database:', {
        total: allTasks?.length || 0,
        tasks: allTasks?.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, flag_reason: t.flag_reason }))
      })
      
      // Filter out callout_followup tasks - they're shown in the upcoming section
      const data = allTasks?.filter(task => task.flag_reason !== 'callout_followup') || []

      if (error) {
        console.error('❌ Supabase query error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No tasks found for today')
        setTasks([])
        setCompletedTasks([])
        setLoading(false)
        return
      }
      
      // Load templates manually (only for tasks that have template_id)
      if (data && data.length > 0) {
        const templateIds = [...new Set(data.map(t => t.template_id).filter((id): id is string => id !== null))]
        let templatesMap = new Map()
        
        if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('task_templates')
          .select('id, name, description, category, frequency, compliance_standard, is_critical, evidence_types, repeatable_field_name, instructions, dayparts')
          .in('id', templateIds)
        
        if (templates) {
            templatesMap = new Map(templates.map(t => [t.id, t]))
          }
        }
        
          const tasksWithTemplates = data.map(task => ({
            ...task,
            template: task.template_id ? templatesMap.get(task.template_id) : null
          }))
          
          console.log('📦 Tasks with templates:', {
            count: tasksWithTemplates.length,
            tasks: tasksWithTemplates.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, template_id: t.template_id }))
          })
        
        // CRITICAL: Handle tasks with multiple dayparts
        // IMPORTANT: The cron job already creates separate task records for each daypart.
        // So if a task has a daypart field set, it's already a single instance - don't expand it.
        // Only expand if the task has NO daypart but has multiple dayparts in task_data or template.
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
        
        tasksWithTemplates.forEach(task => {
          // If task already has a daypart set, it's already a separate instance from cron generation
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
          tasks: expandedTasks.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, template_id: t.template_id }))
        })
        
        // Deduplicate: Use task ID as the unique key (since each task should have a unique ID)
        // Only filter out if we have the exact same task ID appearing multiple times
        // This prevents true duplicates while preserving separate task instances
        const seen = new Map<string, ChecklistTaskWithTemplate>()
        const deduplicatedTasks = expandedTasks.filter(task => {
          // Use task ID as the key - each task should have a unique ID
          const key = task.id
          if (seen.has(key)) {
            // Already seen this exact task ID - skip it (true duplicate)
            console.log('⚠️ Duplicate task ID filtered:', { key, taskId: task.id, status: task.status })
            return false
          }
          seen.set(key, task)
          return true
        })
        
        console.log('🔄 After deduplication:', {
          count: deduplicatedTasks.length,
          tasks: deduplicatedTasks.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, template_id: t.template_id }))
        })
        
        // Sort deduplicated tasks chronologically by daypart
        deduplicatedTasks.sort((a, b) => {
          const orderA = getDaypartSortOrder(a.daypart)
          const orderB = getDaypartSortOrder(b.daypart)
          
          // If same daypart order, sort by due_time
          if (orderA === orderB) {
            const timeA = a.due_time || '23:59'
            const timeB = b.due_time || '23:59'
            return timeA.localeCompare(timeB)
          }
          
          return orderA - orderB
        })
        
        // Use deduplicated tasks for the rest of the logic
        expandedTasks = deduplicatedTasks
        
        // Load profiles for completed tasks
        const completedByUserIds = expandedTasks
          .filter(t => t.status === 'completed' && t.completed_by)
          .map(t => t.completed_by)
          .filter((id): id is string => id !== null)
        
        let profilesMap = new Map()
        if (completedByUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', [...new Set(completedByUserIds)])
          
          if (profiles) {
            profilesMap = new Map(profiles.map(p => [p.id, p]))
          }
        }
        
        const tasksWithProfiles = expandedTasks.map(task => ({
          ...task,
          completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) : null
        }))
        
        // Fetch completion records for completed tasks
        const completedTasksList = tasksWithProfiles.filter(t => t.status === 'completed')
        const completedTaskIds = completedTasksList.map(t => t.id)
        
        let completionRecordsMap = new Map()
        if (completedTaskIds.length > 0) {
          const { data: completionRecords } = await supabase
            .from('task_completion_records')
            .select('*')
            .in('task_id', completedTaskIds)
          
          if (completionRecords) {
            completionRecordsMap = new Map(completionRecords.map(r => [r.task_id, r]))
          }
        }
        
        // Attach completion records to completed tasks
        // CRITICAL: Use completion_record.id as the unique identifier since one task can have multiple completion records
        // (though typically one, but we need unique keys)
        const completedTasksWithRecords = completedTasksList
          .map(task => ({
            ...task,
            completion_record: completionRecordsMap.get(task.id) || null
          }))
          // Filter out tasks without completion records (shouldn't happen, but safety check)
          .filter(task => task.completion_record !== null)
          // Ensure uniqueness by using completion_record.id
          .filter((task, index, self) => 
            index === self.findIndex(t => 
              t.completion_record?.id === task.completion_record?.id
            )
          )
        
        // Filter out completed tasks from the main list (they go to completed section)
        // Only show pending, in_progress, overdue, or failed tasks in the main list
        const activeTasks = tasksWithProfiles.filter(t => 
          t.status !== 'completed' && t.status !== 'skipped'
        )
        
        console.log('📋 Tasks Debug:', {
          totalTasks: tasksWithProfiles.length,
          activeTasks: activeTasks.length,
          completedTasks: completedTasksWithRecords.length,
          taskStatuses: tasksWithProfiles.map(t => ({ 
            id: t.id, 
            status: t.status, 
            daypart: t.daypart, 
            due_time: t.due_time,
            templateId: t.template_id,
            templateName: t.template?.name
          }))
        })
        
        console.log('✅ Setting tasks:', {
          activeTasksCount: activeTasks.length,
          completedTasksCount: completedTasksWithRecords.length,
          activeTasks: activeTasks.map(t => ({ id: t.id, status: t.status, daypart: t.daypart, due_time: t.due_time }))
        })
        
        setTasks(activeTasks)
        setCompletedTasks(completedTasksWithRecords)
      } else {
        console.log('⚠️ No data after processing')
        setTasks([])
        setCompletedTasks([])
      }
    } catch (error) {
      console.error('❌ Failed to fetch today\'s tasks:', error)
      setTasks([])
      setCompletedTasks([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') {
      return 'bg-green-500/10 text-green-400 border-green-500/20'
    }
    
    // Calculate timing status for non-completed tasks
    const timing = calculateTaskTiming(task.due_date, task.due_time || null)
    if (timing.status === 'late') return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (timing.status === 'due') return 'bg-green-500/10 text-green-400 border-green-500/20'
    if (timing.status === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  const getStatusIcon = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') return <CheckCircle2 className="w-4 h-4" />
    
    const timing = calculateTaskTiming(task.due_date, task.due_time || null)
    if (timing.status === 'late') return <AlertCircle className="w-4 h-4" />
    if (timing.status === 'due') return <Clock className="w-4 h-4" />
    if (timing.status === 'pending') return <Clock className="w-4 h-4" />
    
    return <Clock className="w-4 h-4" />
    }
  
  const getStatusLabel = (task: ChecklistTaskWithTemplate) => {
    if (task.status === 'completed') return 'COMPLETED'
    
    const timing = calculateTaskTiming(task.due_date, task.due_time || null)
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Today's Tasks
        </h1>
        <p className="text-neutral-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        </div>
        <div className="flex gap-2">
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
            setShowCompletion(false)
            setSelectedTask(null)
            // Small delay to ensure database updates have propagated
            await new Promise(resolve => setTimeout(resolve, 500))
            await fetchTodaysTasks() // Refresh tasks to show completed task
          }}
          onMonitoringTaskCreated={() => {
            // Refresh tasks list immediately when monitoring task is created
            fetchTodaysTasks()
          }}
        />
      )}
    </div>
  )
}
