"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";
import type { Conversation } from "@/types/messaging";

interface UseConversationsOptions {
  autoLoad?: boolean;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  createConversation: (
    type: "direct" | "group" | "site" | "team",
    participantIds: string[],
    name?: string,
  ) => Promise<Conversation | null>;
  archiveConversation: (conversationId: string) => Promise<void>;
  unarchiveConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useConversations({
  autoLoad = true,
}: UseConversationsOptions = {}): UseConversationsReturn {
  const { companyId, siteId, loading: contextLoading } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reloadTimeoutRef = (typeof window !== "undefined")
    ? (window as any).__convReloadRef ?? { current: null }
    : { current: null };
  if (typeof window !== "undefined" && !(window as any).__convReloadRef) {
    (window as any).__convReloadRef = reloadTimeoutRef;
  }

  const loadConversations = useCallback(
    async (options?: { silent?: boolean }) => {
    try {
      setError(null);
      if (!options?.silent) {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          console.warn("No user found, skipping conversation load");
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      if (!companyId) {
          // Silent return - companyId will be available once AppContext finishes loading
          // This is expected during initial load, no need to log
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      // Get conversations where user is a participant
      // First, get channel IDs where user is a member
      const { data: userChannels, error: userChannelsError } = await supabase
        .from("messaging_channel_members")
        .select("channel_id")
        .eq("profile_id", user.id)
        .is("left_at", null);

      if (userChannelsError) {
        console.error("Error fetching user channels:", userChannelsError);
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      const channelIds = (userChannels || []).map((c: any) => c.channel_id);
      if (channelIds.length === 0) {
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      // Then get all conversations with ALL their participants
      const { data: conversationsData, error: conversationsError } =
        await supabase
          .from("messaging_channels")
          .select(`
            *,
            participants:messaging_channel_members(
              profile_id,
              last_read_at,
              last_read_message_id,
              left_at
            )
          `)
          .in("id", channelIds)
          .is("archived_at", null)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

      if (conversationsError) {
          const errorCode = conversationsError.code || "";
          const errorMessage = conversationsError.message ||
            String(conversationsError);
        
          console.error("Error fetching conversations:", {
          code: errorCode,
          message: errorMessage,
          details: conversationsError.details,
          hint: conversationsError.hint,
          fullError: conversationsError,
        });
        
        // If it's a permission error or table doesn't exist, return empty array gracefully
        if (
            errorCode === "PGRST116" ||
            errorCode === "42P01" ||
            errorCode === "42501" ||
            errorMessage.includes("permission") ||
            errorMessage.includes("does not exist") ||
            errorMessage.includes("relation")
        ) {
            console.warn(
              "⚠️ Conversations table may not be accessible. Ensure migrations are run.",
            );
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

      // Debug: Log raw query results BEFORE filtering
      console.log('[useConversations] Raw query results:', {
        conversationsCount: conversationsData?.length || 0,
        currentUserId: user.id,
        rawConversations: conversationsData?.map((conv: any) => ({
          id: conv.id,
          name: conv.name,
          type: conv.channel_type || conv.type,
          rawParticipantsCount: conv.participants?.length || 0,
          rawParticipants: conv.participants?.map((p: any) => ({
            profile_id: p.profile_id || p.user_id,
            left_at: p.left_at,
            isCurrentUser: (p.profile_id || p.user_id) === user.id,
          })),
          // Check if we're only seeing current user
          onlyCurrentUser: conv.participants?.every((p: any) => (p.profile_id || p.user_id) === user.id),
        })),
      });

      // Filter participants to only active ones (left_at IS NULL)
      // But keep ALL participants (not just current user) for display names
      const userConversations = (conversationsData || []).map((conv: any) => ({
        ...conv,
        participants: (conv.participants || []).filter((p: any) => !p.left_at),
      })) as Conversation[];
      
      // Debug: Log AFTER filtering
      console.log('[useConversations] After filtering participants:', {
        conversationsCount: userConversations.length,
        filteredConversations: userConversations.map((conv: any) => ({
          id: conv.id,
          name: conv.name,
          participantsCount: conv.participants?.length || 0,
          participantIds: conv.participants?.map((p: any) => p.profile_id || p.user_id),
        })),
      });

      // Enrich participant records with profile info in ONE batch to avoid RLS on nested joins
      try {
        const uniqueUserIds = Array.from(
          new Set(
            (userConversations || [])
                .flatMap((c: any) =>
                  c.participants?.map((p: any) => p.profile_id || p.user_id).filter(Boolean) || []
                ),
            ),
        );
        
        if (uniqueUserIds.length > 0) {
            const query = supabase
              .from("profiles")
              .select("id, full_name, email");
            const { data: profilesData, error: profilesError } = uniqueUserIds.length === 1
              ? await query.eq("id", uniqueUserIds[0])
              : await query.in("id", uniqueUserIds);
            
            if (profilesError) {
              console.error("Error fetching profiles for enrichment:", profilesError);
            }
            
            if (profilesData && profilesData.length > 0) {
              const idToProfile: Record<string, any> = {};
              for (const prof of profilesData) {
                idToProfile[prof.id] = prof;
              }
              
              // Enrich each conversation's participants
              for (const conv of userConversations as any[]) {
                conv.participants = (conv.participants || []).map((p: any) => {
                  const participantId = p.profile_id || p.user_id;
                  const profile = idToProfile[participantId];
                  return {
                    ...p,
                    user: profile || null,
                  };
                });
              }
              
              // Debug: Log enrichment results
              console.log('[useConversations] Enriched participants:', {
                uniqueUserIdsCount: uniqueUserIds.length,
                uniqueUserIds: uniqueUserIds,
                profilesFetched: profilesData.length,
                profilesData: profilesData.map(p => ({ id: p.id, name: p.full_name })),
                conversationsCount: userConversations.length,
                allConversations: userConversations.map((conv: any) => ({
                  id: conv.id,
                  name: conv.name,
                  type: conv.channel_type || conv.type,
                  participantsCount: conv.participants?.length || 0,
                  participants: conv.participants?.map((p: any) => ({
                    profile_id: p.profile_id || p.user_id,
                    hasUser: !!p.user,
                    userName: p.user?.full_name,
                    userEmail: p.user?.email,
                  })),
                })),
              });
            } else {
              console.warn("No profile data returned for enrichment. UserIds:", uniqueUserIds);
            }
        } else {
          console.warn("No unique user IDs found for enrichment");
        }
      } catch (enrichErr) {
        // Non-fatal; continue without profile enrichment
          console.error("Unable to enrich participant profiles:", enrichErr);
      }

      // Extract participant data for unread count calculation
      const participantData = userConversations.map((conv: any) => {
        const participant = conv.participants?.find(
            (p: any) => (p.profile_id || p.user_id) === user.id && !p.left_at,
        );
          return participant
            ? {
              channel_id: conv.id,
              conversation_id: conv.id, // Keep for backward compatibility
          last_read_at: participant.last_read_at,
          last_read_message_id: participant.last_read_message_id,
          left_at: participant.left_at,
            }
            : null;
      }).filter(Boolean);

      if (userConversations.length === 0) {
        setConversations([]);
        if (!options?.silent) setLoading(false);
        return;
      }

      // Optimize: Fetch last messages and unread counts in batch queries instead of per-conversation
        const conversationIds = userConversations.map((conv) => conv.id);
      
      // Fetch all last messages in one query using a window function approach
      // Get the most recent message per conversation
        // Only select columns that exist in the table (matching useMessages.ts)
      const { data: allLastMessages } = await supabase
          .from("messaging_messages")
        .select(`
          id,
          content,
          created_at,
          edited_at,
          sender_profile_id,
          channel_id,
          parent_message_id,
          message_type,
          file_url,
          file_name,
          file_size,
          file_type,
          metadata
        `)
          .in("channel_id", conversationIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        // Fetch sender profiles separately to avoid relationship query issues
        let senderProfilesMap = new Map();
        if (allLastMessages && allLastMessages.length > 0) {
          const senderIds = [...new Set(allLastMessages.map((msg: any) => msg.sender_profile_id || msg.sender_id).filter(Boolean))];
          if (senderIds.length > 0) {
            const query = supabase
              .from("profiles")
              .select("id, full_name, email");
            const { data: senderProfiles } = senderIds.length === 1
              ? await query.eq("id", senderIds[0])
              : await query.in("id", senderIds);
            
            if (senderProfiles) {
              senderProfilesMap = new Map(senderProfiles.map((p: any) => [p.id, p]));
            }
          }
        }

        // Group last messages by channel_id (get the first one for each conversation)
        // Also enrich with sender profile information
      const lastMessagesMap = new Map<string, any>();
      if (allLastMessages) {
        for (const msg of allLastMessages) {
            const channelId = msg.channel_id;
            if (!lastMessagesMap.has(channelId)) {
              // Enrich message with sender profile
              const senderId = msg.sender_profile_id || msg.sender_id;
              const enrichedMessage = {
                ...msg,
                sender: senderProfilesMap.get(senderId) || null,
              };
              lastMessagesMap.set(channelId, enrichedMessage);
          }
        }
      }

      // Calculate unread counts efficiently using a single aggregated query
      const unreadCountsMap = new Map<string, number>();
      
      // Build participant info map for quick lookup
      const participantMap = new Map<string, any>();
      participantData?.forEach((p: any) => {
          const channelId = p.channel_id;
          participantMap.set(channelId, p);
      });

      // Fetch all unread messages in one query, grouped by conversation
      // We'll use RPC or a more efficient approach
      const unreadMessagesQuery = await supabase
          .from("messaging_messages")
          .select("channel_id, created_at, sender_profile_id")
          .in("channel_id", conversationIds)
          .is("deleted_at", null)
          .neq("sender_profile_id", user.id)
          .order("created_at", { ascending: false });

      if (unreadMessagesQuery.data) {
        // Group messages by conversation
        const messagesByConversation = new Map<string, any[]>();
        unreadMessagesQuery.data.forEach((msg: any) => {
            const channelId = msg.channel_id;
            if (!messagesByConversation.has(channelId)) {
              messagesByConversation.set(channelId, []);
          }
            messagesByConversation.get(channelId)!.push(msg);
        });

        // Calculate unread counts for each conversation
        userConversations.forEach((conv) => {
            const channelId = conv.id;
            const participant = participantMap.get(channelId);
            const messages = messagesByConversation.get(channelId) || [];
          
          if (!participant) {
            // No participant record - if there's a last message from someone else, count as 1
            const lastMessage = lastMessagesMap.get(conv.id);
              const lastMessageSenderId = lastMessage?.sender_profile_id || lastMessage?.sender_id;
              unreadCountsMap.set(
                conv.id,
                (lastMessage && lastMessageSenderId !== user.id) ? 1 : 0,
              );
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
                (msg: any) =>
                  new Date(msg.created_at) > new Date(participant.last_read_at),
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
      // IMPORTANT: Preserve participants array that was enriched earlier
      const conversationsWithMessages = userConversations.map((conv) => {
          const channelId = conv.id;
          const lastMessage = lastMessagesMap.get(channelId) || null;
          const unreadCount = unreadCountsMap.get(channelId) || 0;

        return {
          ...conv,
          participants: conv.participants || [], // Explicitly preserve participants
          last_message: lastMessage,
          unread_count: unreadCount,
        };
      });

      // Sort conversations by last message activity (most recent first)
      // Use last_message.created_at if available, otherwise fall back to last_message_at or updated_at
      const sortedConversations = conversationsWithMessages.sort((a, b) => {
        // Get the most recent activity timestamp for each conversation
        const getLastActivity = (conv: Conversation) => {
          // Priority: last_message.created_at > last_message_at > updated_at
          if (conv.last_message?.created_at) {
            return new Date(conv.last_message.created_at).getTime();
          }
          if (conv.last_message_at) {
            return new Date(conv.last_message_at).getTime();
          }
          return new Date(conv.updated_at).getTime();
        };

        const timeA = getLastActivity(a);
        const timeB = getLastActivity(b);

        // Sort descending (most recent first)
        return timeB - timeA;
      });

      setConversations(sortedConversations);
      if (!options?.silent) setLoading(false);
    } catch (err: any) {
      // Better error logging
        const errorCode = err?.code || "";
        const errorMessage = err?.message || String(err) || "Unknown error";
        const errorString = JSON.stringify(
          err,
          Object.getOwnPropertyNames(err),
        );
      
        console.error("Error loading conversations:", {
        code: errorCode,
        message: errorMessage,
        stringified: errorString,
        fullError: err,
      });
      
      // Try to extract meaningful error message
        let displayError = "Failed to load conversations";
        if (errorMessage && errorMessage !== "{}") {
        displayError = errorMessage;
      } else if (errorCode) {
        displayError = `Error ${errorCode}: Failed to load conversations`;
      }
      
      setError(displayError);
      if (!options?.silent) setLoading(false);
      // Set empty array on error to prevent UI issues
      setConversations([]);
    }
    },
    [companyId, siteId],
  );

  const createConversation = useCallback(async (
    type: "direct" | "group" | "site" | "team",
    participantIds: string[],
    name?: string,
  ): Promise<Conversation | null> => {
    if (!companyId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // For direct conversations, check if one already exists
      if (type === "direct" && participantIds.length === 1) {
        const { data: existing } = await supabase
          .from("messaging_channels")
          .select("id, participants:messaging_channel_members(profile_id)")
          .eq("channel_type", "direct")
          .eq("company_id", companyId)
          .limit(10);

        if (existing) {
          for (const conv of existing) {
            const participantUserIds =
              (conv.participants as any[])?.map((p: any) => p.profile_id || p.user_id) || [];
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
        channel_type: type,
        company_id: companyId,
        created_by: user.id,
      };

      if (type === "site" && siteId) {
        conversationData.entity_id = siteId;
        conversationData.entity_type = "site";
      }

      // For direct conversations, set name to the OTHER participant's name
      // This is just for reference - the display logic will show the other person's name
      if (type === "direct" && participantIds.length === 1 && !name) {
        // OA profile has no company_id so RLS blocks it — use known name
        const OA_ID = '00000000-0000-0000-0000-000000000002';
        if (participantIds[0] === OA_ID) {
          conversationData.name = 'Opsly Assistant';
        } else {
          try {
              const { data: otherProfile, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", participantIds[0])
              .single();

            if (otherProfile?.full_name) {
              conversationData.name = otherProfile.full_name;
            } else if (otherProfile?.email) {
              conversationData.name = otherProfile.email;
            }
          } catch {}
        }
      }

      // For team/group conversations, require a name or generate one from participants
      if ((type === "team" || type === "group") && !name) {
        if (participantIds.length > 0) {
          try {
            // Fetch participant profiles to generate a name
            const { data: profiles } = await supabase
              .from("profiles")
              .select("full_name, email")
              .in("id", participantIds);
            
            if (profiles && profiles.length > 0) {
              const names = profiles
                .map(p => p.full_name || p.email?.split('@')[0])
                .filter(Boolean)
                .slice(0, 3); // Limit to 3 names for readability
              
              if (names.length > 0) {
                conversationData.name = names.join(', ') + (profiles.length > 3 ? '...' : '');
              } else {
                throw new Error("Cannot create team/group conversation: Unable to generate name from participants");
              }
            } else {
              throw new Error("Cannot create team/group conversation: No participants found");
            }
          } catch (error: any) {
            console.error("Error generating conversation name:", error);
            throw new Error("Cannot create team/group conversation without a name. Please provide a name or ensure participants are valid.");
          }
        } else {
          throw new Error("Cannot create team/group conversation: No participants provided");
        }
      }

      // Set provided name if given
      if (name && name.trim()) {
        conversationData.name = name.trim();
      }

      // Final validation: team/group conversations MUST have a name
      if ((type === "team" || type === "group") && !conversationData.name) {
        throw new Error("Team and group conversations require a name. Please provide a conversation name.");
      }

      // Debug: Log what we're trying to insert (removed for production)

      const { data: conversation, error: createError } = await supabase
        .from("messaging_channels")
        .insert(conversationData)
        .select()
        .single();

      if (createError) {
        // Better error logging - handle cases where error might not serialize
        const errorInfo = {
          code: createError.code || "UNKNOWN",
          message: createError.message || String(createError),
          details: createError.details || null,
          hint: createError.hint || null,
          status: createError.status || null,
          statusCode: createError.statusCode || null,
          data_attempted: conversationData,
          fullError: createError,
        };
        
        console.error("❌ Conversation creation error:", errorInfo);
        console.error("❌ Full error object:", createError);
        console.error("❌ Error keys:", Object.keys(createError));
        console.error(
          "❌ Error stringified:",
          JSON.stringify(createError, Object.getOwnPropertyNames(createError)),
        );
        
        // Re-throw with more context
        const enhancedError = new Error(
          `Failed to create conversation: ${createError.message || createError.code || 'Unknown error'}. ` +
          `Details: ${createError.details || 'None'}. ` +
          `Hint: ${createError.hint || 'None'}`
        ) as any;
        enhancedError.originalError = createError;
        enhancedError.code = createError.code;
        enhancedError.details = createError.details;
        enhancedError.hint = createError.hint;
        throw enhancedError;
      }

      if (!conversation) {
        console.error("❌ Insert succeeded but no conversation returned");
        throw new Error("Conversation insert succeeded but returned no data");
      }

      // Add participants - deduplicate to avoid conflicts
      const allParticipantIds = [...new Set([user.id, ...participantIds])];
      const participants = allParticipantIds.map((userId, index) => ({
        channel_id: conversation.id,
        profile_id: userId,
        member_role: index === 0 ? "admin" : "member" as const,
      }));

      // Check if participants already exist to avoid conflicts
      const { data: existingMembers } = await supabase
        .from("messaging_channel_members")
        .select("profile_id")
        .eq("channel_id", conversation.id)
        .in("profile_id", allParticipantIds);

      const existingUserIds = new Set((existingMembers || []).map((m: any) => m.profile_id || m.user_id));
      const newParticipants = participants.filter((p) => !existingUserIds.has(p.profile_id));

      // Add participants - use insert since we've already checked for existing members
      if (newParticipants.length > 0) {
        const { error: participantsError } = await supabase
          .from("messaging_channel_members")
          .insert(newParticipants);

        if (participantsError) {
          const errorInfo = {
            code: participantsError.code || "UNKNOWN",
            message: participantsError.message || String(participantsError),
            details: participantsError.details || null,
            hint: participantsError.hint || null,
            status: participantsError.status || null,
            participants_attempted: newParticipants,
            fullError: participantsError,
            errorStringified: JSON.stringify(
              participantsError,
              Object.getOwnPropertyNames(participantsError),
            ),
          };
          console.error("❌ Error inserting participants:", errorInfo);
          console.error("❌ Full participants error object:", participantsError);
          
          // This is critical - if participants aren't added, recipients won't see the conversation
          // Throw error so the caller knows something went wrong
          throw new Error(
            `Failed to add participants to conversation: ${participantsError.message || participantsError.code || 'Unknown error'}. ` +
            `The conversation was created but participants may not have been added.`
          );
        }
      }

      // Immediately refresh conversations list and return the new conversation
      // Use a small delay to ensure database consistency
      setTimeout(async () => {
        await loadConversations({ silent: true });
      }, 100);
      
      // Also return the conversation immediately so UI can update
      return conversation as Conversation;
    } catch (err: any) {
      // Better error logging
      const errorMessage = err?.message || err?.originalError?.message || err?.error?.message || String(err) ||
        "Failed to create conversation";
      const errorCode = err?.code || err?.originalError?.code || err?.error?.code || "UNKNOWN";
      const errorDetails = err?.details || err?.originalError?.details || err?.error?.details;
      const errorHint = err?.hint || err?.originalError?.hint || err?.error?.hint;
      
      console.error("❌ Error creating conversation (caught):", {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
        hint: errorHint,
        fullError: err,
        originalError: err?.originalError,
        errorStringified: JSON.stringify(err, Object.getOwnPropertyNames(err)),
        companyId,
        type,
        participantIds,
        name,
      });
      
      setError(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}${errorHint ? ` Hint: ${errorHint}` : ''}`);
      return null;
    }
  }, [companyId, siteId, loadConversations]);

  const archiveConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("messaging_channels")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (updateError) throw updateError;

      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
    } catch (err: any) {
      console.error("Error archiving conversation:", err);
      setError(err.message || "Failed to archive conversation");
    }
  }, []);

  const unarchiveConversation = useCallback(async (conversationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("messaging_channels")
        .update({ archived_at: null })
        .eq("id", conversationId);

      if (updateError) throw updateError;

      await loadConversations();
    } catch (err: any) {
      console.error("Error unarchiving conversation:", err);
      setError(err.message || "Failed to unarchive conversation");
    }
  }, [loadConversations]);

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
    try {
      // Attempt hard delete
      const { error: deleteError } = await supabase
          .from("messaging_channels")
        .delete()
          .eq("id", conversationId);

      if (deleteError) {
          console.error("Error deleting conversation:", deleteError);
          setError(deleteError.message || "Failed to delete conversation");
        return false;
      }

        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
      return true;
    } catch (err: any) {
        console.error("Error deleting conversation:", err);
        setError(err.message || "Failed to delete conversation");
      return false;
    }
    },
    [],
  );

  // Track if we've attempted to load conversations to prevent loops
  const hasAttemptedLoadRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);

  // Reset attempt flag when companyId changes
  useEffect(() => {
    if (companyId !== lastCompanyIdRef.current) {
      hasAttemptedLoadRef.current = false;
      lastCompanyIdRef.current = companyId;
    }
  }, [companyId]);

  // Initial load - wait for AppContext to finish loading before loading conversations
  useEffect(() => {
    if (autoLoad && !contextLoading && companyId && !hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      loadConversations();
    } else if (autoLoad && !contextLoading && !companyId) {
      // Context finished loading but no companyId - set loading to false
      // Silent - companyId might not be available yet, will retry when it becomes available
      setLoading(false);
    }
     
  }, [autoLoad, contextLoading, companyId]); // Removed loadConversations to prevent loops

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
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_channels",
        },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_channel_members",
        },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messaging_messages",
        },
        scheduleReload,
      )
      .subscribe();

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
     
  }, [companyId]); // Removed loadConversations and reloadTimeoutRef to prevent loops

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
