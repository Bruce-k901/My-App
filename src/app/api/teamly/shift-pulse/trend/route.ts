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

    let query = supabase
      .from('shift_pulse_ratings')
      .select('rating, clock_out_at')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', startDate)
      .lte('clock_out_at', endDate)
      .order('clock_out_at', { ascending: true })

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId)
    }

    const { data: ratings, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by date and calculate daily averages
    const dailyMap = new Map<string, { sum: number; count: number }>()

    for (const r of ratings || []) {
      const date = new Date(r.clock_out_at).toISOString().split('T')[0]
      const existing = dailyMap.get(date) || { sum: 0, count: 0 }
      existing.sum += r.rating
      existing.count += 1
      dailyMap.set(date, existing)
    }

    const trendData = Array.from(dailyMap.entries()).map(([date, { sum, count }]) => ({
      date,
      avg_rating: Math.round((sum / count) * 10) / 10,
      count,
    }))

    return NextResponse.json({ success: true, data: trendData })
  } catch (error: any) {
    console.error('[ShiftPulse Trend] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
