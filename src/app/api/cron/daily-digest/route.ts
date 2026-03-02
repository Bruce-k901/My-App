import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'

// Module accent colours and light background tints for the email
const MODULE_THEME: Record<string, { accent: string; bg: string }> = {
  checkly: { accent: '#B8860B', bg: '#FFFBEB' },
  teamly: { accent: '#BE185D', bg: '#FDF2F8' },
  stockly: { accent: '#0F766E', bg: '#F0FDFA' },
  planly: { accent: '#15803D', bg: '#F0FDF4' },
  assetly: { accent: '#92400E', bg: '#FFF7ED' },
}

// ---------------------------------------------------------------------------
// Safe query wrapper — returns empty array on any error (including missing tables)
// ---------------------------------------------------------------------------
async function safeQuery<T>(
  label: string,
  queryFn: () => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  try {
    const { data, error } = await queryFn()
    if (error) {
      if (error.code === '42P01') {
        console.log(`[Digest] table not found for ${label}, skipping`)
      } else {
        console.warn(`[Digest] ${label} query error:`, error.message)
      }
      return []
    }
    return data || []
  } catch (err: any) {
    console.warn(`[Digest] ${label} exception:`, err.message)
    return []
  }
}

// ---------------------------------------------------------------------------
// Per-module data fetchers
// ---------------------------------------------------------------------------

interface ChecklyRaw {
  tasks: any[]
  overdueTasks: any[]
  tempLogs: any[]
  tempFailures: any[]
  incidents: any[]
}

async function fetchChecklyData(
  supabase: any, companyId: string, siteIds: string[],
  yesterdayStr: string, yesterdayStart: string, yesterdayEnd: string
): Promise<ChecklyRaw> {
  const [tasks, overdueTasks, tempLogs, tempFailures, incidents] = await Promise.all([
    safeQuery('checklist_tasks', () =>
      supabase.from('checklist_tasks')
        .select('id, site_id, status, priority, custom_name, template:task_templates(name)')
        .eq('company_id', companyId)
        .eq('due_date', yesterdayStr)
    ),
    safeQuery('overdue_tasks', () =>
      supabase.from('checklist_tasks')
        .select('id, site_id, status, priority, custom_name, due_date, template:task_templates(name)')
        .eq('company_id', companyId)
        .lt('due_date', yesterdayStr)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(200)
    ),
    safeQuery('temp_logs', () =>
      supabase.from('temperature_logs')
        .select('id, site_id, status')
        .eq('company_id', companyId)
        .gte('recorded_at', yesterdayStart)
        .lte('recorded_at', yesterdayEnd)
    ),
    safeQuery('temp_failures', () =>
      supabase.from('temperature_logs')
        .select('id, site_id')
        .eq('company_id', companyId)
        .gte('recorded_at', yesterdayStart)
        .lte('recorded_at', yesterdayEnd)
        .in('status', ['failed', 'critical', 'breach', 'out_of_range'])
    ),
    safeQuery('incidents', () =>
      supabase.from('incidents')
        .select('id, site_id, severity, title, status')
        .eq('company_id', companyId)
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)
    ),
  ])
  return { tasks, overdueTasks, tempLogs, tempFailures, incidents }
}

interface TeamlyRaw {
  shifts: any[]
  leaveRequests: any[]
  expiringProfiles: any[]
  trainingCompleted: any[]
}

