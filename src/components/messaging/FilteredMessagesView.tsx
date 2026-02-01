"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatMessageTime } from '@/lib/utils/dateUtils';
import type { Message, TopicCategory } from '@/types/messaging';
import { X } from 'lucide-react';

interface FilteredMessagesViewProps {
  topic: TopicCategory;
  onClearFilter: () => void;
  userChannelIds: string[];
}

const getTopicLabel = (topic: TopicCategory): string => {
  const labels: Record<TopicCategory, string> = {
    safety: '🛡️ Safety',
    maintenance: '🔧 Maintenance',
    operations: '🔄 Operations',
    hr: '👥 HR',
    compliance: '✅ Compliance',
    incidents: '⚠️ Incidents',
    general: '💬 General',
  };
  return labels[topic] || topic;
};

export default function FilteredMessagesView({ 
  topic, 
  onClearFilter,
  userChannelIds 
}: FilteredMessagesViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFilteredMessages = useCallback(async () => {
      if (userChannelIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch messages and related data separately to avoid relationship query issues
        const { data: messagesData, error: messagesError } = await supabase
          .from('messaging_messages')
          .select('*')
          .eq('topic', topic)
          .in('channel_id', userChannelIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (messagesError) throw messagesError;

        if (!messagesData || messagesData.length === 0) {
          setMessages([]);
          setLoading(false);
          return;
        }

        // Fetch channels
        const channelIds = [...new Set(messagesData.map((m: any) => m.channel_id))];
        const { data: channelsData } = await supabase
          .from('messaging_channels')
          .select('id, name')
          .in('id', channelIds);

        // Fetch sender profiles
        const senderIds = [...new Set(messagesData.map((m: any) => m.sender_profile_id || m.sender_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', senderIds);

        // Create maps for quick lookup
        const channelsMap = new Map((channelsData || []).map((c: any) => [c.id, c]));
        const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

        // Transform the data to match Message type
        const transformedMessages: Message[] = messagesData.map((msg: any) => {
          const senderId = msg.sender_profile_id || msg.sender_id; // Backward compatibility
          const senderProfile = senderId ? profilesMap.get(senderId) : null;
          
          return {
            id: msg.id,
            channel_id: msg.channel_id,
            sender_profile_id: senderId || '',
            sender_id: senderId, // Backward compatibility
            content: msg.content,
            message_type: msg.message_type,
            file_url: msg.file_url,
            file_name: msg.file_name,
            file_size: msg.file_size,
            file_type: msg.file_type,
            metadata: msg.metadata || {},
            created_at: msg.created_at,
            updated_at: msg.updated_at || msg.created_at,
            edited_at: msg.edited_at,
            deleted_at: msg.deleted_at,
            topic: msg.topic,
            sender: senderProfile ? {
              id: senderProfile.id,
              full_name: senderProfile.full_name,
              email: senderProfile.email,
            } : undefined,
            sender_name: senderProfile?.full_name || msg.metadata?.sender_name,
            // Add channel info to metadata for display
            channel: channelsMap.get(msg.channel_id) || undefined,
          } as Message & { channel?: { id: string; name: string | null } };
        });

        setMessages(transformedMessages);
      } catch (error) {
        console.error('Error fetching filtered messages:', error);
      } finally {
        setLoading(false);
      }
    }, [topic, userChannelIds]);

  // Initial fetch and refresh when dependencies change
  useEffect(() => {
    fetchFilteredMessages();
  }, [fetchFilteredMessages]);

  // Real-time subscription for message topic updates
  useEffect(() => {
    if (userChannelIds.length === 0) return;

    const channel = supabase
      .channel(`filtered-messages-${topic}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messaging_messages',
          filter: `channel_id=in.(${userChannelIds.join(',')})`,
        },
        (payload) => {
          // Refresh filtered messages when any message changes
          // Only refresh if the change affects our topic filter
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Refresh if:
          // - A message was updated and its topic matches our filter
          // - A message was updated and its old topic matched our filter (removed tag)
          // - A new message was inserted with our topic
          if (
            (payload.eventType === 'INSERT' && newRecord?.topic === topic) ||
            (payload.eventType === 'UPDATE' && (newRecord?.topic === topic || oldRecord?.topic === topic)) ||
            (payload.eventType === 'DELETE' && oldRecord?.topic === topic)
          ) {
            console.log('Message topic changed, refreshing filtered view:', payload);
            fetchFilteredMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topic, userChannelIds, fetchFilteredMessages]);

  const handleMessageClick = (message: Message & { channel?: { id: string; name: string | null } }) => {
    if (message.channel?.id) {
      router.push(`/dashboard/messaging?conversation=${message.channel.id}&highlight=${message.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-white/60">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-[#0B0D13]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getTopicLabel(topic)}
          </h2>
          <p className="text-sm text-gray-600 dark:text-white/60">
            {messages.length} tagged message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClearFilter}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Clear filter"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message: Message & { channel?: { id: string; name: string | null } }) => (
          <div
            key={message.id}
            className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition cursor-pointer"
            onClick={() => handleMessageClick(message)}
          >
            {/* Channel name */}
            {message.channel?.name && (
              <div className="text-xs text-gray-500 dark:text-white/50 mb-1">
                {message.channel.name}
              </div>
            )}

            {/* Sender */}
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {message.sender?.full_name || message.sender?.email?.split('@')[0] || 'Unknown'}
            </div>

            {/* Message content */}
            <div className="text-sm text-gray-700 dark:text-white/70 line-clamp-2 mb-2">
              {message.content}
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 dark:text-white/50">
              {formatMessageTime(message.created_at)}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-white/40 py-8">
            No messages tagged with {getTopicLabel(topic)}
          </div>
        )}
      </div>
    </div>
  );
}

