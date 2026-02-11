import type { SupabaseClient } from '@supabase/supabase-js'
import type { GenerationResult, ScanResult } from '@/types/health-check'
import { scanCompany, scanSite, calculateHealthScore } from './scanner'

/**
 * Find the site manager via user_scope_assignments.
 * Falls back to any admin-scoped user, then company owner.
 */
async function findSiteManager(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string
): Promise<{ id: string; role: string } | null> {
  // Try scope-based manager first
  const { data: scopeUser } = await supabase
    .from('user_scope_assignments')
    .select('profile_id, role')
    .eq('scope_type', 'site')
    .eq('scope_id', siteId)
    .in('role', ['manager', 'admin'])
    .limit(1)
    .maybeSingle()

  if (scopeUser?.profile_id) {
    return { id: scopeUser.profile_id, role: scopeUser.role }
  }

  // Fall back to company owner
  const { data: owner } = await supabase
    .from('profiles')
    .select('id, app_role')
    .eq('company_id', companyId)
    .eq('app_role', 'Owner')
    .limit(1)
    .maybeSingle()

  if (owner) {
    return { id: owner.id, role: 'Owner' }
  }

  // Last resort: any admin
  const { data: admin } = await supabase
    .from('profiles')
    .select('id, app_role')
    .eq('company_id', companyId)
    .eq('app_role', 'Admin')
    .limit(1)
    .maybeSingle()

  return admin ? { id: admin.id, role: 'Admin' } : null
}

/**
 * Get the previous week's health score for trend comparison.
 */
async function getPreviousScore(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('health_check_history')
    .select('health_score')
    .eq('company_id', companyId)
    .eq('site_id', siteId)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.health_score ?? null
}

/**
 * Create a calendar task for the health check report.
 */
