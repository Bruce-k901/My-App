import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/health-check/admin-data
 * Platform-admin-only endpoint to query health check data (bypasses RLS).
 * Used by the admin test page where the platform admin may not be a member
 * of the company being inspected.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify platform admin
    const userSupabase = await createServerSupabaseClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('auth_user_id', user.id)
      .single()
    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: 'Platform admin required' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { action, company_id } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400 })
    }

    switch (action) {
      case 'reports': {
        const { data } = await supabase
          .from('health_check_reports')
          .select(`
            id, site_id, assigned_to, assigned_role,
            health_score, previous_week_score,
            total_items, critical_count, medium_count, low_count,
            completed_items, delegated_items, ignored_items, escalated_items,
            status, calendar_task_id, created_at, is_test_data,
            sites(name),
            profiles!health_check_reports_assigned_to_fkey(full_name)
          `)
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })
          .limit(50)

        return NextResponse.json({ data: data ?? [] })
      }

      case 'calendar': {
        const { data } = await supabase
          .from('checklist_tasks')
          .select('id, custom_name, due_date, due_time, status, priority, assigned_to_user_id, task_data, created_at')
          .eq('company_id', company_id)
          .not('task_data', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50)

        const healthTasks = (data ?? []).filter(
          (t: any) => t.task_data?.task_type === 'health_check'
        )

        // Resolve names
        const userIds = [...new Set(healthTasks.map((t: any) => t.assigned_to_user_id).filter(Boolean))]
        const nameMap = new Map<string, string>()
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles').select('id, full_name').in('id', userIds)
          for (const p of profiles ?? []) nameMap.set(p.id, p.full_name)
        }

        return NextResponse.json({
          data: healthTasks.map((t: any) => ({
            ...t,
            assigned_name: t.assigned_to_user_id ? nameMap.get(t.assigned_to_user_id) ?? null : null,
          }))
        })
      }

      case 'delegations': {
        const { report_ids } = body

        // Delegated + escalated items
        const { data: items } = await supabase
          .from('health_check_items')
          .select(`
            id, title, record_name, severity, module, status,
            delegated_to, delegated_by, delegated_at, delegation_message,
            due_date, conversation_id, reminder_count, last_reminder_sent, next_reminder_at,
            escalated_to, escalation_reason, site_id,
            sites(name)
          `)
          .eq('company_id', company_id)
          .in('status', ['delegated', 'escalated'])
          .order('delegated_at', { ascending: false })
          .limit(50)

        // Resolve profile names
        const profileIds = new Set<string>()
        for (const item of items ?? []) {
          if (item.delegated_to) profileIds.add(item.delegated_to)
          if (item.delegated_by) profileIds.add(item.delegated_by)
          if (item.escalated_to) profileIds.add(item.escalated_to)
        }
        const nameMap = new Map<string, string>()
        if (profileIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles').select('id, full_name').in('id', Array.from(profileIds))
          for (const p of profiles ?? []) nameMap.set(p.id, p.full_name)
        }

        // Reminders
        let reminders: any[] = []
        if (report_ids?.length) {
          const { data: allItems } = await supabase
            .from('health_check_items').select('id').in('report_id', report_ids)
          const itemIds = (allItems ?? []).map((i: any) => i.id)

          if (itemIds.length > 0) {
            const { data: remindersData } = await supabase
              .from('health_check_reminders')
              .select('id, health_check_item_id, reminder_type, scheduled_for, sent_at, sent_to, message_content')
              .in('health_check_item_id', itemIds)
              .order('scheduled_for', { ascending: false })
              .limit(50)

            // Resolve names
            const sentToIds = new Set<string>()
            for (const r of remindersData ?? []) { if (r.sent_to) sentToIds.add(r.sent_to) }
            const sentNameMap = new Map<string, string>()
            if (sentToIds.size > 0) {
              const { data: profiles } = await supabase
                .from('profiles').select('id, full_name').in('id', Array.from(sentToIds))
              for (const p of profiles ?? []) sentNameMap.set(p.id, p.full_name)
            }

            const itemTitleMap = new Map<string, string>()
            const { data: itemsWithTitles } = await supabase
              .from('health_check_items').select('id, title')
              .in('id', (remindersData ?? []).map(r => r.health_check_item_id))
            for (const it of itemsWithTitles ?? []) itemTitleMap.set(it.id, it.title)

            reminders = (remindersData ?? []).map((r: any) => ({
              id: r.id,
              health_check_item_id: r.health_check_item_id,
              item_title: itemTitleMap.get(r.health_check_item_id) ?? null,
              reminder_type: r.reminder_type,
              scheduled_for: r.scheduled_for,
              sent_at: r.sent_at,
              sent_to_name: r.sent_to ? sentNameMap.get(r.sent_to) ?? null : null,
              message_content: r.message_content,
            }))
          }
        }

        return NextResponse.json({
          items: (items ?? []).map((i: any) => ({
            ...i,
            delegated_to_name: i.delegated_to ? nameMap.get(i.delegated_to) ?? null : null,
            delegated_by_name: i.delegated_by ? nameMap.get(i.delegated_by) ?? null : null,
            site_name: i.sites?.name ?? null,
          })),
          reminders,
        })
      }

      case 'summary': {
        // Aggregate across all site reports
        const { data: reports } = await supabase
          .from('health_check_reports')
          .select('id, health_score, previous_week_score, critical_count, medium_count, low_count, completed_items, ignored_items, total_items, site_id')
          .eq('company_id', company_id)
          .order('created_at', { ascending: false })

        // Dedupe to latest per site
        const latestBySite = new Map<string, any>()
        for (const r of reports ?? []) {
          if (r.site_id && !latestBySite.has(r.site_id)) {
            latestBySite.set(r.site_id, r)
          }
        }
        const siteReports = Array.from(latestBySite.values())

        // Module scores from history
        const { data: latestHistory } = await supabase
          .from('health_check_history')
          .select('module_scores')
          .eq('company_id', company_id)
          .order('report_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Trend data (last 12 weeks)
        const { data: history } = await supabase
          .from('health_check_history')
          .select('report_date, health_score')
          .eq('company_id', company_id)
          .order('report_date', { ascending: true })
          .limit(84)

        return NextResponse.json({
          reports: siteReports,
          moduleScores: latestHistory?.module_scores ?? {},
          trend: history ?? [],
        })
      }

      case 'clear': {
        const { error: reportsErr } = await supabase
          .from('health_check_reports').delete().eq('company_id', company_id)
        const { error: historyErr } = await supabase
          .from('health_check_history').delete().eq('company_id', company_id)

        if (reportsErr || historyErr) {
          return NextResponse.json({ error: 'Failed to clear some data' }, { status: 500 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[HealthCheck AdminData] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
