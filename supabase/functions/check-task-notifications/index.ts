import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

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
  pushNotificationsSent: number
  pushNotificationsFailed: number
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
    pushNotificationsSent: 0,
    pushNotificationsFailed: 0,
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
        push_sent: metrics.pushNotificationsSent,
        push_failed: metrics.pushNotificationsFailed,
        tasks_checked: metrics.tasksChecked,
        errors_count: metrics.errors.length,
        warnings_count: metrics.warnings.length,
        execution_time_ms: executionTime,
        message: `Processed ${metrics.tasksChecked} tasks. Created ${totalNotifications} notifications. Push: ${metrics.pushNotificationsSent} sent, ${metrics.pushNotificationsFailed} failed.`,
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

// ============================================================================
// WEB PUSH NOTIFICATION IMPLEMENTATION
// Uses VAPID for authentication and Web Push protocol for delivery
// ============================================================================

/**
 * Convert URL-safe base64 to standard base64
 */
function urlBase64ToBase64(urlBase64: string): string {
  let base64 = urlBase64.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding) {
    base64 += '='.repeat(4 - padding)
  }
  return base64
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const standardBase64 = urlBase64ToBase64(base64)
  const binaryString = atob(standardBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert Uint8Array to URL-safe base64
 */
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  const base64 = base64Encode(uint8Array)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Create VAPID JWT for push authentication
 */
async function createVapidJwt(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`

  // JWT Header
  const header = { typ: 'JWT', alg: 'ES256' }
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)))

  // JWT Payload - expires in 12 hours
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: 'mailto:notifications@opsly.app'
  }
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)))

  // Import the VAPID private key for signing
  const privateKeyBytes = base64ToUint8Array(vapidPrivateKey)

  // Create the raw private key in JWK format for P-256
  const publicKeyBytes = base64ToUint8Array(vapidPublicKey)

  // Extract x and y coordinates from uncompressed public key (first byte is 0x04)
  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(privateKeyBytes)
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Sign the JWT
  const unsignedToken = `${headerB64}.${payloadB64}`
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  // Convert signature from DER to raw format (r || s)
  const signatureArray = new Uint8Array(signature)
  const signatureB64 = uint8ArrayToBase64Url(signatureArray)

  const jwt = `${unsignedToken}.${signatureB64}`

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey
  }
}

/**
 * Encrypt push notification payload using Web Push encryption
 */
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Export local public key
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  const localPublicKey = new Uint8Array(localPublicKeyBuffer)

  // Import subscription's public key
  const subscriptionPublicKeyBytes = base64ToUint8Array(p256dh)
  const subscriptionPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriptionPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriptionPublicKey },
    localKeyPair.privateKey,
    256
  )
  const sharedSecret = new Uint8Array(sharedSecretBuffer)

  // Get auth secret
  const authSecret = base64ToUint8Array(auth)

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF to derive encryption key and nonce
  // First, derive PRK using auth secret
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const prkBuffer = await crypto.subtle.sign('HMAC', prkKey, sharedSecret)

  // Import PRK for further derivation
  const prk = await crypto.subtle.importKey(
    'raw',
    prkBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Create key info for content encryption key
  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
  ])

  // Derive content encryption key
  const cekInfoWithCounter = new Uint8Array([...keyInfo, 1])
  const cekBuffer = await crypto.subtle.sign('HMAC', prk, cekInfoWithCounter)
  const cek = new Uint8Array(cekBuffer).slice(0, 16)

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0')
  const nonceInfoWithCounter = new Uint8Array([...nonceInfo, 1])
  const nonceBuffer = await crypto.subtle.sign('HMAC', prk, nonceInfoWithCounter)
  const nonce = new Uint8Array(nonceBuffer).slice(0, 12)

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Add padding to payload (required by Web Push)
  const payloadBytes = new TextEncoder().encode(payload)
  const paddedPayload = new Uint8Array(payloadBytes.length + 1)
  paddedPayload.set(payloadBytes)
  paddedPayload[payloadBytes.length] = 2 // Padding delimiter

  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  )

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    salt,
    localPublicKey
  }
}

/**
 * Build the encrypted body in aes128gcm format
 */
function buildEncryptedBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array,
  recordSize: number = 4096
): Uint8Array {
  // Header: salt (16) + record size (4) + key length (1) + key (65)
  const header = new Uint8Array(86)
  header.set(salt, 0)

  // Record size as 4-byte big-endian
  const recordSizeView = new DataView(header.buffer, 16, 4)
  recordSizeView.setUint32(0, recordSize, false)

  // Key length
  header[20] = localPublicKey.length

  // Local public key
  header.set(localPublicKey, 21)

  // Combine header and ciphertext
  const body = new Uint8Array(header.length + ciphertext.length)
  body.set(header)
  body.set(ciphertext, header.length)

  return body
}

/**
 * Send a single push notification
 */
async function sendSinglePushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; message: string; url?: string; id?: string; type?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload)

    // Create VAPID authorization
    const { authorization } = await createVapidJwt(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Encrypt the payload
    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    )

    // Build the encrypted body
    const body = buildEncryptedBody(ciphertext, salt, localPublicKey)

    // Send the push notification
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 hours
        'Urgency': 'normal'
      },
      body
    })

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status }
    } else if (response.status === 410 || response.status === 404) {
      // Subscription expired or invalid
      return { success: false, statusCode: response.status, error: 'Subscription expired' }
    } else {
      const errorText = await response.text()
      return { success: false, statusCode: response.status, error: errorText }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function sendPushNotifications(supabase: any, metrics: ExecutionMetrics) {
  try {
    console.log('[INFO] Checking for pending push notifications...')

    const { data: pendingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, recipient_user_id, title, message, type, severity, task_id, conversation_id, link')
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

    const userIds = [...new Set(pendingNotifications.map((n: any) => n.recipient_user_id).filter(Boolean))]

    if (userIds.length === 0) {
      console.log('[WARN] No valid user IDs found in pending notifications')
      // Mark as sent to prevent retry loop
      const notificationIds = pendingNotifications.map((n: any) => n.id)
      await supabase
        .from('notifications')
        .update({ push_sent: true })
        .in('id', notificationIds)
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

    // Create a map of user_id to subscriptions for faster lookup
    const subscriptionsByUser = new Map<string, typeof subscriptions>()
    for (const sub of subscriptions) {
      if (!subscriptionsByUser.has(sub.user_id)) {
        subscriptionsByUser.set(sub.user_id, [])
      }
      subscriptionsByUser.get(sub.user_id)!.push(sub)
    }

    // Track results
    const expiredSubscriptions: string[] = []
    const sentNotificationIds: string[] = []

    // Send push notifications
    for (const notification of pendingNotifications) {
      const userSubscriptions = subscriptionsByUser.get(notification.recipient_user_id) || []

      if (userSubscriptions.length === 0) {
        // No subscription for this user, mark as sent
        sentNotificationIds.push(notification.id)
        continue
      }

      const payload = {
        title: notification.title || 'Notification',
        message: notification.message || '',
        url: notification.link || '/notifications',
        id: notification.id,
        type: notification.type
      }

      // Send to all user's subscriptions (they might have multiple devices)
      for (const subscription of userSubscriptions) {
        const result = await sendSinglePushNotification(
          {
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth
          },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )

        if (result.success) {
          metrics.pushNotificationsSent++
          console.log(`[SUCCESS] Push sent to ${subscription.endpoint.substring(0, 50)}...`)
        } else {
          metrics.pushNotificationsFailed++
          console.warn(`[WARN] Push failed: ${result.error} (status: ${result.statusCode})`)

          // Mark expired subscriptions for cleanup
          if (result.statusCode === 410 || result.statusCode === 404) {
            expiredSubscriptions.push(subscription.endpoint)
          }
        }
      }

      // Mark notification as sent regardless of push success (to prevent infinite retries)
      sentNotificationIds.push(notification.id)
    }

    // Update notifications as push_sent
    if (sentNotificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ push_sent: true })
        .in('id', sentNotificationIds)

      if (updateError) {
        const errorMsg = `Error updating notification push_sent flag: ${updateError.message}`
        console.error(`[ERROR] ${errorMsg}`, updateError)
        metrics.errors.push({ error: errorMsg, context: 'Update push_sent flag' })
      }
    }

    // Deactivate expired subscriptions
    if (expiredSubscriptions.length > 0) {
      const { error: deactivateError } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('endpoint', expiredSubscriptions)

      if (deactivateError) {
        console.warn(`[WARN] Failed to deactivate expired subscriptions: ${deactivateError.message}`)
      } else {
        console.log(`[INFO] Deactivated ${expiredSubscriptions.length} expired subscriptions`)
      }
    }

    console.log(`[SUCCESS] Push notifications complete: ${metrics.pushNotificationsSent} sent, ${metrics.pushNotificationsFailed} failed, ${sentNotificationIds.length} notifications processed`)

  } catch (error) {
    const errorMsg = `Exception in sendPushNotifications: ${error instanceof Error ? error.message : String(error)}`
    console.error(`[ERROR] ${errorMsg}`, error)
    metrics.errors.push({ error: errorMsg, context: 'sendPushNotifications exception' })
    // Don't throw - let the cron complete even if push notifications fail
  }
}
