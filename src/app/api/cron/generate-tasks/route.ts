import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/generate-tasks
 * Daily cron job to trigger task generation via Supabase Edge Function.
 * Schedule: 4 AM UTC daily (configured in vercel.json)
 * Vercel cron jobs invoke routes via GET.
 *
 * This acts as a reliable Vercel-managed trigger for the generate-daily-tasks
 * Edge Function, which creates daily/weekly/monthly/annual tasks, PPM tasks,
 * certificate expiry tasks, SOP/RA review tasks, and more.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Generate tasks: unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Cron] Generate tasks: missing SUPABASE_URL or SERVICE_ROLE_KEY')
      return NextResponse.json(
        { error: 'Server configuration error: missing Supabase credentials' },
        { status: 500 }
      )
    }

    console.log('[Cron] Generate tasks starting...')

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-daily-tasks`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read response')
      console.error(`[Cron] Generate tasks: Edge Function returned ${response.status}:`, errorText)
      return NextResponse.json(
        {
          error: `Edge Function returned ${response.status}`,
          details: errorText.slice(0, 500),
          duration_ms: duration,
        },
        { status: 502 }
      )
    }

    const result = await response.json()

    console.log('[Cron] Generate tasks complete:', {
      total: result.total_tasks_created,
      daily: result.daily_tasks_created,
      weekly: result.weekly_tasks_created,
      monthly: result.monthly_tasks_created,
      ppm: result.ppm_tasks_created,
      certificates: result.certificate_tasks_created,
      errors: result.errors?.length || 0,
      duration_ms: duration,
    })

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Cron] Generate tasks error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        duration_ms: duration,
      },
      { status: 500 }
    )
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
