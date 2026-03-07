import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'
import { generateTaskCompletionEmailHTML } from '@/lib/emails/taskCompletionNotification'
import type { NotificationConfig, NotificationRecipient } from '@/types/checklist'

function substitutePlaceholders(template: string, values: Record<string, string>): string {
  let result = template
  for (const [placeholder, value] of Object.entries(values)) {
    result = result.replaceAll(placeholder, value)
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, completedBy, completedAt, companyId, siteId } = await request.json()

    if (!taskId || !completedBy || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch the task and its template_id
    const { data: task, error: taskError } = await supabase
      .from('checklist_tasks')
      .select('id, template_id, custom_name, site_id')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.template_id) {
      return NextResponse.json({ skipped: true, reason: 'No template associated' })
    }

    // 2. Fetch the template with notification_config
    const { data: template, error: templateError } = await supabase
      .from('task_templates')
      .select('id, name, notification_config')
      .eq('id', task.template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const config = template.notification_config as NotificationConfig | null
    if (!config?.enabled || config.trigger !== 'on_completion') {
      return NextResponse.json({ skipped: true, reason: 'Notifications not enabled' })
    }

    if (!config.recipients || config.recipients.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No recipients configured' })
    }

    // 3. Idempotency check — skip if already sent for this task
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('task_id', taskId)
      .eq('type', 'task')
      .containedBy('metadata', { template_notification: true })
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ skipped: true, reason: 'Notification already sent' })
    }

    // 4. Resolve context data for placeholder substitution
    const effectiveSiteId = siteId || task.site_id

    const [profileResult, siteResult, companyResult] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', completedBy).single(),
      effectiveSiteId
        ? supabase.from('sites').select('name').eq('id', effectiveSiteId).single()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('companies').select('name').eq('id', companyId).single(),
    ])

    const completedByName = profileResult.data?.full_name || profileResult.data?.email || 'Unknown'
    const siteName = siteResult.data?.name || 'Unknown Site'
    const companyName = companyResult.data?.name || ''
    const taskName = task.custom_name || template.name

    const completionDate = new Date(completedAt)
    const dateStr = completionDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const timeStr = completionDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // 5. Substitute placeholders
    const placeholders: Record<string, string> = {
      '{task_name}': taskName,
      '{completed_by}': completedByName,
      '{site_name}': siteName,
      '{company_name}': companyName,
      '{date}': dateStr,
      '{time}': timeStr,
    }

    const resolvedSubject = substitutePlaceholders(config.subject, placeholders)
    const resolvedMessage = substitutePlaceholders(config.message, placeholders)

    // 6. Resolve recipient email addresses
    const emailAddresses: Array<{ email: string; name: string }> = []

    const userRecipients = config.recipients.filter(
      (r: NotificationRecipient) => r.type === 'user' && r.user_id
    )

    if (userRecipients.length > 0) {
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in(
          'id',
          userRecipients.map((r: NotificationRecipient) => r.user_id!)
        )

      if (userProfiles) {
        for (const profile of userProfiles) {
          if (profile.email) {
            emailAddresses.push({ email: profile.email, name: profile.full_name || '' })
          }
        }
      }
    }

    for (const recipient of config.recipients) {
      if (recipient.type === 'external' && recipient.email) {
        emailAddresses.push({ email: recipient.email, name: recipient.name || '' })
      }
    }

    if (emailAddresses.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'No valid recipients' })
    }

    // 7. Generate HTML email
    const html = generateTaskCompletionEmailHTML({
      message: resolvedMessage,
      taskName,
      completedBy: completedByName,
      siteName,
      companyName,
      date: dateStr,
      time: timeStr,
    })

    // 8. Send emails
    const results = await Promise.allSettled(
      emailAddresses.map((recipient) =>
        sendEmail({
          to: recipient.email,
          subject: resolvedSubject,
          html,
        })
      )
    )

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).success
    ).length
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success)
    ).length

    // 9. Log to notifications table
    await supabase.from('notifications').insert({
      company_id: companyId,
      site_id: effectiveSiteId,
      type: 'task',
      title: resolvedSubject,
      message: resolvedMessage,
      severity: 'info',
      priority: 'medium',
      status: 'active',
      task_id: taskId,
      created_by: completedBy,
      push_sent: false,
      metadata: {
        template_notification: true,
        trigger: 'on_completion',
        template_id: template.id,
        recipients: emailAddresses,
        emails_sent: sent,
        emails_failed: failed,
      },
    })

    console.log(`📧 Task notification: ${sent} sent, ${failed} failed for task ${taskId}`)

    return NextResponse.json({ success: true, sent, failed })
  } catch (error: any) {
    console.error('❌ Notification send error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
