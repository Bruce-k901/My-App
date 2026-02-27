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
      .select('rating')
      .eq('company_id', profile.company_id)
      .gte('clock_out_at', startDate)
      .lte('clock_out_at', endDate)

    if (siteId && siteId !== 'all') {
      query = query.eq('site_id', siteId)
    }

    const { data: ratings, error } = await query

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          data: [
            { rating: 1, count: 0 },
            { rating: 2, count: 0 },
            { rating: 3, count: 0 },
            { rating: 4, count: 0 },
            { rating: 5, count: 0 },
          ],
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count each rating value
    const counts = [0, 0, 0, 0, 0]
    for (const r of ratings || []) {
      counts[r.rating - 1]++
    }

    const distribution = counts.map((count, i) => ({
      rating: i + 1,
      count,
    }))

    return NextResponse.json({ success: true, data: distribution })
  } catch (error: any) {
    console.error('[ShiftPulse Distribution] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
