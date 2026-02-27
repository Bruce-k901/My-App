import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'

const RATING_LABELS = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great']
const RATING_COLOURS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getRatingColour(avg: number): string {
  if (avg < 1.5) return '#EF4444'
  if (avg < 2.5) return '#F97316'
  if (avg < 3.5) return '#EAB308'
  if (avg < 4.5) return '#22C55E'
  return '#10B981'
}

function getRatingLabel(avg: number): string {
  return RATING_LABELS[Math.round(avg)] || 'N/A'
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Shift Pulse weekly report starting...')

    const supabase = getSupabaseAdmin()
    const now = new Date()

    // Last week: Monday to Sunday
    const dayOfWeek = now.getUTCDay()
    const lastMonday = new Date(now)
    lastMonday.setUTCDate(now.getUTCDate() - dayOfWeek - 6)
    lastMonday.setUTCHours(0, 0, 0, 0)

    const lastSunday = new Date(lastMonday)
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6)
    lastSunday.setUTCHours(23, 59, 59, 999)

    // Previous week for comparison
    const prevMonday = new Date(lastMonday)
    prevMonday.setUTCDate(lastMonday.getUTCDate() - 7)
    const prevSunday = new Date(lastMonday)
    prevSunday.setUTCMilliseconds(-1)

    const weekStart = lastMonday.toISOString()
    const weekEnd = lastSunday.toISOString()
    const prevWeekStart = prevMonday.toISOString()
    const prevWeekEnd = prevSunday.toISOString()

    const dateRangeLabel = `${lastMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${lastSunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

    // Get all companies that have shift pulse ratings
    const { data: companies } = await supabase
      .from('shift_pulse_ratings')
      .select('company_id')
      .gte('clock_out_at', weekStart)
      .lte('clock_out_at', weekEnd)

    if (!companies || companies.length === 0) {
      console.log('[Cron] Shift Pulse: no ratings this week, skipping')
      return NextResponse.json({ success: true, message: 'No ratings to report' })
    }

    const companyIds = [...new Set(companies.map(c => c.company_id))]
    let emailsSent = 0

    for (const companyId of companyIds) {
      // Get sites for this company that have ratings
      const { data: siteRatings } = await supabase
        .from('shift_pulse_ratings')
        .select('site_id, rating, clock_out_at, user_id')
        .eq('company_id', companyId)
        .gte('clock_out_at', weekStart)
        .lte('clock_out_at', weekEnd)

      if (!siteRatings || siteRatings.length === 0) continue

      // Previous week ratings
      const { data: prevRatings } = await supabase
        .from('shift_pulse_ratings')
        .select('rating')
        .eq('company_id', companyId)
        .gte('clock_out_at', prevWeekStart)
        .lte('clock_out_at', prevWeekEnd)

      const prevAvg = prevRatings && prevRatings.length > 0
        ? prevRatings.reduce((s, r) => s + r.rating, 0) / prevRatings.length
        : 0

      // Get sites names
      const siteIds = [...new Set(siteRatings.map(r => r.site_id))]
      const { data: sites } = await supabase
        .from('sites')
        .select('id, name')
        .in('id', siteIds)

      const siteNameMap = new Map((sites || []).map(s => [s.id, s.name]))

      // Company-wide stats
      const totalResponses = siteRatings.length
      const avgRating = Math.round((siteRatings.reduce((s, r) => s + r.rating, 0) / totalResponses) * 10) / 10
      const trend = prevAvg > 0 ? Math.round((avgRating - prevAvg) * 10) / 10 : 0
      const trendArrow = trend > 0 ? '&#9650;' : trend < 0 ? '&#9660;' : '&#8212;'
      const trendColour = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#888'

      // Total clock-outs for response rate
      const { count: totalClockOuts } = await supabase
        .from('staff_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('shift_status', 'off_shift')
        .gte('clock_out_time', weekStart)
        .lte('clock_out_time', weekEnd)

      const responseRate = totalClockOuts && totalClockOuts > 0
        ? Math.round((totalResponses / totalClockOuts) * 100)
        : 0

      // Lowest-rated day
      const dayMap = new Map<number, { sum: number; count: number }>()
      for (const r of siteRatings) {
        const day = new Date(r.clock_out_at).getUTCDay()
        const existing = dayMap.get(day) || { sum: 0, count: 0 }
        existing.sum += r.rating
        existing.count++
        dayMap.set(day, existing)
      }

      let lowestDay = ''
      let lowestDayAvg = 6
      for (const [day, { sum, count }] of dayMap) {
        const avg = sum / count
        if (avg < lowestDayAvg) {
          lowestDayAvg = avg
          lowestDay = DAY_NAMES[day]
        }
      }

      // Staff with avg below 3.0
      const staffMap = new Map<string, { sum: number; count: number }>()
      for (const r of siteRatings) {
        const existing = staffMap.get(r.user_id) || { sum: 0, count: 0 }
        existing.sum += r.rating
        existing.count++
        staffMap.set(r.user_id, existing)
      }

      const lowRatedStaffCount = Array.from(staffMap.values())
        .filter(({ sum, count }) => sum / count < 3.0)
        .length

      // Get managers/admins to email
      const { data: managers } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('company_id', companyId)
        .in('app_role', ['Admin', 'Owner', 'Manager'])
        .not('email', 'is', null)

      if (!managers || managers.length === 0) continue

      // Build site label
      const siteLabel = siteIds.length === 1
        ? siteNameMap.get(siteIds[0]) || 'Your Site'
        : `${siteIds.length} Sites`

      // Build email HTML
      const html = buildEmailHtml({
        dateRangeLabel,
        siteLabel,
        avgRating,
        trend,
        trendArrow,
        trendColour,
        responseRate,
        totalResponses,
        lowestDay,
        lowestDayAvg: Math.round(lowestDayAvg * 10) / 10,
        lowRatedStaffCount,
      })

      // Send to each manager
      for (const manager of managers) {
        if (!manager.email) continue
        const subject = `Shift Pulse Weekly \u2014 ${siteLabel} \u2014 ${dateRangeLabel}`
        await sendEmail({ to: manager.email, subject, html })
        emailsSent++
      }
    }

    console.log(`[Cron] Shift Pulse weekly: sent ${emailsSent} emails`)
    return NextResponse.json({ success: true, emailsSent })
  } catch (error: any) {
    console.error('[Cron] Shift Pulse weekly error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildEmailHtml(data: {
  dateRangeLabel: string
  siteLabel: string
  avgRating: number
  trend: number
  trendArrow: string
  trendColour: string
  responseRate: number
  totalResponses: number
  lowestDay: string
  lowestDayAvg: number
  lowRatedStaffCount: number
}) {
  const ratingColour = getRatingColour(data.avgRating)
  const ratingLabel = getRatingLabel(data.avgRating)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;">

  <!-- Header -->
  <div style="background:#D37E91;padding:28px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:600;">Shift Pulse Weekly</h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">${data.siteLabel} &mdash; ${data.dateRangeLabel}</p>
  </div>

  <!-- Average Rating -->
  <div style="padding:28px 32px;text-align:center;border-bottom:1px solid #eee;">
    <p style="margin:0 0 4px;color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Average Rating</p>
    <p style="margin:0;font-size:42px;font-weight:700;color:${ratingColour};">${data.avgRating} <span style="font-size:18px;color:#aaa;">/ 5</span></p>
    <p style="margin:6px 0 0;font-size:14px;color:${ratingColour};">${ratingLabel}</p>
  </div>

  <!-- Stats Grid -->
  <div style="padding:24px 32px;border-bottom:1px solid #eee;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="width:50%;padding:12px 0;">
          <p style="margin:0 0 2px;color:#888;font-size:12px;">vs Previous Week</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:${data.trendColour};">${data.trendArrow} ${data.trend > 0 ? '+' : ''}${data.trend}</p>
        </td>
        <td style="width:50%;padding:12px 0;">
          <p style="margin:0 0 2px;color:#888;font-size:12px;">Response Rate</p>
          <p style="margin:0;font-size:20px;font-weight:600;color:#333;">${data.responseRate}% <span style="font-size:13px;color:#888;">(${data.totalResponses} responses)</span></p>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding:12px 0;">
          <p style="margin:0 0 2px;color:#888;font-size:12px;">Lowest-Rated Day</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#333;">${data.lowestDay} <span style="font-size:13px;color:${getRatingColour(data.lowestDayAvg)};">(${data.lowestDayAvg})</span></p>
        </td>
        <td style="width:50%;padding:12px 0;">
          <p style="margin:0 0 2px;color:#888;font-size:12px;">Staff Below 3.0 Avg</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:${data.lowRatedStaffCount > 0 ? '#EF4444' : '#10B981'};">${data.lowRatedStaffCount} staff member${data.lowRatedStaffCount !== 1 ? 's' : ''}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- CTA -->
  <div style="padding:28px 32px;text-align:center;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.opslytech.com'}/dashboard/people/shift-pulse"
       style="display:inline-block;background:#D37E91;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
      View Full Report
    </a>
    <p style="margin:16px 0 0;color:#aaa;font-size:12px;">Sent by Opsly &mdash; Teamly Module</p>
  </div>

</div>
</body>
</html>`.trim()
}
