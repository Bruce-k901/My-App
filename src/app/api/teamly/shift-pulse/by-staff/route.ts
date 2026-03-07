import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Calculate previous period for per-staff trend
    const start = new Date(startDate)
    const end = new Date(endDate)
    const periodMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - periodMs).toISOString()
    const prevEnd = startDate

    // Current period ratings with user info
    let currentQuery = supabase
      .from('shift_pulse_ratings')
      .select('rating, user_id')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', startDate)
      .lte('clock_out_at', endDate)

    if (siteId && siteId !== 'all') {
      currentQuery = currentQuery.eq('site_id', siteId)
    }

    const { data: currentRatings, error } = await currentQuery

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Previous period ratings for trend
    let prevQuery = supabase
      .from('shift_pulse_ratings')
      .select('rating, user_id')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', prevStart)
      .lt('clock_out_at', prevEnd)

    if (siteId && siteId !== 'all') {
      prevQuery = prevQuery.eq('site_id', siteId)
    }

    const { data: prevRatings } = await prevQuery

    // Aggregate per staff (current period)
    const staffMap = new Map<string, { sum: number; count: number }>()
    for (const r of currentRatings || []) {
      const existing = staffMap.get(r.user_id) || { sum: 0, count: 0 }
      existing.sum += r.rating
      existing.count += 1
      staffMap.set(r.user_id, existing)
    }

    // Previous period aggregation for trend
    const prevStaffMap = new Map<string, { sum: number; count: number }>()
    for (const r of prevRatings || []) {
      const existing = prevStaffMap.get(r.user_id) || { sum: 0, count: 0 }
      existing.sum += r.rating
      existing.count += 1
      prevStaffMap.set(r.user_id, existing)
    }

    // Get profile names for all staff with ratings
    const userIds = Array.from(staffMap.keys())
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]))

    // Build result sorted by avg rating ascending (lowest first)
    const staffData = Array.from(staffMap.entries())
      .map(([userId, { sum, count }]) => {
        const avg = Math.round((sum / count) * 10) / 10
        const prev = prevStaffMap.get(userId)
        const prevAvg = prev ? prev.sum / prev.count : 0
        const trend = prev ? Math.round((avg - prevAvg) * 10) / 10 : 0

        return {
          user_id: userId,
          name: profileMap.get(userId) || 'Unknown',
          avg_rating: avg,
          count,
          trend,
        }
      })
      .sort((a, b) => a.avg_rating - b.avg_rating)

    return NextResponse.json({ success: true, data: staffData })
  } catch (error: any) {
    console.error('[ShiftPulse ByStaff] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
