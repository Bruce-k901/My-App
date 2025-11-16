"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';
import type { Conversation } from '@/types/messaging';

interface UseConversationsOptions {
  autoLoad?: boolean;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  createConversation: (
    type: 'direct' | 'group' | 'site' | 'team',
    participantIds: string[],
    name?: string
  ) => Promise<Conversation | null>;
  archiveConversation: (conversationId: string) => Promise<void>;
  unarchiveConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useConversations({
  autoLoad = true,
}: UseConversationsOptions = {}): UseConversationsReturn {
  const { companyId, siteId } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadTimeoutRef = (typeof window !== 'undefined') ? (window as any).__convReloadRef ?? { current: null } : { current: null };
  if (typeof window !== 'undefined' && !(window as any).__convReloadRef) {
    (window as any).__convReloadRef = reloadTimeoutRef;
  }

  const loadConversations = useCallback(async (options?: { silent?: boolean }) => {
    try {
      setError(null);
      if (!options?.silent) {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No user found, skipping conversation load');
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      if (!companyId) {
        console.warn('No companyId found, skipping conversation load');
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      // Get conversations where user is a participant
      // Query conversations directly with participant filter using RLS-friendly approach
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants!inner(
            user_id,
            last_read_at,
            last_read_message_id,
            left_at
          )
        `)
        .is('archived_at', null)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        const errorCode = conversationsError.code || '';
        const errorMessage = conversationsError.message || String(conversationsError);
        
        console.error('Error fetching conversations:', {
          code: errorCode,
          message: errorMessage,
          details: conversationsError.details,
          hint: conversationsError.hint,
          fullError: conversationsError,
        });
        
        // If it's a permission error or table doesn't exist, return empty array gracefully
        if (
          errorCode === 'PGRST116' || 
          errorCode === '42P01' || 
          errorCode === '42501' ||
          errorMessage.includes('permission') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation')
        ) {
          console.warn('⚠️ Conversations table may not be accessible. Ensure migrations are run.');
          setConversations([]);
          if (!options?.silent) setLoading(false);
          setError(null); // Don't show error to user
          return;
        }
        
        // For other errors, log and return empty gracefully
        setConversations([]);
        if (!options?.silent) setLoading(false);
        setError(null);
        return;
      }

      // Filter to only conversations where user is a participant and hasn't left
      const userConversations = (conversationsData || []).filter((conv: any) =>
        conv.participants?.some((p: any) => p.user_id === user.id && !p.left_at)
      ) as Conversation[];

      // Enrich participant records with profile info in ONE batch to avoid RLS on nested joins
      try {
        const uniqueUserIds = Array.from(
          new Set(
            (userConversations || [])
              .flatMap((c: any) => c.participants?.map((p: any) => p.user_id) || [])
          )
        );
        if (uniqueUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', uniqueUserIds);
          if (!profilesError && profilesData) {
            const idToProfile: Record<string, any> = {};
            for (const prof of profilesData) idToProfile[prof.id] = prof;
            for (const conv of userConversations as any[]) {
              conv.participants = (conv.participants || []).map((p: any) => ({
                ...p,
                user: idToProfile[p.user_id] || null,
              }));
            }
          }
        }
      } catch (enrichErr) {
        // Non-fatal; continue without profile enrichment
        console.warn('Unable to enrich participant profiles:', enrichErr);
      }

      // Extract participant data for unread count calculation
      const participantData = userConversations.map((conv: any) => {
        const participant = conv.participants?.find(
          (p: any) => p.user_id === user.id && !p.left_at
        );
        return participant ? {
          conversation_id: conv.id,
          last_read_at: participant.last_read_at,
          last_read_message_id: participant.last_read_message_id,
          left_at: participant.left_at,
        } : null;
      }).filter(Boolean);

      if (userConversations.length === 0) {
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      // Optimize: Fetch last messages and unread counts in batch queries instead of per-conversation
      const conversationIds = userConversations.map(conv => conv.id);
      
      // Fetch all last messages in one query using a window function approach
      // Get the most recent message per conversation
      const { data: allLastMessages } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, email),
          conversation_id
        `)
        .in('conversation_id', conversationIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Group last messages by conversation_id (get the first one for each conversation)
      const lastMessagesMap = new Map<string, any>();
      if (allLastMessages) {
        for (const msg of allLastMessages) {
          if (!lastMessagesMap.has(msg.conversation_id)) {
            lastMessagesMap.set(msg.conversation_id, msg);
          }
        }
      }

      // Calculate unread counts efficiently using a single aggregated query
      const unreadCountsMap = new Map<string, number>();
      
      // Build participant info map for quick lookup
      const participantMap = new Map<string, any>();
      participantData?.forEach((p: any) => {
        participantMap.set(p.conversation_id, p);
      });

      // Fetch all unread messages in one query, grouped by conversation
      // We'll use RPC or a more efficient approach
      const unreadMessagesQuery = await supabase
        .from('messages')
        .select('conversation_id, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .is('deleted_at', null)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (unreadMessagesQuery.data) {
        // Group messages by conversation
        const messagesByConversation = new Map<string, any[]>();
        unreadMessagesQuery.data.forEach((msg: any) => {
          if (!messagesByConversation.has(msg.conversation_id)) {
            messagesByConversation.set(msg.conversation_id, []);
          }
          messagesByConversation.get(msg.conversation_id)!.push(msg);
        });

        // Calculate unread counts for each conversation
        userConversations.forEach((conv) => {
          const participant = participantMap.get(conv.id);
          const messages = messagesByConversation.get(conv.id) || [];
          
          if (!participant) {
            // No participant record - if there's a last message from someone else, count as 1
            const lastMessage = lastMessagesMap.get(conv.id);
            unreadCountsMap.set(conv.id, (lastMessage && lastMessage.sender_id !== user.id) ? 1 : 0);
            return;
          }

          const lastMessage = lastMessagesMap.get(conv.id);
          if (!lastMessage) {
            unreadCountsMap.set(conv.id, 0);
            return;
          }

          if (participant.last_read_at) {
            // Count messages after last_read_at
            const unreadCount = messages.filter(
              (msg: any) => new Date(msg.created_at) > new Date(participant.last_read_at)
            ).length;
            unreadCountsMap.set(conv.id, unreadCount);
          } else {
            // Participant hasn't read any messages - count all messages not from user
            unreadCountsMap.set(conv.id, messages.length);
          }
        });
      } else {
        // If query failed, set all to 0
        userConversations.forEach((conv) => {
          unreadCountsMap.set(conv.id, 0);
        });
      }

      // Combine everything
      const conversationsWithMessages = userConversations.map((conv) => {
        const lastMessage = lastMessagesMap.get(conv.id) || null;
        const unreadCount = unreadCountsMap.get(conv.id) || 0;

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      });

      setConversations(conversationsWithMessages);
      if (!options?.silent) setLoading(false);
    } catch (err: any) {
      // Better error logging
      const errorCode = err?.code || '';
      const errorMessage = err?.message || String(err) || 'Unknown error';
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      
      console.error('Error loading conversations:', {
        code: errorCode,
        message: errorMessage,
        stringified: errorString,
        fullError: err,
      });
      
      // Try to extract meaningful error message
      let displayError = 'Failed to load conversations';
      if (errorMessage && errorMessage !== '{}') {
        displayError = errorMessage;
      } else if (errorCode) {
        displayError = `Error ${errorCode}: Failed to load conversations`;
      }
      
      setError(displayError);
      if (!options?.silent) setLoading(false);
      // Set empty array on error to prevent UI issues
      setConversations([]);
    }
  }, [companyId, siteId]);

  const createConversation = useCallback(async (
    type: 'direct' | 'group' | 'site' | 'team',
    participantIds: string[],
    name?: string
  ): Promise<Conversation | null> => {
    if (!companyId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For direct conversations, check if one already exists
      if (type === 'direct' && participantIds.length === 1) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id, participants:conversation_participants(user_id)')
          .eq('type', 'direct')
          .eq('company_id', companyId)
          .limit(10);

        if (existing) {
          for (const conv of existing) {
            const participantUserIds = (conv.participants as any[])?.map((p: any) => p.user_id) || [];
            if (
              participantUserIds.includes(user.id) &&
              participantUserIds.includes(participantIds[0])
            ) {
              // Return existing conversation
              await loadConversations();
              return conv as Conversation;
            }
          }
        }
      }

      // Create new conversation
      const conversationData: any = {
        type,
        company_id: companyId,
        created_by: user.id,
      };

      if (type === 'site' && siteId) {
        conversationData.site_id = siteId;
      }

      // For direct conversations, prefill name with other participant's name (for better UX)
      if (type === 'direct' && participantIds.length === 1 && !name) {
        try {
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', participantIds[0])
            .single();
          if (otherProfile?.full_name) {
            conversationData.name = otherProfile.full_name;
          } else if (otherProfile?.email) {
            conversationData.name = otherProfile.email;
          }
        } catch {}
      }

      if (name) {
        conversationData.name = name;
      }

      // Debug: Log what we're trying to insert
      console.log('🔍 Creating conversation with data:', {
        type: conversationData.type,
        company_id: conversationData.company_id,
        created_by: conversationData.created_by,
        user_id_from_auth: user.id,
        company_id_from_context: companyId,
      });

      const { data: conversation, error: createError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (createError) {
        // Better error logging - handle cases where error might not serialize
        const errorInfo = {
          code: createError.code || 'UNKNOWN',
          message: createError.message || String(createError),
          details: createError.details || null,
          hint: createError.hint || null,
          status: createError.status || null,
          statusCode: createError.statusCode || null,
          data_attempted: conversationData,
          fullError: createError,
        };
        
        console.error('❌ Conversation creation error:', errorInfo);
        console.error('❌ Full error object:', createError);
        console.error('❌ Error keys:', Object.keys(createError));
        console.error('❌ Error stringified:', JSON.stringify(createError, Object.getOwnPropertyNames(createError)));
        
        throw createError;
      }

      // Add participants
      const allParticipantIds = [user.id, ...participantIds];
      const participants = allParticipantIds.map((userId, index) => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: index === 0 ? 'admin' : 'member' as const,
      }));

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) {
        const errorInfo = {
          code: participantsError.code || 'UNKNOWN',
          message: participantsError.message || String(participantsError),
          details: participantsError.details || null,
          hint: participantsError.hint || null,
          status: participantsError.status || null,
          participants_attempted: participants,
          fullError: participantsError,
          errorStringified: JSON.stringify(participantsError, Object.getOwnPropertyNames(participantsError)),
        };
        console.error('Error inserting participants:', errorInfo);
        console.error('Full participants error object:', participantsError);
        // Don't throw - conversation is created, participants can be added later
      }

      await loadConversations();
      return conversation as Conversation;
    } catch (err: any) {
      // Better error logging
      const errorMessage = err?.message || err?.error?.message || String(err) || 'Failed to create conversation';
      const errorCode = err?.code || err?.error?.code || 'UNKNOWN';
      
      console.error('Error creating conversation:', {
        message: errorMessage,
        code: errorCode,
        details: err?.details || err?.error?.details,
        hint: err?.hint || err?.error?.hint,
        fullError: err,
        errorStringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });
      
      setError(errorMessage);
      return null;
    }
  }, [companyId, siteId, loadConversations]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    } catch (err: any) {
      console.error('Error archiving conversation:', err);
      setError(err.message || 'Failed to archive conversation');
    }
  }, []);

  const unarchiveConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ archived_at: null })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      await loadConversations();
    } catch (err: any) {
      console.error('Error unarchiving conversation:', err);
      setError(err.message || 'Failed to unarchive conversation');
    }
  }, [loadConversations]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      // Attempt hard delete
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (deleteError) {
        console.error('Error deleting conversation:', deleteError);
        setError(deleteError.message || 'Failed to delete conversation');
        return false;
      }

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      return true;
    } catch (err: any) {
      console.error('Error deleting conversation:', err);
      setError(err.message || 'Failed to delete conversation');
      return false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, loadConversations]);

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!companyId) return;

    // Simple throttle: at most one reload every 500ms
    let lastReloadAt = 0;
    const scheduleReload = () => {
      // Coalesce rapid events into a single reload
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = setTimeout(() => {
        const now = Date.now();
        if (now - lastReloadAt < 500) return;
        lastReloadAt = now;
        loadConversations({ silent: true });
      }, 250);
    };

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        scheduleReload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
        },
        scheduleReload
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [companyId, loadConversations, reloadTimeoutRef]);

  return {
    conversations,
    loading,
    error,
    createConversation,
    archiveConversation,
    unarchiveConversation,
    deleteConversation,
    refresh: loadConversations,
  };
}

