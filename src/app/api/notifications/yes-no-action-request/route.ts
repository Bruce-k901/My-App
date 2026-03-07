import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/send-email'
import { generateYesNoActionEmailHTML } from '@/lib/emails/yesNoActionNotification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      managerIds,
      question,
      answer,
      actionMessage,
      actionResponse,
      taskId,
      companyId,
      siteId,
      completedBy,
    } = body

    if (!managerIds || !Array.isArray(managerIds) || managerIds.length === 0) {
      return NextResponse.json({ error: 'No manager IDs provided' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Look up manager emails
    const { data: managers, error: managersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', managerIds)

    if (managersError || !managers || managers.length === 0) {
      return NextResponse.json({ error: 'Failed to load manager profiles' }, { status: 500 })
    }

    // Get task and site names for context
    let taskName = 'Task'
    let siteName = 'Site'

    if (taskId) {
      const { data: taskData } = await supabase
        .from('checklist_tasks')
        .select('custom_name, template:task_templates(name)')
        .eq('id', taskId)
        .single()

      if (taskData) {
        taskName = taskData.custom_name || (taskData.template as any)?.name || 'Task'
      }
    }

    if (siteId) {
      const { data: siteData } = await supabase
        .from('sites')
        .select('name')
        .eq('id', siteId)
        .single()

      if (siteData) {
        siteName = siteData.name
      }
    }

    // Generate email HTML
    const html = generateYesNoActionEmailHTML({
      question,
      answer,
      actionMessage,
      actionResponse,
      completedBy,
      taskName,
      siteName,
    })

    // Send to each manager
    const results = await Promise.allSettled(
      managers
        .filter(m => m.email)
        .map(manager =>
          sendEmail({
            to: manager.email,
            subject: `Action Required: ${question?.substring(0, 50) || 'Yes/No Response'}`,
            html,
          })
        )
    )

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const failed = results.length - sent

    return NextResponse.json({ sent, failed, total: results.length })
  } catch (err: any) {
    console.error('Yes/No action notification error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
