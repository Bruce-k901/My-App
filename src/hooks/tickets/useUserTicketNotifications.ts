'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to get total unread count for user's tickets
 * Sums up unread_count from ticket_notifications for current user
 */
export function useUserTicketNotifications() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();

    // Set up real-time subscription for notification changes
    const channel = supabase
      .channel('user_ticket_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_notifications'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get all notifications for this user and sum unread counts
      const { data: notifications, error } = await supabase
        .from('ticket_notifications')
        .select('unread_count')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching ticket notifications:', error);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Sum up all unread counts
      const total = (notifications || []).reduce((sum, n) => sum + (n.unread_count || 0), 0);
      setUnreadCount(total);
    } catch (error) {
      console.error('Error fetching ticket notifications:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  return { unreadCount, loading };
}
