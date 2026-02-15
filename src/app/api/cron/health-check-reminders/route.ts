import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { escalateOverdueItems } from '@/lib/health-check/escalation'

/**
 * POST /api/cron/health-check-reminders
 * Hourly cron job to process pending health check reminders and
 * check for overdue delegated items needing escalation.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // 1. Send pending reminders
    const { data: dueReminders } = await supabase
      .from('health_check_reminders')
      .select('id, health_check_item_id, sent_to, reminder_type, message_content')
      .is('sent_at', null)
      .lte('scheduled_for', now)
      .limit(100)

    let remindersSent = 0

    if (dueReminders?.length) {
      for (const reminder of dueReminders) {
        // Mark as sent (actual notification delivery would plug in here)
        await supabase
          .from('health_check_reminders')
          .update({ sent_at: now })
          .eq('id', reminder.id)

        // Increment counter on the item
        const { data: item } = await supabase
          .from('health_check_items')
          .select('reminder_count')
          .eq('id', reminder.health_check_item_id)
          .single()

        if (item) {
          await supabase
            .from('health_check_items')
            .update({
              last_reminder_sent: now,
              reminder_count: (item.reminder_count || 0) + 1,
            })
            .eq('id', reminder.health_check_item_id)
        }

        remindersSent++
      }
    }

    // 2. Schedule follow-up reminders for overdue items not yet at escalation threshold
    const { data: overdueItems } = await supabase
      .from('health_check_items')
      .select('id, delegated_to, reminder_count, due_date')
      .in('status', ['pending', 'delegated'])
      .not('due_date', 'is', null)
      .lt('due_date', now)
      .lt('reminder_count', 3)
      .limit(100)

    if (overdueItems?.length) {
      for (const item of overdueItems) {
        const nextReminder = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await supabase.from('health_check_reminders').insert({
          health_check_item_id: item.id,
          reminder_type: 'follow_up',
          scheduled_for: nextReminder,
          sent_to: item.delegated_to,
          message_content: `Reminder: Your delegated health check task is overdue (was due ${new Date(item.due_date!).toLocaleDateString()}).`,
        })

        await supabase
          .from('health_check_items')
          .update({ next_reminder_at: nextReminder })
          .eq('id', item.id)
      }
    }

    // 3. Escalate items with 3+ reminders via proper escalation chain
    const { data: companies } = await supabase
      .from('companies')
      .select('id')

    let escalations = 0
    for (const company of companies ?? []) {
      const result = await escalateOverdueItems(supabase, company.id)
      escalations += result.escalated
    }

    console.log('[Cron] Health check reminders:', {
      remindersSent,
      overdueFollowUps: overdueItems?.length ?? 0,
      escalations,
      timestamp: now,
    })

    return NextResponse.json({
      success: true,
      reminders_sent: remindersSent,
      overdue_follow_ups: overdueItems?.length ?? 0,
      escalations,
      timestamp: now,
    })
  } catch (error: any) {
    console.error('[Cron] Health check reminders error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow GET for dev testing
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Method not allowed in production' }, { status: 405 })
  }
  return POST(request)
}
