import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'

// ───────────────────────────────────────────────────────────────────────────
// MODULE BRAND COLORS — March 2026 Rebrand
// For email (light background): use "dark" color for accents
// ───────────────────────────────────────────────────────────────────────────

const MODULE_THEME: Record<string, { accent: string; bg: string; name: string }> = {
  checkly: { accent: '#7E8052', bg: '#FDFCF8', name: 'Checkly' },      // Olive Gold
  teamly: { accent: '#3B0A0A', bg: '#FEF7F7', name: 'Teamly' },        // Crimson Smoke dark
  stockly: { accent: '#1B4242', bg: '#F0FFFE', name: 'Stockly' },      // Teal Depth
  assetly: { accent: '#002B36', bg: '#F0FFFE', name: 'Assetly' },      // Deep Teal
  planly: { accent: '#4E7E5D', bg: '#F8FBF8', name: 'Planly' },        // Forest Green
  calendar: { accent: '#7B8FA1', bg: '#F9FAFB', name: 'Your Day' },    // Storm Marble mid
}

// Brand CTA colour
const BRAND_CTA = '#8A2B2B' // Crimson Smoke mid

// ───────────────────────────────────────────────────────────────────────────
// Safe query wrapper
// ───────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────
// DATA FETCHERS
// ───────────────────────────────────────────────────────────────────────────

// 1. COMPLIANCE DATA (PRIORITY)
interface ComplianceData {
  completionRate: number
  totalDue: number
  completed: number
  missed: number
  overdueTasks: any[]
  overdueCount: number
  tempFailures: any[]
  incidents: any[]
}

