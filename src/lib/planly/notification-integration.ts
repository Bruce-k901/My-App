import { createServerSupabaseClient } from '@/lib/supabase-server';

export type NotificationType =
  | 'order_placed'
  | 'order_modified'
  | 'cutoff_reminder'
  | 'order_locked'
  | 'delivery_issue'
  | 'credit_approved'
  | 'credit_rejected'
  | 'stock_alert';

interface NotificationConfig {
  title: string;
  messageTemplate: string;
  recipientRole?: string;
  isPortal?: boolean;
}

const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  order_placed: {
    title: 'New order',
    messageTemplate: '{customer} placed order for {date} - {items} items, £{value}',
    recipientRole: 'production_team',
  },
  order_modified: {
    title: 'Order updated',
    messageTemplate: '{customer} modified order for {date}',
    recipientRole: 'production_team',
  },
  cutoff_reminder: {
    title: 'Order cutoff tomorrow',
    messageTemplate: 'Orders for {day} delivery lock at {time} tomorrow',
    isPortal: true,
  },
  order_locked: {
    title: 'Order confirmed',
    messageTemplate: 'Your order for {date} is now in production',
    isPortal: true,
  },
  delivery_issue: {
    title: 'Issue reported',
    messageTemplate: '{customer} reported {issue_type} for {product}',
    recipientRole: 'site_manager',
  },
  credit_approved: {
    title: 'Credit issued',
    messageTemplate: 'Credit note {number} for £{amount} has been issued',
    isPortal: true,
  },
  credit_rejected: {
    title: 'Issue reviewed',
    messageTemplate: 'Your reported issue has been reviewed - please contact us',
    isPortal: true,
  },
  stock_alert: {
    title: 'Low stock',
    messageTemplate: '{product} stock at {quantity} - forecast need: {forecast}',
    recipientRole: 'production_team',
  },
};

export async function createNotification(
  type: NotificationType,
  data: Record<string, any>,
  recipientUserId?: string,
  sourceReferenceId?: string,
  sourceReferenceType?: string
) {
  const supabase = await createServerSupabaseClient();
  const config = NOTIFICATION_CONFIGS[type];
  
  // Replace template variables
  let message = config.messageTemplate;
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, String(value));
  });

  const { error } = await supabase
    .from('planly_notifications')
    .insert({
      type,
      title: config.title,
      message,
      recipient_user_id: recipientUserId,
      recipient_role: config.recipientRole,
      source_reference_id: sourceReferenceId,
      source_reference_type: sourceReferenceType,
      is_portal: config.isPortal || false,
    });

  if (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

export async function getUnreadCount(userId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { count } = await supabase
    .from('planly_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);

  return count || 0;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from('planly_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}
