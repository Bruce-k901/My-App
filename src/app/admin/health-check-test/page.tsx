'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Spinner from '@/components/ui/Spinner'
import Select from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { MODULE_BADGE_COLOURS } from '@/config/widget-registry'
import { SiteManagerModal } from '@/components/health-check/site-manager-modal'
import { AreaManagerModal } from '@/components/health-check/area-manager-modal'
import { OwnerSummaryModal } from '@/components/health-check/owner-summary-modal'
import { HealthCheckItemCard } from '@/components/health-check/health-check-item-card'
import { DelegationDialog } from '@/components/health-check/delegation-dialog'
import { toast } from 'sonner'
import {
  Shield,
  Play,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  MapPin,
  Wand2,
  Database,
  Calendar,
  MessageSquare,
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
} from '@/components/ui/icons'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { HealthCheckItem, HealthCheckModule } from '@/types/health-check'

// ---------- Admin button styles (always dark context on #0B0D13) ----------

const btnBase = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none'
const btnPrimary = `${btnBase} h-10 px-5 bg-transparent border border-[#D37E91] text-[#D37E91] hover:bg-[#D37E91]/10 hover:shadow-module-glow`
const btnGhost = `${btnBase} h-10 px-5 bg-transparent border border-white/20 text-theme-tertiary hover:bg-white/[0.06] hover:text-white hover:border-white/30`
const btnDestructive = `${btnBase} h-10 px-5 bg-red-500/90 text-white hover:bg-red-500 border border-red-500/50`
const btnOutline = `${btnBase} h-9 px-3 bg-transparent border border-white/15 text-theme-tertiary hover:border-[#D37E91]/50 hover:text-[#D37E91] hover:shadow-module-glow`

// Admin Select overrides — targets the Radix trigger <button> inside the Select wrapper
const adminSelectCls = [
  '[&_button]:!bg-white/5',
  '[&_button]:!border-[rgba(211,126,145,0.4)]',
  '[&_button]:!text-theme-primary',
  '[&_button]:!shadow-none',
  '[&_button_svg]:!text-theme-tertiary',
  '[&_button]:hover:!border-[rgba(211,126,145,0.7)]',
  '[&_button]:hover:!shadow-[0_0_10px_rgba(211,126,145,0.2)]',
  '[&_button]:focus:!border-[#D37E91]',
  '[&_button]:focus:!shadow-[0_0_14px_rgba(211,126,145,0.3)]',
  '[&_button[data-state=open]]:!border-[#D37E91]',
  '[&_button[data-state=open]]:!shadow-[0_0_14px_rgba(211,126,145,0.3)]',
].join(' ')

// ---------- Types ----------

interface Company { id: string; name: string }
interface Site { id: string; name: string }
interface Area { id: string; name: string }

interface ReportSummary {
  id: string
  site_id: string
  site_name: string
  assigned_to: string
  assigned_name: string | null
  assigned_role: string
  health_score: number | null
  previous_week_score: number | null
  total_items: number
  critical_count: number
  medium_count: number
  low_count: number
  completed_items: number
  delegated_items: number
  ignored_items: number
  escalated_items: number
  status: string
  calendar_task_id: string | null
  created_at: string
  is_test_data: boolean
}

interface CalendarTask {
  id: string
  custom_name: string
  due_date: string
  due_time: string | null
  status: string
  priority: string
  assigned_to_user_id: string | null
  assigned_name: string | null
  task_data: {
    task_type?: string
    health_check_report_id?: string
    severity_breakdown?: { critical: number; medium: number; low: number }
  } | null
  created_at: string
}

interface DelegatedItem {
  id: string
  title: string
  record_name: string | null
  severity: string
  module: string
  status: string
  delegated_to: string | null
  delegated_to_name: string | null
  delegated_by: string | null
  delegated_by_name: string | null
  delegated_at: string | null
  delegation_message: string | null
  due_date: string | null
  conversation_id: string | null
  reminder_count: number
  last_reminder_sent: string | null
  next_reminder_at: string | null
  escalated_to: string | null
  escalation_reason: string | null
  site_name: string | null
}