async function fetchComplianceData(
  supabase: any,
  companyId: string,
  siteId: string | null,
  yesterdayStr: string,
  todayStr: string,
  yesterdayStart: string,
  yesterdayEnd: string
): Promise<ComplianceData> {
  // Tasks due YESTERDAY
  let tasksQuery = supabase
    .from('checklist_tasks')
    .select('id, site_id, status, custom_name, template:task_templates(name)')
    .eq('company_id', companyId)
    .eq('due_date', yesterdayStr)

  if (siteId) tasksQuery = tasksQuery.eq('site_id', siteId)
  const tasks = await safeQuery('yesterday_tasks', () => tasksQuery)

  const completed = tasks.filter(t => t.status === 'completed').length
  const missed = tasks.filter(t => ['missed', 'failed'].includes(t.status)).length
  const totalDue = tasks.length
  const completionRate = totalDue > 0 ? Math.round((completed / totalDue) * 100) : 100

  // Overdue tasks (tasks due BEFORE today that are still pending)
  let overdueQuery = supabase
    .from('checklist_tasks')
    .select('id, site_id, custom_name, due_date, priority, template:task_templates(name)')
    .eq('company_id', companyId)
    .lt('due_date', todayStr)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .order('priority', { ascending: false })
    .limit(10) // Only fetch top 10 most urgent

  if (siteId) overdueQuery = overdueQuery.eq('site_id', siteId)
  const overdueTasks = await safeQuery('overdue_tasks', () => overdueQuery)

  // Get total overdue count separately
  let overdueCountQuery = supabase
    .from('checklist_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .lt('due_date', todayStr)
    .in('status', ['pending', 'in_progress'])

  if (siteId) overdueCountQuery = overdueCountQuery.eq('site_id', siteId)
  const { count: overdueCount } = await overdueCountQuery

  // Temperature failures from yesterday
  let tempQuery = supabase
    .from('temperature_logs')
    .select('id, site_id, equipment_name, recorded_temp, status')
    .eq('company_id', companyId)
    .gte('recorded_at', yesterdayStart)
    .lte('recorded_at', yesterdayEnd)
    .in('status', ['failed', 'critical', 'breach', 'out_of_range'])

  if (siteId) tempQuery = tempQuery.eq('site_id', siteId)
  const tempFailures = await safeQuery('temp_failures', () => tempQuery)

  // Incidents from yesterday
  let incidentsQuery = supabase
    .from('incidents')
    .select('id, site_id, severity, title, status, incident_type')
    .eq('company_id', companyId)
    .gte('created_at', yesterdayStart)
    .lte('created_at', yesterdayEnd)
    .order('severity', { ascending: false })

  if (siteId) incidentsQuery = incidentsQuery.eq('site_id', siteId)
  const incidents = await safeQuery('incidents', () => incidentsQuery)

  return {
    completionRate,
    totalDue,
    completed,
    missed,
    overdueTasks,
    overdueCount: overdueCount || 0,
    tempFailures,
    incidents,
  }
}

// 2. STAFF DATA
interface StaffData {
  sickness: any[]
  holidayRequests: any[]
  upcomingReviews: any[]
  openShifts: any[]
  trialShifts: any[]
  pendingCourses: any[]
}

async function fetchStaffData(
  supabase: any,
  companyId: string,
  siteId: string | null,
  yesterdayStart: string,
  yesterdayEnd: string,
  todayStr: string,
  next7Days: string
): Promise<StaffData> {
  // Sickness records started yesterday
  let sicknessQuery = supabase
    .from('staff_sickness_records')
    .select('id, profile:profiles(full_name), start_date, end_date, reason')
    .eq('company_id', companyId)
    .gte('start_date', yesterdayStart.split('T')[0])
    .lte('start_date', yesterdayEnd.split('T')[0])

  if (siteId) sicknessQuery = sicknessQuery.eq('site_id', siteId)
  const sickness = await safeQuery('sickness', () => sicknessQuery)

  // Holiday/leave requests submitted yesterday
  let leaveQuery = supabase
    .from('leave_requests')
    .select('id, profile:profiles(full_name), start_date, end_date, leave_type, status')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .gte('requested_at', yesterdayStart)
    .lte('requested_at', yesterdayEnd)

  const holidayRequests = await safeQuery('holiday_requests', () => leaveQuery)

  // Reviews/1-on-1s coming up in next 7 days
  let reviewsQuery = supabase
    .from('one_on_ones')
    .select('id, profile:profiles(full_name), scheduled_date, review_type')
    .eq('company_id', companyId)
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', next7Days)
    .eq('status', 'scheduled')
    .order('scheduled_date', { ascending: true })

  const upcomingReviews = await safeQuery('upcoming_reviews', () => reviewsQuery)

  // Open shifts not filled (today and next 7 days)
  let shiftsQuery = supabase
    .from('rota_shifts')
    .select('id, site_id, shift_date, shift_start, shift_end, role')
    .is('profile_id', null)
    .gte('shift_date', todayStr)
    .lte('shift_date', next7Days)
    .order('shift_date', { ascending: true })
    .limit(10)

  if (siteId) shiftsQuery = shiftsQuery.eq('site_id', siteId)
  const openShifts = await safeQuery('open_shifts', () => shiftsQuery)

  // Trial shifts planned for today
  let trialQuery = supabase
    .from('candidate_trial_shifts')
    .select('id, candidate:recruitment_candidates(full_name), trial_date, trial_time, site_id')
    .eq('company_id', companyId)
    .eq('trial_date', todayStr)
    .eq('status', 'scheduled')

  if (siteId) trialQuery = trialQuery.eq('site_id', siteId)
  const trialShifts = await safeQuery('trial_shifts', () => trialQuery)

  // Pending training courses not yet scheduled
  let coursesQuery = supabase
    .from('training_records')
    .select('id, profile:profiles(full_name), course_name, assigned_date')
    .eq('company_id', companyId)
    .eq('status', 'assigned')
    .is('scheduled_date', null)
    .order('assigned_date', { ascending: true })
    .limit(10)

  const pendingCourses = await safeQuery('pending_courses', () => coursesQuery)

  return {
    sickness,
    holidayRequests,
    upcomingReviews,
    openShifts,
    trialShifts,
    pendingCourses,
  }
}

// 3. STOCK DATA
interface StockData {
  expiringToday: any[]
  salesYesterday: {
    revenue: number
    gp: number
    gpPercent: number
    transactionCount: number
  }
  topSellers: any[]
  discountTotal: number
  revenueStreams: any[]
}

async function fetchStockData(
  supabase: any,
  companyId: string,
  siteId: string | null,
  yesterdayStr: string,
  todayStr: string
): Promise<StockData> {
  // Expiring today (use_by or best_before = today)
  let expiringQuery = supabase
    .from('stock_batches')
    .select('id, batch_code, stock_item:stock_items(name), quantity_remaining, unit, use_by_date, best_before_date')
    .eq('status', 'active')
    .gt('quantity_remaining', 0)
    .or(`use_by_date.eq.${todayStr},best_before_date.eq.${todayStr}`)
    .limit(10)

  if (siteId && siteId !== 'all') expiringQuery = expiringQuery.eq('site_id', siteId)
  const expiringToday = await safeQuery('expiring_today', () => expiringQuery)

  // Sales from yesterday
  let salesQuery = supabase
    .from('sales')
    .select('id, net_revenue, gross_revenue, discounts, order_source, fulfillment_type, payment_details')
    .eq('company_id', companyId)
    .eq('sale_date', yesterdayStr)
    .eq('status', 'completed')

  if (siteId && siteId !== 'all') salesQuery = salesQuery.eq('site_id', siteId)
  const sales = await safeQuery('sales_yesterday', () => salesQuery)

  const revenue = sales.reduce((sum, s) => sum + (s.net_revenue || 0), 0)
  const grossRevenue = sales.reduce((sum, s) => sum + (s.gross_revenue || 0), 0)
  const discountTotal = sales.reduce((sum, s) => sum + (s.discounts || 0), 0)

  // Calculate GP from theoretical GP table if available
  let gpQuery = supabase
    .from('daily_sales_summary')
    .select('theoretical_gp')
    .eq('company_id', companyId)
    .eq('summary_date', yesterdayStr)
    .single()

  if (siteId && siteId !== 'all') gpQuery = gpQuery.eq('site_id', siteId)
  const { data: gpData } = await gpQuery
  const gp = gpData?.theoretical_gp || 0
  const gpPercent = revenue > 0 ? Math.round((gp / revenue) * 100) : 0

  // Top sellers - get sale items from yesterday
  let itemsQuery = supabase
    .rpc('get_top_selling_items', {
      p_company_id: companyId,
      p_site_id: siteId && siteId !== 'all' ? siteId : null,
      p_date_from: yesterdayStr,
      p_date_to: yesterdayStr,
      p_limit: 5,
    })

  const topSellers = await safeQuery('top_sellers', () => itemsQuery)

  // Revenue streams breakdown
  const streamMap = new Map<string, number>()
  for (const sale of sales) {
    const source = sale.order_source || sale.fulfillment_type || 'Walk-in'
    streamMap.set(source, (streamMap.get(source) || 0) + (sale.net_revenue || 0))
  }
  const revenueStreams = Array.from(streamMap.entries())
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount)

  return {
    expiringToday,
    salesYesterday: {
      revenue,
      gp,
      gpPercent,
      transactionCount: sales.length,
    },
    topSellers,
    discountTotal,
    revenueStreams,
  }
}

