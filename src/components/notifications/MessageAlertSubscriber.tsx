'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import { useMessageAlerts } from '@/hooks/useMessageAlerts';
import type { Message } from '@/types/messaging';

/**
 * Global component that subscribes to new messages company-wide
 * and triggers alerts for incoming messages when the user is not
 * currently viewing that conversation.
 *
 * Should be included in the root layout (wrapped in a client boundary).
 */
export function MessageAlertSubscriber() {
  const { profile, companyId, userId } = useAppContext();
  const { handleNewMessage } = useMessageAlerts({
    currentUserId: userId || profile?.id || '',
    enabled: !!profile && !!companyId,
  });

  // Track subscribed channel to prevent duplicate subscriptions
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!profile?.id || !companyId) return;

    // Only subscribe if not already subscribed
    if (channelRef.current) return;

    // Subscribe to all new messages in the company
    // Filter to only messages where the user is a participant
    const channel = supabase
      .channel(`company-messages:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaging_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Skip if sender is current user
          const senderId = newMessage.sender_profile_id || newMessage.sender_id;
          if (senderId === profile.id) return;

          // Get channel info to check if user is a participant
          const channelId = newMessage.channel_id;
          if (!channelId) return;

          // Check if user is a member of this channel
          const { data: membership } = await supabase
            .from('messaging_channel_members')
            .select('profile_id')
            .eq('channel_id', channelId)
            .eq('profile_id', profile.id)
            .is('left_at', null)
            .maybeSingle();

          if (!membership) return; // User is not a participant

          // Get sender info for the alert
          let senderInfo = null;

          // Try to get sender info from metadata first
          if (newMessage.metadata?.sender_name) {
            senderInfo = {
              id: senderId,
              full_name: newMessage.metadata.sender_name,
              email: newMessage.metadata.sender_email || null,
            };
          } else {
            // Fetch sender profile
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', senderId)
              .maybeSingle();

            if (senderProfile) {
              senderInfo = senderProfile;
            }
          }

          // Construct message object for alert
          const message: Message = {
            id: newMessage.id,
            channel_id: newMessage.channel_id,
            sender_profile_id: senderId,
            content: newMessage.content || '',
            message_type: newMessage.message_type || 'text',
            metadata: newMessage.metadata || {},
            created_at: newMessage.created_at,
            updated_at: newMessage.updated_at || newMessage.created_at,
            sender: senderInfo,
          };

          // Trigger the alert
          handleNewMessage(message);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[MessageAlertSubscriber] Subscribed to company messages');
        } else if (status === 'CHANNEL_ERROR' && err) {
          console.debug('[MessageAlertSubscriber] Subscription error:', err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe().catch(() => {});
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile?.id, companyId, handleNewMessage]);

  return null; // This component doesn't render anything
}
