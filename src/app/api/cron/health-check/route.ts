import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { generateAllReports } from '@/lib/health-check/generator'

/**
 * POST /api/cron/health-check
 * Weekly cron job to scan all companies and generate health check reports.
 * Schedule: Wednesdays at 6 AM UTC (configured in vercel.json)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

// Allow GET for dev testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed in production' }, { status: 405 })
  }
  return POST(request)
}