// 4. ASSETS DATA
interface AssetsData {
  callouts: any[]
  outOfCommission: any[]
}

async function fetchAssetsData(
  supabase: any,
  companyId: string,
  siteId: string | null
): Promise<AssetsData> {
  // Callouts still awaiting contractor response
  let calloutsQuery = supabase
    .from('asset_callouts')
    .select('id, asset:assets(name), issue_description, created_at, status, contractor:contractors(business_name)')
    .eq('company_id', companyId)
    .in('status', ['pending', 'contractor_notified', 'awaiting_contractor'])
    .order('created_at', { ascending: true })
    .limit(10)

  if (siteId) calloutsQuery = calloutsQuery.eq('site_id', siteId)
  const callouts = await safeQuery('callouts', () => calloutsQuery)

  // Equipment out of commission
  let assetsQuery = supabase
    .from('assets')
    .select('id, name, asset_type, status, site_id')
    .eq('company_id', companyId)
    .eq('status', 'out_of_service')

  if (siteId) assetsQuery = assetsQuery.eq('site_id', siteId)
  const outOfCommission = await safeQuery('out_of_service', () => assetsQuery)

  return {
    callouts,
    outOfCommission,
  }
}

// 5. CALENDAR DATA
interface CalendarData {
  events: any[]
}

