import type { SupabaseClient } from '@supabase/supabase-js'
import type { ItemStatus, HealthCheckItem } from '@/types/health-check'

/**
 * Update the value of the source record directly, then mark the item resolved.
 */
export async function fixItem(
  supabase: SupabaseClient,
  itemId: string,
  newValue: unknown,
  resolvedBy: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch the item to know which table/record/field to update
  const { data: item, error: fetchError } = await supabase
    .from('health_check_items')
    .select('*')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) {
    return { success: false, error: fetchError?.message || 'Item not found' }
  }

  // Update the source record
  const { error: updateError } = await supabase
    .from(item.table_name)
    .update({ [item.field_name]: newValue })
    .eq('id', item.record_id)

  if (updateError) {
    return { success: false, error: `Failed to update source: ${updateError.message}` }
  }

  // Mark the health check item as resolved
  const { error: resolveError } = await supabase
    .from('health_check_items')
    .update({
      status: 'resolved' as ItemStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
      resolution_method: 'manual_fix',
      new_value: JSON.stringify(newValue),
    })
    .eq('id', itemId)

  if (resolveError) {
    return { success: false, error: `Source updated but failed to mark resolved: ${resolveError.message}` }
  }

  // Update report counters
  await updateReportCounters(supabase, item.report_id)

  return { success: true }
}

/**
 * Mark an item as ignored.
 */
export async function ignoreItem(
  supabase: SupabaseClient,
  itemId: string,
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('health_check_items')
    .update({ status: 'ignored' as ItemStatus })
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }

  await updateReportCounters(supabase, reportId)
  return { success: true }
}

/**
 * Delegate an item to another user via Msgly.
 */
export async function delegateItem(
  supabase: SupabaseClient,
  itemId: string,
  delegatedBy: string,
  delegateTo: string,
  message: string,
  companyId: string,
  siteId: string | null,
  dueDate?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  // Fetch the item
  const { data: item, error: fetchError } = await supabase
    .from('health_check_items')
    .select('id, title, report_id')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) {
    return { success: false, error: fetchError?.message || 'Item not found' }
  }

  // Create a conversation for the delegation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      company_id: companyId,
      site_id: siteId,
      type: 'direct',
      name: `Health Check: ${item.title}`,
      topic_category: 'operations',
      created_by: delegatedBy,
    })
    .select('id')
    .single()

  if (convError || !conversation) {
    return { success: false, error: `Failed to create conversation: ${convError?.message}` }
  }

  // Add participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: conversation.id, user_id: delegatedBy, role: 'admin' },
    { conversation_id: conversation.id, user_id: delegateTo, role: 'member' },
  ])

  // Send the delegation message
  await supabase.from('messages').insert({
    channel_id: conversation.id,
    sender_id: delegatedBy,
    content: message,
    message_type: 'text',
    is_task: true,
    metadata: { health_check_item_id: item.id },
  })

  // Update the health check item
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('health_check_items')
    .update({
      status: 'delegated' as ItemStatus,
      delegated_to: delegateTo,
      delegated_at: now,
      delegated_by: delegatedBy,
      delegation_message: message,
      due_date: dueDate || null,
      conversation_id: conversation.id,
      next_reminder_at: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', itemId)

  if (updateError) {
    return { success: false, error: `Delegation created but failed to update item: ${updateError.message}` }
  }

  await updateReportCounters(supabase, item.report_id)

  return { success: true, conversationId: conversation.id }
}

/**
 * Escalate an item to a higher-level manager.
 */
export async function escalateItem(
  supabase: SupabaseClient,
  itemId: string,
  escalateTo: string,
  reason: string,
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('health_check_items')
    .update({
      status: 'escalated' as ItemStatus,
      escalated_to: escalateTo,
      escalated_at: new Date().toISOString(),
      escalation_reason: reason,
    })
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }

  await updateReportCounters(supabase, reportId)
  return { success: true }
}

// ---------- Report Counter Sync ----------

async function updateReportCounters(supabase: SupabaseClient, reportId: string) {
  const { data: items } = await supabase
    .from('health_check_items')
    .select('status')
    .eq('report_id', reportId)

  if (!items) return

  const completed = items.filter(i => i.status === 'resolved' || i.status === 'ai_fixed').length
  const delegated = items.filter(i => i.status === 'delegated').length
  const escalated = items.filter(i => i.status === 'escalated').length
  const ignored = items.filter(i => i.status === 'ignored').length

  const allDone = items.every(i =>
    ['resolved', 'ai_fixed', 'ignored'].includes(i.status)
  )

  await supabase
    .from('health_check_reports')
    .update({
      completed_items: completed,
      delegated_items: delegated,
      escalated_items: escalated,
      ignored_items: ignored,
      status: allDone ? 'completed' : 'in_progress',
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq('id', reportId)
}
