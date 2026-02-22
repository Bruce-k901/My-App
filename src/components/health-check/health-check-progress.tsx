'use client'

import { Progress } from '@/components/ui/progress'
import type { HealthCheckReport } from '@/types/health-check'

interface HealthCheckProgressProps {
  report: HealthCheckReport
}

export function HealthCheckProgress({ report }: HealthCheckProgressProps) {
  const resolved = report.completed_items + report.ignored_items
  const total = report.total_items
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0

  const scoreDelta = report.previous_week_score != null && report.health_score != null
    ? report.health_score - report.previous_week_score
    : null

  return (
    <div className="space-y-3">
      {/* Health Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-theme-secondary">Health Score</span>
          <span className="text-2xl font-bold text-theme-primary">
            {report.health_score != null ? `${Math.round(report.health_score)}%` : '—'}
          </span>
          {scoreDelta != null && scoreDelta !== 0 && (
            <span className={`text-xs font-medium ${scoreDelta > 0 ? 'text-module-fg' : 'text-red-600 dark:text-red-400'}`}>
              {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}%
            </span>
          )}
        </div>
        <span className="text-xs text-theme-tertiary">
          {resolved} of {total} resolved
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={pct}
        barClassName={pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}
      />

      {/* Severity breakdown */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-theme-secondary/50">{report.critical_count} critical</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-theme-secondary/50">{report.medium_count} medium</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-theme-secondary/50">{report.low_count} low</span>
        </div>
      </div>
    </div>
  )
}
