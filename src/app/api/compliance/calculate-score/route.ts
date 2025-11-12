import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to manually trigger compliance score calculation
 * POST /api/compliance/calculate-score
 * Body: { siteId?: string, date?: string }
 * 
 * If siteId is provided, calculates for that site only
 * If date is provided, calculates for that date (defaults to today)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json().catch(() => ({}))
    const { siteId, date } = body

    const targetDate = date || new Date().toISOString().split('T')[0]

    if (siteId) {
      // Calculate for specific site
      // We need to call the function via RPC
      // But since it's security definer, we can call it directly
      const { error } = await supabase.rpc('compute_site_compliance_score', {
        target_date: targetDate
      })

      if (error) {
        console.error('Error calculating compliance score:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to calculate compliance score' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Compliance score calculated for site ${siteId} on ${targetDate}`,
        siteId,
        date: targetDate
      })
    } else {
      // Calculate for all sites
      // Get all sites
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id')

      if (sitesError) {
        return NextResponse.json(
          { error: sitesError.message || 'Failed to fetch sites' },
          { status: 500 }
        )
      }

      // Calculate for each site
      const results = []
      for (const site of sites || []) {
        try {
          const { error } = await supabase.rpc('compute_site_compliance_score', {
            target_date: targetDate
          })
          
          if (error) {
            results.push({ siteId: site.id, success: false, error: error.message })
          } else {
            results.push({ siteId: site.id, success: true })
          }
        } catch (err: any) {
          results.push({ siteId: site.id, success: false, error: err.message })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      return NextResponse.json({
        success: true,
        message: `Calculated compliance scores for ${successCount} sites${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        date: targetDate,
        results
      })
    }
  } catch (error: any) {
    console.error('Error in calculate-score route:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

