import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { batchGenerateAISuggestions, autoFixHighConfidenceItems } from '@/lib/health-check/ai-assistant'

/**
 * POST /api/health-check/ai-fix
 * Generate AI suggestions and optionally auto-fix high-confidence items.
 *
 * Body:
 *  - report_id: string (required)
 *  - auto_fix: boolean (optional, default false)
 *  - confidence_threshold: number (optional, default 90)
 *  - max_items: number (optional, default 20)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI features are not configured. Set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { report_id, auto_fix = false, confidence_threshold = 90, max_items = 20 } = body

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
    }

    // Verify access to report (RLS handles this, but check explicitly)
    const { data: report, error: reportError } = await supabase
      .from('health_check_reports')
      .select('id')
      .eq('id', report_id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }

    // Load pending items for this report
    const { data: items } = await supabase
      .from('health_check_items')
      .select('*')
      .eq('report_id', report_id)
      .eq('status', 'pending')

    if (!items?.length) {
      return NextResponse.json({
        success: true,
        suggestions: { processed: 0, succeeded: 0, failed: 0 },
        auto_fix: { fixed: 0, skipped: 0 },
      })
    }

    // Generate AI suggestions
    const suggestions = await batchGenerateAISuggestions(supabase, items, max_items)

    // Optionally auto-fix high confidence items
    let fixResult = { fixed: 0, skipped: 0 }
    if (auto_fix) {
      fixResult = await autoFixHighConfidenceItems(supabase, report_id, confidence_threshold)
    }

    return NextResponse.json({
      success: true,
      suggestions,
      auto_fix: fixResult,
    })
  } catch (error: any) {
    console.error('[HealthCheck] AI fix error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