async function fetchCalendarData(
  supabase: any,
  companyId: string,
  profileId: string,
  todayStr: string
): Promise<CalendarData> {
  // Calendar events for today
  let eventsQuery = supabase
    .from('calendar_events')
    .select('id, title, start_time, end_time, event_type, description')
    .eq('company_id', companyId)
    .contains('attendee_ids', [profileId])
    .gte('start_time', `${todayStr}T00:00:00Z`)
    .lte('start_time', `${todayStr}T23:59:59Z`)
    .order('start_time', { ascending: true })

  const events = await safeQuery('calendar_events', () => eventsQuery)

  return { events }
}

// ───────────────────────────────────────────────────────────────────────────
// HTML BUILDERS
// ───────────────────────────────────────────────────────────────────────────

interface AlertLevel {
  status: 'critical' | 'warning' | 'good'
  color: string
  bg: string
  label: string
}

function getAlertLevel(compliance: ComplianceData): AlertLevel {
  const hasCritical = compliance.tempFailures.length > 0 ||
    compliance.incidents.some(i => ['critical', 'major', 'fatality'].includes(i.severity))

  const hasWarning = compliance.missed > 0 ||
    compliance.overdueCount > 5 ||
    compliance.completionRate < 80

  if (hasCritical) {
    return { status: 'critical', color: '#DC2626', bg: '#FEF2F2', label: 'Action Required' }
  }
  if (hasWarning) {
    return { status: 'warning', color: '#D97706', bg: '#FFFBEB', label: 'Needs Attention' }
  }
  return { status: 'good', color: '#059669', bg: '#F0FDF4', label: 'All Clear' }
}

function buildComplianceSection(data: ComplianceData, accent: string, bgTint: string): string {
  if (data.totalDue === 0 && data.overdueCount === 0 && data.tempFailures.length === 0 && data.incidents.length === 0) {
    return ''
  }

  let content = `
    <div style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${accent}; background: ${bgTint}; border-radius: 0 8px 8px 0;">
      <div style="font-weight: 700; font-size: 13px; color: ${accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">Compliance</div>
  `

  // Completion rate
  const rateColor = data.completionRate >= 90 ? '#059669' : data.completionRate >= 75 ? '#D97706' : '#DC2626'
  content += `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: #6B7280; font-size: 14px;">Yesterday's completion</span>
      <span style="color: ${rateColor}; font-size: 14px; font-weight: 600;">${data.completionRate}%</span>
    </div>
  `

  if (data.totalDue > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Tasks due</span>
        <span style="color: #374151; font-size: 14px;">${data.completed} of ${data.totalDue} completed</span>
      </div>
    `
  }

  if (data.missed > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Missed tasks</span>
        <span style="color: #DC2626; font-size: 14px; font-weight: 600;">${data.missed}</span>
      </div>
    `
  }

  if (data.overdueCount > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Overdue tasks</span>
        <span style="color: #D97706; font-size: 14px; font-weight: 600;">${data.overdueCount}</span>
      </div>
    `

    // Show top 3 overdue
    if (data.overdueTasks.length > 0) {
      content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">`
      data.overdueTasks.slice(0, 3).forEach(task => {
        const name = task.custom_name || task.template?.name || 'Unnamed task'
        content += `<div style="color: #6B7280; font-size: 12px; padding: 3px 0;">• Overdue: ${name} (${task.due_date})</div>`
      })
      if (data.overdueCount > 3) {
        content += `<div style="color: #9CA3AF; font-size: 12px; padding: 3px 0;">...and ${data.overdueCount - 3} more</div>`
      }
      content += `</div>`
    }
  }

  if (data.tempFailures.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Temperature failures</span>
        <span style="color: #DC2626; font-size: 14px; font-weight: 700;">${data.tempFailures.length}</span>
      </div>
    `
  }

  if (data.incidents.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Incidents</span>
        <span style="color: #DC2626; font-size: 14px; font-weight: 700;">${data.incidents.length}</span>
      </div>
    `

    // Show incident details
    content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">`
    data.incidents.slice(0, 3).forEach(inc => {
      const sevBadge = inc.severity ? ` [${inc.severity}]` : ''
      content += `<div style="color: #6B7280; font-size: 12px; padding: 3px 0;">• ${inc.title || 'Incident'}${sevBadge}</div>`
    })
    content += `</div>`
  }

  content += `</div>`
  return content
}

