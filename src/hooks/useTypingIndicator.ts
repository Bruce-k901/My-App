"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { TypingIndicator } from '@/types/messaging';

interface UseTypingIndicatorOptions {
  conversationId: string;
  debounceMs?: number;
}

interface UseTypingIndicatorReturn {
  typingUsers: TypingIndicator[];
  setTyping: (isTyping: boolean) => void;
}

export function useTypingIndicator({
  conversationId,
  debounceMs = 1000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isTyping) {
      isTypingRef.current = true;
      
      // Update typing indicator
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: true,
          updated_at: new Date().toISOString(),
        });

      // Auto-clear after debounce period
      typingTimeoutRef.current = setTimeout(async () => {
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
        
        isTypingRef.current = false;
      }, debounceMs);
    } else {
      isTypingRef.current = false;
      
      // Clear typing indicator immediately
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    }
  }, [conversationId, debounceMs]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId) return;

    const loadTypingUsers = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select(`
          *,
          user:profiles(id, full_name)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_typing', true)
        .gt('updated_at', new Date(Date.now() - 5000).toISOString()); // Last 5 seconds

      if (data) {
        setTypingUsers(data as TypingIndicator[]);
      }
    };

    loadTypingUsers();

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          await loadTypingUsers();
        }
      )
      .subscribe();

    // Cleanup old indicators periodically
    const cleanupInterval = setInterval(async () => {
      await supabase
        .from('typing_indicators')
        .delete()
        .lt('updated_at', new Date(Date.now() - 30000).toISOString()); // Older than 30 seconds
    }, 10000); // Every 10 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  return {
    typingUsers,
    setTyping,
  };
}

