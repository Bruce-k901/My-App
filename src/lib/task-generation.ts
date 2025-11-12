import { supabase } from '@/lib/supabase'

export interface GenerationLog {
  run_date?: Date | string
  daily_tasks_created?: number
  weekly_tasks_created?: number
  monthly_tasks_created?: number
  triggered_tasks_created?: number
  errors?: string[]
  // Legacy fields for backward compatibility
  daily_tasks?: number
  weekly_tasks?: number
  monthly_tasks?: number
  triggered_tasks?: number
  status?: 'success' | 'partial' | 'failed'
}

/**
 * Manually trigger task generation (for testing)
 */
export async function triggerTaskGeneration(): Promise<GenerationLog> {
  try {
    // Get auth token
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Not authenticated')
    }

    // Call API route
    const response = await fetch('/api/admin/generate-tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`)
    }

    const log = await response.json()
    return log
  } catch (error) {
    console.error('Failed to trigger task generation:', error)
    throw error
  }
}

/**
 * Get task generation history
 */
export async function getGenerationHistory(limit = 10) {
  // Query logs from a hypothetical task_generation_logs table
  // (optional to implement full logging)
  const { data, error } = await supabase
    .from('task_generation_logs')
    .select('*')
    .order('run_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch generation history:', error)
    return []
  }

  return data
}

/**
 * Check today's generated tasks
 */
export async function getTodaysTasks(siteId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('*, template: task_templates(name, frequency)')
    .eq('site_id', siteId)
    .eq('due_date', today)
    .order('due_time', { ascending: true })

  if (error) {
    console.error('Failed to fetch today\'s tasks:', error)
    return []
  }

  return data
}

/**
 * Get all tasks for a specific site and date range
 */
export async function getTasksForDateRange(siteId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select(`
      *,
      template: task_templates(name, frequency, category),
      completion: task_completion_records(completed_at, completed_by)
    `)
    .eq('site_id', siteId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true })

  if (error) {
    console.error('Failed to fetch tasks for date range:', error)
    return []
  }

  return data
}

/**
 * Get overdue tasks for a site
 */
export async function getOverdueTasks(siteId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('checklist_tasks')
    .select(`
      *,
      template: task_templates(name, frequency, category, is_critical)
    `)
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Failed to fetch overdue tasks:', error)
    return []
  }

  return data
}

/**
 * Get task completion statistics for a site
 */
export async function getTaskCompletionStats(siteId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select(`
      status,
      template: task_templates(category, is_critical)
    `)
    .eq('site_id', siteId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)

  if (error) {
    console.error('Failed to fetch task completion stats:', error)
    return null
  }

  if (!data) return null

  const total = data.length
  const completed = data.filter(task => task.status === 'completed').length
  const pending = data.filter(task => task.status === 'pending').length
  const overdue = data.filter(task => 
    task.status === 'pending' && task.due_date < new Date().toISOString().split('T')[0]
  ).length

  const criticalTotal = data.filter(task => task.template?.is_critical).length
  const criticalCompleted = data.filter(task => 
    task.template?.is_critical && task.status === 'completed'
  ).length

  return {
    total,
    completed,
    pending,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    criticalTotal,
    criticalCompleted,
    criticalCompletionRate: criticalTotal > 0 ? Math.round((criticalCompleted / criticalTotal) * 100) : 0
  }
}