function buildStaffSection(data: StaffData, accent: string, bgTint: string): string {
  const hasData = data.sickness.length > 0 || data.holidayRequests.length > 0 ||
    data.upcomingReviews.length > 0 || data.openShifts.length > 0 ||
    data.trialShifts.length > 0 || data.pendingCourses.length > 0

  if (!hasData) return ''

  let content = `
    <div style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${accent}; background: ${bgTint}; border-radius: 0 8px 8px 0;">
      <div style="font-weight: 700; font-size: 13px; color: ${accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">People</div>
  `

  if (data.sickness.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">New sickness</span>
        <span style="color: #D97706; font-size: 14px; font-weight: 600;">${data.sickness.length}</span>
      </div>
    `
  }

  if (data.holidayRequests.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Holiday requests</span>
        <span style="color: #3B82F6; font-size: 14px; font-weight: 600;">${data.holidayRequests.length} pending</span>
      </div>
    `
  }

  if (data.upcomingReviews.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Reviews coming up</span>
        <span style="color: #374151; font-size: 14px;">${data.upcomingReviews.length} in next 7 days</span>
      </div>
    `
  }

  if (data.openShifts.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Unfilled shifts</span>
        <span style="color: #D97706; font-size: 14px; font-weight: 600;">${data.openShifts.length}</span>
      </div>
    `
  }

  if (data.trialShifts.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Trial shifts today</span>
        <span style="color: #059669; font-size: 14px; font-weight: 600;">${data.trialShifts.length}</span>
      </div>
    `
  }

  if (data.pendingCourses.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Training not scheduled</span>
        <span style="color: #D97706; font-size: 14px; font-weight: 600;">${data.pendingCourses.length}</span>
      </div>
    `
  }

  content += `</div>`
  return content
}

