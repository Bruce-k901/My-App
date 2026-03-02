'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Button from '@/components/ui/Button'
import { HealthCheckProgress } from './health-check-progress'
import { HealthCheckItemCard } from './health-check-item-card'
import { DelegationDialog } from './delegation-dialog'
import type { HealthCheckReport, HealthCheckItem, Severity, HealthCheckModule } from '@/types/health-check'

const SEVERITY_GROUPS: { key: Severity; label: string; containerClass: string }[] = [
  {
    key: 'critical',
    label: 'Critical',
    containerClass: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
  },
  {
    key: 'medium',
    label: 'Medium',
    containerClass: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
  },
  {
    key: 'low',
    label: 'Low',
    containerClass: 'bg-white/50 dark:bg-white/[0.03] border-theme',
  },
]

const MODULE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'checkly', label: 'Checkly' },
  { value: 'stockly', label: 'Stockly' },
  { value: 'teamly', label: 'Teamly' },
  { value: 'planly', label: 'Planly' },
  { value: 'assetly', label: 'Assetly' },
]

interface SiteManagerModalProps {
  open: boolean
  onClose: () => void
  reportId: string | null
  companyId: string
  siteId: string | null
}

export function SiteManagerModal({ open, onClose, reportId, companyId, siteId }: SiteManagerModalProps) {
  const [report, setReport] = useState<HealthCheckReport | null>(null)
  const [items, setItems] = useState<HealthCheckItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [delegatingItem, setDelegatingItem] = useState<HealthCheckItem | null>(null)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/health-check/report/${reportId}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReport(data)
      setItems(data.items ?? [])
    } catch (err) {
      console.error('Failed to load health check report:', err)
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (open && reportId) loadReport()
  }, [open, reportId, loadReport])

  const handleFix = async (itemId: string, value: unknown) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix', new_value: value, report_id: item.report_id }),
    })

    if (res.ok) {
      loadReport()
    }
  }

  const handleIgnore = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ignore', report_id: item.report_id }),
    })

    if (res.ok) {
      loadReport()
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (moduleFilter !== 'all' && item.module !== moduleFilter) return false
    return true
  })

  const groupedBySeverity = SEVERITY_GROUPS.map(group => ({
    ...group,
    items: filteredItems.filter(i => i.severity === group.key),
  })).filter(group => group.items.length > 0)

  const pendingCount = items.filter(i => i.status === 'pending').length
  const resolvedCount = items.filter(i => i.status === 'resolved' || i.status === 'ai_fixed').length
  const delegatedCount = items.filter(i => i.status === 'delegated').length
  const ignoredCount = items.filter(i => i.status === 'ignored').length

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Data Health Check</DialogTitle>
          </DialogHeader>

          {loading && !report ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-white/20 border-t-blue-500 rounded-full" />
            </div>
          ) : report ? (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Progress overview */}
              <HealthCheckProgress report={report} />

              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                    <TabsTrigger value="delegated">Delegated ({delegatedCount})</TabsTrigger>
                    <TabsTrigger value="ignored">Ignored ({ignoredCount})</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Module filter */}
                <div className="flex gap-1 ml-auto">
                  {MODULE_FILTERS.map(mf => (
                    <button
                      key={mf.value}
                      onClick={() => setModuleFilter(mf.value)}
                      className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${
                        moduleFilter === mf.value
                          ? 'bg-gray-200 dark:bg-white/[0.1] text-theme-primary'
                          : 'text-theme-tertiary/30 hover:text-theme-secondary dark:hover:text-theme-tertiary'
                      }`}
                    >
                      {mf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items grouped by severity */}
              {groupedBySeverity.length > 0 ? (
                <div className="space-y-4">
                  {groupedBySeverity.map(group => (
                    <div key={group.key} className={`rounded-lg border p-3 space-y-2 ${group.containerClass}`}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-secondary/50">
                        {group.label} ({group.items.length})
                      </h3>
                      <div className="space-y-2">
                        {group.items.map(item => (
                          <HealthCheckItemCard
                            key={item.id}
                            item={item}
                            onFix={handleFix}
                            onIgnore={handleIgnore}
                            onDelegate={setDelegatingItem}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-theme-tertiary/30">
                  {items.length === 0 ? 'No issues found — great job!' : 'No items match the current filters'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-theme-tertiary/30">
              No report selected
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delegation dialog */}
      <DelegationDialog
        open={!!delegatingItem}
        onClose={() => setDelegatingItem(null)}
        item={delegatingItem}
        companyId={companyId}
        siteId={siteId}
        onDelegated={loadReport}
      />
    </>
  )
}
