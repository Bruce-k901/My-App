import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { delegateItem } from '@/lib/health-check/mutations'

/**
 * POST /api/health-check/delegate
 * Delegate a health check item to another user via Msgly conversation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, delegated_to, message, due_date, company_id, site_id } = body

    if (!item_id || !delegated_to || !message || !company_id) {
      return NextResponse.json(
        { error: 'item_id, delegated_to, message, and company_id are required' },
        { status: 400 }
      )
    }

    const result = await delegateItem(
      supabase,
      item_id,
      user.id,
      delegated_to,
      message,
      company_id,
      site_id || null,
      due_date
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Schedule initial reminder for delegate
    const reminderDate = due_date
      ? new Date(new Date(due_date).getTime() - 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.from('health_check_reminders').insert({
      health_check_item_id: item_id,
      reminder_type: 'initial',
      scheduled_for: reminderDate,
      sent_to: delegated_to,
      message_content: `You have been assigned a health check task: "${message}"`,
    })

    return NextResponse.json({
      success: true,
      conversation_id: result.conversationId,
    })
  } catch (error: any) {
    console.error('[HealthCheck] Delegation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