function buildStockSection(data: StockData, accent: string, bgTint: string): string {
  if (!data.salesYesterday.revenue && data.expiringToday.length === 0) return ''

  let content = `
    <div style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${accent}; background: ${bgTint}; border-radius: 0 8px 8px 0;">
      <div style="font-weight: 700; font-size: 13px; color: ${accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">Stock & Sales</div>
  `

  if (data.expiringToday.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Expiring today</span>
        <span style="color: #DC2626; font-size: 14px; font-weight: 700;">${data.expiringToday.length} items</span>
      </div>
    `
  }

  if (data.salesYesterday.revenue > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Sales yesterday</span>
        <span style="color: #374151; font-size: 14px; font-weight: 600;">£${data.salesYesterday.revenue.toFixed(0)}</span>
      </div>
    `

    if (data.salesYesterday.gp > 0) {
      content += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6B7280; font-size: 14px;">Theoretical GP</span>
          <span style="color: #059669; font-size: 14px; font-weight: 600;">£${data.salesYesterday.gp.toFixed(0)} (${data.salesYesterday.gpPercent}%)</span>
        </div>
      `
    }

    if (data.salesYesterday.transactionCount > 0) {
      content += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6B7280; font-size: 14px;">Transactions</span>
          <span style="color: #374151; font-size: 14px;">${data.salesYesterday.transactionCount}</span>
        </div>
      `
    }

    if (data.discountTotal > 0) {
      content += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6B7280; font-size: 14px;">Discounts given</span>
          <span style="color: #D97706; font-size: 14px;">£${data.discountTotal.toFixed(0)}</span>
        </div>
      `
    }

    // Top sellers
    if (data.topSellers.length > 0) {
      content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">`
      content += `<div style="color: #374151; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Top sellers:</div>`
      data.topSellers.slice(0, 3).forEach((item: any) => {
        content += `<div style="color: #6B7280; font-size: 12px; padding: 2px 0;">• ${item.name} (${item.quantity} sold)</div>`
      })
      content += `</div>`
    }

    // Revenue streams
    if (data.revenueStreams.length > 1) {
      content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">`
      content += `<div style="color: #374151; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Revenue streams:</div>`
      data.revenueStreams.forEach(stream => {
        content += `<div style="color: #6B7280; font-size: 12px; padding: 2px 0;">• ${stream.source}: £${stream.amount.toFixed(0)}</div>`
      })
      content += `</div>`
    }
  }

  content += `</div>`
  return content
}

function buildAssetsSection(data: AssetsData, accent: string, bgTint: string): string {
  if (data.callouts.length === 0 && data.outOfCommission.length === 0) return ''

  let content = `
    <div style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${accent}; background: ${bgTint}; border-radius: 0 8px 8px 0;">
      <div style="font-weight: 700; font-size: 13px; color: ${accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">Assets</div>
  `

  if (data.callouts.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Pending callouts</span>
        <span style="color: #D97706; font-size: 14px; font-weight: 600;">${data.callouts.length}</span>
      </div>
    `
  }

  if (data.outOfCommission.length > 0) {
    content += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #6B7280; font-size: 14px;">Out of commission</span>
        <span style="color: #DC2626; font-size: 14px; font-weight: 700;">${data.outOfCommission.length} assets</span>
      </div>
    `

    // List out of commission assets
    content += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">`
    data.outOfCommission.slice(0, 5).forEach((asset: any) => {
      content += `<div style="color: #6B7280; font-size: 12px; padding: 3px 0;">• ${asset.name}</div>`
    })
    if (data.outOfCommission.length > 5) {
      content += `<div style="color: #9CA3AF; font-size: 12px; padding: 3px 0;">...and ${data.outOfCommission.length - 5} more</div>`
    }
    content += `</div>`
  }

  content += `</div>`
  return content
}

