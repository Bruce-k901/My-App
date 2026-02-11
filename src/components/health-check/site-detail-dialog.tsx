'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import Button from '@/components/ui/Button'
import { MODULE_BADGE_COLOURS } from '@/config/widget-registry'
import { HealthCheckItemCard } from './health-check-item-card'
import { DelegationDialog } from './delegation-dialog'
import { supabase } from '@/lib/supabase'
import type { HealthCheckReport, HealthCheckItem, HealthCheckModule, Severity } from '@/types/health-check'

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/30',
  medium: 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
  low: 'bg-gray-100 dark:bg-white/[0.03] text-gray-800 dark:text-gray-300 border-gray-300 dark:border-white/[0.06]',
}

interface SiteDetailDialogProps {
  open: boolean
  onClose: () => void
  siteId: string
  siteName: string
  companyId: string
}

export function SiteDetailDialog({ open, onClose, siteId, siteName, companyId }: SiteDetailDialogProps) {
  const [report, setReport] = useState<HealthCheckReport | null>(null)
  const [items, setItems] = useState<HealthCheckItem[]>([])
  const [manager, setManager] = useState<{ name: string; role: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [delegatingItem, setDelegatingItem] = useState<HealthCheckItem | null>(null)

  useEffect(() => {
    if (!open || !siteId) return
    loadData()
  }, [open, siteId])

  async function loadData() {
    setLoading(true)
    try {
      // Load latest report for this site
      const { data: reportData } = await supabase
        .from('health_check_reports')
        .select('*')
        .eq('site_id', siteId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (reportData) {
        setReport(reportData)

        // Load items
        const { data: itemsData } = await supabase
          .from('health_check_items')
          .select('*')
          .eq('report_id', reportData.id)
          .order('severity', { ascending: true })

        setItems(itemsData ?? [])
      }

      // Load site manager via user_scope_assignments
      const { data: scopeUser } = await supabase
        .from('user_scope_assignments')
        .select('profile_id, role, profiles!inner(full_name)')
        .eq('scope_type', 'site')
        .eq('scope_id', siteId)
        .in('role', ['manager', 'admin'])
        .limit(1)
        .maybeSingle()

      if (scopeUser) {
        setManager({
          name: (scopeUser as any).profiles?.full_name ?? 'Unknown',
          role: scopeUser.role,
        })
      }
    } catch (err) {
      console.error('Failed to load site detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFix = async (itemId: string, value: unknown) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix', new_value: value, report_id: item.report_id }),
    })
    if (res.ok) loadData()
  }

  const handleIgnore = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ignore', report_id: item.report_id }),
    })
    if (res.ok) loadData()
  }

  // Group items by module
  const modules = items.reduce<Record<string, HealthCheckItem[]>>((acc, item) => {
    if (activeTab !== 'all' && item.severity !== activeTab) return acc
    const mod = item.module
    if (!acc[mod]) acc[mod] = []
    acc[mod].push(item)
    return acc
  }, {})

  const pct = report && report.total_items > 0
    ? Math.round(((report.completed_items + report.ignored_items) / report.total_items) * 100)
    : 0

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{siteName}</span>
              {report && (
                <span className={`text-sm font-normal px-2 py-0.5 rounded ${
                  report.critical_count > 0
                    ? 'bg-red-500/10 text-red-400'
                    : report.medium_count > 0
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {report.health_score != null ? `${Math.round(report.health_score)}%` : '—'}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-white/20 border-t-blue-500 rounded-full" />
            </div>
          ) : !report ? (
            <div className="text-center py-16 text-gray-400 dark:text-white/30">
              No health check data for this site yet.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Summary bar */}
              <div className="flex items-center gap-6 p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                {manager && (
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-white/40">Manager: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{manager.name}</span>
                  </div>
                )}
                <div className="flex-1">
                  <Progress value={pct} barClassName={pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'} />
                </div>
                <span className="text-xs text-gray-500 dark:text-white/40">{pct}% resolved</span>
              </div>

              {/* Severity filter */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                  <TabsTrigger value="critical">Critical ({report.critical_count})</TabsTrigger>
                  <TabsTrigger value="medium">Medium ({report.medium_count})</TabsTrigger>
                  <TabsTrigger value="low">Low ({report.low_count})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Items by module */}
              {Object.keys(modules).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(modules).map(([mod, modItems]) => {
                    const colors = MODULE_BADGE_COLOURS[mod as HealthCheckModule]
                    return (
                      <div key={mod} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${colors?.bg ?? ''} ${colors?.text ?? ''}`}>
                            {mod}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-white/30">{modItems.length} items</span>
                        </div>
                        {modItems.map(item => (
                          <HealthCheckItemCard
                            key={item.id}
                            item={item}
                            onFix={handleFix}
                            onIgnore={handleIgnore}
                            onDelegate={setDelegatingItem}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-white/30">
                  No items match the current filter
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DelegationDialog
        open={!!delegatingItem}
        onClose={() => setDelegatingItem(null)}
        item={delegatingItem}
        companyId={companyId}
        siteId={siteId}
        onDelegated={loadData}
      />
    </>
  )
}
