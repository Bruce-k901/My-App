import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

    console.log(`[Task Notifications] Checking tasks at ${currentTimeStr}`)

    const today = now.toISOString().split('T')[0]
    
    const { data: tasks, error: tasksError } = await supabase
      .from('checklist_tasks')
      .select(`
        id,
        template_id,
        site_id,
        assigned_to_user_id,
        due_date,
        due_time,
        status,
        company_id,
        task_templates:template_id(name)
      `)
      .eq('due_date', today)
      .in('status', ['pending', 'in_progress'])
      .not('due_time', 'is', null)

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      throw tasksError
    }

    if (!tasks || tasks.length === 0) {
      console.log('No tasks found for today')
      return new Response(
        JSON.stringify({ success: true, notifications_created: 0, message: 'No tasks to check' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let readyNotificationsCreated = 0
    let lateNotificationsCreated = 0

    for (const task of tasks) {
      if (!task.due_time) continue

      const [dueHour, dueMinute] = task.due_time.split(':').map(Number)
      const dueTimeMinutes = dueHour * 60 + dueMinute
      const currentTimeMinutes = currentHour * 60 + currentMinute

      const windowStartMinutes = dueTimeMinutes - 60
      const windowEndMinutes = dueTimeMinutes + 60

      const taskName = (task.task_templates as any)?.name || 'Task'

      if (currentTimeMinutes >= windowStartMinutes && currentTimeMinutes < dueTimeMinutes) {
        if (task.assigned_to_user_id) {
          const { data: notificationId, error: notifyError } = await supabase.rpc(
            'create_task_ready_notification',
            {
              p_task_id: task.id,
              p_company_id: task.company_id,
              p_site_id: task.site_id,
              p_user_id: task.assigned_to_user_id,
              p_task_name: taskName,
              p_due_time: task.due_time
            }
          )

          if (!notifyError && notificationId) {
            readyNotificationsCreated++
            console.log(`Created ready notification for task ${task.id}`)
          }
        }
      }

      if (currentTimeMinutes > windowEndMinutes) {
        if (task.assigned_to_user_id && task.site_id) {
          const { data: notificationCount, error: lateError } = await supabase.rpc(
            'create_late_task_notification',
            {
              p_task_id: task.id,
              p_company_id: task.company_id,
              p_site_id: task.site_id,
              p_task_name: taskName,
              p_due_time: task.due_time,
              p_assigned_user_id: task.assigned_to_user_id
            }
          )

          if (!lateError && notificationCount > 0) {
            lateNotificationsCreated += notificationCount
            console.log(`Created ${notificationCount} late notification(s) for task ${task.id}`)
          }
        }
      }
    }

    await sendPushNotifications(supabase)

    return new Response(
      JSON.stringify({
        success: true,
        ready_notifications: readyNotificationsCreated,
        late_notifications: lateNotificationsCreated,
        total_notifications: readyNotificationsCreated + lateNotificationsCreated,
        message: `Created ${readyNotificationsCreated} ready and ${lateNotificationsCreated} late notifications`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-task-notifications:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendPushNotifications(supabase: any) {
  try {
    const { data: pendingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, severity, task_id, conversation_id')
      .eq('push_sent', false)
      .eq('read', false)
      .limit(100)

    if (notifError) {
      console.error('Error fetching pending notifications:', notifError)
      return
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return
    }

    const userIds = [...new Set(pendingNotifications.map((n: any) => n.user_id))]
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (subError) {
      console.error('Error fetching push subscriptions:', subError)
      return
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found')
      return
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured, skipping push notifications')
      const notificationIds = pendingNotifications.map((n: any) => n.id)
      await supabase
        .from('notifications')
        .update({ push_sent: true })
        .in('id', notificationIds)
      return
    }

    const notificationIds = pendingNotifications.map((n: any) => n.id)
    
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ push_sent: true })
      .in('id', notificationIds)

    if (updateError) {
      console.error('Error updating notification push_sent flag:', updateError)
    } else {
      console.log(`Marked ${notificationIds.length} notifications as push_sent`)
    }
  } catch (error) {
    console.error('Error in sendPushNotifications:', error)
  }
}
