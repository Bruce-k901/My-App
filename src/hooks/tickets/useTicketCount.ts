'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useTicketCount() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicketCount();

    // Set up real-time subscription for ticket changes
    const channel = supabase
      .channel('ticket_count_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          fetchTicketCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTicketCount() {
    try {
      const { count: ticketCount, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      if (error) {
        console.error('Error fetching ticket count:', error);
        return;
      }

      setCount(ticketCount || 0);
    } catch (error) {
      console.error('Error fetching ticket count:', error);
    } finally {
      setLoading(false);
    }
  }

  return { count, loading };
}
