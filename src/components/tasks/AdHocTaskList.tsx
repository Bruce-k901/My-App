'use client'

import { Clock, Loader2, Camera, Thermometer, ClipboardList, FileText, Play, CheckCircle2 } from '@/components/ui/icons'
import type { AdHocTemplate } from '@/hooks/tasks/useAdHocTasks'

interface AdHocTaskListProps {
  adHocTemplates: AdHocTemplate[]
  loading: boolean
  onStartTask: (template: AdHocTemplate) => void
  startingTaskId: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  food_safety: 'bg-green-500/10 text-green-600 dark:text-green-400',
  h_and_s: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  fire: 'bg-red-500/10 text-red-600 dark:text-red-400',
  cleaning: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  compliance: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
}

const EVIDENCE_ICONS: Record<string, { icon: typeof Camera; label: string }> = {
  photo: { icon: Camera, label: 'Photo' },
  temperature: { icon: Thermometer, label: 'Temperature' },
  checklist: { icon: ClipboardList, label: 'Checklist' },
  yes_no_checklist: { icon: ClipboardList, label: 'Checklist' },
  text_note: { icon: FileText, label: 'Notes' },
}

export default function AdHocTaskList({
  adHocTemplates,
  loading,
  onStartTask,
  startingTaskId,
}: AdHocTaskListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-module-fg/[0.10] dark:bg-module-fg/[0.15] mb-4">
          <Clock className="w-8 h-8 text-module-fg dark:text-module-fg animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">
          Loading ad hoc tasks...
        </h3>
      </div>
    )
  }

  if (adHocTemplates.length === 0) {
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-checkly-dark/10 dark:bg-checkly/15 mb-6">
            <Play className="w-10 h-10 text-checkly-dark dark:text-checkly" />
          </div>
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))] dark:text-white mb-3">
            No ad hoc tasks available
          </h2>
          <p className="text-[rgb(var(--text-secondary))] dark:text-theme-tertiary text-lg mb-4">
            There are no on-demand tasks configured for this site.
          </p>
          <p className="text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary text-sm">
            Configure triggered templates in My Tasks to see them here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adHocTemplates.map((adHoc) => {
        const { siteChecklist, template, completionsToday } = adHoc
        const isStarting = startingTaskId === siteChecklist.id
        const category = template.category || ''
        const evidenceTypes: string[] = template.evidence_types || []
        const categoryColor = CATEGORY_COLORS[category] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'

        return (
          <button
            key={siteChecklist.id}
            type="button"
            onClick={() => !isStarting && onStartTask(adHoc)}
            disabled={isStarting}
            className="w-full text-left bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-70 disabled:cursor-wait"
          >
            <div className="flex items-start justify-between gap-3">
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] dark:text-white truncate">
                    {siteChecklist.name || template.name}
                  </h3>
                  {category && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
                      {category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  )}
                  {template.is_critical && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                      Critical
                    </span>
                  )}
                </div>

                {template.description && (
                  <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary line-clamp-2 mb-2">
                    {template.description}
                  </p>
                )}

                {/* Evidence type icons */}
                {evidenceTypes.length > 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    {evidenceTypes.map((type: string) => {
                      const config = EVIDENCE_ICONS[type]
                      if (!config) return null
                      const Icon = config.icon
                      return (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 text-xs text-[rgb(var(--text-tertiary))] dark:text-theme-tertiary"
                          title={config.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Completion count */}
                {completionsToday > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Completed {completionsToday} time{completionsToday !== 1 ? 's' : ''} today
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Start button */}
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isStarting
                      ? 'bg-checkly-dark/20 dark:bg-checkly/20 text-checkly-dark dark:text-checkly'
                      : 'bg-checkly-dark dark:bg-checkly text-white dark:text-neutral-900 hover:bg-checkly-dark/90 dark:hover:bg-checkly/90'
                  }`}
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Start
                    </>
                  )}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
