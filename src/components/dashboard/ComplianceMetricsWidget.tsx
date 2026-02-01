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
  const { siteId, companyId, loading: contextLoading } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [recentCompletions, setRecentCompletions] = useState<RecentCompletion[]>([])
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrend[]>([])
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)
  const lastLoadRef = useRef<{ siteId: string | null; companyId: string | null }>({ siteId: null, companyId: null })
  const hasLoadedRef = useRef(false) // Track if we've successfully loaded at least once
  const errorCountRef = useRef(0) // Track consecutive errors to prevent infinite retries
  const contextLoadingHandledRef = useRef(false) // Track if we've already handled the initial context loading

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadComplianceMetrics = useCallback(async () => {
    // Handle "all" sites case - widget needs a specific site
    if (siteId === 'all' || !siteId || !companyId) {
      console.warn('⚠️ ComplianceMetricsWidget: Cannot load - missing siteId or companyId, or "all" sites selected', { siteId, companyId })
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
      console.log('⏸️ ComplianceMetricsWidget: Load already in progress, skipping')
      return
    }

    console.log('▶️ ComplianceMetricsWidget: Starting load', { siteId, companyId })
    loadingRef.current = true
    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      console.log('1️⃣ ComplianceMetricsWidget: Fetching today\'s tasks...')
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's tasks - only filter by site_id if siteId is valid (not "all")
      let tasksQuery = supabase
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
        .eq('due_date', today)
      
      // Only add site_id filter if siteId is not "all"
      if (siteId && siteId !== 'all') {
        tasksQuery = tasksQuery.eq('site_id', siteId)
      }
      
      const { data: todayTasks, error: tasksError } = await tasksQuery

      console.log('2️⃣ ComplianceMetricsWidget: Today\'s tasks response received', { 
        recordCount: todayTasks?.length,
        hasError: !!tasksError 
      })

      if (tasksError) {
        console.error('❌ ComplianceMetricsWidget: Error fetching tasks:', tasksError)
        throw tasksError
      }

      console.log('3️⃣ ComplianceMetricsWidget: Calculating today\'s stats...')
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
        console.log('4️⃣ ComplianceMetricsWidget: Today\'s stats set', { total, completed, pending, overdue })
      }

      console.log('5️⃣ ComplianceMetricsWidget: Fetching recent completions...')
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
        let tasksQuery = supabase
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
        
        // Only add site_id filter if siteId is not "all"
        if (siteId && siteId !== 'all') {
          tasksQuery = tasksQuery.eq('site_id', siteId)
        }
        
        const { data: tasksData } = await tasksQuery

        // Fetch user profiles
        const userIds = [...new Set(recentData.map(r => r.completed_by).filter(Boolean))]
        let profilesData = null;
        if (userIds.length > 0) {
          const query = supabase
            .from('profiles')
            .select('id, full_name');
          const result = userIds.length === 1
            ? await query.eq('id', userIds[0])
            : await query.in('id', userIds);
          profilesData = result.data;
        }

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
          console.log('6️⃣ ComplianceMetricsWidget: Recent completions set', { count: completions.length })
        }
      } else if (recentError) {
        console.warn('⚠️ ComplianceMetricsWidget: Failed to fetch recent completions:', recentError)
      } else {
        console.log('6️⃣ ComplianceMetricsWidget: No recent completions found')
      }

      console.log('7️⃣ ComplianceMetricsWidget: Fetching compliance trend...')
      // Calculate compliance score on-the-fly if no historical data exists
      // First try to fetch historical scores
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      // Only fetch compliance score if siteId and companyId are valid (not "all")
      let scoreQuery = supabase
        .from('site_compliance_score')
        .select('score_date, score')
        .gte('score_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('score_date', { ascending: true })
        .limit(7)
      
      // Add tenant_id filter for RLS if companyId is available
      if (companyId) {
        scoreQuery = scoreQuery.eq('tenant_id', companyId)
      }
      
      if (siteId && siteId !== 'all') {
        scoreQuery = scoreQuery.eq('site_id', siteId)
      }
      
      const { data: scoreData, error: scoreError } = await scoreQuery

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
        
        // Limit to prevent excessive queries - only calculate if we don't have historical data
        try {
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            
            // Calculate score for this date
            const windowStart = new Date(date)
            windowStart.setDate(windowStart.getDate() - 6)
            
            // Fetch data for this date with error handling
            // Build queries with conditional site_id filter
            const buildQuery = (baseQuery: any) => {
              if (siteId && siteId !== 'all') {
                return baseQuery.eq('site_id', siteId)
              }
              return baseQuery
            }
            
            const [incidentsResult, overdueResult, missedResult, breachesResult] = await Promise.allSettled([
              // Critical incidents
              buildQuery(
                supabase
                  .from('incidents')
                  .select('id')
                  .in('severity', ['high', 'critical'])
                  .neq('status', 'closed')
              ),
              // Overdue tasks
              buildQuery(
                supabase
                  .from('checklist_tasks')
                  .select('id')
                  .in('status', ['pending', 'in_progress'])
                  .lt('due_date', dateStr)
              ),
              // Missed tasks (yesterday's incomplete)
              buildQuery(
                supabase
                  .from('checklist_tasks')
                  .select('id')
                  .in('status', ['pending', 'in_progress'])
                  .eq('due_date', new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
              ),
              // Temperature breaches (last 7 days from this date)
              buildQuery(
                supabase
                  .from('temperature_breach_actions')
                  .select('id')
                  .in('status', ['pending', 'acknowledged'])
                  .gte('created_at', windowStart.toISOString())
                  .lt('created_at', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString())
              )
            ])
            
            // Extract data from settled promises, defaulting to empty arrays on error
            const criticalIncidents = incidentsResult.status === 'fulfilled' ? (incidentsResult.value.data?.length || 0) : 0
            const overdueTasks = overdueResult.status === 'fulfilled' ? (overdueResult.value.data?.length || 0) : 0
            const missedTasks = missedResult.status === 'fulfilled' ? (missedResult.value.data?.length || 0) : 0
            const tempBreaches = breachesResult.status === 'fulfilled' ? (breachesResult.value.data?.length || 0) : 0
            
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
        } catch (trendError) {
          console.warn('⚠️ ComplianceMetricsWidget: Error calculating trend, using empty trend', trendError)
          // Continue with empty trend rather than failing completely
        }
        
        if (mountedRef.current) {
          setComplianceTrend(trend)
          console.log('8️⃣ ComplianceMetricsWidget: Compliance trend set', { trendLength: trend.length })
        }
        
        // Optionally trigger the function to store today's score
        if (trend.length > 0 && mountedRef.current) {
          const todayScore = trend[trend.length - 1]
          // Store today's score via RPC call (if function exists)
          try {
            console.log('9️⃣ ComplianceMetricsWidget: Storing compliance score...')
            await supabase.rpc('compute_site_compliance_score', { target_date: today.toISOString().split('T')[0] })
            console.log('✅ ComplianceMetricsWidget: Score stored successfully')
          } catch (err) {
            // Silently fail - function might not be accessible or might not exist yet
            console.debug('⚠️ ComplianceMetricsWidget: Could not store compliance score:', err)
          }
        }
      }

      console.log('✅ ComplianceMetricsWidget: All data loaded successfully')

    } catch (err: any) {
      errorCountRef.current += 1
      console.error('❌ ComplianceMetricsWidget: Error loading compliance metrics:', err, `(Error count: ${errorCountRef.current})`)
      console.error('❌ ComplianceMetricsWidget: Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        stack: err?.stack
      })
      if (mountedRef.current) {
        setError(err.message || 'Failed to load compliance metrics')
        // If we've had multiple consecutive errors, stop trying to prevent infinite loops
        if (errorCountRef.current >= 3) {
          console.error('🛑 ComplianceMetricsWidget: Too many consecutive errors, stopping retries')
        }
      }
    } finally {
      // ✅ THIS ALWAYS RUNS - even if there's an error!
      console.log('🏁 ComplianceMetricsWidget: Finally block executing - clearing loading flag')
      loadingRef.current = false
      hasLoadedRef.current = true // Mark as successfully attempted
      
      // Always clear loading state, even if component appears unmounted
      // React state updates are safe even after unmount (they just get ignored)
      console.log('🔄 ComplianceMetricsWidget: Calling setLoading(false)...')
      setLoading(false)
      console.log('✅ ComplianceMetricsWidget: setLoading(false) called, component should re-render')
      
      // Double-check mounted state for logging purposes
      if (!mountedRef.current) {
        console.warn('⚠️ ComplianceMetricsWidget: Component appears unmounted, but setLoading was called anyway')
      }
    }
  }, [siteId, companyId])

  // Store the latest callback in a ref to avoid stale closures, update inline
  const loadComplianceMetricsRef = useRef(loadComplianceMetrics)
  loadComplianceMetricsRef.current = loadComplianceMetrics

  useEffect(() => {
    // Only wait for contextLoading on initial load (before we've loaded successfully)
    // After initial load, ignore contextLoading flickers during Fast Refresh
    // Also, if we already have siteId/companyId, don't wait (they're already available)
    const hasRequiredValues = siteId && companyId
    if (contextLoading && !contextLoadingHandledRef.current && !hasRequiredValues) {
      console.log('⏳ ComplianceMetricsWidget: Waiting for AppContext to finish loading', { siteId, companyId })
      return
    }

    // Mark that we've handled context loading at least once
    if (!contextLoading) {
      contextLoadingHandledRef.current = true
    }

    // Don't trigger if a load is already in progress
    if (loadingRef.current) {
      console.log('⏸️ ComplianceMetricsWidget: Load in progress, skipping effect')
      return
    }

    // Check if siteId or companyId have actually changed
    const prevSiteId = lastLoadRef.current.siteId
    const prevCompanyId = lastLoadRef.current.companyId
    const hasChanged = prevSiteId !== siteId || prevCompanyId !== companyId
    
    // Only proceed if values have actually changed OR if this is the first load
    // Also skip if contextLoading just changed but values haven't changed
    if (!hasChanged && hasLoadedRef.current && prevSiteId === siteId && prevCompanyId === companyId) {
      // Only log if we've loaded before (to reduce console spam)
      console.log('⏭️ ComplianceMetricsWidget: No change detected, skipping', { siteId, companyId })
      return
    }
    
    // Update the ref to track current values BEFORE loading
    lastLoadRef.current = { siteId, companyId }
    
    // Only load if we have both siteId and companyId and haven't hit error limit
    if (siteId && companyId && errorCountRef.current < 3) {
      // Reset error count on successful change (new values might work)
      if (hasChanged) {
        errorCountRef.current = 0
      }
      console.log('🔄 ComplianceMetricsWidget: Values changed, loading metrics', { 
        siteId, 
        companyId, 
        prevSiteId, 
        prevCompanyId,
        hasLoadedBefore: hasLoadedRef.current,
        errorCount: errorCountRef.current,
        isInitialLoad: !hasLoadedRef.current
      })
      loadComplianceMetricsRef.current()
    } else if (errorCountRef.current >= 3) {
      console.warn('⚠️ ComplianceMetricsWidget: Skipping load due to error limit', { errorCount: errorCountRef.current })
    } else {
      // If missing required values, ensure loading state is cleared
      if (mountedRef.current) {
        console.log('⚠️ ComplianceMetricsWidget: Missing required values', { siteId, companyId, contextLoading })
        setLoading(false)
        setTodayStats(null)
        setRecentCompletions([])
        setComplianceTrend([])
        setError(null)
        hasLoadedRef.current = false // Reset since we didn't successfully load
        contextLoadingHandledRef.current = false // Reset so we wait for context again
      }
    }
     
  }, [siteId, companyId, contextLoading]) // Only depend on values, not the callback function to avoid loops

  // Show loading state while context is loading or while we're fetching data
  if (contextLoading || (!siteId && !companyId)) {
    console.log('🔄 ComplianceMetricsWidget: Rendering context loading state', { contextLoading, siteId, companyId })
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
          <span className="ml-3 text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Loading...</span>
        </div>
      </div>
    )
  }

  if (!siteId || siteId === 'all') {
    console.log('🔄 ComplianceMetricsWidget: Rendering "select site" state', { siteId, companyId })
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
        <p className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] text-center">Select a specific site to view compliance metrics</p>
      </div>
    )
  }

  if (loading) {
    console.log('🔄 ComplianceMetricsWidget: Rendering loading spinner', { 
      loading, 
      loadingRef: loadingRef.current,
      hasTodayStats: !!todayStats,
      hasRecentCompletions: recentCompletions.length > 0
    })
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
          <span className="ml-3 text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Loading compliance metrics...</span>
        </div>
      </div>
    )
  }

  console.log('✅ ComplianceMetricsWidget: Rendering metrics content', {
    loading,
    loadingRef: loadingRef.current,
    todayStats: !!todayStats,
    recentCompletionsCount: recentCompletions.length,
    trendLength: complianceTrend.length
  })

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
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[rgb(var(--text-primary))] dark:text-white">Compliance Metrics</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] mt-1">Today's performance overview</p>
        </div>
        <Link 
          href="/dashboard/my_tasks"
          className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-300 transition-colors"
        >
          View All Tasks →
        </Link>
      </div>

      {/* Today's Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {todayStats?.completionRate ?? 0}%
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] mt-1">
            {todayStats?.completed ?? 0} of {todayStats?.total ?? 0} tasks
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className={`bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border rounded-lg p-4 ${
          (todayStats?.overdue ?? 0) > 0 
            ? 'border-red-500/40 bg-red-500/10' 
            : 'border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${
              (todayStats?.overdue ?? 0) > 0 ? 'text-red-400' : 'text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]'
            }`} />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Overdue</span>
          </div>
          <div className={`text-2xl font-bold ${
            (todayStats?.overdue ?? 0) > 0 ? 'text-red-400' : 'text-[rgb(var(--text-primary))] dark:text-white'
          }`}>
            {todayStats?.overdue ?? 0}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] mt-1">Tasks past due</div>
        </div>

        {/* Critical Tasks */}
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Critical</span>
          </div>
          <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {todayStats?.criticalCompleted ?? 0}/{todayStats?.critical ?? 0}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] mt-1">
            {todayStats?.criticalCompletionRate ?? 0}% complete
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Pending</span>
          </div>
          <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white">
            {todayStats?.pending ?? 0}
          </div>
          <div className="text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))] mt-1">Awaiting completion</div>
        </div>
      </div>

      {/* Current Compliance Score */}
      {complianceTrend.length > 0 && (
        <div className="bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">Current Compliance Score</span>
              <div className="text-3xl font-bold text-[rgb(var(--text-primary))] dark:text-white mt-1">
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
                  <Minus className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]" />
                  <span className="text-sm text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">No change</span>
                </>
              )}
            </div>
          </div>
          
          {/* Compliance Score Trend Chart */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">7-Day Trend</span>
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
            <div className="flex justify-between mt-2 text-xs text-[rgb(var(--text-tertiary))] dark:text-[rgb(var(--text-primary))]">
              <span>{format(new Date(complianceTrend[0]?.date || new Date()), 'MMM dd')}</span>
              <span>{format(new Date(complianceTrend[complianceTrend.length - 1]?.date || new Date()), 'MMM dd')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Completions */}
      {recentCompletions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white mb-3">Recent Completions</h3>
          <div className="space-y-2">
            {recentCompletions.map((completion) => (
              <div
                key={completion.id}
                className="flex items-center justify-between bg-[rgb(var(--surface))] dark:bg-[rgb(var(--surface))] border border-[rgb(var(--border-hover))] dark:border-[rgb(var(--border-hover))] rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-[rgb(var(--text-primary))] dark:text-white truncate">
                      {completion.task_name}
                    </span>
                    {completion.is_critical && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                        Critical
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))] mt-1">
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
          <p className="text-[rgb(var(--text-secondary))] dark:text-[rgb(var(--text-primary))]">No tasks scheduled for today</p>
          <Link 
            href="/dashboard/tasks/compliance-templates"
            className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-300 mt-2 inline-block"
          >
            Create a compliance template →
          </Link>
        </div>
      )}
    </div>
  )
}

