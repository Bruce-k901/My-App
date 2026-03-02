'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { MODULE_BADGE_COLOURS, MODULE_LABELS } from '@/config/widget-registry'
import { useChartTheme } from '@/hooks/dashboard/useChartTheme'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { HealthCheckModule } from '@/types/health-check'

interface CompanyReport {
  totalItems: number
  criticalCount: number
  mediumCount: number
  lowCount: number
  completedItems: number
  healthScore: number | null
  previousScore: number | null
  moduleScores: Record<string, number>
  siteCount: number
}

interface TrendPoint {
  date: string
  score: number
}

interface OwnerSummaryModalProps {
  open: boolean
  onClose: () => void
  companyId: string
}

const MODULE_LINE_COLORS: Record<string, string> = {
  checkly: '#D946EF',   // teamly (blush)
  stockly: '#10B981',   // emerald-500
  teamly: '#3B82F6',    // blue-500
  planly: '#F97316',    // orange-500
  assetly: '#06B6D4',   // cyan-500
  msgly: '#14B8A6',     // teal-500
}

export function OwnerSummaryModal({ open, onClose, companyId }: OwnerSummaryModalProps) {
  const [report, setReport] = useState<CompanyReport | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)
  const ct = useChartTheme()

  useEffect(() => {
    if (!open || !companyId) return
    loadSummary()
  }, [open, companyId])

  async function loadSummary() {
    setLoading(true)
    try {
      // Use admin API to bypass RLS (platform admin may not be a member of this company)
      const res = await fetch('/api/health-check/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summary', company_id: companyId }),
      })
      const json = await res.json()
      const siteReports = json.reports ?? []

      const totalItems = siteReports.reduce((s: number, r: any) => s + r.total_items, 0)
      const criticalCount = siteReports.reduce((s: number, r: any) => s + r.critical_count, 0)
      const mediumCount = siteReports.reduce((s: number, r: any) => s + r.medium_count, 0)
      const lowCount = siteReports.reduce((s: number, r: any) => s + r.low_count, 0)
      const completedItems = siteReports.reduce((s: number, r: any) => s + r.completed_items + r.ignored_items, 0)

      const scores = siteReports.filter((r: any) => r.health_score != null).map((r: any) => r.health_score)
      const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null
      const prevScores = siteReports.filter((r: any) => r.previous_week_score != null).map((r: any) => r.previous_week_score)
      const avgPrev = prevScores.length > 0 ? prevScores.reduce((a: number, b: number) => a + b, 0) / prevScores.length : null

      setReport({
        totalItems,
        criticalCount,
        mediumCount,
        lowCount,
        completedItems,
        healthScore: avgScore,
        previousScore: avgPrev,
        moduleScores: json.moduleScores ?? {},
        siteCount: siteReports.length,
      })

      // Process trend data
      const history = json.trend ?? []
      if (history.length) {
        const byDate = new Map<string, number[]>()
        for (const h of history) {
          const d = h.report_date
          if (!byDate.has(d)) byDate.set(d, [])
          byDate.get(d)!.push(h.health_score)
        }
        const trendData: TrendPoint[] = []
        byDate.forEach((scores, date) => {
          trendData.push({
            date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          })
        })
        setTrend(trendData)
      }
    } catch (err) {
      console.error('Failed to load owner summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const scoreDelta = report?.previousScore != null && report?.healthScore != null
    ? report.healthScore - report.previousScore
    : null

  const pct = report && report.totalItems > 0
    ? Math.round((report.completedItems / report.totalItems) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Company Health Overview</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-white/20 border-t-blue-500 rounded-full" />
          </div>
        ) : !report ? (
          <div className="text-center py-16 text-theme-tertiary/30">
            No health check data available yet.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
                <div className="text-3xl font-bold text-theme-primary">
                  {report.healthScore != null ? `${Math.round(report.healthScore)}%` : '—'}
                </div>
                {scoreDelta != null && scoreDelta !== 0 && (
                  <div className={`text-xs font-medium mt-1 ${scoreDelta > 0 ? 'text-module-fg' : 'text-red-600 dark:text-red-400'}`}>
                    {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}% vs last week
                  </div>
                )}
                <div className="text-[10px] text-theme-tertiary mt-1">Avg Health Score</div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{report.criticalCount}</div>
                <div className="text-[10px] text-theme-tertiary mt-1">Critical Issues</div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
                <div className="text-3xl font-bold text-theme-primary">{report.siteCount}</div>
                <div className="text-[10px] text-theme-tertiary mt-1">Sites Scanned</div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
                <div className="text-3xl font-bold text-theme-primary">{report.totalItems}</div>
                <div className="text-[10px] text-theme-tertiary mt-1">Total Issues</div>
              </div>
            </div>

            {/* Resolution progress */}
            <div>
              <div className="flex justify-between text-xs text-theme-tertiary mb-2">
                <span>{report.completedItems} resolved of {report.totalItems}</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} barClassName={pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'} />
            </div>

            {/* Module scores */}
            {Object.keys(report.moduleScores).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-theme-secondary/60 mb-3">Module Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(report.moduleScores).map(([mod, score]) => {
                    const colors = MODULE_BADGE_COLOURS[mod as HealthCheckModule]
                    const label = MODULE_LABELS[mod as HealthCheckModule] ?? mod
                    return (
                      <div key={mod} className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${colors?.bg ?? ''} ${colors?.text ?? ''}`}>
                            {label}
                          </span>
                          <span className={`text-sm font-bold ${
                            score >= 80 ? 'text-module-fg'
                            : score >= 50 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                          }`}>
                            {Math.round(score)}%
                          </span>
                        </div>
                        <Progress
                          value={score}
                          className="h-1.5"
                          barClassName={
                            score >= 80 ? 'bg-emerald-500'
                            : score >= 50 ? 'bg-amber-500'
                            : 'bg-red-500'
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trend chart */}
            {trend.length > 1 && (
              <div>
                <h3 className="text-sm font-medium text-theme-secondary/60 mb-3">Health Score Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke={ct.axis}
                        tick={{ fontSize: 10, fill: ct.tick }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke={ct.axis}
                        tick={{ fontSize: 10, fill: ct.tick }}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: ct.tooltipBg,
                          border: `1px solid ${ct.tooltipBorder}`,
                          borderRadius: 8,
                          fontSize: 12,
                          color: ct.tooltipText,
                        }}
                        formatter={(value: number) => [`${value}%`, 'Health Score']}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
