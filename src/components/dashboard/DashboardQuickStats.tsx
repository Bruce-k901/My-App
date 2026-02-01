'use client'

import { useState, useEffect } from 'react'
import { useAppContext } from '@/context/AppContext'
import { supabase } from '@/lib/supabase'
import { CheckSquare, AlertTriangle, ShieldCheck, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface QuickStats {
  todayTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  openIncidents: number
  complianceScore: number | null
}

export default function DashboardQuickStats() {
  const { companyId, siteId } = useAppContext()
  const [stats, setStats] = useState<QuickStats>({
    todayTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    openIncidents: 0,
    complianceScore: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const now = new Date()

        // Fetch today's tasks
        let tasksQuery = supabase
          .from('checklist_tasks')
          .select('id, status, due_date, due_time')
          .eq('company_id', companyId)
          .eq('due_date', today)

        if (siteId && siteId !== 'all') {
          tasksQuery = tasksQuery.eq('site_id', siteId)
        }

        const { data: tasks } = await tasksQuery

        // Calculate task stats
        const todayTasks = tasks?.length || 0
        const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
        const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0
        const overdueTasks = tasks?.filter(t => {
          if (t.status === 'completed') return false
          const dueDateTime = t.due_time ? new Date(`${t.due_date}T${t.due_time}`) : new Date(t.due_date)
          return dueDateTime < now
        }).length || 0

        // Fetch open incidents
        let incidentsQuery = supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['open', 'in_progress'])

        if (siteId && siteId !== 'all') {
          incidentsQuery = incidentsQuery.eq('site_id', siteId)
        }

        const { count: openIncidents } = await incidentsQuery

        // Fetch compliance score (if available)
        // Use site_compliance_score view/table instead of compliance_scores
        // CRITICAL: Table uses 'tenant_id' NOT 'company_id'
        let complianceQuery = supabase
          .from('site_compliance_score')
          .select('score, score_date')
          .order('score_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Add tenant_id filter (required for RLS - table column is tenant_id, not company_id)
        if (companyId) {
          complianceQuery = complianceQuery.eq('tenant_id', companyId)
        }

        if (siteId && siteId !== 'all') {
          complianceQuery = complianceQuery.eq('site_id', siteId)
        }

        const { data: compliance, error: complianceError } = await complianceQuery
        
        // Silently handle errors - table might not exist yet
        if (complianceError) {
          console.debug('Compliance score not available:', complianceError.message)
        }

        setStats({
          todayTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          openIncidents: openIncidents || 0,
          complianceScore: compliance?.score || null,
        })
      } catch (error) {
        console.error('Error fetching quick stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [companyId, siteId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2 mb-3" />
            <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  const completionRate = stats.todayTasks > 0 
    ? Math.round((stats.completedTasks / stats.todayTasks) * 100) 
    : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Today's Tasks */}
      <Link
        href="/dashboard/todays_tasks"
        className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5 hover:border-[#EC4899]/50 dark:hover:border-[#EC4899]/50 transition-all group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-500/10 rounded-lg group-hover:bg-pink-200 dark:group-hover:bg-pink-500/20 transition-colors">
            <CheckSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          {stats.overdueTasks > 0 && (
            <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
              {stats.overdueTasks} overdue
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-1">
          {stats.todayTasks}
        </div>
        <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60">
          Today's Tasks
        </div>
        {stats.todayTasks > 0 && (
          <div className="mt-3 pt-3 border-t border-theme dark:border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40">
                {stats.completedTasks} completed
              </span>
              <span className="text-pink-600 dark:text-pink-400 font-medium">
                {completionRate}%
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </Link>

      {/* Pending Tasks */}
      <Link
        href="/dashboard/tasks/my-tasks"
        className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5 hover:border-[#EC4899]/50 dark:hover:border-[#EC4899]/50 transition-all group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-500/20 transition-colors">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-1">
          {stats.pendingTasks}
        </div>
        <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60">
          Pending Tasks
        </div>
        {stats.pendingTasks > 0 && (
          <div className="mt-3 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
            {stats.pendingTasks === 1 ? '1 task' : `${stats.pendingTasks} tasks`} awaiting completion
          </div>
        )}
      </Link>

      {/* Open Incidents */}
      <Link
        href="/dashboard/incidents"
        className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5 hover:border-[#EC4899]/50 dark:hover:border-[#EC4899]/50 transition-all group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-500/20 transition-colors">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-1">
          {stats.openIncidents}
        </div>
        <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60">
          Open Incidents
        </div>
        {stats.openIncidents > 0 && (
          <div className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
            Requires attention
          </div>
        )}
      </Link>

      {/* Compliance Score */}
      <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-500/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        </div>
        {stats.complianceScore !== null ? (
          <>
            <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-1">
              {stats.complianceScore}%
            </div>
            <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-3">
              Compliance Score
            </div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span className="text-[rgb(var(--text-tertiary))] dark:text-white/40">
                Current site status
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-1">
              --
            </div>
            <div className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60">
              Compliance Score
            </div>
            <div className="mt-3 text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40">
              No data available
            </div>
          </>
        )}
      </div>
    </div>
  )
}
