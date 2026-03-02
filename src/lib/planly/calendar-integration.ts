import { createServerSupabaseClient } from '@/lib/supabase-server';
import { format } from 'date-fns';

export type CalendarEventType = 
  | 'order_placed'
  | 'order_locked'
  | 'cutoff_approaching'
  | 'frozen_stock_low'
  | 'delivery_issue';

const EVENT_CONFIGS: Record<CalendarEventType, { category: string; titleTemplate: string }> = {
  order_placed: {
    category: 'Tasks',
    titleTemplate: 'Order: {customer} - {items} items',
  },
  order_locked: {
    category: 'Tasks',
    titleTemplate: 'Production: {items} items for {day}',
  },
  cutoff_approaching: {
    category: 'Reminders',
    titleTemplate: 'Cutoff: {day} deliveries @ {time}',
  },
  frozen_stock_low: {
    category: 'Reminders',
    titleTemplate: 'Low stock: {product} - {quantity} remaining',
  },
  delivery_issue: {
    category: 'Tasks',
    titleTemplate: 'Issue: {customer} - {product}',
  },
};

export async function createCalendarEvent(
  type: CalendarEventType,
  data: Record<string, any>,
  siteId: string,
  sourceReferenceId?: string,
  sourceReferenceType?: string
) {
  const supabase = await createServerSupabaseClient();
  const config = EVENT_CONFIGS[type];
  
  // Replace template variables
  let title = config.titleTemplate;
  Object.entries(data).forEach(([key, value]) => {
    title = title.replace(`{${key}}`, String(value));
  });

  const { error } = await supabase
    .from('planly_calendar_events')
    .insert({
      title,
      event_date: data.event_date || format(new Date(), 'yyyy-MM-dd'),
      event_time: data.event_time,
      category: config.category,
      source_reference_id: sourceReferenceId,
      source_reference_type: sourceReferenceType,
      site_id: siteId,
      is_auto_generated: true,
    });

  if (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}

export async function archiveOldEvents() {
  const supabase = await createServerSupabaseClient();
  const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  
  const { error } = await supabase
    .from('planly_calendar_events')
    .update({ is_archived: true })
    .lt('event_date', yesterday)
    .eq('is_archived', false);

  if (error) {
    console.error('Failed to archive old events:', error);
    throw error;
  }
}
