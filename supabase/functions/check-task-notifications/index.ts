import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Execution metrics for monitoring
interface ExecutionMetrics {
  startTime: number
  tasksChecked: number
  readyNotificationsCreated: number
  lateNotificationsCreated: number
  errors: Array<{ taskId?: string; error: string; context: string }>
  warnings: Array<{ taskId?: string; message: string }>
}

// Helper function to validate UUID
function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Helper function to parse time string safely
function parseTime(timeStr: string | null | undefined): { hour: number; minute: number } | null {
  if (!timeStr || typeof timeStr !== 'string') return null
  
  const parts = timeStr.split(':')
  if (parts.length !== 2) return null
  
  const hour = parseInt(parts[0], 10)
  const minute = parseInt(parts[1], 10)
  
  if (isNaN(hour) || isNaN(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  
  return { hour, minute }
}

// Helper function to validate task data before processing
function validateTask(task: any): { valid: boolean; reason?: string; hasTime?: boolean } {
  if (!task) {
    return { valid: false, reason: 'Task is null or undefined' }
  }
  
  if (!isValidUUID(task.id)) {
    return { valid: false, reason: `Invalid task ID: ${task.id}` }
  }
  
  if (!isValidUUID(task.company_id)) {
    return { valid: false, reason: `Invalid company_id: ${task.company_id}` }
  }
  
  // Check if task has due_time (in column or task_data)
  const dueTime = task.due_time || task.task_data?.due_time || 
                  (task.task_data?.daypart_times?.[0]?.due_time)
  
  if (!dueTime || dueTime === '') {
    // Task without specific time - still valid, just needs date-based notification
    return { valid: true, hasTime: false }
  }
  
  const parsedTime = parseTime(dueTime)
  if (!parsedTime) {
    return { valid: false, reason: `Invalid due_time format: ${dueTime}` }
  }
  
  return { valid: true, hasTime: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const metrics: ExecutionMetrics = {
    startTime: Date.now(),
    tasksChecked: 0,
    readyNotificationsCreated: 0,
    lateNotificationsCreated: 0,
    errors: [],
    warnings: [],
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      const errorMsg = 'Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      console.error(`[CRITICAL] ${errorMsg}`)
      metrics.errors.push({ error: errorMsg, context: 'Environment setup' })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          metrics 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get current time in UTC to avoid timezone issues
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    const today = now.toISOString().split('T')[0]

    console.log(`[Task Notifications] Starting check at ${currentTimeStr} UTC (${today})`)

    // ============================================================================
    // CRITICAL: This cron processes tasks that are due TODAY
    // - Query tasks with due_date = today
    // - Expand by dayparts from task_data.dayparts (each daypart = separate notification check)
    // - Check notification timing for each daypart's due_time
    // - Excludes cron-generated tasks
    // - Does NOT modify tasks, only creates notifications
    // ============================================================================
    
    let tasks: any[] = []
    try {
      // Query tasks - tasks already exist and are due, just check if due_date = today
      const { data, error: tasksError } = await supabase
        .from('checklist_tasks')
        .select(`
          id,
          template_id,
          site_id,
          assigned_to_user_id,
          due_date,
          due_time,
          daypart,
          status,
          company_id,
          task_data
        `)
        .in('status', ['pending', 'in_progress'])
        .eq('due_date', today)  // Tasks due TODAY
        // Note: We'll handle tasks with and without due_time
        // Tasks without due_time will get date-based notifications

      if (tasksError) {
        const errorMsg = `Database error fetching tasks: ${tasksError.message}`
        console.error(`[ERROR] ${errorMsg}`, tasksError)
        metrics.errors.push({ error: errorMsg, context: 'Task fetch' })
        throw new Error(errorMsg)
      }

      if (!data || data.length === 0) {
        console.log(`[INFO] No tasks due today (${today})`)
        return new Response(
          JSON.stringify({ 
            success: true, 
            notifications_created: 0, 
            message: 'No tasks to check',
            metrics: { ...metrics, executionTimeMs: Date.now() - metrics.startTime }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Filter out cron-generated tasks and expand by dayparts
      const expandedTasks: any[] = []
      let skippedCronGenerated = 0
      
      console.log(`[INFO] Found ${data.length} tasks due today (${today})`)
      
      for (const task of data) {
        // Exclude cron-generated tasks
        if (task.task_data && typeof task.task_data === 'object' && task.task_data.source === 'cron') {
          skippedCronGenerated++
          continue
        }
        
        // Get dayparts from task_data.dayparts array
        let dayparts: Array<{ daypart: string; due_time: string }> = []
        
        if (task.task_data?.dayparts && Array.isArray(task.task_data.dayparts)) {
          // Task has multiple dayparts - expand it
          task.task_data.dayparts.forEach((dp: any) => {
            const daypart = typeof dp === 'string' ? dp : (dp.daypart || dp)
            const dueTime = typeof dp === 'object' && dp.due_time ? dp.due_time : task.due_time
            dayparts.push({ daypart, due_time: dueTime })
          })
        } else {
          // Single daypart - use task's daypart and due_time
          dayparts.push({ 
            daypart: task.daypart || 'anytime', 
            due_time: task.due_time || '09:00' 
          })
        }
        
        // Expand task into one instance per daypart
        dayparts.forEach((dp) => {
          expandedTasks.push({
            ...task,
            daypart: dp.daypart,
            due_time: dp.due_time
          })
        })
      }
      
      tasks = expandedTasks
      metrics.tasksChecked = tasks.length
      console.log(`[INFO] Expanded ${data.length} tasks to ${tasks.length} daypart instances (skipped ${skippedCronGenerated} cron-generated)`)

    } catch (error) {
      const errorMsg = `Failed to fetch tasks: ${error instanceof Error ? error.message : String(error)}`
      console.error(`[ERROR] ${errorMsg}`, error)
      metrics.errors.push({ error: errorMsg, context: 'Task fetch' })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          metrics: { ...metrics, executionTimeMs: Date.now() - metrics.startTime }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tasks.length === 0) {
      console.log('[INFO] No tasks found for today')
      return new Response(
        JSON.stringify({ 
          success: true, 
          notifications_created: 0, 
          message: 'No tasks to check',
          metrics: { ...metrics, executionTimeMs: Date.now() - metrics.startTime }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each task with individual error handling
    const currentTimeMinutes = currentHour * 60 + currentMinute

    for (const task of tasks) {
      try {
        // Validate task data
        const validation = validateTask(task)
        if (!validation.valid) {
          metrics.warnings.push({ 
            taskId: task.id, 
            message: `Skipping invalid task: ${validation.reason}` 
          })
          console.warn(`[WARN] Skipping task ${task.id}: ${validation.reason}`)
          continue
        }

        // Get effective due_time (from column, task_data, or daypart_times)
        const effectiveDueTime = task.due_time || 
                                 task.task_data?.due_time || 
                                 (task.task_data?.daypart_times?.[0]?.due_time)

        const taskName = task.custom_name || 
                        (task.task_templates as any)?.name || 
                        task.task_data?.name || 
                        'Task'

        // If task doesn't have a specific due_time, create date-based notification
        if (!effectiveDueTime || effectiveDueTime === '' || !validation.hasTime) {
          // Task is due today but has no specific time - create a general notification
          // Send to ALL clocked-in users at the site (not just assigned user)
          if (!task.site_id || !isValidUUID(task.site_id)) {
            metrics.warnings.push({ 
              taskId: task.id, 
              message: 'Task without due_time missing site_id' 
            })
            continue
          }

          try {
            // Use the site-wide date-based notification function
            const { data: notifications, error: notifyError } = await supabase.rpc(
              'create_task_notification_for_date_range',
              {
                p_task_id: task.id,
                p_company_id: task.company_id,
                p_site_id: task.site_id,
                p_task_name: taskName,
                p_due_date: task.due_date,
                p_notification_type: 'task'
              }
            )

            if (notifyError) {
              console.error(`[ERROR] Task ${task.id}: Failed to create date-based notification: ${notifyError.message}`)
              metrics.errors.push({ 
                taskId: task.id, 
                error: notifyError.message, 
                context: 'create_task_notification_for_date_range' 
              })
            } else if (notifications && Array.isArray(notifications) && notifications.length > 0) {
              metrics.readyNotificationsCreated += notifications.length
              console.log(`[SUCCESS] Created ${notifications.length} date-based notification(s) for task ${task.id} (site: ${task.site_id})`)
            } else {
              console.log(`[INFO] Task ${task.id} ready but no users clocked in at site ${task.site_id}`)
            }
          } catch (rpcError) {
            console.error(`[ERROR] Task ${task.id}: Exception creating date-based notification:`, rpcError)
            metrics.errors.push({ 
              taskId: task.id, 
              error: String(rpcError), 
              context: 'create_task_notification_for_date_range (exception)' 
            })
          }
          continue // Skip time-based processing for tasks without due_time
        }

        // Task has a specific due_time - process time-based notifications
        const parsedTime = parseTime(effectiveDueTime)
        if (!parsedTime) {
          metrics.warnings.push({ 
            taskId: task.id, 
            message: `Invalid time format: ${effectiveDueTime}` 
          })
          continue
        }

        const { hour: dueHour, minute: dueMinute } = parsedTime
        const dueTimeMinutes = dueHour * 60 + dueMinute
        const windowStartMinutes = dueTimeMinutes - 60
        const windowEndMinutes = dueTimeMinutes + 60

        // Check if task is in "ready" window (1 hour before due time)
        if (currentTimeMinutes >= windowStartMinutes && currentTimeMinutes < dueTimeMinutes) {
          // Send to ALL clocked-in users at the site (not just assigned user)
          if (!task.site_id || !isValidUUID(task.site_id)) {
            metrics.warnings.push({ 
              taskId: task.id, 
              message: 'Task in ready window but missing site_id' 
            })
            continue
          }

          try {
            // Use the site-wide notification function
            const { data: notifications, error: notifyError } = await supabase.rpc(
              'create_task_notification_for_site',
              {
                p_task_id: task.id,
                p_company_id: task.company_id,
                p_site_id: task.site_id,
                p_task_name: taskName,
                p_due_time: effectiveDueTime,
                p_due_date: task.due_date,
                p_notification_type: 'task_ready'
              }
            )

            if (notifyError) {
              const errorMsg = `RPC error creating ready notification: ${notifyError.message}`
              console.error(`[ERROR] Task ${task.id}: ${errorMsg}`, notifyError)
              metrics.errors.push({ 
                taskId: task.id, 
                error: errorMsg, 
                context: 'create_task_notification_for_site' 
              })
              // Continue processing other tasks even if this one fails
              continue
            }

            // notifications is an array of {notification_id, user_id, user_name}
            if (notifications && Array.isArray(notifications) && notifications.length > 0) {
              metrics.readyNotificationsCreated += notifications.length
              console.log(`[SUCCESS] Created ${notifications.length} ready notification(s) for task ${task.id} (site: ${task.site_id})`)
            } else {
              console.log(`[INFO] Task ${task.id} ready but no users clocked in at site ${task.site_id}`)
            }

          } catch (rpcError) {
            const errorMsg = `Exception creating ready notification: ${rpcError instanceof Error ? rpcError.message : String(rpcError)}`
            console.error(`[ERROR] Task ${task.id}: ${errorMsg}`, rpcError)
            metrics.errors.push({ 
              taskId: task.id, 
              error: errorMsg, 
              context: 'create_task_notification_for_site (exception)' 
            })
            // Continue processing other tasks
            continue
          }
        }

        // Check if task is late (more than 1 hour after due time)
        if (currentTimeMinutes > windowEndMinutes) {
          // Send to ALL clocked-in users at the site (not just assigned user)
          if (!task.site_id || !isValidUUID(task.site_id)) {
            metrics.warnings.push({ 
              taskId: task.id, 
              message: 'Task is late but missing site_id' 
            })
            continue
          }

          try {
            // Use the site-wide notification function
            const { data: notifications, error: lateError } = await supabase.rpc(
              'create_task_notification_for_site',
              {
                p_task_id: task.id,
                p_company_id: task.company_id,
                p_site_id: task.site_id,
                p_task_name: taskName,
                p_due_time: effectiveDueTime,
                p_due_date: task.due_date,
                p_notification_type: 'task_late'
              }
            )

            if (lateError) {
              const errorMsg = `RPC error creating late notification: ${lateError.message}`
              console.error(`[ERROR] Task ${task.id}: ${errorMsg}`, lateError)
              metrics.errors.push({ 
                taskId: task.id, 
                error: errorMsg, 
                context: 'create_task_notification_for_site (late)' 
              })
              // Continue processing other tasks
              continue
            }

            // notifications is an array of {notification_id, user_id, user_name}
            if (notifications && Array.isArray(notifications) && notifications.length > 0) {
              metrics.lateNotificationsCreated += notifications.length
              console.log(`[SUCCESS] Created ${notifications.length} late notification(s) for task ${task.id} (site: ${task.site_id})`)
            } else {
              console.log(`[INFO] Task ${task.id} is late but no users clocked in at site ${task.site_id}`)
            }

          } catch (rpcError) {
            const errorMsg = `Exception creating late notification: ${rpcError instanceof Error ? rpcError.message : String(rpcError)}`
            console.error(`[ERROR] Task ${task.id}: ${errorMsg}`, rpcError)
            metrics.errors.push({ 
              taskId: task.id, 
              error: errorMsg, 
              context: 'create_task_notification_for_site (late exception)' 
            })
            // Continue processing other tasks
            continue
          }
        }

      } catch (taskError) {
        // Catch any unexpected errors during task processing
        const errorMsg = `Unexpected error processing task ${task.id}: ${taskError instanceof Error ? taskError.message : String(taskError)}`
        console.error(`[ERROR] ${errorMsg}`, taskError)
        metrics.errors.push({ 
          taskId: task.id, 
          error: errorMsg, 
          context: 'Task processing' 
        })
        // Continue with next task
        continue
      }
    }

    // Send push notifications (non-blocking - errors here don't fail the entire cron)
    try {
      await sendPushNotifications(supabase, metrics)
    } catch (pushError) {
      const errorMsg = `Error in sendPushNotifications: ${pushError instanceof Error ? pushError.message : String(pushError)}`
      console.error(`[ERROR] ${errorMsg}`, pushError)
      metrics.errors.push({ 
        error: errorMsg, 
        context: 'sendPushNotifications' 
      })
      // Don't fail the entire cron if push notifications fail
    }

    const executionTime = Date.now() - metrics.startTime
    const totalNotifications = metrics.readyNotificationsCreated + metrics.lateNotificationsCreated

    console.log(`[SUCCESS] Cron completed in ${executionTime}ms. Created ${totalNotifications} notifications (${metrics.readyNotificationsCreated} ready, ${metrics.lateNotificationsCreated} late). Errors: ${metrics.errors.length}, Warnings: ${metrics.warnings.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        ready_notifications: metrics.readyNotificationsCreated,
        late_notifications: metrics.lateNotificationsCreated,
        total_notifications: totalNotifications,
        tasks_checked: metrics.tasksChecked,
        errors_count: metrics.errors.length,
        warnings_count: metrics.warnings.length,
        execution_time_ms: executionTime,
        message: `Processed ${metrics.tasksChecked} tasks. Created ${totalNotifications} notifications.`,
        metrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const executionTime = Date.now() - metrics.startTime
    const errorMsg = `Fatal error in check-task-notifications: ${error instanceof Error ? error.message : String(error)}`
    console.error(`[FATAL] ${errorMsg}`, error)
    metrics.errors.push({ 
      error: errorMsg, 
      context: 'Top-level catch' 
    })

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg,
        metrics: { ...metrics, executionTimeMs: executionTime }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendPushNotifications(supabase: any, metrics: ExecutionMetrics) {
  try {
    console.log('[INFO] Checking for pending push notifications...')
    
    const { data: pendingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, severity, task_id, conversation_id')
      .eq('push_sent', false)
      .eq('read', false)
      .limit(100)

    if (notifError) {
      const errorMsg = `Error fetching pending notifications: ${notifError.message}`
      console.error(`[ERROR] ${errorMsg}`, notifError)
      metrics.errors.push({ error: errorMsg, context: 'Fetch pending notifications' })
      return
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[INFO] No pending push notifications found')
      return
    }

    console.log(`[INFO] Found ${pendingNotifications.length} pending notifications`)

    const userIds = [...new Set(pendingNotifications.map((n: any) => n.user_id).filter(Boolean))]
    
    if (userIds.length === 0) {
      console.log('[WARN] No valid user IDs found in pending notifications')
      return
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (subError) {
      const errorMsg = `Error fetching push subscriptions: ${subError.message}`
      console.error(`[ERROR] ${errorMsg}`, subError)
      metrics.errors.push({ error: errorMsg, context: 'Fetch push subscriptions' })
      return
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[INFO] No active push subscriptions found for users')
      // Mark notifications as push_sent even if no subscriptions (prevents retry loop)
      const notificationIds = pendingNotifications.map((n: any) => n.id)
      await supabase
        .from('notifications')
        .update({ push_sent: true })
        .in('id', notificationIds)
      return
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('[WARN] VAPID keys not configured, marking notifications as push_sent without sending')
      const notificationIds = pendingNotifications.map((n: any) => n.id)
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ push_sent: true })
        .in('id', notificationIds)

      if (updateError) {
        const errorMsg = `Error updating notification push_sent flag: ${updateError.message}`
        console.error(`[ERROR] ${errorMsg}`, updateError)
        metrics.errors.push({ error: errorMsg, context: 'Update push_sent flag' })
      }
      return
    }

    // TODO: Implement actual push notification sending here
    // For now, just mark as sent
    const notificationIds = pendingNotifications.map((n: any) => n.id)
    
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ push_sent: true })
      .in('id', notificationIds)

    if (updateError) {
      const errorMsg = `Error updating notification push_sent flag: ${updateError.message}`
      console.error(`[ERROR] ${errorMsg}`, updateError)
      metrics.errors.push({ error: errorMsg, context: 'Update push_sent flag' })
    } else {
      console.log(`[SUCCESS] Marked ${notificationIds.length} notifications as push_sent`)
    }
  } catch (error) {
    const errorMsg = `Exception in sendPushNotifications: ${error instanceof Error ? error.message : String(error)}`
    console.error(`[ERROR] ${errorMsg}`, error)
    metrics.errors.push({ error: errorMsg, context: 'sendPushNotifications exception' })
    // Don't throw - let the cron complete even if push notifications fail
  }
}
