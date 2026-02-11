'use client'

import { useState, useEffect } from 'react'
import { WidgetCard, CountBadge, WidgetSkeleton } from '../WidgetCard'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'

interface DataHealthWidgetProps {
  siteId: string
  companyId: string
}

export default function DataHealthWidget({ siteId, companyId }: DataHealthWidgetProps) {
  const [loading, setLoading] = useState(true)
  const [reportId, setReportId] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [prevScore, setPrevScore] = useState<number | null>(null)
  const [critical, setCritical] = useState(0)
  const [medium, setMedium] = useState(0)
  const [low, setLow] = useState(0)
  const [resolved, setResolved] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    async function fetchLatestReport() {
      try {
        let query = supabase
          .from('health_check_reports')
          .select('id, health_score, previous_week_score, critical_count, medium_count, low_count, completed_items, ignored_items, total_items')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId)
        }

        const { data, error } = await query.maybeSingle()

        if (error?.code === '42P01') {
          // Table doesn't exist yet
          setLoading(false)
          return
        }

        if (data) {
          setReportId(data.id)
          setScore(data.health_score)
          setPrevScore(data.previous_week_score)
          setCritical(data.critical_count)
          setMedium(data.medium_count)
          setLow(data.low_count)
          setResolved(data.completed_items + data.ignored_items)
          setTotal(data.total_items)
        }
      } catch {
        // Graceful fallback
      } finally {
        setLoading(false)
      }
    }

    fetchLatestReport()
  }, [companyId, siteId])

  if (loading) return <WidgetSkeleton />

  if (!reportId) {
    return (
      <WidgetCard title="Data Health" module="checkly">
        <p className="text-xs text-[rgb(var(--text-disabled))]">
          No health check reports yet. Reports generate weekly.
        </p>
      </WidgetCard>
    )
  }

  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0
  const scoreDelta = prevScore != null && score != null ? score - prevScore : null

  return (
    <WidgetCard title="Data Health" module="checkly">
      <div className="space-y-3">
        {/* Score */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[rgb(var(--text-primary))]">
            {score != null ? `${Math.round(score)}%` : '—'}
          </span>
          {scoreDelta != null && scoreDelta !== 0 && (
            <span className={`text-xs font-medium ${scoreDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] text-[rgb(var(--text-disabled))] mb-1">
            <span>{resolved}/{total} resolved</span>
            <span>{pct}%</span>
          </div>
          <Progress
            value={pct}
            barClassName={pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}
          />
        </div>

        {/* Severity counts */}
        <div className="flex gap-3">
          <CountBadge count={critical} label="Critical" status={critical > 0 ? 'urgent' : 'neutral'} />
          <CountBadge count={medium} label="Medium" status={medium > 0 ? 'warning' : 'neutral'} />
          <CountBadge count={low} label="Low" status="neutral" />
        </div>
      </div>
    </WidgetCard>
  )
}