async function fetchTeamlyData(
  supabase: any, companyId: string, siteIds: string[],
  yesterdayStr: string, yesterdayStart: string, yesterdayEnd: string
): Promise<TeamlyRaw> {
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [shifts, leaveRequests, expiringProfiles, trainingCompleted] = await Promise.all([
    siteIds.length > 0
      ? safeQuery('rota_shifts', () =>
          supabase.from('rota_shifts')
            .select('id, site_id, profile_id, status')
            .in('site_id', siteIds)
            .eq('shift_date', yesterdayStr)
            .not('profile_id', 'is', null)
        )
      : Promise.resolve([]),
    safeQuery('leave_requests', () =>
      supabase.from('leave_requests')
        .select('id, profile_id, status')
        .eq('company_id', companyId)
        .gte('requested_at', yesterdayStart)
        .lte('requested_at', yesterdayEnd)
    ),
    safeQuery('expiring_certs', () =>
      supabase.from('profiles')
        .select('id, full_name, site_id, food_safety_expiry_date, first_aid_expiry_date, fire_marshal_expiry_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .or(`food_safety_expiry_date.lte.${thirtyDaysOut},first_aid_expiry_date.lte.${thirtyDaysOut},fire_marshal_expiry_date.lte.${thirtyDaysOut}`)
    ),
    safeQuery('training_completed', () =>
      supabase.from('training_records')
        .select('id, profile_id')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('completed_at', yesterdayStart)
        .lte('completed_at', yesterdayEnd)
    ),
  ])
  return { shifts, leaveRequests, expiringProfiles, trainingCompleted }
}

interface StocklyRaw {
  movements: any[]
}

async function fetchStocklyData(
  supabase: any, companyId: string,
  yesterdayStart: string, yesterdayEnd: string
): Promise<StocklyRaw> {
  const [movements] = await Promise.all([
    safeQuery('stock_movements', () =>
      supabase.from('stock_movements')
        .select('id, movement_type, quantity')
        .eq('company_id', companyId)
        .gte('recorded_at', yesterdayStart)
        .lte('recorded_at', yesterdayEnd)
    ),
  ])
  return { movements }
}

interface PlanlyRaw {
  orders: any[]
}

async function fetchPlanlyData(
  supabase: any, siteIds: string[], yesterdayStr: string
): Promise<PlanlyRaw> {
  if (siteIds.length === 0) return { orders: [] }

  const customers = await safeQuery<any>('planly_customers', () =>
    supabase.from('planly_customers')
      .select('id, site_id')
      .in('site_id', siteIds)
      .eq('is_active', true)
  )
  const customerIds = customers.map((c: any) => c.id)
  if (customerIds.length === 0) return { orders: [] }

  const orders = await safeQuery<any>('planly_orders', () =>
    supabase.from('planly_orders')
      .select('id, customer_id, status')
      .in('customer_id', customerIds)
      .eq('delivery_date', yesterdayStr)
  )

  const custSiteMap = new Map<string, string>()
  for (const c of customers) custSiteMap.set(c.id, c.site_id)
  for (const o of orders) o._site_id = custSiteMap.get(o.customer_id) || null

  return { orders }
}

interface AssetlyRaw {
  issueAssets: any[]
  ppmTasks: any[]
}

async function fetchAssetlyData(
  supabase: any, companyId: string, siteIds: string[], yesterdayStr: string
): Promise<AssetlyRaw> {
  const [issueAssets, ppmTasks] = await Promise.all([
    safeQuery('assets_issues', () =>
      supabase.from('assets')
        .select('id, name, site_id, status')
        .eq('company_id', companyId)
        .in('status', ['needs_repair', 'out_of_service'])
        .gte('updated_at', `${yesterdayStr}T00:00:00Z`)
        .lte('updated_at', `${yesterdayStr}T23:59:59Z`)
    ),
    siteIds.length > 0
      ? safeQuery('ppm_tasks', () =>
          supabase.from('ppm_tasks')
            .select('id, site_id, task_name, due_date, last_completed')
            .in('site_id', siteIds)
            .eq('due_date', yesterdayStr)
        )
      : Promise.resolve([]),
  ])
  return { issueAssets, ppmTasks }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTaskName(task: any): string {
  return task.custom_name || task.template?.name || 'Unnamed task'
}

function getExpiringCertDetails(profiles: any[], thirtyDaysOut: string, siteFilter?: string | null): string[] {
  const details: string[] = []
  for (const p of profiles) {
    if (siteFilter && p.site_id !== siteFilter) continue
    const name = p.full_name || 'Staff member'
    if (p.food_safety_expiry_date && p.food_safety_expiry_date <= thirtyDaysOut) {
      details.push(`${name} — Food Safety (${p.food_safety_expiry_date})`)
    }
    if (p.first_aid_expiry_date && p.first_aid_expiry_date <= thirtyDaysOut) {
      details.push(`${name} — First Aid (${p.first_aid_expiry_date})`)
    }
    if (p.fire_marshal_expiry_date && p.fire_marshal_expiry_date <= thirtyDaysOut) {
      details.push(`${name} — Fire Marshal (${p.fire_marshal_expiry_date})`)
    }
  }
  return details
}

function countExpiringCerts(profiles: any[], thirtyDaysOut: string, siteFilter?: string | null): number {
  let count = 0
  for (const p of profiles) {
    if (siteFilter && p.site_id !== siteFilter) continue
    if (p.food_safety_expiry_date && p.food_safety_expiry_date <= thirtyDaysOut) count++
    if (p.first_aid_expiry_date && p.first_aid_expiry_date <= thirtyDaysOut) count++
    if (p.fire_marshal_expiry_date && p.fire_marshal_expiry_date <= thirtyDaysOut) count++
  }
  return count
}

// ---------------------------------------------------------------------------
// HTML builders
// ---------------------------------------------------------------------------

interface StatItem {
  label: string
  value: string | number
  alert?: boolean
  warn?: boolean
}

function buildModuleSection(
  title: string,
  accent: string,
  bgTint: string,
  stats: StatItem[],
  details?: string[]
): string {
  const statRows = stats.map(s => {
    const valColour = s.alert ? '#DC2626' : s.warn ? '#B45309' : '#111827'
    const valWeight = (s.alert || s.warn) ? '700' : '600'
    return `
      <tr>
        <td style="padding: 5px 0; color: #6b7280; font-size: 13px; width: 55%;">${s.label}</td>
        <td style="padding: 5px 0; color: ${valColour}; font-size: 13px; font-weight: ${valWeight}; text-align: right;">${s.value}</td>
      </tr>`
  }).join('')

  const detailHtml = details && details.length > 0 ? `
    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.06);">
      ${details.map(d => `<div style="color: #6b7280; font-size: 12px; padding: 2px 0; line-height: 1.4;">&bull; ${d}</div>`).join('')}
    </div>` : ''

  return `
  <div style="margin-bottom: 16px; border-left: 4px solid ${accent}; padding: 14px 16px; background: ${bgTint}; border-radius: 0 8px 8px 0;">
    <div style="color: ${accent}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px;">${title}</div>
    <table cellpadding="0" cellspacing="0" style="width: 100%;">
      ${statRows}
    </table>
    ${detailHtml}
  </div>`
}

// ---------------------------------------------------------------------------
// Main route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Daily digest: unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Daily digest starting...')

    const supabase = getSupabaseAdmin()
    const now = new Date()

    // Yesterday's date range
    const yesterday = new Date(now)
    yesterday.setUTCDate(now.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const yesterdayStart = `${yesterdayStr}T00:00:00Z`
    const yesterdayEnd = `${yesterdayStr}T23:59:59Z`
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const yesterdayFormatted = yesterday.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // 1. Get all companies
    const { data: companies, error: compErr } = await supabase
      .from('companies')
      .select('id, name')

    if (compErr || !companies?.length) {
      return NextResponse.json({ error: compErr?.message || 'No companies found' }, { status: 500 })
    }

    let totalSent = 0
    let totalSkipped = 0
    const errors: string[] = []
    const companyResults: { company: string; recipients: number; recipientList: string[] }[] = []

    for (const company of companies) {
      try {
        // Timeout safety — bail at 50s (Vercel maxDuration is 60s)
        if (Date.now() - startTime > 50_000) {
          console.warn('[Cron] Digest: approaching timeout, stopping')
          break
        }

        // 2. Get managers/admins for this company
        const { data: recipients, error: recipErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, app_role, site_id')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .in('app_role', ['Admin', 'Owner', 'General Manager', 'Area Manager', 'Ops Manager'])

        if (recipErr) {
          console.warn(`[Digest] recipient query error for ${company.name}:`, recipErr.message)
        }
        if (!recipients?.length) {
          companyResults.push({ company: company.name, recipients: 0, recipientList: [] })
          continue
        }

        companyResults.push({
          company: company.name,
          recipients: recipients.length,
          recipientList: recipients.map(r => `${r.full_name} <${r.email}> (${r.app_role})`),
        })

        // 3. Get sites
        const { data: sites } = await supabase
          .from('sites').select('id, name').eq('company_id', company.id)

        const siteMap = new Map<string, string>()
        for (const s of sites || []) siteMap.set(s.id, s.name)
        const siteIds = Array.from(siteMap.keys())

        // 4. Fetch ALL module data in parallel (no gating on company_modules)
        const [checklyResult, teamlyResult, stocklyResult, planlyResult, assetlyResult] =
          await Promise.allSettled([
            fetchChecklyData(supabase, company.id, siteIds, yesterdayStr, yesterdayStart, yesterdayEnd),
            fetchTeamlyData(supabase, company.id, siteIds, yesterdayStr, yesterdayStart, yesterdayEnd),
            fetchStocklyData(supabase, company.id, yesterdayStart, yesterdayEnd),
            fetchPlanlyData(supabase, siteIds, yesterdayStr),
            fetchAssetlyData(supabase, company.id, siteIds, yesterdayStr),
          ])

        const checkly = checklyResult.status === 'fulfilled' ? checklyResult.value : null
        const teamly = teamlyResult.status === 'fulfilled' ? teamlyResult.value : null
        const stockly = stocklyResult.status === 'fulfilled' ? stocklyResult.value : null
        const planly = planlyResult.status === 'fulfilled' ? planlyResult.value : null
        const assetly = assetlyResult.status === 'fulfilled' ? assetlyResult.value : null

        // 5. Send email to each recipient
        for (const recipient of recipients) {
          if (!recipient.email) {
            totalSkipped++
            continue
          }

          const isCompanyWide = ['Admin', 'Owner', 'Area Manager', 'Ops Manager'].includes(recipient.app_role || '')
          const siteFilter = isCompanyWide ? null : recipient.site_id
          const siteName = siteFilter ? (siteMap.get(siteFilter) || 'Your Site') : 'All Sites'
          const firstName = (recipient.full_name || 'Manager').split(' ')[0]
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.opslytech.com'

          // Build module sections — only include sections that have data
          const sections: string[] = []
          let hasAlerts = false
          let hasWarnings = false

          // --- CHECKLY ---
          if (checkly) {
            const bySite = (arr: any[]) => siteFilter ? arr.filter(i => i.site_id === siteFilter) : arr
            const tasks = bySite(checkly.tasks)
            const completed = tasks.filter(t => t.status === 'completed').length
            const missed = tasks.filter(t => t.status === 'missed' || t.status === 'failed').length
            const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
            const total = tasks.length
            const overdue = bySite(checkly.overdueTasks)
            const overdueCount = overdue.length
            const tempTotal = bySite(checkly.tempLogs).length
            const tempFail = bySite(checkly.tempFailures).length
            const incidents = bySite(checkly.incidents)
            const incidentCount = incidents.length
            const criticalIncidents = incidents.filter(i => ['major', 'critical', 'fatality'].includes(i.severity)).length

            if (tempFail > 0 || criticalIncidents > 0) hasAlerts = true
            if (overdueCount > 0 || missed > 0) hasWarnings = true

            // Only show if there's any data at all
            if (total > 0 || overdueCount > 0 || tempTotal > 0 || incidentCount > 0) {
              const stats: StatItem[] = []
              if (total > 0) {
                const pct = Math.round((completed / total) * 100)
                stats.push({ label: 'Tasks completed', value: `${completed} of ${total} (${pct}%)` })
                if (missed > 0) stats.push({ label: 'Missed / failed', value: missed, alert: true })
                if (pending > 0) stats.push({ label: 'Still pending', value: pending, warn: true })
              }
              if (overdueCount > 0) stats.push({ label: 'Overdue tasks', value: overdueCount, warn: true })
              if (tempTotal > 0) stats.push({ label: 'Temperature checks', value: `${tempTotal} recorded` })
              if (tempFail > 0) stats.push({ label: 'Temperature failures', value: tempFail, alert: true })
              if (incidentCount > 0) stats.push({ label: 'Incidents reported', value: incidentCount, alert: criticalIncidents > 0 })

              // Detail items
              const details: string[] = []
              if (overdueCount > 0) {
                const topOverdue = overdue.slice(0, 5)
                for (const t of topOverdue) {
                  details.push(`Overdue: ${getTaskName(t)} (due ${t.due_date})`)
                }
                if (overdueCount > 5) details.push(`...and ${overdueCount - 5} more overdue`)
              }
              if (incidentCount > 0) {
                for (const inc of incidents.slice(0, 3)) {
                  const sev = inc.severity ? ` [${inc.severity}]` : ''
                  details.push(`${inc.title || 'Incident'}${sev}`)
                }
              }

              sections.push(buildModuleSection(
                'Checkly — Tasks & Compliance',
                MODULE_THEME.checkly.accent, MODULE_THEME.checkly.bg,
                stats, details.length > 0 ? details : undefined
              ))
            }
          }

          // --- TEAMLY ---
          if (teamly) {
            const bySite = (arr: any[]) => siteFilter ? arr.filter(i => i.site_id === siteFilter) : arr
            const shifts = bySite(teamly.shifts)
            const totalShifts = shifts.length
            const noShows = shifts.filter(s => ['missed', 'no_show'].includes(s.status)).length
            const cancelled = shifts.filter(s => s.status === 'cancelled').length
            const leaveReqs = teamly.leaveRequests.length
            const expiringCerts = countExpiringCerts(teamly.expiringProfiles, thirtyDaysOut, siteFilter)
            const trainingDone = teamly.trainingCompleted.length

            if (noShows > 0) hasAlerts = true
            if (expiringCerts > 0) hasWarnings = true

            if (totalShifts > 0 || leaveReqs > 0 || expiringCerts > 0 || trainingDone > 0) {
              const stats: StatItem[] = []
              if (totalShifts > 0) {
                stats.push({ label: 'Shifts scheduled', value: totalShifts })
                if (noShows > 0) stats.push({ label: 'No-shows', value: noShows, alert: true })
                if (cancelled > 0) stats.push({ label: 'Cancelled shifts', value: cancelled })
              }
              if (leaveReqs > 0) stats.push({ label: 'New leave requests', value: leaveReqs })
              if (trainingDone > 0) stats.push({ label: 'Training sessions completed', value: trainingDone })
              if (expiringCerts > 0) stats.push({ label: 'Expiring certifications', value: `${expiringCerts} within 30 days`, warn: true })

              // Detail: list expiring cert names (top 5)
              const certDetails = getExpiringCertDetails(teamly.expiringProfiles, thirtyDaysOut, siteFilter)
              const details = certDetails.slice(0, 5)
              if (certDetails.length > 5) details.push(`...and ${certDetails.length - 5} more`)

              sections.push(buildModuleSection(
                'Teamly — People & Schedules',
                MODULE_THEME.teamly.accent, MODULE_THEME.teamly.bg,
                stats, details.length > 0 ? details : undefined
              ))
            }
          }

          // --- STOCKLY ---
          if (stockly && stockly.movements.length > 0) {
            const movements = stockly.movements
            const totalMov = movements.length
            const deliveries = movements.filter(m => m.movement_type === 'delivery' || m.movement_type === 'in').length
            const waste = movements.filter(m => m.movement_type === 'waste').length
            const counts = movements.filter(m => m.movement_type === 'count').length
            const transfers = movements.filter(m => m.movement_type === 'transfer').length

            const stats: StatItem[] = [
              { label: 'Total stock movements', value: totalMov },
            ]
            if (deliveries > 0) stats.push({ label: 'Deliveries received', value: deliveries })
            if (waste > 0) stats.push({ label: 'Waste recorded', value: waste, warn: waste > 3 })
            if (counts > 0) stats.push({ label: 'Stock counts', value: counts })
            if (transfers > 0) stats.push({ label: 'Transfers', value: transfers })

            sections.push(buildModuleSection(
              'Stockly — Inventory',
              MODULE_THEME.stockly.accent, MODULE_THEME.stockly.bg,
              stats
            ))
          }

          // --- PLANLY ---
          if (planly) {
            const bySite = (arr: any[]) => siteFilter ? arr.filter(i => i._site_id === siteFilter) : arr
            const orders = bySite(planly.orders)
            const totalOrders = orders.length
            const delivered = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length
            const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length

            if (totalOrders > 0) {
              const stats: StatItem[] = [
                { label: 'Total orders', value: totalOrders },
                { label: 'Delivered / completed', value: delivered },
              ]
              if (pending > 0) stats.push({ label: 'Pending / confirmed', value: pending })

              sections.push(buildModuleSection(
                'Planly — Production & Orders',
                MODULE_THEME.planly.accent, MODULE_THEME.planly.bg,
                stats
              ))
            }
          }

          // --- ASSETLY ---
          if (assetly) {
            const bySite = (arr: any[]) => siteFilter ? arr.filter(i => i.site_id === siteFilter) : arr
            const issues = bySite(assetly.issueAssets)
            const ppm = bySite(assetly.ppmTasks)
            const ppmCompleted = ppm.filter(t => t.last_completed && t.last_completed >= yesterdayStr).length
            const ppmDue = ppm.length

            if (issues.length > 0) hasWarnings = true

            if (issues.length > 0 || ppmDue > 0) {
              const stats: StatItem[] = []
              if (issues.length > 0) stats.push({ label: 'Asset issues reported', value: issues.length, warn: true })
              if (ppmDue > 0) {
                stats.push({ label: 'PPM tasks due', value: ppmDue })
                stats.push({ label: 'PPM completed', value: ppmCompleted })
              }

              const details: string[] = []
              for (const a of issues.slice(0, 4)) {
                details.push(`${a.name} — ${a.status === 'out_of_service' ? 'Out of service' : 'Needs repair'}`)
              }
              if (issues.length > 4) details.push(`...and ${issues.length - 4} more`)

              sections.push(buildModuleSection(
                'Assetly — Assets & Maintenance',
                MODULE_THEME.assetly.accent, MODULE_THEME.assetly.bg,
                stats, details.length > 0 ? details : undefined
              ))
            }
          }

          // If no sections have data, add a quiet "all clear" note
          if (sections.length === 0) {
            sections.push(`
  <div style="text-align: center; padding: 24px 16px; color: #9ca3af; font-size: 14px;">
    No notable activity recorded yesterday.
  </div>`)
          }

          // Status
          const statusColor = hasAlerts ? '#DC2626' : hasWarnings ? '#B45309' : '#059669'
          const statusBg = hasAlerts ? '#FEF2F2' : hasWarnings ? '#FFFBEB' : '#F0FDF4'
          const statusLabel = hasAlerts ? 'Action Required' : hasWarnings ? 'Needs Attention' : 'All Clear'
          const statusEmoji = hasAlerts ? '\u{1F534}' : hasWarnings ? '\u{1F7E1}' : '\u{1F7E2}'

          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yesterday's Ops Summary — ${company.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">Opsly</span>
    </div>

    <!-- Main Card -->
    <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">

      <!-- Accent bar -->
      <div style="height: 4px; background: linear-gradient(90deg, #D37E91 0%, #9A8EC9 50%, #789A99 100%);"></div>

      <!-- Title Block -->
      <div style="padding: 28px 32px 0;">
        <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #111827;">Yesterday's Ops Summary</h1>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">${yesterdayFormatted}</p>
      </div>

      <!-- Status Banner -->
      <div style="margin: 20px 32px 0;">
        <div style="background: ${statusBg}; border: 1px solid ${statusColor}20; border-radius: 8px; padding: 12px 16px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; margin-right: 8px; vertical-align: middle;"></span>
          <span style="color: ${statusColor}; font-size: 13px; font-weight: 700; vertical-align: middle;">${statusLabel}</span>
          <span style="color: #9ca3af; font-size: 13px; margin-left: 6px; vertical-align: middle;">&middot; ${siteName}</span>
        </div>
      </div>

      <!-- Greeting -->
      <div style="padding: 20px 32px 4px;">
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">
          Good morning ${firstName}, here's what happened yesterday at <strong>${company.name}</strong>.
        </p>
      </div>

      <!-- Module Sections -->
      <div style="padding: 16px 32px 28px;">
        ${sections.join('\n')}
      </div>

      <!-- CTA -->
      <div style="padding: 0 32px 32px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation">
          <tr>
            <td align="center" style="padding: 0;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appUrl}/dashboard" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" fillcolor="#D37E91" strokecolor="#D37E91" strokeweight="0">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Open Dashboard</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${appUrl}/dashboard" target="_blank"
                 style="background-color: #D37E91; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; display: inline-block;">
                Open Dashboard
              </a>
              <!--<![endif]-->
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 0 12px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" role="presentation">
        <tr>
          <td align="center" style="padding: 0 0 14px; color: #9ca3af; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
            ${company.name} &middot; ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0;">
            <span style="color: #b0b5bd; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">Powered by </span><span style="color: #1B2624; font-size: 13px; font-weight: 500; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; letter-spacing: -0.3px;">opsly</span>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`.trim()

          const result = await sendEmail({
            to: recipient.email,
            subject: `${statusEmoji} Yesterday's Ops Summary \u00b7 ${siteName} \u00b7 ${yesterdayFormatted}`,
            html,
          })

          if (result.success) {
            totalSent++
          } else if (result.skipped) {
            totalSkipped++
          } else {
            errors.push(`Failed for ${recipient.email}: ${result.error}`)
          }

          // Resend free tier: 2 req/sec — delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 600))
        }

        // In-app notification (non-blocking)
        try {
          await supabase.from('notifications').insert({
            company_id: company.id,
            profile_id: recipients[0]?.id,
            type: 'digest',
            title: 'Daily Operations Summary',
            message: `Yesterday's digest sent to ${recipients.length} recipient(s)`,
            read: false,
          })
        } catch (notifErr: any) {
          console.warn(`[Digest] notification insert failed for ${company.name}:`, notifErr.message)
        }
      } catch (companyErr: any) {
        errors.push(`Company ${company.name}: ${companyErr.message}`)
      }
    }

    const duration = Date.now() - startTime
    console.log('[Cron] Daily digest complete:', {
      totalSent,
      totalSkipped,
      errors: errors.length,
      duration_ms: duration,
      timestamp: now.toISOString(),
    })

    return NextResponse.json({
      success: true,
      companies: companies.length,
      sent: totalSent,
      skipped: totalSkipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
      companyResults,
      duration_ms: duration,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('[Cron] Daily digest error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggers (e.g. admin tools, testing)
export async function POST(request: NextRequest) {
  return GET(request)
}
