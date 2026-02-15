import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'

/**
 * POST /api/cron/daily-digest
 * Daily cron job to send compliance digest emails to managers/admins.
 * Schedule: 6 AM UTC daily (configured in vercel.json)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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

    for (const company of companies) {
      try {
        // 2. Get managers/admins for this company
        const { data: recipients } = await supabase
          .from('profiles')
          .select('id, email, full_name, app_role, site_id')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .in('app_role', ['admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager'])

        if (!recipients?.length) continue

        // 3. Get sites for this company
        const { data: sites } = await supabase
          .from('sites')
          .select('id, name')
          .eq('company_id', company.id)

        const siteMap = new Map<string, string>()
        for (const s of sites || []) siteMap.set(s.id, s.name)

        // 4. Gather digest data per company (aggregated)

        // Open incidents (last 24h)
        const { data: incidents } = await supabase
          .from('incidents')
          .select('id, site_id, severity, title')
          .eq('company_id', company.id)
          .eq('status', 'open')
          .gte('created_at', past24h)

        // Tasks due today (incomplete)
        const { data: tasksDue } = await supabase
          .from('tasks')
          .select('id, site_id, title, priority')
          .eq('company_id', company.id)
          .eq('due_date', today)
          .neq('status', 'completed')

        // Overdue tasks (due before today, still incomplete)
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('id, site_id, title, priority')
          .eq('company_id', company.id)
          .lt('due_date', today)
          .in('status', ['pending', 'in_progress'])
          .limit(20)

        // Temperature failures (last 24h)
        const { data: tempFailures } = await supabase
          .from('temperature_logs')
          .select('id, site_id')
          .eq('company_id', company.id)
          .gte('recorded_at', past24h)
          .eq('status', 'failed')

        // Staff on shift today
        const { data: todayShifts } = await supabase
          .from('rota_shifts')
          .select('id, site_id, profile_id')
          .eq('shift_date', today)
          .not('profile_id', 'is', null)
          .neq('status', 'cancelled')

        // Expiring certifications (next 30 days)
        const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const { data: expiringCerts } = await supabase
          .from('profiles')
          .select('id, full_name, food_safety_expiry_date, first_aid_expiry_date, fire_marshal_expiry_date')
          .eq('company_id', company.id)
          .eq('status', 'active')
          .or(`food_safety_expiry_date.lte.${thirtyDaysOut},first_aid_expiry_date.lte.${thirtyDaysOut},fire_marshal_expiry_date.lte.${thirtyDaysOut}`)

        // Count expiring certs
        let expiringCount = 0
        for (const p of expiringCerts || []) {
          if (p.food_safety_expiry_date && p.food_safety_expiry_date <= thirtyDaysOut) expiringCount++
          if (p.first_aid_expiry_date && p.first_aid_expiry_date <= thirtyDaysOut) expiringCount++
          if (p.fire_marshal_expiry_date && p.fire_marshal_expiry_date <= thirtyDaysOut) expiringCount++
        }

        // Aggregate counts
        const incidentCount = incidents?.length || 0
        const tasksDueCount = tasksDue?.length || 0
        const overdueCount = overdueTasks?.length || 0
        const tempFailCount = tempFailures?.length || 0
        const shiftsCount = todayShifts?.length || 0

        // Count high-priority items
        const highPriorityTasks = (tasksDue || []).filter(t => t.priority === 'high').length
        const criticalIncidents = (incidents || []).filter(i => i.severity === 'high').length

        // 5. Send email to each recipient
        for (const recipient of recipients) {
          if (!recipient.email) {
            totalSkipped++
            continue
          }

          // Filter data by site for site-specific managers
          const isCompanyWide = ['admin', 'owner', 'area_manager', 'ops_manager'].includes(recipient.app_role || '')
          const recipientSiteId = recipient.site_id
          const siteName = recipientSiteId ? (siteMap.get(recipientSiteId) || 'Your Site') : 'All Sites'
          const scopeLabel = isCompanyWide ? 'All Sites' : siteName

          // Site-filtered counts
          let rIncidents = incidentCount
          let rTasksDue = tasksDueCount
          let rOverdue = overdueCount
          let rTempFail = tempFailCount
          let rShifts = shiftsCount
          let rHighTasks = highPriorityTasks
          let rCritical = criticalIncidents

          if (!isCompanyWide && recipientSiteId) {
            rIncidents = (incidents || []).filter(i => i.site_id === recipientSiteId).length
            rTasksDue = (tasksDue || []).filter(t => t.site_id === recipientSiteId).length
            rOverdue = (overdueTasks || []).filter(t => t.site_id === recipientSiteId).length
            rTempFail = (tempFailures || []).filter(t => t.site_id === recipientSiteId).length
            rShifts = (todayShifts || []).filter(s => s.site_id === recipientSiteId).length
            rHighTasks = (tasksDue || []).filter(t => t.site_id === recipientSiteId && t.priority === 'high').length
            rCritical = (incidents || []).filter(i => i.site_id === recipientSiteId && i.severity === 'high').length
          }

          // Determine overall status
          const hasAlerts = rCritical > 0 || rTempFail > 0
          const hasWarnings = rOverdue > 0 || rHighTasks > 0
          const statusColor = hasAlerts ? '#EF4444' : hasWarnings ? '#F59E0B' : '#10B981'
          const statusLabel = hasAlerts ? 'Action Required' : hasWarnings ? 'Needs Attention' : 'All Clear'

          const dateFormatted = now.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })

          const firstName = (recipient.full_name || 'Manager').split(' ')[0]
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.opslytech.com'

          const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Digest - ${company.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0b0e; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1d24; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #D37E91 0%, #8B5CF6 100%); padding: 32px; text-align: center;">
      <div style="margin: 0 auto 12px; text-align: center;">
        <svg width="60" height="40" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="24" height="110" rx="12" fill="#1B2624"/>
          <rect x="44" y="30" width="24" height="90" rx="12" fill="#8B2E3E"/>
          <rect x="78" y="15" width="24" height="105" rx="12" fill="#D9868C"/>
          <rect x="112" y="25" width="24" height="95" rx="12" fill="#5D8AA8"/>
          <rect x="146" y="10" width="24" height="110" rx="12" fill="#87B0D6"/>
          <rect x="180" y="20" width="24" height="100" rx="12" fill="#9AC297"/>
        </svg>
      </div>
      <h1 style="margin: 0 0 4px; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
        Daily Digest
      </h1>
      <p style="margin: 0; color: rgba(255, 255, 255, 0.85); font-size: 13px;">
        ${dateFormatted}
      </p>
    </div>

    <!-- Status Banner -->
    <div style="background: ${statusColor}15; border-bottom: 1px solid ${statusColor}30; padding: 14px 32px; display: flex; align-items: center;">
      <div style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; margin-right: 10px;"></div>
      <span style="color: ${statusColor}; font-size: 13px; font-weight: 600;">${statusLabel}</span>
      <span style="color: rgba(255,255,255,0.4); font-size: 13px; margin-left: 8px;">· ${scopeLabel}</span>
    </div>

    <!-- Content -->
    <div style="padding: 28px 32px;">
      <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 14px;">
        Good morning ${firstName}, here's your operations summary for <strong style="color: #fff;">${company.name}</strong>.
      </p>

      <!-- Stats Grid -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 8px;">
        <tr>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: ${rOverdue > 0 ? '#EF4444' : '#10B981'}; font-size: 28px; font-weight: 700;">${rTasksDue}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Tasks Due Today</div>
            ${rHighTasks > 0 ? `<div style="color: #F59E0B; font-size: 11px; margin-top: 4px;">${rHighTasks} high priority</div>` : ''}
          </td>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: ${rIncidents > 0 ? '#EF4444' : '#10B981'}; font-size: 28px; font-weight: 700;">${rIncidents}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">New Incidents</div>
            ${rCritical > 0 ? `<div style="color: #EF4444; font-size: 11px; margin-top: 4px;">${rCritical} critical</div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: ${rOverdue > 0 ? '#F59E0B' : '#10B981'}; font-size: 28px; font-weight: 700;">${rOverdue}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Overdue Tasks</div>
          </td>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: ${rTempFail > 0 ? '#EF4444' : '#10B981'}; font-size: 28px; font-weight: 700;">${rTempFail}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Temp. Failures</div>
          </td>
        </tr>
        <tr>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: #D37E91; font-size: 28px; font-weight: 700;">${rShifts}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Staff on Shift</div>
          </td>
          <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; text-align: center; width: 50%;">
            <div style="color: ${expiringCount > 0 ? '#F59E0B' : '#10B981'}; font-size: 28px; font-weight: 700;">${expiringCount}</div>
            <div style="color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px;">Expiring Certs</div>
            ${expiringCount > 0 ? `<div style="color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 4px;">within 30 days</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <div style="margin: 28px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <a href="${appUrl}/dashboard"
                 style="background: linear-gradient(135deg, #D37E91 0%, #b0607a 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; min-width: 200px; text-align: center;">
                Open Dashboard
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
      <p style="margin: 0; color: rgba(255,255,255,0.35); font-size: 11px;">
        ${company.name} · Sent by Opsly at ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC
      </p>
    </div>
  </div>
</body>
</html>`.trim()

          const result = await sendEmail({
            to: recipient.email,
            subject: `${statusLabel === 'Action Required' ? '🔴' : statusLabel === 'Needs Attention' ? '🟡' : '🟢'} Daily Digest · ${scopeLabel} · ${dateFormatted}`,
            html,
          })

          if (result.success) {
            totalSent++
          } else if (result.skipped) {
            totalSkipped++
          } else {
            errors.push(`Failed for ${recipient.email}: ${result.error}`)
          }
        }

        // 6. Create in-app notification for digest
        const severity = incidentCount > 0 || tempFailCount > 0 ? 'warning' : 'info'
        await supabase.from('notifications').insert({
          company_id: company.id,
          user_id: recipients[0]?.id,
          type: 'digest',
          title: 'Daily Compliance Summary',
          message: `Tasks: ${tasksDueCount} due today, ${overdueCount} overdue | Incidents: ${incidentCount} open | Temp failures: ${tempFailCount}`,
          read: false,
        })
      } catch (companyErr: any) {
        errors.push(`Company ${company.name}: ${companyErr.message}`)
      }
    }

    console.log('[Cron] Daily digest complete:', {
      totalSent,
      totalSkipped,
      errors: errors.length,
      timestamp: now.toISOString(),
    })

    return NextResponse.json({
      success: true,
      sent: totalSent,
      skipped: totalSkipped,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
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

// Allow GET for dev testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed in production' }, { status: 405 })
  }
  return POST(request)
}
