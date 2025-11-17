'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'

interface TodayStats {
  total: number
  completed: number
  pending: number
  overdue: number
  critical: number
  criticalCompleted: number
  completionRate: number
  criticalCompletionRate: number
}

interface RecentCompletion {
  id: string
  task_name: string
  completed_at: string
  completed_by_name: string | null
  category: string | null
  is_critical: boolean | null
}

interface ComplianceTrend {
  date: string
  score: number
}

export default function ComplianceMetricsWidget() {
  const { siteId, companyId } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [recentCompletions, setRecentCompletions] = useState<RecentCompletion[]>([])
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([])
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadComplianceMetrics = useCallback(async () => {
    if (!siteId || !companyId) {
      if (mountedRef.current) {
        setLoading(false)
        setTodayStats(null)
        setRecentCompletions([])
        setComplianceTrend([])
        setError(null)
      }
      return
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's tasks
      const { data: todayTasks, error: tasksError } = await supabase
        .from('checklist_tasks')
        .select(`
          id,
          status,
          due_date,
          template: task_templates(
            name,
            category,
            is_critical
          )
        `)
        .eq('site_id', siteId)
        .eq('due_date', today)

      if (tasksError) throw tasksError

      // Calculate today's stats
      const total = todayTasks?.length || 0
      const completed = todayTasks?.filter(t => t.status === 'completed').length || 0
      const pending = todayTasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0
      const overdue = todayTasks?.filter(t => {
        const isOverdue = (t.status === 'pending' || t.status === 'in_progress') && 
                          t.due_date < today
        return isOverdue
      }).length || 0
      const critical = todayTasks?.filter(t => t.template?.is_critical).length || 0
      const criticalCompleted = todayTasks?.filter(t => 
        t.template?.is_critical && t.status === 'completed'
      ).length || 0

      if (mountedRef.current) {
        setTodayStats({
          total,
          completed,
          pending,
          overdue,
          critical,
          criticalCompleted,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          criticalCompletionRate: critical > 0 ? Math.round((criticalCompleted / critical) * 100) : 0
        })
      }

      // Fetch recent completions (last 5)
      // First get completion records, then fetch task details separately
      const { data: recentData, error: recentError } = await supabase
        .from('task_completion_records')
        .select(`
          id,
          completed_at,
          completed_by,
          task_id
        `)
        .order('completed_at', { ascending: false })
        .limit(5)

      if (!recentError && recentData && recentData.length > 0) {
        // Fetch task details for completed tasks
        const taskIds = recentData.map(r => r.task_id).filter(Boolean)
        const { data: tasksData } = await supabase
          .from('checklist_tasks')
          .select(`
            id,
            template: task_templates(
              name,
              category,
              is_critical
            )
          `)
          .in('id', taskIds)
          .eq('site_id', siteId)

        // Fetch user profiles
        const userIds = [...new Set(recentData.map(r => r.completed_by).filter(Boolean))]
        const { data: profilesData } = userIds.length > 0 ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds) : { data: [] }

        const tasksMap = new Map((tasksData || []).map((t: any) => [t.id, t]))
        const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p.full_name]))

        const completions: RecentCompletion[] = recentData
          .filter((record: any) => {
            const task = tasksMap.get(record.task_id)
            return task // Only include if task belongs to this site
          })
          .map((record: any) => {
            const task = tasksMap.get(record.task_id)
            return {
              id: record.id,
              task_name: task?.template?.name || 'Unknown Task',
              completed_at: record.completed_at,
              completed_by_name: profilesMap.get(record.completed_by) || null,
              category: task?.template?.category || null,
              is_critical: task?.template?.is_critical || false
            }
          })
        
        if (mountedRef.current) {
          setRecentCompletions(completions)
        }
      } else if (recentError) {
        console.warn('Failed to fetch recent completions:', recentError)
      }

      // Calculate compliance score on-the-fly if no historical data exists
      // First try to fetch historical scores
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: scoreData, error: scoreError } = await supabase
        .from('site_compliance_score')
        .select('score_date, score')
        .eq('site_id', siteId)
        .gte('score_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('score_date', { ascending: true })
        .limit(7)

      if (scoreError) {
        console.warn('Failed to fetch compliance trend:', scoreError)
      }

      // If we have historical data, use it
      if (scoreData && scoreData.length > 0) {
        const trend: ComplianceTrend[] = scoreData.map((entry: any) => ({
          date: entry.score_date,
          score: entry.score || 0
        }))
        if (mountedRef.current) {
          setComplianceTrend(trend)
        }
      } else {
        // Calculate on-the-fly for the last 7 days
        const trend: ComplianceTrend[] = []
        const today = new Date()
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          
          // Calculate score for this date
          const windowStart = new Date(date)
          windowStart.setDate(windowStart.getDate() - 6)
          
          // Fetch data for this date
          const [incidentsResult, overdueResult, missedResult, breachesResult] = await Promise.all([
            // Critical incidents
            supabase
              .from('incidents')
              .select('id')
              .eq('site_id', siteId)
              .in('severity', ['high', 'critical'])
              .neq('status', 'closed'),
            // Overdue tasks
            supabase
              .from('checklist_tasks')
              .select('id')
              .eq('site_id', siteId)
              .in('status', ['pending', 'in_progress'])
              .lt('due_date', dateStr),
            // Missed tasks (yesterday's incomplete)
            supabase
              .from('checklist_tasks')
              .select('id')
              .eq('site_id', siteId)
              .in('status', ['pending', 'in_progress'])
              .eq('due_date', new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
            // Temperature breaches (last 7 days from this date)
            supabase
              .from('temperature_breach_actions')
              .select('id')
              .eq('site_id', siteId)
              .in('status', ['pending', 'acknowledged'])
              .gte('created_at', windowStart.toISOString())
              .lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString())
          ])
          
          const criticalIncidents = incidentsResult.data?.length || 0
          const overdueTasks = overdueResult.data?.length || 0
          const missedTasks = missedResult.data?.length || 0
          const tempBreaches = breachesResult.data?.length || 0
          
          // Calculate score: 100 - 10*critical - 2*overdue - 1*missed - 0.5*breaches
          const score = Math.max(0, Math.min(100, 
            100 
            - (10 * criticalIncidents)
            - (2 * overdueTasks)
            - (1 * missedTasks)
            - (0.5 * tempBreaches)
          ))
          
          trend.push({
            date: dateStr,
            score: Math.round(score * 100) / 100 // Round to 2 decimal places
          })
        }
        
        if (mountedRef.current) {
          setComplianceTrend(trend)
        }
        
        // Optionally trigger the function to store today's score
        if (trend.length > 0 && mountedRef.current) {
          const todayScore = trend[trend.length - 1]
          // Store today's score via RPC call (if function exists)
          try {
            await supabase.rpc('compute_site_compliance_score', { target_date: today.toISOString().split('T')[0] })
          } catch (err) {
            // Silently fail - function might not be accessible or might not exist yet
            console.debug('Could not store compliance score:', err)
          }
        }
      }

    } catch (err: any) {
      console.error('Error loading compliance metrics:', err)
      if (mountedRef.current) {
        setError(err.message || 'Failed to load compliance metrics')
      }
    } finally {
      loadingRef.current = false
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [siteId, companyId])

  useEffect(() => {
    // Reset loading ref when dependencies change
    loadingRef.current = false
    loadComplianceMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, companyId]) // Only depend on siteId and companyId, not the callback

  if (!siteId) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <p className="text-white/60 text-center">Select a site to view compliance metrics</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
          <span className="ml-3 text-white/60">Loading compliance metrics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-red-500/20 rounded-xl p-6">
        <p className="text-red-400 text-center">Error: {error}</p>
      </div>
    )
  }

  const trendDirection = complianceTrend.length >= 2
    ? complianceTrend[complianceTrend.length - 1].score - complianceTrend[0].score
    : 0

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Compliance Metrics</h2>
          <p className="text-sm text-white/60 mt-1">Today's performance overview</p>
        </div>
        <Link 
          href="/dashboard/tasks/active"
          className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
        >
          View All Tasks →
        </Link>
      </div>

      {/* Today's Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/60">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {todayStats?.completionRate ?? 0}%
          </div>
          <div className="text-xs text-white/40 mt-1">
            {todayStats?.completed ?? 0} of {todayStats?.total ?? 0} tasks
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className={`bg-white/[0.05] border rounded-lg p-4 ${
          (todayStats?.overdue ?? 0) > 0 
            ? 'border-red-500/40 bg-red-500/10' 
            : 'border-white/[0.1]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${
              (todayStats?.overdue ?? 0) > 0 ? 'text-red-400' : 'text-white/60'
            }`} />
            <span className="text-xs text-white/60">Overdue</span>
          </div>
          <div className={`text-2xl font-bold ${
            (todayStats?.overdue ?? 0) > 0 ? 'text-red-400' : 'text-white'
          }`}>
            {todayStats?.overdue ?? 0}
          </div>
          <div className="text-xs text-white/40 mt-1">Tasks past due</div>
        </div>

        {/* Critical Tasks */}
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-white/60">Critical</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {todayStats?.criticalCompleted ?? 0}/{todayStats?.critical ?? 0}
          </div>
          <div className="text-xs text-white/40 mt-1">
            {todayStats?.criticalCompletionRate ?? 0}% complete
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-white/60">Pending</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {todayStats?.pending ?? 0}
          </div>
          <div className="text-xs text-white/40 mt-1">Awaiting completion</div>
        </div>
      </div>

      {/* Current Compliance Score */}
      {complianceTrend.length > 0 && (
        <div className="bg-white/[0.05] border border-white/[0.1] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium text-white/60">Current Compliance Score</span>
              <div className="text-3xl font-bold text-white mt-1">
                {complianceTrend[complianceTrend.length - 1]?.score.toFixed(1) || '0.0'}%
              </div>
            </div>
            <div className="flex items-center gap-1">
              {trendDirection > 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">+{trendDirection.toFixed(1)}</span>
                </>
              ) : trendDirection < 0 ? (
                <>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400 font-medium">{trendDirection.toFixed(1)}</span>
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 text-white/60" />
                  <span className="text-sm text-white/60">No change</span>
                </>
              )}
            </div>
          </div>
          
          {/* Compliance Score Trend Chart */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">7-Day Trend</span>
            </div>
            <div className="flex items-end gap-1 h-16">
              {complianceTrend.map((entry) => (
                <div
                  key={entry.date}
                  className="flex-1 bg-pink-500/30 rounded-t transition-all hover:bg-pink-500/50"
                  style={{ height: `${Math.max(5, Math.min(100, entry.score))}%` }}
                  title={`${entry.score.toFixed(1)}% on ${format(new Date(entry.date), 'MMM dd')}`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/40">
              <span>{format(new Date(complianceTrend[0]?.date || new Date()), 'MMM dd')}</span>
              <span>{format(new Date(complianceTrend[complianceTrend.length - 1]?.date || new Date()), 'MMM dd')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Completions */}
      {recentCompletions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Recent Completions</h3>
          <div className="space-y-2">
            {recentCompletions.map((completion) => (
              <div
                key={completion.id}
                className="flex items-center justify-between bg-white/[0.05] border border-white/[0.1] rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-white truncate">
                      {completion.task_name}
                    </span>
                    {completion.is_critical && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                        Critical
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {completion.completed_by_name && (
                      <span>by {completion.completed_by_name} • </span>
                    )}
                    {formatDistanceToNow(new Date(completion.completed_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {todayStats && todayStats.total === 0 && (
        <div className="text-center py-8">
          <p className="text-white/60">No tasks scheduled for today</p>
          <Link 
            href="/dashboard/tasks/compliance-templates"
            className="text-sm text-pink-400 hover:text-pink-300 mt-2 inline-block"
          >
            Create a compliance template →
          </Link>
        </div>
      )}
    </div>
  )
}

