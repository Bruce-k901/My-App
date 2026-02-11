import type { SupabaseClient } from '@supabase/supabase-js'

interface AreaSiteSummary {
  siteId: string
  siteName: string
  managerName: string | null
  managerProfileId: string | null
  healthScore: number | null
  criticalCount: number
  mediumCount: number
  lowCount: number
  totalItems: number
  completedItems: number
  reportId: string | null
}

/**
 * Get health check summaries for all sites in an area.
 * Replaces the `get_area_site_summaries` SQL RPC function.
 */
export async function getAreaSiteSummaries(
  supabase: SupabaseClient,
  areaId: string,
  companyId: string
): Promise<AreaSiteSummary[]> {
  // Get sites in the area
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('area_id', areaId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name')

  if (!sites?.length) return []

  const summaries: AreaSiteSummary[] = []

  for (const site of sites) {
    // Latest report
    const { data: report } = await supabase
      .from('health_check_reports')
      .select('id, health_score, critical_count, medium_count, low_count, total_items, completed_items, ignored_items')
      .eq('site_id', site.id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Site manager via user_scope_assignments
    const { data: scopeUser } = await supabase
      .from('user_scope_assignments')
      .select('profile_id, profiles!inner(full_name)')
      .eq('scope_type', 'site')
      .eq('scope_id', site.id)
      .in('role', ['manager', 'admin'])
      .limit(1)
      .maybeSingle()

    summaries.push({
      siteId: site.id,
      siteName: site.name,
      managerName: (scopeUser as any)?.profiles?.full_name ?? null,
      managerProfileId: scopeUser?.profile_id ?? null,
      healthScore: report?.health_score ?? null,
      criticalCount: report?.critical_count ?? 0,
      mediumCount: report?.medium_count ?? 0,
      lowCount: report?.low_count ?? 0,
      totalItems: report?.total_items ?? 0,
      completedItems: (report?.completed_items ?? 0) + (report?.ignored_items ?? 0),
      reportId: report?.id ?? null,
    })
  }

  return summaries
}

/**
 * Escalate overdue health check items to the next level up.
 * Replaces the `escalate_overdue_health_check_items` SQL function.
 *
 * Escalation chain:
 *   Site Manager → Area Manager → Company Owner
 */
export async function escalateOverdueItems(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ escalated: number; errors: string[] }> {
  const now = new Date().toISOString()
  const errors: string[] = []
  let escalated = 0

  // Find overdue items that have had 3+ reminders and are still pending/delegated
  const { data: overdueItems } = await supabase
    .from('health_check_items')
    .select('id, site_id, report_id, delegated_to, reminder_count, status')
    .eq('company_id', companyId)
    .in('status', ['pending', 'delegated'])
    .not('due_date', 'is', null)
    .lt('due_date', now)
    .gte('reminder_count', 3)

  if (!overdueItems?.length) return { escalated: 0, errors }

  for (const item of overdueItems) {
    try {
      // Find who to escalate to
      const escalateTo = await findEscalationTarget(supabase, companyId, item.site_id)
      if (!escalateTo) {
        errors.push(`No escalation target found for item ${item.id}`)
        continue
      }

      // Skip if already assigned to this person
      if (escalateTo === item.delegated_to) continue

      await supabase
        .from('health_check_items')
        .update({
          status: 'escalated',
          escalated_to: escalateTo,
          escalated_at: now,
          escalation_reason: 'Auto-escalated: overdue after 3+ reminders',
        })
        .eq('id', item.id)

      // Create escalation reminder
      await supabase.from('health_check_reminders').insert({
        health_check_item_id: item.id,
        reminder_type: 'escalated',
        scheduled_for: now,
        sent_to: escalateTo,
        message_content: 'A health check item has been escalated to you because it was not resolved after multiple reminders.',
      })

      escalated++
    } catch (err: any) {
      errors.push(`Item ${item.id}: ${err.message}`)
    }
  }

  return { escalated, errors }
}

/**
 * Find the next person up the chain to escalate to.
 * Site Manager → Area Manager → Company Owner
 */
async function findEscalationTarget(
  supabase: SupabaseClient,
  companyId: string,
  siteId: string | null
): Promise<string | null> {
  if (siteId) {
    // Try to find the site's area, then the area manager
    const { data: site } = await supabase
      .from('sites')
      .select('area_id')
      .eq('id', siteId)
      .single()

    if (site?.area_id) {
      const { data: areaManager } = await supabase
        .from('user_scope_assignments')
        .select('profile_id')
        .eq('scope_type', 'area')
        .eq('scope_id', site.area_id)
        .in('role', ['manager', 'admin'])
        .limit(1)
        .maybeSingle()

      if (areaManager?.profile_id) return areaManager.profile_id
    }
  }

  // Fall back to company owner
  const { data: owner } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('app_role', 'Owner')
    .limit(1)
    .maybeSingle()

  return owner?.id ?? null
}
