import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/health-check/report/[reportId]
 * Fetch a health check report with all its items.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const supabase = await createServerSupabaseClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch report (RLS handles access control)
    const { data: report, error: reportError } = await supabase
      .from('health_check_reports')
      .select(`
        *,
        sites (id, name),
        profiles!health_check_reports_assigned_to_fkey (id, full_name, app_role)
      `)
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Mark as viewed
    if (!report.last_viewed_at) {
      await supabase
        .from('health_check_reports')
        .update({ last_viewed_at: new Date().toISOString(), status: 'in_progress' })
        .eq('id', reportId)
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('health_check_items')
      .select('*')
      .eq('report_id', reportId)
      .order('severity', { ascending: true })
      .order('module', { ascending: true })

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...report,
      site: report.sites,
      assigned_profile: report.profiles,
      items: items ?? [],
    })
  } catch (error: any) {
    console.error('[HealthCheck] Report fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