interface Reminder {
  id: string
  health_check_item_id: string
  item_title: string | null
  reminder_type: string
  scheduled_for: string
  sent_at: string | null
  sent_to_name: string | null
  message_content: string | null
}

// ---------- Component ----------

export default function HealthCheckTestPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedSite, setSelectedSite] = useState('') // '' = all sites
  const [sites, setSites] = useState<Site[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [running, setRunning] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiRunning, setAiRunning] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('mixed')
  const [mainTab, setMainTab] = useState('reports')

  // Report detail (inline expansion)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<HealthCheckItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Calendar tasks
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)

  // Delegations & reminders
  const [delegatedItems, setDelegatedItems] = useState<DelegatedItem[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loadingDelegations, setLoadingDelegations] = useState(false)

  // Modal state
  const [siteModalReportId, setSiteModalReportId] = useState<string | null>(null)
  const [siteModalSiteId, setSiteModalSiteId] = useState<string | null>(null)
  const [areaModal, setAreaModal] = useState<{ id: string; name: string } | null>(null)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false)
  const [delegatingItem, setDelegatingItem] = useState<HealthCheckItem | null>(null)
  const [delegatingSiteId, setDelegatingSiteId] = useState<string | null>(null)

  // ---------- Load data ----------

  useEffect(() => { loadCompanies() }, [])

  useEffect(() => {
    setSelectedSite('') // reset site when company changes
    if (selectedCompany) {
      loadCompanyData()
    } else {
      setSites([])
      setAreas([])
      setReports([])
      setCalendarTasks([])
      setDelegatedItems([])
      setReminders([])
    }
  }, [selectedCompany])

  async function loadCompanies() {
    const { data } = await supabase.from('companies').select('id, name').order('name')
    setCompanies(data ?? [])
  }

  async function loadCompanyData() {
    const { data: sitesData } = await supabase
      .from('sites').select('id, name')
      .eq('company_id', selectedCompany)
      .eq('is_active', true)
      .order('name')
    setSites(sitesData ?? [])

    const { data: areasData } = await supabase
      .from('company_areas').select('id, name')
      .eq('company_id', selectedCompany)
      .order('name')
    setAreas(areasData ?? [])

    await loadReports()
  }

  async function loadReports() {
    if (!selectedCompany) return
    try {
      const res = await fetch('/api/health-check/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reports', company_id: selectedCompany }),
      })
      const json = await res.json()
      const data = json.data ?? []

      setReports(
        data.map((r: any) => ({
          id: r.id,
          site_id: r.site_id,
          site_name: r.sites?.name ?? 'Unknown',
          assigned_to: r.assigned_to,
          assigned_name: r.profiles?.full_name ?? null,
          assigned_role: r.assigned_role,
          health_score: r.health_score,
          previous_week_score: r.previous_week_score,
          total_items: r.total_items,
          critical_count: r.critical_count,
          medium_count: r.medium_count,
          low_count: r.low_count,
          completed_items: r.completed_items,
          delegated_items: r.delegated_items,
          ignored_items: r.ignored_items,
          escalated_items: r.escalated_items,
          status: r.status,
          calendar_task_id: r.calendar_task_id,
          created_at: r.created_at,
          is_test_data: r.is_test_data,
        }))
      )
    } catch (err) {
      console.error('Failed to load reports:', err)
    }
  }

  // ---------- Load expanded report items ----------

  const loadReportItems = useCallback(async (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null)
      setExpandedItems([])
      return
    }

    setExpandedReportId(reportId)
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/health-check/report/${reportId}`)
      if (res.ok) {
        const data = await res.json()
        setExpandedItems(data.items ?? [])
      }
    } catch (err) {
      console.error('Failed to load report items:', err)
    } finally {
      setLoadingItems(false)
    }
  }, [expandedReportId])

  // ---------- Load calendar tasks ----------

  async function loadCalendarTasks() {
    if (!selectedCompany) return
    setLoadingCalendar(true)
    try {
      const res = await fetch('/api/health-check/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calendar', company_id: selectedCompany }),
      })
      const json = await res.json()

      setCalendarTasks((json.data ?? []).map((t: any) => ({
        id: t.id,
        custom_name: t.custom_name,
        due_date: t.due_date,
        due_time: t.due_time,
        status: t.status,
        priority: t.priority,
        assigned_to_user_id: t.assigned_to_user_id,
        assigned_name: t.assigned_name ?? null,
        task_data: t.task_data,
        created_at: t.created_at,
      })))
    } catch (err) {
      console.error('Failed to load calendar tasks:', err)
    } finally {
      setLoadingCalendar(false)
    }
  }

  // ---------- Load delegations & reminders ----------

  async function loadDelegations() {
    if (!selectedCompany) return
    setLoadingDelegations(true)
    try {
      const reportIds = reports.map(r => r.id)
      const res = await fetch('/api/health-check/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delegations', company_id: selectedCompany, report_ids: reportIds }),
      })
      const json = await res.json()

      setDelegatedItems((json.items ?? []).map((i: any) => ({
        id: i.id,
        title: i.title,
        record_name: i.record_name,
        severity: i.severity,
        module: i.module,
        status: i.status,
        delegated_to: i.delegated_to,
        delegated_to_name: i.delegated_to_name ?? null,
        delegated_by: i.delegated_by,
        delegated_by_name: i.delegated_by_name ?? null,
        delegated_at: i.delegated_at,
        delegation_message: i.delegation_message,
        due_date: i.due_date,
        conversation_id: i.conversation_id,
        reminder_count: i.reminder_count ?? 0,
        last_reminder_sent: i.last_reminder_sent,
        next_reminder_at: i.next_reminder_at,
        escalated_to: i.escalated_to,
        escalation_reason: i.escalation_reason,
        site_name: i.site_name ?? null,
      })))

      setReminders(json.reminders ?? [])
    } catch (err) {
      console.error('Failed to load delegations:', err)
    } finally {
      setLoadingDelegations(false)
    }
  }

  // ---------- Load tab data on switch ----------

  useEffect(() => {
    if (!selectedCompany) return
    if (mainTab === 'calendar') loadCalendarTasks()
    if (mainTab === 'delegations') loadDelegations()
  }, [mainTab, selectedCompany])

  // ---------- Actions ----------

  const [lastScanDiag, setLastScanDiag] = useState<{ errors: string[]; scan_errors: string[]; reports_created: number; items_created: number; calendar_tasks_created: number } | null>(null)

  async function runScan() {
    if (!selectedCompany) { toast.error('Select a company first'); return }
    setRunning(true)
    setLastScanDiag(null)
    try {
      const body: Record<string, string> = { company_id: selectedCompany }
      const targetSite = selectedSite && selectedSite !== 'all' ? selectedSite : ''
      if (targetSite) body.site_id = targetSite
      const siteName = targetSite ? sites.find(s => s.id === targetSite)?.name ?? 'site' : 'all sites'

      const res = await fetch('/api/health-check/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setLastScanDiag({
          errors: data.errors ?? [],
          scan_errors: data.scan_errors ?? [],
          reports_created: data.reports_created ?? 0,
          items_created: data.items_created ?? 0,
          calendar_tasks_created: data.calendar_tasks_created ?? 0,
        })
        const totalErrors = (data.errors?.length ?? 0) + (data.scan_errors?.length ?? 0)
        if (totalErrors > 0) {
          toast.error(`Scan (${siteName}): ${data.reports_created} reports, ${data.items_created} items — ${totalErrors} errors found (see diagnostics below)`)
        } else {
          toast.success(`Scan (${siteName}): ${data.reports_created} reports, ${data.items_created} items, ${data.calendar_tasks_created ?? 0} calendar tasks`)
        }
        await loadReports()
      } else {
        toast.error(`Scan failed: ${data.error}`)
      }
    } catch (err: any) {
      toast.error(`Scan error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  async function generateTestData() {
    if (!selectedCompany) { toast.error('Select a company first'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/health-check/test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: selectedCompany, scenario: selectedScenario }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Generated: ${data.reportsCreated} reports, ${data.itemsCreated} items (${selectedScenario})`)
        await loadReports()
      } else {
        toast.error(`Generation failed: ${data.error}`)
      }
    } catch (err: any) {
      toast.error(`Generation error: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  async function clearAllData() {
    if (!selectedCompany) return
    setClearing(true)
    try {
      const res = await fetch('/api/health-check/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', company_id: selectedCompany }),
      })
      const json = await res.json()

      if (res.ok) {
        toast.success('All health check data cleared')
        setReports([])
        setCalendarTasks([])
        setDelegatedItems([])
        setReminders([])
        setExpandedReportId(null)
        setExpandedItems([])
      } else {
        toast.error(json.error || 'Failed to clear some data')
      }
    } catch (err: any) {
      toast.error(`Clear error: ${err.message}`)
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }

  async function runAISuggestions(reportId: string) {
    setAiRunning(true)
    try {
      const res = await fetch('/api/health-check/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, auto_fix: false }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`AI: ${data.suggestions.succeeded} suggestions generated`)
        // Refresh expanded items if this report is open
        if (expandedReportId === reportId) {
          setExpandedReportId(null)
          setTimeout(() => loadReportItems(reportId), 100)
        }
      } else {
        toast.error(`AI error: ${data.error}`)
      }
    } catch (err: any) {
      toast.error(`AI error: ${err.message}`)
    } finally {
      setAiRunning(false)
    }
  }

  // Item actions (for inline expanded items)
  const handleFix = async (itemId: string, value: unknown) => {
    const item = expandedItems.find(i => i.id === itemId)
    if (!item) return
    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix', new_value: value, report_id: item.report_id }),
    })
    if (res.ok) {
      toast.success('Item fixed')
      if (expandedReportId) {
        const rid = expandedReportId
        setExpandedReportId(null)
        setTimeout(() => loadReportItems(rid), 100)
        loadReports()
      }
    } else {
      const err = await res.json()
      toast.error(`Fix failed: ${err.error}`)
    }
  }

  const handleIgnore = async (itemId: string) => {
    const item = expandedItems.find(i => i.id === itemId)
    if (!item) return
    const res = await fetch(`/api/health-check/item/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ignore', report_id: item.report_id }),
    })
    if (res.ok) {
      toast.success('Item ignored')
      if (expandedReportId) {
        const rid = expandedReportId
        setExpandedReportId(null)
        setTimeout(() => loadReportItems(rid), 100)
        loadReports()
      }
    }
  }

  const handleDelegate = (item: HealthCheckItem) => {
    const report = reports.find(r => r.id === item.report_id)
    setDelegatingItem(item)
    setDelegatingSiteId(report?.site_id ?? null)
  }

  // ---------- Render helpers ----------

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-module-fg" />
      case 'in_progress': return <Clock className="w-3.5 h-3.5 text-blue-400" />
      case 'overdue': return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
      default: return <Clock className="w-3.5 h-3.5 text-theme-disabled" />
    }
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-teamly/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-teamly" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Health Check Testing</h1>
          <p className="text-theme-tertiary text-sm">Live scans on real data — reports, calendar tasks, delegation, fix &amp; management views</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[220px]">
          <label className="block text-xs font-medium text-theme-tertiary mb-1">Company</label>
          <Select
            value={selectedCompany}
            onValueChange={setSelectedCompany}
            placeholder="Select a company..."
            options={companies.map(c => ({ label: c.name, value: c.id }))}
            className={adminSelectCls}
          />
        </div>

        {selectedCompany && sites.length > 0 && (
          <div className="min-w-[220px]">
            <label className="block text-xs font-medium text-theme-tertiary mb-1">Site</label>
            <Select
              value={selectedSite}
              onValueChange={setSelectedSite}
              placeholder="All sites"
              options={[
                { label: 'All sites', value: 'all' },
                ...sites.map(s => ({ label: s.name, value: s.id })),
              ]}
              className={adminSelectCls}
            />
          </div>
        )}

        <button onClick={runScan} disabled={running || !selectedCompany} className={btnPrimary}>
          {running ? <><Spinner /><span className="ml-2">Scanning...</span></> : <><Play className="w-4 h-4 mr-2" />Run Scan</>}
        </button>

        <button onClick={() => { loadReports(); if (mainTab === 'calendar') loadCalendarTasks(); if (mainTab === 'delegations') loadDelegations() }} disabled={!selectedCompany} className={btnGhost}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>

        <button onClick={() => setConfirmClear(true)} disabled={!selectedCompany || reports.length === 0} className={btnDestructive}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Data
        </button>
      </div>

      {/* Scan diagnostics */}
      {lastScanDiag && (
        <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">Last Scan Diagnostics</h3>
          <div className="flex gap-4 text-sm">
            <span className="text-theme-secondary">Reports: <span className="text-theme-primary font-bold">{lastScanDiag.reports_created}</span></span>
            <span className="text-theme-secondary">Items: <span className="text-theme-primary font-bold">{lastScanDiag.items_created}</span></span>
            <span className="text-theme-secondary">Calendar tasks: <span className="text-theme-primary font-bold">{lastScanDiag.calendar_tasks_created}</span></span>
          </div>
          {lastScanDiag.scan_errors.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-red-400">Scan Errors (per-rule failures):</h4>
              <div className="max-h-40 overflow-y-auto rounded bg-red-500/10 border border-red-500/30 p-2 text-xs font-mono text-red-300 space-y-0.5">
                {lastScanDiag.scan_errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}
          {lastScanDiag.errors.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-amber-400">Generation Errors:</h4>
              <div className="max-h-40 overflow-y-auto rounded bg-amber-500/10 border border-amber-500/30 p-2 text-xs font-mono text-amber-300 space-y-0.5">
                {lastScanDiag.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}
          {lastScanDiag.scan_errors.length === 0 && lastScanDiag.errors.length === 0 && lastScanDiag.items_created === 0 && (
            <p className="text-xs text-theme-tertiary">No errors, but also no issues found. The scanned data may be complete, or columns/tables may not exist yet.</p>
          )}
        </div>
      )}

      {/* Test data + management views */}
      {selectedCompany && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Generate test data */}
          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">Generate Test Data</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <Select
                  value={selectedScenario}
                  onValueChange={setSelectedScenario}
                  options={[
                    { label: 'Mixed (recommended)', value: 'mixed' },
                    { label: 'Critical only', value: 'critical' },
                    { label: 'Moderate only', value: 'moderate' },
                    { label: 'Clean (no issues)', value: 'clean' },
                  ]}
                  className={adminSelectCls}
                />
              </div>
              <button onClick={generateTestData} disabled={generating || !selectedCompany} className={btnPrimary}>
                {generating ? <><Spinner /><span className="ml-2">Generating...</span></> : <><Database className="w-4 h-4 mr-2" />Generate</>}
              </button>
            </div>
            <p className="text-[10px] text-theme-disabled">Creates synthetic reports &amp; items (marked as test data)</p>
          </div>

          {/* Management views */}
          <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-tertiary">Management Views</h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setOwnerModalOpen(true)} className={`${btnOutline} text-xs`}>
                <Building2 className="w-4 h-4 mr-1.5" />
                Owner Summary
              </button>
              {areas.map(area => (
                <button key={area.id} onClick={() => setAreaModal(area)} className={`${btnOutline} text-xs`}>
                  <MapPin className="w-4 h-4 mr-1.5" />
                  {area.name}
                </button>
              ))}
              {areas.length === 0 && (
                <span className="text-[10px] text-theme-disabled self-center">No areas configured</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content tabs */}
      {selectedCompany && (
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
            <TabsTrigger value="calendar">Calendar Tasks</TabsTrigger>
            <TabsTrigger value="delegations">Delegations &amp; Reminders</TabsTrigger>
          </TabsList>

          {/* ======== REPORTS TAB ======== */}
          <TabsContent value="reports" className="mt-4 space-y-3">
            {reports.length === 0 && !running && (
              <div className="text-center py-16 text-theme-disabled">
                No reports yet. Run a scan or generate test data.
              </div>
            )}

            {reports.map(report => {
              const isExpanded = expandedReportId === report.id
              const resolved = report.completed_items + report.ignored_items
              const pct = report.total_items > 0 ? Math.round((resolved / report.total_items) * 100) : 0
              const scoreDelta = report.previous_week_score != null && report.health_score != null
                ? report.health_score - report.previous_week_score
                : null

              return (
                <div key={report.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  {/* Report header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Expand toggle */}
                      <button onClick={() => loadReportItems(report.id)} className="text-theme-disabled hover:text-theme-tertiary transition-colors shrink-0">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>

                      {/* Site + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-theme-primary truncate">{report.site_name}</h3>
                          {statusIcon(report.status)}
                          {report.is_test_data && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">TEST</span>
                          )}
                        </div>
                        <div className="text-[10px] text-theme-disabled mt-0.5 flex gap-3 flex-wrap">
                          <span>{new Date(report.created_at).toLocaleString()}</span>
                          <span>Assigned: {report.assigned_name ?? 'Unknown'} ({report.assigned_role})</span>
                          {report.calendar_task_id && (
                            <span className="text-module-fg flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Calendar linked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <span className={`text-lg font-bold ${
                          report.health_score != null && report.health_score >= 80 ? 'text-module-fg'
                          : report.health_score != null && report.health_score >= 50 ? 'text-amber-400'
                          : 'text-red-400'
                        }`}>
                          {report.health_score != null ? `${Math.round(report.health_score)}%` : '—'}
                        </span>
                        {scoreDelta != null && scoreDelta !== 0 && (
                          <div className={`text-[10px] ${scoreDelta > 0 ? 'text-module-fg' : 'text-red-400'}`}>
                            {scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)}%
                          </div>
                        )}
                      </div>

                      {/* Severity pills */}
                      <div className="flex gap-1.5 text-[10px] shrink-0">
                        {report.critical_count > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">{report.critical_count} crit</span>}
                        {report.medium_count > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">{report.medium_count} med</span>}
                        {report.low_count > 0 && <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-theme-tertiary">{report.low_count} low</span>}
                      </div>

                      {/* Status breakdown */}
                      <div className="hidden xl:flex gap-1.5 text-[10px] shrink-0 border-l border-white/[0.06] pl-3">
                        {report.completed_items > 0 && <span className="text-module-fg">{report.completed_items} fixed</span>}
                        {report.delegated_items > 0 && <span className="text-purple-400">{report.delegated_items} delegated</span>}
                        {report.ignored_items > 0 && <span className="text-theme-disabled">{report.ignored_items} ignored</span>}
                        {report.escalated_items > 0 && <span className="text-red-400">{report.escalated_items} escalated</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); runAISuggestions(report.id) }}
                          disabled={aiRunning}
                          className="p-1.5 rounded-md hover:bg-module-fg/10 text-purple-400 transition-colors disabled:opacity-50"
                          title="Generate AI suggestions"
                        >
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSiteModalReportId(report.id); setSiteModalSiteId(report.site_id) }}
                          className="p-1.5 rounded-md hover:bg-white/[0.05] text-theme-disabled hover:text-theme-tertiary transition-colors"
                          title="Open in Site Manager modal"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    {report.total_items > 0 && (
                      <div className="mt-3 ml-8">
                        <div className="flex justify-between text-[10px] text-theme-disabled mb-1">
                          <span>{pct}% resolved ({resolved}/{report.total_items})</span>
                        </div>
                        <Progress value={pct} className="h-1" barClassName={pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'} />
                      </div>
                    )}
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] bg-white/[0.01] p-4 space-y-3">
                      {loadingItems ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-blue-500 rounded-full" />
                        </div>
                      ) : expandedItems.length === 0 ? (
                        <div className="text-center py-6 text-theme-disabled text-sm">No items in this report</div>
                      ) : (
                        <>
                          <div className="text-xs text-theme-tertiary mb-2">
                            {expandedItems.length} items — Fix to edit inline, Delegate to assign, Ignore to dismiss
                          </div>
                          {expandedItems.map(item => (
                            <HealthCheckItemCard
                              key={item.id}
                              item={item}
                              onFix={handleFix}
                              onIgnore={handleIgnore}
                              onDelegate={handleDelegate}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </TabsContent>

          {/* ======== CALENDAR TASKS TAB ======== */}
          <TabsContent value="calendar" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-theme-tertiary">Calendar Tasks Created by Health Check</h2>
              <button onClick={loadCalendarTasks} className={`${btnGhost} h-8 px-3 text-xs`}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
              </button>
            </div>

            {loadingCalendar ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-blue-500 rounded-full" />
              </div>
            ) : calendarTasks.length === 0 ? (
              <div className="text-center py-12 text-theme-disabled">
                No calendar tasks yet. Run a real scan (not test data) to create calendar tasks.
              </div>
            ) : (
              <div className="space-y-2">
                {calendarTasks.map(task => {
                  const breakdown = task.task_data?.severity_breakdown
                  const linkedReportId = task.task_data?.health_check_report_id
                  return (
                    <div key={task.id} className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-module-fg" />
                            <h4 className="text-sm font-medium text-theme-primary">{task.custom_name}</h4>
                          </div>
                          <div className="text-[10px] text-theme-disabled mt-1 flex gap-3 flex-wrap">
                            <span>Due: {task.due_date} {task.due_time ?? ''}</span>
                            <span>Priority: <span className={task.priority === 'high' ? 'text-red-400' : 'text-amber-400'}>{task.priority}</span></span>
                            <span>Status: {task.status}</span>
                            {task.assigned_name && <span>Assigned: {task.assigned_name}</span>}
                          </div>
                          {breakdown && (
                            <div className="flex gap-2 mt-2 text-[10px]">
                              {breakdown.critical > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">{breakdown.critical} critical</span>}
                              {breakdown.medium > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">{breakdown.medium} medium</span>}
                              {breakdown.low > 0 && <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-theme-tertiary">{breakdown.low} low</span>}
                            </div>
                          )}
                        </div>
                        {linkedReportId && (
                          <button
                            onClick={() => { setSiteModalReportId(linkedReportId); setSiteModalSiteId(null) }}
                            className="text-xs text-module-fg hover:text-cyan-300 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Report
                          </button>
                        )}
                      </div>
                      <details className="mt-2">
                        <summary className="text-[10px] text-white/20 cursor-pointer hover:text-theme-tertiary">Raw task_data</summary>
                        <pre className="mt-1 text-[10px] text-theme-disabled bg-black/20 rounded p-2 overflow-x-auto">
                          {JSON.stringify(task.task_data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ======== DELEGATIONS & REMINDERS TAB ======== */}
          <TabsContent value="delegations" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-theme-tertiary">Delegated &amp; Escalated Items</h2>
              <button onClick={loadDelegations} className={`${btnGhost} h-8 px-3 text-xs`}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
              </button>
            </div>

            {loadingDelegations ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-blue-500 rounded-full" />
              </div>
            ) : (
              <>
                {delegatedItems.length === 0 ? (
                  <div className="text-center py-8 text-theme-disabled text-sm">
                    No delegated items. Expand a report, then click Delegate on an item to test.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {delegatedItems.map(item => {
                      const modColors = MODULE_BADGE_COLOURS[item.module as HealthCheckModule]
                      return (
                        <div key={item.id} className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {item.status === 'escalated'
                                  ? <ArrowUpRight className="w-4 h-4 text-red-400" />
                                  : <MessageSquare className="w-4 h-4 text-purple-400" />
                                }
                                <h4 className="text-sm font-medium text-theme-primary">{item.title}</h4>
                                {modColors && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${modColors.bg} ${modColors.text}`}>{item.module}</span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  item.severity === 'critical' ? 'bg-red-500/20 text-red-400'
                                  : item.severity === 'medium' ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-white/[0.05] text-theme-tertiary'
                                }`}>{item.severity}</span>
                                <span className={`text-[10px] font-medium ${item.status === 'escalated' ? 'text-red-400' : 'text-purple-400'}`}>
                                  {item.status}
                                </span>
                              </div>
                              {item.record_name && <p className="text-xs text-theme-tertiary">{item.record_name}</p>}

                              <div className="text-[10px] text-theme-disabled mt-2 space-y-1">
                                {item.delegated_to_name && (
                                  <div>Delegated to: <span className="text-theme-tertiary">{item.delegated_to_name}</span> by {item.delegated_by_name ?? 'Unknown'}</div>
                                )}
                                {item.delegated_at && <div>Delegated: {new Date(item.delegated_at).toLocaleString()}</div>}
                                {item.due_date && (
                                  <div>Due: <span className={new Date(item.due_date) < new Date() ? 'text-red-400' : 'text-theme-tertiary'}>{new Date(item.due_date).toLocaleDateString()}</span></div>
                                )}
                                {item.delegation_message && (
                                  <div className="p-2 mt-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
                                    &ldquo;{item.delegation_message}&rdquo;
                                  </div>
                                )}
                                {item.conversation_id && (
                                  <div className="flex items-center gap-1 text-module-fg">
                                    <MessageSquare className="w-3 h-3" /> Conversation: {item.conversation_id.slice(0, 8)}...
                                  </div>
                                )}
                                <div className="flex gap-3 mt-1 pt-1 border-t border-white/[0.04]">
                                  <span>Reminders sent: <span className="text-theme-tertiary">{item.reminder_count}</span></span>
                                  {item.last_reminder_sent && <span>Last: {new Date(item.last_reminder_sent).toLocaleString()}</span>}
                                  {item.next_reminder_at && <span>Next: {new Date(item.next_reminder_at).toLocaleString()}</span>}
                                </div>
                                {item.status === 'escalated' && item.escalation_reason && (
                                  <div className="p-2 mt-1 rounded bg-red-500/10 border border-red-500/20 text-red-300">
                                    Escalated: {item.escalation_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                            {item.site_name && <span className="text-[10px] text-white/20 shrink-0">{item.site_name}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Reminders */}
                <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                  <h2 className="text-sm font-medium text-theme-tertiary flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Scheduled Reminders ({reminders.length})
                  </h2>
                  {reminders.length === 0 ? (
                    <div className="text-center py-6 text-theme-disabled text-sm">
                      No reminders. Delegate an item with a due date to create reminders.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map(r => (
                        <div key={r.id} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${r.sent_at ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-theme-tertiary">
                              <span className="font-medium capitalize">{r.reminder_type.replace('_', ' ')}</span>
                              {r.item_title && <span className="text-theme-disabled"> — {r.item_title}</span>}
                            </div>
                            {r.message_content && <p className="text-[10px] text-theme-disabled mt-0.5 truncate">{r.message_content}</p>}
                          </div>
                          <div className="text-[10px] text-theme-disabled text-right shrink-0">
                            <div>Scheduled: {new Date(r.scheduled_for).toLocaleString()}</div>
                            {r.sent_at ? (
                              <div className="text-module-fg">Sent: {new Date(r.sent_at).toLocaleString()}</div>
                            ) : (
                              <div className="text-amber-400">Pending</div>
                            )}
                            {r.sent_to_name && <div>To: {r.sent_to_name}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!selectedCompany && (
        <div className="text-center py-20 text-theme-disabled">Select a company above to start testing</div>
      )}

      {/* ======== MODALS ======== */}
      <SiteManagerModal
        open={!!siteModalReportId}
        onClose={() => { setSiteModalReportId(null); loadReports() }}
        reportId={siteModalReportId}
        companyId={selectedCompany}
        siteId={siteModalSiteId}
      />

      {areaModal && (
        <AreaManagerModal
          open={!!areaModal}
          onClose={() => setAreaModal(null)}
          areaId={areaModal.id}
          areaName={areaModal.name}
          companyId={selectedCompany}
        />
      )}

      <OwnerSummaryModal
        open={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
        companyId={selectedCompany}
      />

      <DelegationDialog
        open={!!delegatingItem}
        onClose={() => { setDelegatingItem(null); setDelegatingSiteId(null) }}
        item={delegatingItem}
        companyId={selectedCompany}
        siteId={delegatingSiteId}
        onDelegated={() => {
          setDelegatingItem(null)
          setDelegatingSiteId(null)
          toast.success('Item delegated')
          if (expandedReportId) {
            const rid = expandedReportId
            setExpandedReportId(null)
            setTimeout(() => loadReportItems(rid), 100)
          }
          loadReports()
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAllData}
        title="Clear Health Check Data"
        description="This will permanently delete all health check reports, items, reminders, and history for this company."
        confirmText="Delete All"
        variant="destructive"
      />
    </div>
  )
}
