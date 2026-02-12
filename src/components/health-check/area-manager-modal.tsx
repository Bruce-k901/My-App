'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { MODULE_BADGE_COLOURS } from '@/config/widget-registry'
import { SiteDetailDialog } from './site-detail-dialog'
import { supabase } from '@/lib/supabase'
import type { HealthCheckModule } from '@/types/health-check'

interface SiteSummary {
  siteId: string
  siteName: string
  managerName: string | null
  healthScore: number | null
  criticalCount: number
  mediumCount: number
  lowCount: number
  completedItems: number
  totalItems: number
  reportId: string | null
}

interface AreaManagerModalProps {
  open: boolean
  onClose: () => void
  areaId: string
  areaName: string
  companyId: string
}

function getCardBorderClass(summary: SiteSummary): string {
  if (summary.criticalCount > 0) return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
  if (summary.mediumCount > 0) return 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
  return 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
}

function getScoreColor(score: number | null): string {
  if (score == null) return 'text-theme-tertiary/30'
  if (score >= 80) return 'text-module-fg'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function AreaManagerModal({ open, onClose, areaId, areaName, companyId }: AreaManagerModalProps) {
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSite, setSelectedSite] = useState<SiteSummary | null>(null)

  useEffect(() => {
    if (!open || !areaId) return
    loadAreaSites()
  }, [open, areaId])

  async function loadAreaSites() {
    setLoading(true)
    try {
      // Get all sites in this area
      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name')
        .eq('area_id', areaId)
        .eq('is_active', true)
        .order('name')

      if (!sitesData?.length) {
        setSites([])
        setLoading(false)
        return
      }

      const summaries: SiteSummary[] = []

      for (const site of sitesData) {
        // Latest report for this site
        const { data: report } = await supabase
          .from('health_check_reports')
          .select('id, health_score, critical_count, medium_count, low_count, completed_items, ignored_items, total_items')
          .eq('site_id', site.id)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Site manager via user_scope_assignments
        const { data: scopeUser } = await supabase
          .from('user_scope_assignments')
          .select('profiles!inner(full_name)')
          .eq('scope_type', 'site')
          .eq('scope_id', site.id)
          .in('role', ['manager', 'admin'])
          .limit(1)
          .maybeSingle()

        summaries.push({
          siteId: site.id,
          siteName: site.name,
          managerName: (scopeUser as any)?.profiles?.full_name ?? null,
          healthScore: report?.health_score ?? null,
          criticalCount: report?.critical_count ?? 0,
          mediumCount: report?.medium_count ?? 0,
          lowCount: report?.low_count ?? 0,
          completedItems: (report?.completed_items ?? 0) + (report?.ignored_items ?? 0),
          totalItems: report?.total_items ?? 0,
          reportId: report?.id ?? null,
        })
      }

      setSites(summaries)
    } catch (err) {
      console.error('Failed to load area sites:', err)
    } finally {
      setLoading(false)
    }
  }

  // Area-level aggregates
  const totalCritical = sites.reduce((s, site) => s + site.criticalCount, 0)
  const totalMedium = sites.reduce((s, site) => s + site.mediumCount, 0)
  const totalLow = sites.reduce((s, site) => s + site.lowCount, 0)
  const totalItems = sites.reduce((s, site) => s + site.totalItems, 0)
  const totalResolved = sites.reduce((s, site) => s + site.completedItems, 0)
  const avgScore = sites.length > 0
    ? sites.reduce((s, site) => s + (site.healthScore ?? 0), 0) / sites.filter(s => s.healthScore != null).length
    : null

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{areaName} — Area Health</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-white/20 border-t-blue-500 rounded-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Area-level summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                    {avgScore != null ? `${Math.round(avgScore)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-theme-tertiary mt-1">Avg Score</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalCritical}</div>
                  <div className="text-[10px] text-theme-tertiary mt-1">Critical</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalMedium}</div>
                  <div className="text-[10px] text-theme-tertiary mt-1">Medium</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-theme text-center">
                  <div className="text-2xl font-bold text-theme-secondary">{totalLow}</div>
                  <div className="text-[10px] text-theme-tertiary mt-1">Low</div>
                </div>
              </div>

              {/* Overall progress */}
              {totalItems > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-theme-tertiary">{totalResolved}/{totalItems} resolved</span>
                  <div className="flex-1">
                    <Progress
                      value={Math.round((totalResolved / totalItems) * 100)}
                      barClassName={totalResolved === totalItems ? 'bg-emerald-500' : 'bg-blue-500'}
                    />
                  </div>
                </div>
              )}

              {/* Site cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-theme-secondary/60">{sites.length} Sites</h3>
                {sites.map(site => {
                  const sitePct = site.totalItems > 0 ? Math.round((site.completedItems / site.totalItems) * 100) : 0
                  return (
                    <button
                      key={site.siteId}
                      onClick={() => setSelectedSite(site)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors hover:opacity-90 ${getCardBorderClass(site)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-medium text-theme-primary">{site.siteName}</h4>
                          {site.managerName && (
                            <p className="text-[10px] text-theme-tertiary">Manager: {site.managerName}</p>
                          )}
                        </div>
                        <span className={`text-lg font-bold ${getScoreColor(site.healthScore)}`}>
                          {site.healthScore != null ? `${Math.round(site.healthScore)}%` : '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px]">
                        {site.criticalCount > 0 && (
                          <span className="text-red-600 dark:text-red-400 font-medium">{site.criticalCount} critical</span>
                        )}
                        {site.mediumCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{site.mediumCount} medium</span>
                        )}
                        {site.lowCount > 0 && (
                          <span className="text-theme-tertiary">{site.lowCount} low</span>
                        )}
                        <span className="ml-auto text-theme-tertiary/30">{sitePct}% resolved</span>
                      </div>
                    </button>
                  )
                })}

                {sites.length === 0 && (
                  <div className="text-center py-8 text-theme-tertiary/30">
                    No active sites in this area
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Site detail drill-down */}
      {selectedSite && (
        <SiteDetailDialog
          open={!!selectedSite}
          onClose={() => setSelectedSite(null)}
          siteId={selectedSite.siteId}
          siteName={selectedSite.siteName}
          companyId={companyId}
        />
      )}
    </>
  )
}
