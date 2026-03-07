import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify manager/admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id, app_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['Admin', 'Owner', 'Manager'].includes(profile.app_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('site_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
    }

    // Calculate previous period for trend comparison
    const start = new Date(startDate)
    const end = new Date(endDate)
    const periodMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - periodMs).toISOString()
    const prevEnd = startDate

    // Current period ratings
    let currentQuery = supabase
      .from('shift_pulse_ratings')
      .select('rating')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', startDate)
      .lte('clock_out_at', endDate)

    if (siteId && siteId !== 'all') {
      currentQuery = currentQuery.eq('site_id', siteId)
    }

    const { data: currentRatings, error: currentError } = await currentQuery

    if (currentError) {
      if (currentError.code === '42P01') {
        return NextResponse.json({ success: true, data: { avgRating: 0, totalResponses: 0, responseRate: 0, trend: 0 } })
      }
      return NextResponse.json({ error: currentError.message }, { status: 500 })
    }

    // Previous period ratings for trend
    let prevQuery = supabase
      .from('shift_pulse_ratings')
      .select('rating')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', prevStart)
      .lt('clock_out_at', prevEnd)

    if (siteId && siteId !== 'all') {
      prevQuery = prevQuery.eq('site_id', siteId)
    }

    const { data: prevRatings } = await prevQuery

    // Total clock-outs for response rate
    let clockOutQuery = supabase
      .from('staff_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('shift_status', 'off_shift')
      .gte('clock_out_time', startDate)
      .lte('clock_out_time', endDate)

    if (siteId && siteId !== 'all') {
      clockOutQuery = clockOutQuery.eq('site_id', siteId)
    }

    const { count: totalClockOuts } = await clockOutQuery

    // Calculate stats
    const ratings = currentRatings || []
    const totalResponses = ratings.length
    const avgRating = totalResponses > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalResponses) * 10) / 10
      : 0
    const responseRate = totalClockOuts && totalClockOuts > 0
      ? Math.round((totalResponses / totalClockOuts) * 100)
      : 0

    const prevAvg = prevRatings && prevRatings.length > 0
      ? prevRatings.reduce((sum, r) => sum + r.rating, 0) / prevRatings.length
      : 0
    const trend = prevAvg > 0 ? Math.round((avgRating - prevAvg) * 10) / 10 : 0

    return NextResponse.json({
      success: true,
      data: { avgRating, totalResponses, responseRate, trend },
    })
  } catch (error: any) {
    console.error('[ShiftPulse Summary] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
