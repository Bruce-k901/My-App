import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fixItem, ignoreItem } from '@/lib/health-check/mutations'

/**
 * PATCH /api/health-check/item/[itemId]
 * Update a health check item: fix value, ignore, or change status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params
    const supabase = await createServerSupabaseClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, new_value, report_id } = body

    switch (action) {
      case 'fix': {
        if (new_value === undefined) {
          return NextResponse.json({ error: 'new_value is required for fix action' }, { status: 400 })
        }
        const result = await fixItem(supabase, itemId, new_value, user.id)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case 'ignore': {
        if (!report_id) {
          return NextResponse.json({ error: 'report_id is required for ignore action' }, { status: 400 })
        }
        const result = await ignoreItem(supabase, itemId, report_id)
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      case 'update_status': {
        const { status } = body
        if (!status) {
          return NextResponse.json({ error: 'status is required' }, { status: 400 })
        }
        const { error } = await supabase
          .from('health_check_items')
          .update({ status })
          .eq('id', itemId)
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[HealthCheck] Item update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
