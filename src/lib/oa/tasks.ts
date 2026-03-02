/**
 * OA Task & Notification Service — primitives for creating tasks and notifications.
 *
 * All functions use getSupabaseAdmin() (service-role) to bypass RLS.
 * Fire-and-forget: errors are logged but never propagated.
 */

import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { OACreateTaskParams, OACreateReminderParams, OASendNotificationParams } from './types';

const TAG = '[OA Task]';

/**
 * Create a checklist task assigned to a specific user.
 * Returns the task ID on success, null on failure.
 */
export async function createTask(params: OACreateTaskParams): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data: task, error: taskError } = await admin
      .from('checklist_tasks')
      .insert({
        template_id: null,
        company_id: params.companyId,
        site_id: params.siteId || null,
        due_date: params.dueDate,
        due_time: params.dueTime || '09:00',
        daypart: 'anytime',
        assigned_to_role: params.assignedToRole || 'manager',
        assigned_to_user_id: params.assignedToUserId,
        status: 'pending',
        priority: params.priority || 'medium',
        custom_name: params.taskName,
        custom_instructions: params.instructions || null,
        task_data: {
          created_via: 'opsly_assistant',
          ...(params.taskData || {}),
        },
        generated_at: new Date().toISOString(),
        expires_at: params.expiresAt || null,
      } as any)
      .select('id')
      .single();

    if (taskError || !task) {
      console.error(`${TAG} createTask failed:`, JSON.stringify(taskError));
      return null;
    }

    console.log(`${TAG} Task created: ${task.id} — "${params.taskName}"`);
    return task.id;
  } catch (err: any) {
    console.error(`${TAG} createTask error:`, err?.message);
    return null;
  }
}

/**
 * Create a reminder notification for a specific user.
 * Returns the notification ID on success, null on failure.
 */
export async function createReminder(params: OACreateReminderParams): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    const { data: notification, error: notifError } = await admin
      .from('notifications')
      .insert({
        company_id: params.companyId,
        recipient_user_id: params.recipientUserId,
        type: 'task',
        title: params.title,
        message: params.message || null,
        link: params.link || null,
        read: false,
        metadata: {
          source: 'opsly_assistant',
          ...(params.metadata || {}),
        },
      } as any)
      .select('id')
      .single();

    if (notifError || !notification) {
      console.error(`${TAG} createReminder failed:`, JSON.stringify(notifError));
      return null;
    }

    console.log(`${TAG} Reminder created: ${notification.id} — "${params.title}"`);
    return notification.id;
  } catch (err: any) {
    console.error(`${TAG} createReminder error:`, err?.message);
    return null;
  }
}

/**
 * Send a general notification to a user or role.
 * Returns the notification ID on success, null on failure.
 */
export async function sendNotification(params: OASendNotificationParams): Promise<string | null> {
  try {
    const admin = getSupabaseAdmin();

    const insertData: Record<string, unknown> = {
      company_id: params.companyId,
      type: params.type,
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      read: false,
      metadata: {
        source: 'opsly_assistant',
        ...(params.metadata || {}),
      },
    };

    if (params.siteId) insertData.site_id = params.siteId;
    if (params.recipientUserId) insertData.recipient_user_id = params.recipientUserId;
    if (params.recipientRole) insertData.recipient_role = params.recipientRole;

    const { data: notification, error: notifError } = await admin
      .from('notifications')
      .insert(insertData as any)
      .select('id')
      .single();

    if (notifError || !notification) {
      console.error(`${TAG} sendNotification failed:`, JSON.stringify(notifError));
      return null;
    }

    console.log(`${TAG} Notification sent: ${notification.id} — "${params.title}"`);
    return notification.id;
  } catch (err: any) {
    console.error(`${TAG} sendNotification error:`, err?.message);
    return null;
  }
}
