import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { generateCompanyReports } from '@/lib/health-check/generator'

/**
 * POST /api/health-check/scan
 * Targeted health check scan for a specific company + optional site.
 * Uses admin client for scanning (bypasses RLS) but validates the caller is platform admin.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify caller is platform admin
    const userSupabase = await createServerSupabaseClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: 'Platform admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { company_id, site_id } = body

    if (!company_id) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
    }

    // Use admin client for the scan (needs to read across tables without RLS)
    const supabase = getSupabaseAdmin()

    const result = await generateCompanyReports(supabase, company_id, site_id || undefined)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[HealthCheck Scan] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