async function createCalendarTask(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string,
  assignedTo: string,
  reportId: string,
  stats: ScanResult['stats']
): Promise<string | null> {
  // Due date: next Wednesday
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilWed = (3 - dayOfWeek + 7) % 7 || 7
  const dueDate = new Date(now)
  dueDate.setDate(now.getDate() + daysUntilWed)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('checklist_tasks')
    .insert({
      company_id: companyId,
      site_id: siteId,
      custom_name: `Weekly Data Health Check (${stats.critical} critical, ${stats.medium} medium, ${stats.low} low)`,
      due_date: dueDateStr,
      due_time: '09:00',
      status: 'pending',
      priority: stats.critical > 0 ? 'high' : 'medium',
      assigned_to_user_id: assignedTo,
      task_data: {
        task_type: 'health_check',
        health_check_report_id: reportId,
        severity_breakdown: {
          critical: stats.critical,
          medium: stats.medium,
          low: stats.low,
        },
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[HealthCheck] Failed to create calendar task:', error)
    return null
  }

  return data?.id ?? null
}

/**
 * Generate health check reports for a single company.
 * Creates one report per site, with items for each issue found.
 * If siteId is provided, only scans that one site (for targeted testing).
 */
export async function generateCompanyReports(
  supabase: SupabaseClient,
  companyId: string,
  siteId?: string
): Promise<GenerationResult> {
  const result: GenerationResult = {
    reports_created: 0,
    items_created: 0,
    calendar_tasks_created: 0,
    errors: [],
    scan_errors: [],
  }

  // Scan specific site or all sites
  let scanResults: ScanResult[]
  if (siteId) {
    const { data: site } = await supabase
      .from('sites').select('name').eq('id', siteId).single()
    const siteResult = await scanSite(supabase, companyId, siteId, site?.name ?? 'Unknown')
    scanResults = [siteResult]
  } else {
    scanResults = await scanCompany(supabase, companyId)
  }

  // Collect scan errors from all sites
  for (const scan of scanResults) {
    if (scan.scan_errors?.length) {
      result.scan_errors.push(...scan.scan_errors.map(e => `[${scan.site_name}] ${e}`))
    }
  }

  for (const scan of scanResults) {
    if (scan.items.length === 0) continue

    // Find who to assign the report to
    const assignee = await findSiteManager(supabase, companyId, scan.site_id)
    if (!assignee) {
      result.errors.push(`No assignee found for site ${scan.site_name} (${scan.site_id})`)
      continue
    }

    const healthScore = calculateHealthScore(scan.stats)
    const previousScore = await getPreviousScore(supabase, companyId, scan.site_id)

    // Create the report
    const { data: report, error: reportError } = await supabase
      .from('health_check_reports')
      .insert({
        company_id: companyId,
        report_level: 'site',
        site_id: scan.site_id,
        assigned_to: assignee.id,
        assigned_role: assignee.role,
        total_items: scan.stats.total,
        critical_count: scan.stats.critical,
        medium_count: scan.stats.medium,
        low_count: scan.stats.low,
        health_score: healthScore,
        previous_week_score: previousScore,
        status: 'pending',
      })
      .select('id')
      .single()

    if (reportError || !report) {
      result.errors.push(`Failed to create report for site ${scan.site_name}: ${reportError?.message}`)
      continue
    }

    result.reports_created++

    // Create items
    const items = scan.items.map(item => ({
      report_id: report.id,
      company_id: companyId,
      site_id: item.site_id || scan.site_id,
      severity: item.rule.severity,
      module: item.rule.module,
      category: item.rule.category,
      title: item.rule.title,
      description: `${item.rule.description}: ${item.record_name}`,
      table_name: item.rule.table_name,
      record_id: item.record_id,
      record_name: item.record_name,
      field_name: item.rule.field_name,
      field_label: item.rule.field_label,
      field_type: item.rule.field_type,
      current_value: item.current_value != null ? JSON.stringify(item.current_value) : null,
      field_options: item.rule.field_options ? JSON.stringify(item.rule.field_options) : null,
      field_metadata: item.rule.field_metadata ? JSON.stringify(item.rule.field_metadata) : null,
      status: 'pending',
    }))

    const { error: itemsError, data: insertedItems } = await supabase
      .from('health_check_items')
      .insert(items)
      .select('id')

    if (itemsError) {
      result.errors.push(`Failed to create items for site ${scan.site_name}: ${itemsError.message}`)
    } else {
      result.items_created += insertedItems?.length ?? 0
    }

    // Create calendar task
    const taskId = await createCalendarTask(
      supabase, companyId, scan.site_id, assignee.id, report.id, scan.stats
    )

    if (taskId) {
      result.calendar_tasks_created++
      // Link task back to report
      await supabase
        .from('health_check_reports')
        .update({ calendar_task_id: taskId })
        .eq('id', report.id)
    }

    // Save to history for trend tracking
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('health_check_history')
      .upsert({
        company_id: companyId,
        site_id: scan.site_id,
        report_date: today,
        total_items: scan.stats.total,
        critical_count: scan.stats.critical,
        medium_count: scan.stats.medium,
        low_count: scan.stats.low,
        completed_items: 0,
        health_score: healthScore,
        module_scores: calculateModuleScores(scan),
        category_counts: calculateCategoryCounts(scan),
      }, { onConflict: 'company_id,site_id,report_date' })
  }

  return result
}

/**
 * Generate reports for ALL companies (called by cron).
 */
export async function generateAllReports(
  supabase: SupabaseClient
): Promise<{ companies: number; results: GenerationResult[] }> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id')

  if (error || !companies?.length) {
    console.error('[HealthCheck] Failed to fetch companies:', error)
    return { companies: 0, results: [] }
  }

  const results: GenerationResult[] = []

  for (const company of companies) {
    try {
      const companyResult = await generateCompanyReports(supabase, company.id)
      results.push(companyResult)
    } catch (err: any) {
      console.error(`[HealthCheck] Failed for company ${company.id}:`, err)
      results.push({
        reports_created: 0,
        items_created: 0,
        calendar_tasks_created: 0,
        errors: [err.message || 'Unknown error'],
        scan_errors: [],
      })
    }
  }

  return { companies: companies.length, results }
}

// ---------- Helpers ----------

function calculateModuleScores(scan: ScanResult): Record<string, number> {
  const modules: Record<string, { total: number; weighted: number }> = {}

  for (const item of scan.items) {
    const mod = item.rule.module
    if (!modules[mod]) modules[mod] = { total: 0, weighted: 0 }
    modules[mod].total++
    modules[mod].weighted += item.rule.severity === 'critical' ? 5 : item.rule.severity === 'medium' ? 2 : 1
  }

  const scores: Record<string, number> = {}
  for (const mod of Object.keys(modules)) {
    scores[mod] = Math.max(0, 100 - modules[mod].weighted)
  }
  return scores
}

function calculateCategoryCounts(scan: ScanResult): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of scan.items) {
    counts[item.rule.category] = (counts[item.rule.category] || 0) + 1
  }
  return counts
}
