'use client';

import { useRef, useCallback } from 'react';
import { useAlerts } from './useAlerts';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import { usePanelStore } from '@/lib/stores/panel-store';
import type { Message } from '@/types/messaging';

interface UseMessageAlertsOptions {
  currentUserId: string;
  enabled?: boolean;
}

/**
 * Hook to handle new message alerts
 * Triggers sound, vibration, and toast notifications for incoming messages
 */
export function useMessageAlerts({
  currentUserId,
  enabled = true
}: UseMessageAlertsOptions) {
  const { alertNewMessage, settings } = useAlerts();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const lastAlertedMessageId = useRef<string | null>(null);

  const handleNewMessage = useCallback((message: Message) => {
    if (!enabled || !settings.messagesEnabled) return;

    // Get sender ID (handle both old and new column names)
    const senderId = message.sender_profile_id || message.sender_id;

    // Don't alert for own messages
    if (senderId === currentUserId) return;

    // Don't alert if already alerted this message
    if (message.id === lastAlertedMessageId.current) return;

    // Get conversation/channel ID
    const conversationId = message.channel_id || message.conversation_id;

    // Don't alert if user is already on the messages page viewing this conversation
    const currentPath = pathnameRef.current;
    const isViewingConversation = currentPath?.includes('/messages') &&
      conversationId && currentPath?.includes(conversationId);
    if (isViewingConversation) return;

    // Trigger alert
    alertNewMessage();
    lastAlertedMessageId.current = message.id;

    // Get sender name from various sources
    const senderName = message.sender?.full_name ||
      message.sender_name ||
      message.metadata?.sender_name ||
      message.sender?.email?.split('@')[0] ||
      'Someone';

    // Show toast notification
    toast.info(`${senderName}`, {
      description: message.content.length > 50
        ? message.content.substring(0, 50) + '...'
        : message.content,
      duration: 8000,
      action: {
        label: 'Reply',
        onClick: () => {
          if (conversationId) {
            usePanelStore.getState().openMessagingWithConversation(conversationId);
          } else {
            usePanelStore.getState().setMessagingOpen(true);
          }
        },
      },
    });
  }, [enabled, currentUserId, alertNewMessage, settings.messagesEnabled]);

  // Clear the last alerted message (useful when switching conversations)
  const clearLastAlerted = useCallback(() => {
    lastAlertedMessageId.current = null;
  }, []);

  return {
    handleNewMessage,
    clearLastAlerted,
  };
}
