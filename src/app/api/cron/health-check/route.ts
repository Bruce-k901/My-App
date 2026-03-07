import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { generateAllReports } from '@/lib/health-check/generator'

/**
 * GET /api/cron/health-check
 * Weekly cron job to scan all companies and generate health check reports.
 * Schedule: Daily at 3 AM UTC (configured in vercel.json)
 * Vercel cron jobs invoke routes via GET.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Health check: unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Health check starting...')
    const supabase = getSupabaseAdmin()
    const { companies, results } = await generateAllReports(supabase)

    const totalReports = results.reduce((sum, r) => sum + r.reports_created, 0)
    const totalItems = results.reduce((sum, r) => sum + r.items_created, 0)
    const totalTasks = results.reduce((sum, r) => sum + r.calendar_tasks_created, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    console.log('[Cron] Health check complete:', {
      companies,
      totalReports,
      totalItems,
      totalTasks,
      totalErrors,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      companies,
      reports_created: totalReports,
      items_created: totalItems,
      calendar_tasks_created: totalTasks,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Cron] Health check error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
