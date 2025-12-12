"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/context/AppContext";

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
          .from("messaging_channel_members")
          .select("channel_id, last_read_at, last_read_message_id")
          .eq("user_id", user.id)
          .is("left_at", null);

        if (!participantData || participantData.length === 0) {
          if (mounted) {
            setUnreadCount(0);
            setLoading(false);
          }
          return;
        }

        const channelIds = participantData.map((p) => p.channel_id);

        // Get all unread messages in one query
        // Fetch all messages in conversations where user is a participant
        const { data: allMessages } = await supabase
          .from("messaging_messages")
          .select("channel_id, created_at, sender_id")
          .in("channel_id", channelIds)
          .is("deleted_at", null)
          .neq("sender_id", user.id);

        // Calculate unread count per conversation
        let totalUnread = 0;
        if (allMessages) {
          participantData.forEach((participant) => {
            const lastRead = participant.last_read_at
              ? new Date(participant.last_read_at)
              : new Date(0);

            const unreadInConv = allMessages.filter((msg) =>
              msg.channel_id === participant.channel_id &&
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
        console.error("Error fetching unread count:", error);
        if (mounted) {
          setUnreadCount(0);
          setLoading(false);
        }
      }
    }

    fetchUnreadCount();

    // Set up real-time subscription for unread counts
    const channel = supabase
      .channel("unread-message-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_messages",
        },
        () => {
          // Refetch when messages change
          fetchUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messaging_channel_members",
        },
        () => {
          // Refetch when participants change
          fetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  return { unreadCount, loading };
}
