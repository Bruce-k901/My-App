"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/types/messaging";

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
  refetchMessages: () => Promise<void>;
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

      // Load messages - fetch parent messages separately to avoid relationship query issues
      let query = supabase
        .from("messaging_messages")
        .select(`
          id,
          content,
          created_at,
          edited_at,
          sender_id,
          channel_id,
          parent_message_id,
          message_type,
          file_url,
          file_name,
          file_size,
          file_type,
          metadata,
          topic
        `)
        .eq("channel_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (beforeId) {
        query = query.lt("id", beforeId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error loading messages:", fetchError);
        throw fetchError;
      }

      if (!data || data.length === 0) {
        if (beforeId) {
          setHasMore(false);
        }
        setLoading(false);
        return;
      }

      // Skip profiles query - use metadata stored in messages instead
      // This avoids RLS issues and is more reliable
      let profilesMap = new Map();
      console.log(
        "📝 Using sender info from message metadata (skipping profiles query)",
      );

      // Get current user info for own messages (from login/auth)
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Fetch parent messages (reply_to) separately
      const parentMessageIds = [
        ...new Set(
          data.map((msg: any) => msg.parent_message_id).filter(Boolean),
        ),
      ];
      let parentMessagesMap = new Map();

      if (parentMessageIds.length > 0) {
        try {
          const parentQuery = supabase
            .from("messaging_messages")
            .select(`
              id,
              content,
              sender_id,
              created_at,
              message_type,
              file_name,
              metadata
            `);

          const { data: parentMessages } = parentMessageIds.length === 1
            ? await parentQuery.eq("id", parentMessageIds[0])
            : await parentQuery.in("id", parentMessageIds);

          if (parentMessages) {
            parentMessagesMap = new Map(
              parentMessages.map((msg: any) => [msg.id, msg]),
            );
          }
        } catch (err) {
          console.warn("Error fetching parent messages:", err);
        }
      }

      // Fetch delivery and read status for all messages
      const messageIds = data.map((msg: any) => msg.id);
      let deliveriesMap = new Map<string, string[]>(); // message_id -> user_ids[]
      let readsMap = new Map<string, string[]>(); // message_id -> user_ids[]

      if (messageIds.length > 0 && currentUser) {
        try {
          // Fetch deliveries
          const { data: deliveries } = await supabase
            .from("message_deliveries")
            .select("message_id, user_id")
            .in("message_id", messageIds);

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
            .from("message_reads")
            .select("message_id, user_id")
            .in("message_id", messageIds);

          if (reads) {
            reads.forEach((r: any) => {
              if (!readsMap.has(r.message_id)) {
                readsMap.set(r.message_id, []);
              }
              readsMap.get(r.message_id)!.push(r.user_id);
            });
          }
        } catch (err) {
          console.warn("Error fetching delivery/read status:", err);
        }
      }

      // Get conversation participants to determine who should receive messages
      let participantIds: string[] = [];
      try {
        const { data: participants } = await supabase
          .from("messaging_channel_members")
          .select("user_id")
          .eq("channel_id", conversationId)
          .is("left_at", null);

        if (participants) {
          participantIds = participants.map((p: any) => p.user_id).filter((
            id: string,
          ) => id !== currentUser?.id);
        }
      } catch (err) {
        console.warn("Error fetching participants:", err);
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
        } // Second try: current user's message - use auth user info
        else if (currentUser && msg.sender_id === currentUser.id) {
          sender = {
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              currentUser.email?.split("@")[0] || "You",
            email: currentUser.email || null,
          };
        } // Third try: use profile from map (for other users)
        else {
          sender = profilesMap.get(msg.sender_id);
        }

        // Ensure sender is never null - if we have a sender_id, we should have sender info
        // If sender is still null, it means profile fetch failed - log for debugging
        if (!sender && msg.sender_id) {
          console.warn(
            `⚠️ No sender info found for sender_id: ${msg.sender_id}`,
          );
          // Don't create empty sender - let it be null so UI can handle gracefully
        }

        // Calculate receipt status for own messages (WhatsApp-style)
        let receipt_status: "sent" | "delivered" | "read" | undefined =
          undefined;
        if (
          currentUser && msg.sender_id === currentUser.id &&
          participantIds.length > 0
        ) {
          const deliveredTo = deliveriesMap.get(msg.id) || [];
          const readBy = readsMap.get(msg.id) || [];

          // Check if all participants have read it
          const allRead = participantIds.every((id) => readBy.includes(id));
          const allDelivered = participantIds.every((id) =>
            deliveredTo.includes(id)
          );

          if (allRead) {
            receipt_status = "read";
          } else if (allDelivered) {
            receipt_status = "delivered";
          } else {
            receipt_status = "sent";
          }
        }

        // Handle reply_to - fetch from parentMessagesMap
        let replyTo = null;
        const replyToId = msg.parent_message_id;
        if (replyToId) {
          const parentMessage = parentMessagesMap.get(replyToId);
          if (parentMessage) {
            // Get sender info for parent message
            let replySender = null;

            // Try metadata first (stored at creation time)
            if (parentMessage.metadata?.sender_name) {
              replySender = {
                id: parentMessage.sender_id,
                full_name: parentMessage.metadata.sender_name,
                email: parentMessage.metadata.sender_email || null,
              };
            } // Try profilesMap (if we loaded profiles)
            else if (profilesMap.has(parentMessage.sender_id)) {
              replySender = profilesMap.get(parentMessage.sender_id);
            } // If it's current user, use auth info
            else if (
              currentUser && parentMessage.sender_id === currentUser.id
            ) {
              replySender = {
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name ||
                  currentUser.user_metadata?.name ||
                  currentUser.email?.split("@")[0] || "You",
                email: currentUser.email || null,
              };
            }
            // Fallback: create a basic sender object with just the ID
            // We'll show "Unknown" in the UI if we don't have sender info
            if (!replySender && parentMessage.sender_id) {
              replySender = {
                id: parentMessage.sender_id,
                full_name: null,
                email: null,
              };
            }

            replyTo = {
              id: parentMessage.id,
              content: parentMessage.content,
              sender_id: parentMessage.sender_id,
              created_at: parentMessage.created_at,
              message_type: parentMessage.message_type,
              file_name: parentMessage.file_name,
              metadata: parentMessage.metadata,
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
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        // Initial load
        setMessages(newMessages);
      }

      setOldestMessageId(newMessages[0]?.id || null);
      setHasMore(data.length === limit);
      setLoading(false);
    } catch (err: any) {
      // Better error logging
      const errorMessage = err?.message || err?.error?.message || String(err) ||
        "Failed to load messages";
      const errorCode = err?.code || err?.error?.code || "UNKNOWN";

      console.error("Error loading messages:", {
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
    replyToId?: string,
  ): Promise<Message | null> => {
    if (!conversationId || !content.trim()) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use auth user info directly (from login) - no need to fetch from profiles
      // This avoids RLS issues and is more reliable
      const senderInfo = {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name ||
          user.email?.split("@")[0] || "You",
        email: user.email || null,
      };

      // Find the parent message if replying
      let replyToMessage: Message | null = null;
      if (replyToId) {
        // Find the parent message in current messages
        const parentMsg = messages.find((m) => m.id === replyToId);
        if (parentMsg) {
          replyToMessage = {
            id: parentMsg.id,
            content: parentMsg.content,
            sender_id: parentMsg.sender_id,
            created_at: parentMsg.created_at,
            message_type: parentMsg.message_type,
            file_name: parentMsg.file_name,
            metadata: parentMsg.metadata,
            sender: parentMsg.sender,
          };
        }
      }

      // Optimistically create a temporary message
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        channel_id: conversationId, // Keep for backward compatibility
        conversation_id: conversationId, // Keep for backward compatibility in types
        sender_id: user.id,
        content: content.trim(),
        parent_message_id: replyToId || null,
        reply_to_id: replyToId || null, // Keep for backward compatibility
        message_type: "text",
        file_url: null,
        file_name: null,
        file_size: null,
        file_type: null,
        attachments: [],
        metadata: {},
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        sender: senderInfo,
        reply_to: replyToMessage,
      };

      // Add optimistically to state immediately
      setMessages((prev) => {
        const updated = [...prev, tempMessage];
        return updated.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      // Store sender name directly in message metadata - simple, no fetching needed!
      const senderName = senderInfo.full_name ||
        senderInfo.email?.split("@")[0] || "You";

      // First, insert the message without selecting anything back
      // We'll use the optimistic message data we already have
      let { data: insertResult, error: insertError } = await supabase
        .from("messaging_messages")
        .insert({
          channel_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          parent_message_id: replyToId || null,
          message_type: "text",
          metadata: {
            sender_name: senderName,
            sender_email: senderInfo.email,
          },
        })
        .select("id")
        .single();

      // Fallback: If insert failed (likely due to metadata column missing), try without metadata
      if (insertError) {
        console.warn(
          "⚠️ Initial insert failed, retrying without metadata...",
          insertError.message,
        );
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from("messaging_messages")
          .insert({
            channel_id: conversationId,
            sender_id: user.id,
            content: content.trim(),
            parent_message_id: replyToId || null,
            message_type: "text",
          })
          .select("id")
          .single();

        if (fallbackError) {
          throw fallbackError; // Throw the real error if fallback also fails
        }

        // Use fallback result
        insertResult = fallbackResult;
        // Clear the initial error since we recovered
        insertError = null;
      }

      // If insert succeeded, use the returned ID with our optimistic data
      const message = insertResult
        ? {
          id: insertResult.id,
          channel_id: conversationId, // Keep for backward compatibility
          conversation_id: conversationId, // Keep for backward compatibility
          sender_id: user.id,
          sender_name: senderName,
          content: content.trim(),
          parent_message_id: replyToId || null,
          reply_to_id: replyToId || null, // Keep for backward compatibility
          message_type: "text",
          file_url: null,
          file_name: null,
          file_size: null,
          file_type: null,
          attachments: [],
          metadata: {
            sender_name: senderName,
            sender_email: senderInfo.email,
          },
          created_at: new Date().toISOString(),
          edited_at: null,
          deleted_at: null,
        }
        : null;

      if (insertError) {
        console.error("❌ Error inserting message:", {
          message: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
          hint: insertError?.hint,
          error: insertError,
        });
        console.error("💥 Full error object:", insertError);
        console.error("Error type:", typeof insertError);
        console.error("Error keys:", Object.keys(insertError || {}));
        console.error(
          "Error stringified:",
          JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)),
        );
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        throw insertError;
      }

      // Replace temp message with real message
      // Use sender info from optimistic update (we know it's correct)
      const enrichedMessage: Message = {
        ...message,
        sender: senderInfo, // Use sender info we already have
        reply_to: replyToMessage, // Use reply_to we found earlier
      } as Message;

      // If there's a reply_to_id and we don't have reply_to yet, try to find it
      if (replyToId && !replyToMessage) {
        setMessages((prev) => {
          const repliedToMessage = prev.find((m: Message) =>
            m.id === replyToId
          );
          if (repliedToMessage) {
            enrichedMessage.reply_to = {
              id: repliedToMessage.id,
              content: repliedToMessage.content,
              sender_id: repliedToMessage.sender_id,
              created_at: repliedToMessage.created_at,
              message_type: repliedToMessage.message_type,
              file_name: repliedToMessage.file_name,
              sender: repliedToMessage.sender,
            };
          }
          return prev;
        });
      }

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== tempId);
        const updated = [...filtered, enrichedMessage];
        return updated.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      return enrichedMessage;
    } catch (err: any) {
      console.error("❌ Error sending message:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err,
      });
      console.error("💥 Full error object:", err);
      console.error("Error type:", typeof err);
      console.error("Error keys:", Object.keys(err || {}));
      console.error("Error message:", err?.message);
      console.error("Error stack:", err?.stack);
      console.error(
        "Error stringified:",
        JSON.stringify(err, Object.getOwnPropertyNames(err)),
      );

      const errorMessage = err?.message || err?.error?.message || String(err) ||
        "Failed to send message";
      setError(errorMessage);
      return null;
    }
  }, [conversationId]);

  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
  ) => {
    try {
      const { error: updateError } = await supabase
        .from("messaging_messages")
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (updateError) throw updateError;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              content: newContent.trim(),
              edited_at: new Date().toISOString(),
            }
            : msg
        )
      );
    } catch (err: any) {
      console.error("Error editing message:", err);
      setError(err.message || "Failed to edit message");
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("messaging_messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId);

      if (deleteError) throw deleteError;

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err: any) {
      console.error("Error deleting message:", err);
      setError(err.message || "Failed to delete message");
    }
  }, []);

  const markAsDelivered = useCallback(async (messageIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark messages as delivered (seen in UI)
      await supabase
        .from("message_deliveries")
        .insert(
          messageIds.map((messageId) => ({
            message_id: messageId,
            user_id: user.id,
          })),
        )
        .select();
    } catch (err: any) {
      console.error("Error marking as delivered:", err);
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
        .from("message_reads")
        .insert(
          messageIds.map((messageId) => ({
            message_id: messageId,
            user_id: user.id,
          })),
        )
        .select();

      // Update participant's last_read_at
      const latestMessageId = messageIds[messageIds.length - 1];
      await supabase
        .from("messaging_channel_members")
        .update({
          last_read_at: new Date().toISOString(),
          last_read_message_id: latestMessageId,
        })
        .eq("channel_id", conversationId)
        .eq("user_id", user.id);
    } catch (err: any) {
      console.error("Error marking as read:", err);
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
  }, [conversationId, autoLoad]); // Reload whenever conversationId changes

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) {
      console.log("⚠️ No conversationId, skipping real-time subscription");
      return;
    }

    console.log(
      `🔌 Setting up real-time subscription for conversation: ${conversationId}`,
    );

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
          filter: `channel_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log(
            "🔔 Real-time message INSERT event received:",
            payload.new,
          );
          const messageId = payload.new.id;
          const senderId = payload.new.sender_id;

          // Check if this is a message we just sent (we already have sender info)
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const isOwnMessage = currentUser && senderId === currentUser.id;

          try {
            // Fetch message data without relationships (simpler, avoids column errors)
            const { data: messageData, error: fetchError } = await supabase
              .from("messaging_messages")
              .select("*")
              .eq("id", messageId)
              .is("deleted_at", null)
              .single();

            if (fetchError) {
              console.error(
                "Error fetching new message in subscription:",
                fetchError,
              );
              // Fallback: use payload data if fetch fails
              const fallbackMessage: Message = {
                ...payload.new,
                sender: null,
                reply_to: null,
              };
              setMessages((prev) => {
                const exists = prev.some((msg) => msg.id === messageId);
                if (exists) return prev;
                return [...prev, fallbackMessage as Message].sort((a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
                );
              });
              return;
            }

            // SIMPLE: Get sender info from message metadata (stored at creation)
            // Fallback to existing sender or auth user info
            let sender = null;
            let existingSender = null;

            setMessages((prev) => {
              const existingMsg = prev.find((msg) => msg.id === messageId);
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
            } // Second: Use existing sender if we have it
            else if (existingSender) {
              sender = existingSender;
            } // Third: For own messages, use auth user info
            else if (isOwnMessage && currentUser) {
              sender = {
                id: currentUser.id,
                full_name: currentUser.user_metadata?.full_name ||
                  currentUser.user_metadata?.name ||
                  currentUser.email?.split("@")[0] || "You",
                email: currentUser.email || null,
              };
            }

            // Handle reply_to for real-time updates - will be resolved in setMessages callback
            const enrichedMessage: Message = {
              ...messageData,
              sender: sender || existingSender, // Use fetched sender or fall back to existing
              reply_to: null, // Will be set in setMessages callback
            } as Message;

            setMessages((prev) => {
              // CRITICAL: Check for duplicates first - prevent duplicate messages
              const existingMsg = prev.find((msg) => msg.id === messageId);
              if (existingMsg) {
                // Message already exists - update it with latest data
                console.log(
                  "🔄 Updating existing message in real-time:",
                  messageId,
                );

                // Handle reply_to for existing message update
                let replyToMessage: Message | null = null;
                if (messageData.parent_message_id) {
                  const parentMsg = prev.find((m: Message) =>
                    m.id === messageData.parent_message_id
                  );
                  if (parentMsg) {
                    replyToMessage = {
                      id: parentMsg.id,
                      content: parentMsg.content,
                      sender_id: parentMsg.sender_id,
                      created_at: parentMsg.created_at,
                      message_type: parentMsg.message_type,
                      file_name: parentMsg.file_name,
                      metadata: parentMsg.metadata,
                      sender: parentMsg.sender,
                    };
                  }
                }

                return prev.map((msg) =>
                  msg.id === messageId
                    ? {
                      ...enrichedMessage,
                      sender: existingMsg.sender || enrichedMessage.sender,
                      reply_to: replyToMessage || existingMsg.reply_to,
                    }
                    : msg
                );
              }

              console.log(
                "✅ Adding new message from real-time subscription:",
                messageId,
              );

              // Handle reply_to - find in existing messages (fast lookup only)
              // IMPORTANT: Only set finalReplyTo if parent_message_id actually exists
              let finalReplyTo = null;
              const replyToId = messageData.parent_message_id;
              if (replyToId) {
                const repliedToMessage = prev.find((m: Message) =>
                  m.id === replyToId
                );
                if (repliedToMessage && repliedToMessage.id) {
                  finalReplyTo = {
                    id: repliedToMessage.id,
                    content: repliedToMessage.content,
                    sender_id: repliedToMessage.sender_id,
                    created_at: repliedToMessage.created_at,
                    message_type: repliedToMessage.message_type,
                    file_name: repliedToMessage.file_name,
                    metadata: repliedToMessage.metadata,
                    sender: repliedToMessage.sender,
                  };
                }
              }

              // Add new message (no async fetching - keep it fast)
              const updated = [...prev, {
                ...enrichedMessage,
                reply_to: finalReplyTo,
              }].sort((a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
              );

              console.log(
                `📊 Message count: ${prev.length} → ${updated.length}`,
              );
              return updated;
            });

            // Auto-mark as read if user is viewing
            const { data: { user } } = await supabase.auth.getUser();
            if (user && enrichedMessage.sender_id !== user.id) {
              markAsRead([enrichedMessage.id]);
            }
          } catch (err) {
            console.error("Error in message subscription handler:", err);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messaging_messages",
          filter: `channel_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log(
            "🔄 Real-time message UPDATE event received:",
            payload.new,
          );
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new } as Message
                : msg
            )
          );
        },
      )
      .subscribe((status) => {
        // Only log important status changes, not CLOSED (expected when switching conversations)
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to real-time messages");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to real-time messages");
        } else if (status === "TIMED_OUT") {
          console.warn("⏱️ Real-time subscription timed out, retrying...");
        }
        // CLOSED status is expected when switching conversations - no need to log
      });

    // Subscribe to delivery and read updates to refresh receipt status
    // Note: We'll reload messages when deliveries/reads change to get updated status
    const deliveryChannel = supabase
      .channel(`message_deliveries:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_deliveries",
        },
        (payload) => {
          const { message_id, user_id } = payload.new as any;

          // Update delivered_to array for the message
          setMessages((prev) => {
            return prev.map((msg) => {
              if (
                msg.id === message_id && !msg.delivered_to?.includes(user_id)
              ) {
                const newDeliveredTo = [...(msg.delivered_to || []), user_id];
                // Simple status update - if all participants delivered, mark as delivered
                let receipt_status = msg.receipt_status;
                if (msg.receipt_status === "sent") {
                  receipt_status = "delivered";
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
        },
      )
      .subscribe();

    const readChannel = supabase
      .channel(`message_reads:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        (payload) => {
          const { message_id, user_id } = payload.new as any;

          // Update read_by array for the message
          setMessages((prev) => {
            return prev.map((msg) => {
              if (msg.id === message_id && !msg.read_by?.includes(user_id)) {
                const newReadBy = [...(msg.read_by || []), user_id];
                // Update receipt status to read
                return {
                  ...msg,
                  read_by: newReadBy,
                  receipt_status: "read" as const,
                };
              }
              return msg;
            });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deliveryChannel);
      supabase.removeChannel(readChannel);
    };
  }, [conversationId, markAsRead]);

  const refetchMessages = useCallback(async () => {
    setOldestMessageId(null);
    setHasMore(true);
    await loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    refetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
  };
}
