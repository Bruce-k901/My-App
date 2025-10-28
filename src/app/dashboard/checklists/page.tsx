'use client'

import { useEffect, useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, Calendar, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ChecklistTaskWithTemplate, TaskStatus, DAYPARTS } from '@/types/checklist-types'
import TaskCard from '@/components/checklists/TaskCard'
import TaskCompletionModal from '@/components/checklists/TaskCompletionModal'

export default function DailyChecklistPage() {
  const [tasks, setTasks] = useState<ChecklistTaskWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<ChecklistTaskWithTemplate | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [selectedDaypart, setSelectedDaypart] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    fetchTodaysTasks()
  }, [])

  async function fetchTodaysTasks() {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select(`
          *,
          template: task_templates(
            id, name, description, category, frequency, 
            compliance_standard, is_critical, evidence_types,
            repeatable_field_name, instructions
          )
        `)
        .eq('due_date', today)
        .order('due_time', { ascending: true })
        .order('daypart', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Failed to fetch today\'s tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedByDaypart = tasks.reduce((acc, task) => {
    const daypart = task.daypart || 'anytime'
    if (!acc[daypart]) acc[daypart] = []
    acc[daypart].push(task)
    return acc
  }, {} as Record<string, ChecklistTaskWithTemplate[]>)

  const filteredTasks = tasks.filter(task => {
    const daypartMatch = selectedDaypart === 'all' || task.daypart === selectedDaypart
    const statusMatch = selectedStatus === 'all' || task.status === selectedStatus
    return daypartMatch && statusMatch
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.status === 'pending' && new Date(t.due_date) < new Date()).length,
    critical: tasks.filter(t => t.template?.is_critical && t.status === 'pending').length
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600/20 to-blue-600/20 bg-clip-text text-transparent">
            📋 Daily Checklist
          </h1>
          <p className="text-neutral-400 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{completionRate}%</div>
            <div className="text-sm text-neutral-400">Complete</div>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-700"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-pink-500"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${completionRate}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <span className="text-sm text-neutral-400">Total</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm text-neutral-400">Completed</span>
          </div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.completed}</div>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-neutral-400">Pending</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-neutral-400">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.overdue}</div>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-neutral-400">Critical</span>
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-1">{stats.critical}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <span className="text-sm text-neutral-400">Filter by:</span>
        </div>
        <select
          value={selectedDaypart}
          onChange={(e) => setSelectedDaypart(e.target.value)}
          className="px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-pink-400"
        >
          <option value="all">All Dayparts</option>
          {DAYPARTS.map((daypart) => (
            <option key={daypart.value} value={daypart.value}>{daypart.label}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1 bg-neutral-800/50 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:border-pink-400"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Tasks by Daypart */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">
          Loading today's tasks...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByDaypart).map(([daypart, daypartTasks]) => (
            <div key={daypart}>
              <h2 className="text-xl font-bold mb-4 pb-2 border-b border-neutral-700 bg-gradient-to-r from-pink-600/20 to-blue-600/20 px-4 py-2 rounded">
                {DAYPARTS.find(d => d.value === daypart)?.label || daypart}
                <span className="ml-2 text-sm font-normal text-neutral-400">
                  ({daypartTasks.length} tasks)
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {daypartTasks.map(task => (
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
          ))}
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
            fetchTodaysTasks() // Refresh tasks
          }}
        />
      )}
    </div>
  )
}