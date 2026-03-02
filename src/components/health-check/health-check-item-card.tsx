'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { MODULE_BADGE_COLOURS } from '@/config/widget-registry'
import { HealthCheckFieldEditor } from './health-check-field-editor'
import type { HealthCheckItem, HealthCheckModule } from '@/types/health-check'

const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
  medium: {
    badge: 'bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  low: {
    badge: 'bg-theme-surface-elevated0/20 border-gray-500/30 text-theme-secondary',
    dot: 'bg-gray-400',
  },
} as const

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-theme-tertiary' },
  in_progress: { label: 'In Progress', color: 'text-blue-600 dark:text-blue-400' },
  delegated: { label: 'Delegated', color: 'text-purple-600 dark:text-purple-400' },
  resolved: { label: 'Resolved', color: 'text-module-fg' },
  ignored: { label: 'Ignored', color: 'text-theme-tertiary/30' },
  escalated: { label: 'Escalated', color: 'text-red-600 dark:text-red-400' },
  ai_fixed: { label: 'AI Fixed', color: 'text-purple-600 dark:text-purple-400' },
}

interface ItemCardProps {
  item: HealthCheckItem
  onFix: (itemId: string, value: unknown) => Promise<void>
  onIgnore: (itemId: string) => Promise<void>
  onDelegate: (item: HealthCheckItem) => void
}

export function HealthCheckItemCard({ item, onFix, onIgnore, onDelegate }: ItemCardProps) {
  const [editing, setEditing] = useState(false)
  const [ignoring, setIgnoring] = useState(false)

  const severity = SEVERITY_STYLES[item.severity]
  const status = STATUS_LABELS[item.status] || STATUS_LABELS.pending
  const moduleColors = MODULE_BADGE_COLOURS[item.module as HealthCheckModule]
  const isActionable = item.status === 'pending' || item.status === 'in_progress'

  const handleIgnore = async () => {
    setIgnoring(true)
    try {
      await onIgnore(item.id)
    } finally {
      setIgnoring(false)
    }
  }

  return (
    <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${severity.dot}`} />
            <h4 className="text-sm font-medium text-theme-primary truncate">
              {item.record_name || item.title}
            </h4>
          </div>
          <p className="text-xs text-theme-tertiary line-clamp-2">{item.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Module badge */}
          {moduleColors && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${moduleColors.bg} ${moduleColors.text}`}>
              {item.module}
            </span>
          )}
          {/* Severity badge */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${severity.badge}`}>
            {item.severity}
          </span>
          {/* Status */}
          {item.status !== 'pending' && (
            <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
          )}
        </div>
      </div>

      {/* Field info */}
      <div className="text-xs text-theme-tertiary/30">
        <span className="font-medium">{item.field_label || item.field_name}</span>
        {item.current_value != null && (
          <span> — current: <code className="bg-gray-100 dark:bg-white/[0.05] px-1 rounded">{String(item.current_value)}</code></span>
        )}
      </div>

      {/* Inline editor */}
      {editing && (
        <HealthCheckFieldEditor
          item={item}
          onSave={async (value) => {
            await onFix(item.id, value)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Action buttons */}
      {isActionable && !editing && (
        <div className="flex gap-2 pt-1">
          <Button variant="primary" className="text-xs h-7 px-3" onClick={() => setEditing(true)}>
            Fix
          </Button>
          <Button variant="ghost" className="text-xs h-7 px-3" onClick={() => onDelegate(item)}>
            Delegate
          </Button>
          <Button variant="ghost" className="text-xs h-7 px-3" onClick={handleIgnore} loading={ignoring}>
            Ignore
          </Button>
        </div>
      )}

      {/* Delegation info */}
      {item.status === 'delegated' && item.delegation_message && (
        <div className="text-xs p-2 rounded bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300">
          Delegated: {item.delegation_message}
          {item.due_date && (
            <span className="block mt-1 text-purple-500 dark:text-purple-400">
              Due: {new Date(item.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
