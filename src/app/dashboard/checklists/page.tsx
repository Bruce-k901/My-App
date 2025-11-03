'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChecklistTaskWithTemplate } from '@/types/checklist-types'
import TaskCompletionModal from '@/components/checklists/TaskCompletionModal'
import TaskCard from '@/components/checklists/TaskCard'
import { useAppContext } from '@/context/AppContext'
import { calculateTaskTiming } from '@/utils/taskTiming'

export default function DailyChecklistPage() {
  const [tasks, setTasks] = useState<ChecklistTaskWithTemplate[]>([])
  const [completedTasks, setCompletedTasks] = useState<ChecklistTaskWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ChecklistTaskWithTemplate | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [upcomingTasks, setUpcomingTasks] = useState<ChecklistTaskWithTemplate[]>([])

  useEffect(() => {
    fetchTodaysTasks()
    fetchUpcomingTasks()
  }, [])

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
      const today = new Date().toISOString().split('T')[0]
      
      // Select all columns - callout_id will be included if the migration has been run
      // Exclude callout_followup tasks - they're shown separately in the upcoming section
      const { data: allTasks, error } = await supabase
        .from('checklist_tasks')
        .select('*')
        .eq('due_date', today)
        .order('due_time', { ascending: true })
        .order('daypart', { ascending: true })
      
      // Filter out callout_followup tasks - they're shown in the upcoming section
      const data = allTasks?.filter(task => task.flag_reason !== 'callout_followup') || []

      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      
      // Load templates manually (only for tasks that have template_id)
      if (data && data.length > 0) {
        const templateIds = [...new Set(data.map(t => t.template_id).filter((id): id is string => id !== null))]
        let templatesMap = new Map()
        
        if (templateIds.length > 0) {
        const { data: templates } = await supabase
          .from('task_templates')
          .select('id, name, description, category, frequency, compliance_standard, is_critical, evidence_types, repeatable_field_name, instructions')
          .in('id', templateIds)
        
        if (templates) {
            templatesMap = new Map(templates.map(t => [t.id, t]))
          }
        }
        
          const tasksWithTemplates = data.map(task => ({
            ...task,
          template: task.template_id ? templatesMap.get(task.template_id) : null
          }))
        
        // Load profiles for completed tasks
        const completedTaskIds = tasksWithTemplates
          .filter(t => t.status === 'completed' && t.completed_by)
          .map(t => t.completed_by)
          .filter((id): id is string => id !== null)
        
        let profilesMap = new Map()
        if (completedTaskIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', [...new Set(completedTaskIds)])
          
          if (profiles) {
            profilesMap = new Map(profiles.map(p => [p.id, p]))
          }
        }
        
        const tasksWithProfiles = tasksWithTemplates.map(task => ({
          ...task,
          completed_by_profile: task.completed_by ? profilesMap.get(task.completed_by) : null
        }))
        
        setTasks(tasksWithProfiles.filter(t => t.status !== 'completed'))
        setCompletedTasks(tasksWithProfiles.filter(t => t.status === 'completed'))
      } else {
        setTasks([])
        setCompletedTasks([])
      }
    } catch (error) {
      console.error('Failed to fetch today\'s tasks:', error)
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
      ) : tasks.length === 0 ? (
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
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            // Render TaskCard for all tasks
            return (
              <TaskCard
                key={task.id}
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
            {upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => {
                  setSelectedTask(task)
                  setShowCompletion(true)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks Section */}
      {showCompleted && completedTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-4">Completed Tasks</h2>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 hover:bg-green-500/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {task.template?.name || 'Untitled Task'}
                      </h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 bg-green-500/10 text-green-400 border-green-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        COMPLETED
                      </span>
                    </div>
                    
                    <div className="text-sm text-white/60 space-y-1">
                      {task.completed_by_profile && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">Completed by:</span>
                          <span>{task.completed_by_profile.full_name || task.completed_by_profile.email || 'Unknown'}</span>
                        </div>
                      )}
                      {task.completed_at && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/40">Completed at:</span>
                          <span>{new Date(task.completed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
          onComplete={() => {
            setShowCompletion(false)
            setSelectedTask(null)
            fetchTodaysTasks() // Refresh tasks to show new monitoring task
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
