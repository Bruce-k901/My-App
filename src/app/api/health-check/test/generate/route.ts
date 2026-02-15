import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generateTestData, clearTestData } from '@/lib/health-check/test-data-generator'

/**
 * POST /api/health-check/test/generate
 * Generate synthetic test data for the health check system.
 * Restricted to platform admins.
 *
 * Body:
 *  - company_id: string (required)
 *  - scenario: 'clean' | 'moderate' | 'critical' | 'mixed' (required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check - must be platform admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { company_id, scenario } = body

    if (!company_id || !scenario) {
      return NextResponse.json(
        { error: 'company_id and scenario are required' },
        { status: 400 }
      )
    }

    const validScenarios = ['clean', 'moderate', 'critical', 'mixed']
    if (!validScenarios.includes(scenario)) {
      return NextResponse.json(
        { error: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await generateTestData(supabase, { companyId: company_id, scenario })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[HealthCheck] Test generate error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/health-check/test/generate
 * Clear all test data for a company.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check - platform admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_platform_admin')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile?.is_platform_admin) {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')

    if (!companyId) {
      return NextResponse.json({ error: 'company_id query param is required' }, { status: 400 })
    }

    const result = await clearTestData(supabase, companyId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[HealthCheck] Test clear error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
