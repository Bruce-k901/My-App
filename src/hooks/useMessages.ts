"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/messaging';

interface UseMessagesOptions {
  conversationId: string;
  limit?: number;
  autoLoad?: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  sendMessage: (content: string, replyToId?: string) => Promise<Message | null>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
}

export function useMessages({
  conversationId,
  limit = 50,
  autoLoad = true,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);

  const loadMessages = useCallback(async (beforeId?: string | null) => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Minimal shape first to avoid RLS issues from joins; enrich client-side as needed
      let query = supabase
        .from('messages')
        .select('id, content, created_at, sender_id, conversation_id')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeId) {
        query = query.lt('id', beforeId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        if (beforeId) {
          setHasMore(false);
        }
        setLoading(false);
        return;
      }

      // Reverse to show oldest first, then newest
      const newMessages = [...data].reverse() as Message[];

      if (beforeId) {
        // Loading more (older messages)
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        // Initial load
        setMessages(newMessages);
      }

      setOldestMessageId(newMessages[0]?.id || null);
      setHasMore(data.length === limit);
      setLoading(false);
    } catch (err: any) {
      // Better error logging
      const errorMessage = err?.message || err?.error?.message || String(err) || 'Failed to load messages';
      const errorCode = err?.code || err?.error?.code || 'UNKNOWN';
      
      console.error('Error loading messages:', {
        message: errorMessage,
        code: errorCode,
        details: err?.details || err?.error?.details,
        hint: err?.hint || err?.error?.hint,
        conversationId,
        fullError: err,
        errorStringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [conversationId, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !oldestMessageId) return;
    await loadMessages(oldestMessageId);
  }, [hasMore, loading, oldestMessageId, loadMessages]);

  const sendMessage = useCallback(async (
    content: string,
    replyToId?: string
  ): Promise<Message | null> => {
    if (!conversationId || !content.trim()) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          reply_to_id: replyToId || null,
          message_type: 'text',
        })
        .select(`
          *,
          sender:profiles(id, full_name, email),
          reply_to:messages!messages_reply_to_id_fkey(
            id,
            content,
            sender:profiles(full_name)
          )
        `)
        .single();

      if (insertError) throw insertError;

      // Parse mentions (@username) - this would need a helper function
      // For now, we'll handle it in the component

      return message as Message;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      return null;
    }
  }, [conversationId]);

  const editMessage = useCallback(async (
    messageId: string,
    newContent: string
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent.trim(), edited_at: new Date().toISOString() }
            : msg
        )
      );
    } catch (err: any) {
      console.error('Error editing message:', err);
      setError(err.message || 'Failed to edit message');
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err: any) {
      console.error('Error deleting message:', err);
      setError(err.message || 'Failed to delete message');
    }
  }, []);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert read receipts
      await supabase
        .from('message_reads')
        .insert(
          messageIds.map(messageId => ({
            message_id: messageId,
            user_id: user.id,
          }))
        )
        .select();

      // Update participant's last_read_at
      const latestMessageId = messageIds[messageIds.length - 1];
      await supabase
        .from('conversation_participants')
        .update({
          last_read_at: new Date().toISOString(),
          last_read_message_id: latestMessageId,
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    if (autoLoad && conversationId) {
      loadMessages();
    }
  }, [conversationId, autoLoad, loadMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch full message with relations
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(id, full_name, email),
              reply_to:messages!messages_reply_to_id_fkey(
                id,
                content,
                sender:profiles(full_name)
              )
            `)
            .eq('id', payload.new.id)
            .is('deleted_at', null)
            .single();

          if (newMessage) {
            setMessages(prev => [...prev, newMessage as Message]);
            
            // Auto-mark as read if user is viewing
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              markAsRead([newMessage.id]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } as Message : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, markAsRead]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
  };
}

