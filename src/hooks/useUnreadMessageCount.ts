"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

/**
 * Lightweight hook to get just the unread message count
 * Much faster than loading all conversations
 */
export function useUnreadMessageCount() {
  const { companyId } = useAppContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchUnreadCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUnreadCount(0);
          setLoading(false);
          return;
        }

        // Lightweight query: just get conversation IDs where user is a participant
        const { data: participantData } = await supabase
          .from('conversation_participants')
          .select('conversation_id, last_read_at, last_read_message_id')
          .eq('user_id', user.id)
          .is('left_at', null);

        if (!participantData || participantData.length === 0) {
          if (mounted) {
            setUnreadCount(0);
            setLoading(false);
          }
          return;
        }

        const conversationIds = participantData.map(p => p.conversation_id);

        // Get all unread messages in one query
        // Fetch all messages in conversations where user is a participant
        const { data: allMessages } = await supabase
          .from('messages')
          .select('conversation_id, created_at, sender_id')
          .in('conversation_id', conversationIds)
          .is('deleted_at', null)
          .neq('sender_id', user.id);

        // Calculate unread count per conversation
        let totalUnread = 0;
        if (allMessages) {
          participantData.forEach((participant) => {
            const lastRead = participant.last_read_at 
              ? new Date(participant.last_read_at)
              : new Date(0);
            
            const unreadInConv = allMessages.filter(msg => 
              msg.conversation_id === participant.conversation_id &&
              new Date(msg.created_at) > lastRead
            ).length;
            
            totalUnread += unreadInConv;
          });
        }

        if (mounted) {
          setUnreadCount(totalUnread);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
        if (mounted) {
          setUnreadCount(0);
          setLoading(false);
        }
      }
    }

    fetchUnreadCount();

    // Set up real-time subscription for unread counts
    const channel = supabase
      .channel('unread-message-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch when messages change
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
        },
        () => {
          // Refetch when participants change
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return { unreadCount, loading };
}