function buildCalendarSection(data: CalendarData, accent: string, bgTint: string): string {
  if (data.events.length === 0) return ''

  let content = `
    <div style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${accent}; background: ${bgTint}; border-radius: 0 8px 8px 0;">
      <div style="font-weight: 700; font-size: 13px; color: ${accent}; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">Today's Schedule</div>
  `

  content += `<div style="color: #374151; font-size: 12px; font-weight: 600; margin-bottom: 8px;">You have ${data.events.length} event${data.events.length > 1 ? 's' : ''} today:</div>`

  data.events.forEach((event: any) => {
    const startTime = new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    content += `<div style="color: #6B7280; font-size: 12px; padding: 4px 0; border-left: 3px solid ${accent}; padding-left: 8px; margin-bottom: 6px;">
      <div style="font-weight: 600; color: #374151;">${startTime} — ${event.title}</div>
      ${event.description ? `<div style="color: #9CA3AF; font-size: 11px; margin-top: 2px;">${event.description}</div>` : ''}
    </div>`
  })

  content += `</div>`
  return content
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN ROUTE HANDLER
// ───────────────────────────────────────────────────────────────────────────

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

    // Date ranges
    const yesterday = new Date(now)
    yesterday.setUTCDate(now.getUTCDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const yesterdayStart = `${yesterdayStr}T00:00:00Z`
    const yesterdayEnd = `${yesterdayStr}T23:59:59Z`

    const todayStr = now.toISOString().split('T')[0]
    const next7Days = new Date(now)
    next7Days.setUTCDate(now.getUTCDate() + 7)
    const next7DaysStr = next7Days.toISOString().split('T')[0]

    const yesterdayFormatted = yesterday.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const todayFormatted = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Get all companies
    const { data: companies, error: compErr } = await supabase
      .from('companies')
      .select('id, name')

    if (compErr || !companies?.length) {
      return NextResponse.json({ error: compErr?.message || 'No companies found' }, { status: 500 })
    }

    let totalSent = 0
    let totalSkipped = 0
    const errors: string[] = []

    for (const company of companies) {
      try {
        // Timeout safety
        if (Date.now() - startTime > 50_000) {
          console.warn('[Cron] Digest: approaching timeout, stopping')
          break
        }

        // Get recipients (managers/admins) with digest preferences
        const { data: recipients, error: recipErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, app_role, site_id, digest_enabled, digest_include_compliance, digest_include_staff, digest_include_stock, digest_include_assets, digest_include_calendar')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .eq('digest_enabled', true) // Only send to users who have enabled digest
          .in('app_role', ['Admin', 'Owner', 'General Manager', 'Area Manager', 'Ops Manager'])

        if (recipErr || !recipients?.length) continue

        // Get sites
        const { data: sites } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', company.id)

        const siteMap = new Map<string, string>()
        for (const s of sites || []) siteMap.set(s.id, s.name)

        // Send to each recipient
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

          // Fetch all data
          const [compliance, staff, stock, assets, calendar] = await Promise.allSettled([
            fetchComplianceData(supabase, company.id, siteFilter, yesterdayStr, todayStr, yesterdayStart, yesterdayEnd),
            fetchStaffData(supabase, company.id, siteFilter, yesterdayStart, yesterdayEnd, todayStr, next7DaysStr),
            fetchStockData(supabase, company.id, siteFilter, yesterdayStr, todayStr),
            fetchAssetsData(supabase, company.id, siteFilter),
            fetchCalendarData(supabase, company.id, recipient.id, todayStr),
          ])

          const complianceData = compliance.status === 'fulfilled' ? compliance.value : null
          const staffData = staff.status === 'fulfilled' ? staff.value : null
          const stockData = stock.status === 'fulfilled' ? stock.value : null
          const assetsData = assets.status === 'fulfilled' ? assets.value : null
          const calendarData = calendar.status === 'fulfilled' ? calendar.value : null

          if (!complianceData) {
            totalSkipped++
            continue
          }

          // Build sections based on user preferences
          const sections: string[] = []

          // 1. Compliance (always first, most important) - respect preference
          if (recipient.digest_include_compliance !== false) {
            sections.push(buildComplianceSection(complianceData, MODULE_THEME.checkly.accent, MODULE_THEME.checkly.bg))
          }

          // 2. Staff - respect preference
          if (staffData && recipient.digest_include_staff !== false) {
            sections.push(buildStaffSection(staffData, MODULE_THEME.teamly.accent, MODULE_THEME.teamly.bg))
          }

          // 3. Stock & Sales - respect preference
          if (stockData && recipient.digest_include_stock !== false) {
            sections.push(buildStockSection(stockData, MODULE_THEME.stockly.accent, MODULE_THEME.stockly.bg))
          }

          // 4. Assets - respect preference
          if (assetsData && recipient.digest_include_assets !== false) {
            sections.push(buildAssetsSection(assetsData, MODULE_THEME.assetly.accent, MODULE_THEME.assetly.bg))
          }

          // 5. Calendar - respect preference
          if (calendarData && recipient.digest_include_calendar !== false) {
            sections.push(buildCalendarSection(calendarData, MODULE_THEME.calendar.accent, MODULE_THEME.calendar.bg))
          }

          const filteredSections = sections.filter(s => s !== '')

          if (filteredSections.length === 0) {
            // All clear message
            filteredSections.push(`
              <div style="text-align: center; padding: 32px 16px; color: #9CA3AF; font-size: 14px;">
                <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
                <div style="color: #374151; font-weight: 600; margin-bottom: 4px;">All Clear</div>
                <div>No notable activity from yesterday</div>
              </div>
            `)
          }

          // Determine alert level
          const alertLevel = getAlertLevel(complianceData)

          // Build email HTML
          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yesterday's Ops Summary — ${company.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #F3F4F6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.4px;">opsly</span>
    </div>

    <!-- Main Card -->
    <div style="background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #E5E7EB;">

      <!-- Gradient accent bar -->
      <div style="height: 4px; background: linear-gradient(90deg, ${MODULE_THEME.checkly.accent} 0%, ${MODULE_THEME.stockly.accent} 50%, ${MODULE_THEME.teamly.accent} 100%);"></div>

      <!-- Title Block -->
      <div style="padding: 24px 28px 0;">
        <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 700; color: #111827; line-height: 1.2;">Yesterday's Ops Summary</h1>
        <p style="margin: 0; font-size: 14px; color: #6B7280;">${yesterdayFormatted}</p>
      </div>

      <!-- Status Banner -->
      <div style="margin: 20px 28px 0;">
        <div style="background: ${alertLevel.bg}; border: 1px solid ${alertLevel.color}40; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center;">
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${alertLevel.color}; margin-right: 10px;"></div>
          <span style="color: ${alertLevel.color}; font-size: 13px; font-weight: 700;">${alertLevel.label}</span>
          <span style="color: #9CA3AF; font-size: 13px; margin-left: 8px;">• ${siteName}</span>
        </div>
      </div>

      <!-- Greeting -->
      <div style="padding: 20px 28px 4px;">
        <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.5;">
          Good morning ${firstName}, here's what happened yesterday and what's on your plate today.
        </p>
      </div>

      <!-- Sections -->
      <div style="padding: 16px 28px 28px;">
        ${filteredSections.join('\n')}
      </div>

      <!-- CTA -->
      <div style="padding: 0 28px 32px; text-align: center;">
        <a href="${appUrl}/dashboard"
           style="display: inline-block; background: ${BRAND_CTA}; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Open Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0 8px;">
      <div style="color: #9CA3AF; font-size: 11px; margin-bottom: 8px;">
        ${company.name} • ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC
      </div>
      <div style="color: #D1D5DB; font-size: 11px;">
        Powered by <span style="font-weight: 600; color: #6B7280;">opsly</span>
      </div>
    </div>
  </div>
</body>
</html>`.trim()

          const statusEmoji = alertLevel.status === 'critical' ? '🔴' : alertLevel.status === 'warning' ? '🟡' : '🟢'

          const result = await sendEmail({
            to: recipient.email,
            subject: `${statusEmoji} Yesterday's Ops Summary • ${siteName} • ${yesterdayFormatted}`,
            html,
          })

          if (result.success) {
            totalSent++
          } else if (result.skipped) {
            totalSkipped++
          } else {
            errors.push(`Failed for ${recipient.email}: ${result.error}`)
          }

          // Rate limit protection
          await new Promise(resolve => setTimeout(resolve, 600))
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
    })

    return NextResponse.json({
      success: true,
      companies: companies.length,
      sent: totalSent,
      skipped: totalSkipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
      duration_ms: duration,
    })
  } catch (error: any) {
    console.error('[Cron] Daily digest error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
