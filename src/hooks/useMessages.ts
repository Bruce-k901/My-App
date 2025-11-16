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
      
      // Load messages with reply_to relationship
      let query = supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          edited_at,
          sender_id,
          conversation_id,
          reply_to_id,
          message_type,
          file_url,
          file_name,
          file_size,
          file_type,
          metadata,
          reply_to:messages!reply_to_id(
            id,
            content,
            sender_id,
            created_at,
            metadata
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeId) {
        query = query.lt('id', beforeId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error loading messages:', fetchError);
        throw fetchError;
      }

      if (!data || data.length === 0) {
        if (beforeId) {
          setHasMore(false);
        }
        setLoading(false);
        return;
      }

             // Collect all sender IDs (including reply_to senders)
             const senderIds = [...new Set(data.map((msg: any) => msg.sender_id).filter(Boolean))];
             
             // Also collect reply_to sender IDs
             const replyToSenderIds: string[] = [];
             data.forEach((msg: any) => {
               if (msg.reply_to) {
                 const replyTo = Array.isArray(msg.reply_to) ? msg.reply_to[0] : msg.reply_to;
                 if (replyTo?.sender_id && !senderIds.includes(replyTo.sender_id)) {
                   replyToSenderIds.push(replyTo.sender_id);
                 }
               }
             });
             
             // Combine all sender IDs
             const allSenderIds = [...senderIds, ...replyToSenderIds];
             let profilesMap = new Map();
             
             if (allSenderIds.length > 0) {
        try {
          // Get company_id from conversation first
          const { data: conversation } = await supabase
            .from('conversations')
            .select('company_id')
            .eq('id', conversationId)
            .single();
          
                 if (conversation?.company_id) {
                   // Fetch profiles of users in the same company (including reply_to senders)
                   // This should work with tenant_select_profiles policy
                   const { data: profiles, error: profileError } = await supabase
                     .from('profiles')
                     .select('id, full_name, email')
                     .in('id', allSenderIds)
                     .eq('company_id', conversation.company_id);
            
            if (profileError) {
              console.error('Error fetching profiles by company:', {
                message: profileError?.message,
                code: profileError?.code,
                details: profileError?.details,
                hint: profileError?.hint,
                error: profileError,
              });
            } else if (profiles && profiles.length > 0) {
              profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
              console.log(`✅ Loaded ${profiles.length} profiles for ${allSenderIds.length} senders (including ${replyToSenderIds.length} reply senders)`);
            } else {
              console.warn(`⚠️ No profiles found for sender IDs:`, allSenderIds);
            }
                 } else {
                   // No company_id - try fetching without company filter
                   // This might work if there's a policy allowing it
                   const { data: profiles, error: profileError } = await supabase
                     .from('profiles')
                     .select('id, full_name, email')
                     .in('id', allSenderIds);
            
            if (profileError) {
              console.error('Error fetching profiles without company filter:', profileError);
            } else if (profiles && profiles.length > 0) {
              profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
            }
          }
        } catch (profileError) {
          console.error('Error fetching sender profiles:', profileError);
          // Continue without profiles - messages will show without sender names
        }
      }

      // Get current user info for own messages (from login/auth)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Fetch delivery and read status for all messages
      const messageIds = data.map((msg: any) => msg.id);
      let deliveriesMap = new Map<string, string[]>(); // message_id -> user_ids[]
      let readsMap = new Map<string, string[]>(); // message_id -> user_ids[]
      
      if (messageIds.length > 0 && currentUser) {
        try {
          // Fetch deliveries
          const { data: deliveries } = await supabase
            .from('message_deliveries')
            .select('message_id, user_id')
            .in('message_id', messageIds);
          
          if (deliveries) {
            deliveries.forEach((d: any) => {
              if (!deliveriesMap.has(d.message_id)) {
                deliveriesMap.set(d.message_id, []);
              }
              deliveriesMap.get(d.message_id)!.push(d.user_id);
            });
          }
          
          // Fetch reads
          const { data: reads } = await supabase
            .from('message_reads')
            .select('message_id, user_id')
            .in('message_id', messageIds);
          
          if (reads) {
            reads.forEach((r: any) => {
              if (!readsMap.has(r.message_id)) {
                readsMap.set(r.message_id, []);
              }
              readsMap.get(r.message_id)!.push(r.user_id);
            });
          }
        } catch (err) {
          console.warn('Error fetching delivery/read status:', err);
        }
      }
      
      // Get conversation participants to determine who should receive messages
      let participantIds: string[] = [];
      try {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .is('left_at', null);
        
        if (participants) {
          participantIds = participants.map((p: any) => p.user_id).filter((id: string) => id !== currentUser?.id);
        }
      } catch (err) {
        console.warn('Error fetching participants:', err);
      }
      
      // Enrich messages with sender information and receipt status
      const enrichedMessages = data.map((msg: any) => {
        let sender = null;
        
        // First try: sender name from metadata (stored at creation time)
        if (msg.metadata?.sender_name) {
          sender = {
            id: msg.sender_id,
            full_name: msg.metadata.sender_name,
            email: msg.metadata.sender_email || null,
          };
        }
        // Second try: current user's message - use auth user info
        else if (currentUser && msg.sender_id === currentUser.id) {
          sender = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'You',
            email: currentUser.email || null,
          };
        }
        // Third try: use profile from map (for other users)
        else {
          sender = profilesMap.get(msg.sender_id);
        }
        
        // Ensure sender is never null - if we have a sender_id, we should have sender info
        // If sender is still null, it means profile fetch failed - log for debugging
        if (!sender && msg.sender_id) {
          console.warn(`⚠️ No sender info found for sender_id: ${msg.sender_id}`);
          // Don't create empty sender - let it be null so UI can handle gracefully
        }
        
        // Calculate receipt status for own messages (WhatsApp-style)
        let receipt_status: 'sent' | 'delivered' | 'read' | undefined = undefined;
        if (currentUser && msg.sender_id === currentUser.id && participantIds.length > 0) {
          const deliveredTo = deliveriesMap.get(msg.id) || [];
          const readBy = readsMap.get(msg.id) || [];
          
          // Check if all participants have read it
          const allRead = participantIds.every(id => readBy.includes(id));
          const allDelivered = participantIds.every(id => deliveredTo.includes(id));
          
          if (allRead) {
            receipt_status = 'read';
          } else if (allDelivered) {
            receipt_status = 'delivered';
          } else {
            receipt_status = 'sent';
          }
        }
        
        // Handle reply_to - it might be an array or object
        // IMPORTANT: Only set replyTo if reply_to_id actually exists
        let replyTo = null;
        if (msg.reply_to_id && msg.reply_to) {
          if (Array.isArray(msg.reply_to) && msg.reply_to.length > 0) {
            replyTo = msg.reply_to[0];
          } else if (typeof msg.reply_to === 'object' && msg.reply_to.id) {
            // Only use reply_to if it has an id (valid reply)
            replyTo = msg.reply_to;
          }
          
          // If we have a reply_to, try to get its sender info (fast lookup only)
          if (replyTo && replyTo.sender_id) {
            // Try profilesMap first (already loaded)
            let replySender = profilesMap.get(replyTo.sender_id);
            
            // Try metadata if not in map
            if (!replySender && replyTo.metadata?.sender_name) {
              replySender = {
                id: replyTo.sender_id,
                full_name: replyTo.metadata.sender_name,
                email: replyTo.metadata.sender_email || null,
              };
            }
            
            // If it's current user, use auth info
            if (!replySender && currentUser && replyTo.sender_id === currentUser.id) {
              replySender = {
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'You',
                email: currentUser.email || null,
              };
            }
            
            replyTo = {
              ...replyTo,
              sender: replySender,
            };
          }
        }
        
        return {
          ...msg,
          sender: sender,
          reply_to: replyTo,
          delivered_to: deliveriesMap.get(msg.id) || [],
          read_by: readsMap.get(msg.id) || [],
          receipt_status,
        };
      });

      // Reverse to show oldest first, then newest
      const newMessages = [...enrichedMessages].reverse() as Message[];

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

      // Use auth user info directly (from login) - no need to fetch from profiles
      // This avoids RLS issues and is more reliable
      const senderInfo = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'You',
        email: user.email || null,
      };

      // Optimistically create a temporary message
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        reply_to_id: replyToId || null,
        message_type: 'text',
        file_url: null,
        file_name: null,
        file_size: null,
        file_type: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        sender: senderInfo,
      };

      // Add optimistically to state immediately
      setMessages(prev => {
        const updated = [...prev, tempMessage];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // Store sender name directly in message metadata - simple, no fetching needed!
      const senderName = senderInfo.full_name || senderInfo.email?.split('@')[0] || 'You';
      
      const { data: message, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          reply_to_id: replyToId || null,
          message_type: 'text',
          metadata: {
            sender_name: senderName,
            sender_email: senderInfo.email,
          },
        })
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, email),
          reply_to:messages!reply_to_id(
            id,
            content,
            sender:profiles!sender_id(full_name)
          )
        `)
        .single();

      if (insertError) {
        console.error('Error inserting message:', {
          message: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
          hint: insertError?.hint,
          error: insertError,
        });
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        throw insertError;
      }

      // Replace temp message with real message
      // CRITICAL: Always preserve sender info from optimistic update since we know the sender
      let finalMessage: Message | null = null;
      
      setMessages(prev => {
        // Find the optimistic message to preserve its sender info
        const optimisticMsg = prev.find(msg => msg.id === tempId);
        
        let enrichedMessage = message as Message;
        
        // Handle case where sender might be an array or null
        if (!enrichedMessage.sender || (Array.isArray(enrichedMessage.sender) && enrichedMessage.sender.length === 0)) {
          // ALWAYS use sender from optimistic update if database doesn't have it
          // This is safe because we know the sender (it's the current user)
          if (optimisticMsg?.sender) {
            enrichedMessage = {
              ...enrichedMessage,
              sender: optimisticMsg.sender,
            };
          } else {
            // Fallback: create sender from auth user info (from login)
            enrichedMessage = {
              ...enrichedMessage,
              sender: {
                id: user.id,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'You',
                email: user.email || null,
              },
            };
          }
        } else if (Array.isArray(enrichedMessage.sender)) {
          // If sender is an array, take the first element
          enrichedMessage = {
            ...enrichedMessage,
            sender: enrichedMessage.sender[0],
          };
        }

        finalMessage = enrichedMessage;
        
        const filtered = prev.filter(msg => msg.id !== tempId);
        const updated = [...filtered, enrichedMessage];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      return finalMessage || message as Message;
    } catch (err: any) {
      console.error('Error sending message:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err,
      });
      setError(err?.message || 'Failed to send message');
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

  const markAsDelivered = useCallback(async (messageIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark messages as delivered (seen in UI)
      await supabase
        .from('message_deliveries')
        .insert(
          messageIds.map(messageId => ({
            message_id: messageId,
            user_id: user.id,
          }))
        )
        .select();
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
    }
  }, []);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First mark as delivered (if not already)
      await markAsDelivered(messageIds);

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
  }, [conversationId, markAsDelivered]);

  // Initial load - reset messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    
    // Always reload when conversationId changes
    setLoading(true);
    setError(null);
    setHasMore(true);
    setOldestMessageId(null);
    setMessages([]); // Clear messages when switching conversations
    
    if (autoLoad && conversationId) {
      loadMessages();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, autoLoad]); // Reload whenever conversationId changes

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
          const messageId = payload.new.id;
          const senderId = payload.new.sender_id;
          
          // Check if this is a message we just sent (we already have sender info)
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const isOwnMessage = currentUser && senderId === currentUser.id;
          
          try {
            // Fetch message data first
            const { data: messageData, error: fetchError } = await supabase
              .from('messages')
              .select('*')
              .eq('id', messageId)
              .is('deleted_at', null)
              .single();

            if (fetchError) {
              console.error('Error fetching new message in subscription:', fetchError);
              // Fallback: use payload data if fetch fails
              const fallbackMessage: Message = {
                ...payload.new,
                sender: null,
                reply_to: null,
              };
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === messageId);
                if (exists) return prev;
                return [...prev, fallbackMessage as Message].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
              return;
            }

            // SIMPLE: Get sender info from message metadata (stored at creation)
            // Fallback to existing sender or auth user info
            let sender = null;
            let existingSender = null;
            
            setMessages(prev => {
              const existingMsg = prev.find(msg => msg.id === messageId);
              if (existingMsg?.sender) {
                existingSender = existingMsg.sender;
              }
              return prev; // Don't update yet, just read
            });
            
            // First: Use sender name from metadata (stored when message was created)
            if (messageData.metadata?.sender_name) {
              sender = {
                id: senderId,
                full_name: messageData.metadata.sender_name,
                email: messageData.metadata.sender_email || null,
              };
            }
            // Second: Use existing sender if we have it
            else if (existingSender) {
              sender = existingSender;
            }
            // Third: For own messages, use auth user info
            else if (isOwnMessage && currentUser) {
              sender = {
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'You',
                email: currentUser.email || null,
              };
            }

            // Handle reply_to for real-time updates - will be resolved in setMessages callback
            const enrichedMessage: Message = {
              ...messageData,
              sender: sender || existingSender, // Use fetched sender or fall back to existing
              reply_to: null, // Will be set in setMessages callback
            } as Message;

            setMessages(prev => {
              // CRITICAL: Check for duplicates first - prevent duplicate messages
              const existingMsg = prev.find(msg => msg.id === messageId);
              if (existingMsg) {
                // Message already exists - just update it, don't add duplicate
                return prev.map(msg => 
                  msg.id === messageId 
                    ? { ...enrichedMessage, sender: existingMsg.sender || enrichedMessage.sender }
                    : msg
                );
              }
              
              // Handle reply_to - find in existing messages (fast lookup only)
              // IMPORTANT: Only set finalReplyTo if reply_to_id actually exists
              let finalReplyTo = null;
              if (messageData.reply_to_id) {
                const repliedToMessage = prev.find((m: Message) => m.id === messageData.reply_to_id);
                if (repliedToMessage && repliedToMessage.id) {
                  finalReplyTo = {
                    id: repliedToMessage.id,
                    content: repliedToMessage.content,
                    sender_id: repliedToMessage.sender_id,
                    created_at: repliedToMessage.created_at,
                    sender: repliedToMessage.sender,
                  };
                }
              }
              
              // Add new message (no async fetching - keep it fast)
              return [...prev, { ...enrichedMessage, reply_to: finalReplyTo }].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
            
            // Auto-mark as read if user is viewing
            const { data: { user } } = await supabase.auth.getUser();
            if (user && enrichedMessage.sender_id !== user.id) {
              markAsRead([enrichedMessage.id]);
            }
          } catch (err) {
            console.error('Error in message subscription handler:', err);
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

    // Subscribe to delivery and read updates to refresh receipt status
    // Note: We'll reload messages when deliveries/reads change to get updated status
    const deliveryChannel = supabase
      .channel(`message_deliveries:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_deliveries',
        },
        (payload) => {
          const { message_id, user_id } = payload.new as any;
          
          // Update delivered_to array for the message
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === message_id && !msg.delivered_to?.includes(user_id)) {
                const newDeliveredTo = [...(msg.delivered_to || []), user_id];
                // Simple status update - if all participants delivered, mark as delivered
                let receipt_status = msg.receipt_status;
                if (msg.receipt_status === 'sent') {
                  receipt_status = 'delivered';
                }
                return {
                  ...msg,
                  delivered_to: newDeliveredTo,
                  receipt_status,
                };
              }
              return msg;
            });
          });
        }
      )
      .subscribe();

    const readChannel = supabase
      .channel(`message_reads:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reads',
        },
        (payload) => {
          const { message_id, user_id } = payload.new as any;
          
          // Update read_by array for the message
          setMessages(prev => {
            return prev.map(msg => {
              if (msg.id === message_id && !msg.read_by?.includes(user_id)) {
                const newReadBy = [...(msg.read_by || []), user_id];
                // Update receipt status to read
                return {
                  ...msg,
                  read_by: newReadBy,
                  receipt_status: 'read' as const,
                };
              }
              return msg;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deliveryChannel);
      supabase.removeChannel(readChannel);
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
    markAsDelivered,
  };
}

