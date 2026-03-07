import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rating, site_id, shift_id } = await request.json()

    // Validate rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
    }

    if (!site_id) {
      return NextResponse.json({ error: 'site_id is required' }, { status: 400 })
    }

    // Get user profile to verify company ownership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Verify site belongs to user's company
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', site_id)
      .eq('company_id', profile.company_id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Invalid site' }, { status: 400 })
    }

    // Duplicate check: prevent rating within last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: recentRating } = await supabase
      .from('shift_pulse_ratings')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', twoMinutesAgo)
      .limit(1)

    if (recentRating && recentRating.length > 0) {
      return NextResponse.json({ error: 'Rating already submitted for this clock-out' }, { status: 409 })
    }

    // Insert rating
    const { error: insertError } = await supabase
      .from('shift_pulse_ratings')
      .insert({
        company_id: profile.company_id,
        site_id,
        user_id: user.id,
        shift_id: shift_id || null,
        rating,
      })

    if (insertError) {
      if (insertError.code === '42P01') {
        // Table doesn't exist yet — graceful degradation
        console.log('[ShiftPulse] Table not found, skipping rating insert')
        return NextResponse.json({ success: true, skipped: true })
      }
      console.error('[ShiftPulse] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[ShiftPulse] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
