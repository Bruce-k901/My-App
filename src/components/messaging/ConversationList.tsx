"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useAppContext } from '@/context/AppContext';
import { MessageSquare, Users, Building2, User, Search, Plus, Trash2, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { formatConversationTime } from '@/lib/utils/dateUtils';
import { supabase } from '@/lib/supabase';
import type { Conversation, ConversationFilters, TopicCategory } from '@/types/messaging';
import { StartConversationModal } from './StartConversationModal';
import TopicFilter from './TopicFilter';
import FilteredMessagesView from './FilteredMessagesView';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { conversations, loading, deleteConversation, refresh } = useConversations();
  const { user } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [isTopicFilterExpanded, setIsTopicFilterExpanded] = useState(false);
  const [topicCounts, setTopicCounts] = useState<Record<TopicCategory | 'pinned' | 'all', number>>({
    all: 0,
    pinned: 0,
    safety: 0,
    maintenance: 0,
    operations: 0,
    hr: 0,
    compliance: 0,
    incidents: 0,
    general: 0,
  });
  const [userChannelIds, setUserChannelIds] = useState<string[]>([]);

  // Get user's channel IDs
  useEffect(() => {
    const fetchUserChannels = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('messaging_channel_members')
        .select('channel_id')
        .eq('user_id', user.id);
      
      if (data) {
        setUserChannelIds(data.map(m => m.channel_id));
      }
    };
    
    fetchUserChannels();
  }, [user?.id]);

  // Fetch message topic counts (per-message topics, not conversation topics)
  // Only depends on userChannelIds to prevent loops
  const fetchTopicCounts = useCallback(async () => {
    if (userChannelIds.length === 0) {
      return;
    }

    try {
      const { data } = await supabase
        .from('messaging_messages')
        .select('topic, channel_id')
        .in('channel_id', userChannelIds)
        .not('topic', 'is', null)
        .is('deleted_at', null);

      // Update only topic counts, conversation counts updated separately
      setTopicCounts((prev) => {
        const counts: Record<TopicCategory | 'pinned' | 'all', number> = {
          all: prev.all || 0, // Preserve conversation counts
          pinned: prev.pinned || 0,
          safety: 0,
          maintenance: 0,
          operations: 0,
          hr: 0,
          compliance: 0,
          incidents: 0,
          general: 0,
        };

        data?.forEach((msg: any) => {
          if (msg.topic && counts[msg.topic as TopicCategory] !== undefined) {
            counts[msg.topic as TopicCategory] = (counts[msg.topic as TopicCategory] || 0) + 1;
          }
        });

        return counts;
      });
    } catch (error) {
      console.error('Error fetching topic counts:', error);
    }
  }, [userChannelIds]); // Only depend on userChannelIds, NOT conversations

  // Update conversation counts separately when conversations change
  // This prevents loops by separating concerns - only depend on conversation count values
  useEffect(() => {
    const allCount = conversations.length;
    const pinnedCount = conversations.filter(c => c.is_pinned).length;
    
    setTopicCounts((prev) => {
      // Only update if counts actually changed to prevent unnecessary updates
      if (prev.all === allCount && prev.pinned === pinnedCount) {
        return prev;
      }
      return {
        ...prev,
        all: allCount,
        pinned: pinnedCount,
      };
    });
  }, [conversations]); // Depend on conversations array - React will handle memoization

  // Initial fetch and refresh when dependencies change
  useEffect(() => {
    if (userChannelIds.length > 0) {
      fetchTopicCounts();
    }
     
  }, [userChannelIds]); // Only depend on userChannelIds to prevent loops

  // Real-time subscription for message topic updates
  useEffect(() => {
    if (userChannelIds.length === 0) return;

    const channel = supabase
      .channel('message-topic-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'messaging_messages',
          filter: `channel_id=in.(${userChannelIds.join(',')})`,
        },
        (payload) => {
          // Refresh topic counts when any message topic changes
          console.log('Message topic changed, refreshing counts:', payload);
          fetchTopicCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
     
  }, [userChannelIds]); // Removed fetchTopicCounts to prevent loops - it's stable anyway

  // Filter conversations by topic and search term
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Apply topic filter
    if (filters.topicCategory) {
      filtered = filtered.filter(conv => conv.topic_category === filters.topicCategory);
    }

    // Apply pinned filter
    if (filters.isPinned) {
      filtered = filtered.filter(conv => conv.is_pinned === true);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((conv) => {
        return (
          conv.name?.toLowerCase().includes(searchLower) ||
          conv.topic?.toLowerCase().includes(searchLower) ||
          conv.participants?.some((p: any) =>
            p.user?.full_name?.toLowerCase().includes(searchLower)
          ) ||
          conv.last_message?.content?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Sort: pinned first, then by last activity
    return filtered.sort((a, b) => {
      // Pinned conversations first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      
      // Then by last activity
      const getLastActivity = (conv: Conversation) => {
        if (conv.last_message?.created_at) {
          return new Date(conv.last_message.created_at).getTime();
        }
        if (conv.last_message_at) {
          return new Date(conv.last_message_at).getTime();
        }
        return new Date(conv.updated_at).getTime();
      };
      
      return getLastActivity(b) - getLastActivity(a);
    });
  }, [conversations, filters, searchTerm]);

  // Toggle pin status
  const togglePin = async (conversationId: string, currentPinStatus: boolean) => {
    try {
      const newPinStatus = !currentPinStatus;
      const updateData: { is_pinned: boolean; pinned_at?: string | null; pinned_by?: string | null } = {
        is_pinned: newPinStatus,
      };

      if (newPinStatus) {
        // When pinning, set pinned_at and pinned_by
        updateData.pinned_at = new Date().toISOString();
        updateData.pinned_by = user?.id || null;
      } else {
        // When unpinning, clear pinned_at and pinned_by
        updateData.pinned_at = null;
        updateData.pinned_by = null;
      }

      const { error } = await supabase
        .from('messaging_channels')
        .update(updateData)
        .eq('id', conversationId);
      
      if (error) {
        console.error('Error toggling pin:', error);
        throw error;
      }
      await refresh();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const getConversationIcon = (type: Conversation['type']) => {
    switch (type) {
      case 'direct':
        return User;
      case 'group':
        return Users;
      case 'site':
        return Building2;
      case 'team':
        return Users;
      default:
        return MessageSquare;
    }
  };

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'direct') {
      // Prefer showing the other user's name relative to current user
      const currentUserId = user?.id || conversation.created_by;
      const otherParticipant = conversation.participants?.find(
        (p: any) => p.user_id && p.user_id !== currentUserId
      );
      return (
        otherParticipant?.user?.full_name ||
        otherParticipant?.user?.email ||
        'Direct Message'
      );
    }
    return 'Unnamed Conversation';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-white/60">Loading conversations...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white/[0.03] overflow-hidden">
        {/* Header with Start Button - Fixed at top with exact height */}
        <div className="flex-shrink-0 p-4 border-b border-white/[0.1] bg-white/[0.03] h-[140px] flex flex-col justify-between">
          <button
            onClick={() => setIsStartModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#EC4899] border-2 border-[#EC4899] text-sm font-medium rounded-lg hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Start Conversation
          </button>
          <div className="relative h-[40px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-10 pr-4 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
        </div>

        {/* Topic Filter - Expandable */}
        <div className="flex-shrink-0 border-b border-white/[0.06]">
          <button
            onClick={() => setIsTopicFilterExpanded(!isTopicFilterExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white/70">Filter by Topic</h3>
              {(filters.topicCategory || filters.isPinned) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EC4899]/30 text-[#EC4899]">
                  Active
                </span>
              )}
            </div>
            {isTopicFilterExpanded ? (
              <ChevronUp className="w-4 h-4 text-white/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/60" />
            )}
          </button>
          
          {isTopicFilterExpanded && (
            <div className="px-4 pb-4">
              <TopicFilter 
                currentFilters={filters}
                onFilterChange={setFilters}
                counts={topicCounts}
              />
            </div>
          )}
        </div>

      {/* Show FilteredMessagesView if topic filter is active, otherwise show conversations */}
      {filters.topicCategory ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <FilteredMessagesView
            topic={filters.topicCategory}
            onClearFilter={() => setFilters({ ...filters, topicCategory: undefined })}
            userChannelIds={userChannelIds}
          />
        </div>
      ) : (
        /* Conversations List - Scrollable */
        <div className="flex-1 overflow-y-auto min-h-0">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-white/60 text-sm">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filteredConversations.map((conversation) => {
              const Icon = getConversationIcon(conversation.type);
              const isSelected = conversation.id === selectedConversationId;
              const name = getConversationName(conversation);
              const unreadCount = conversation.unread_count || 0;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full p-4 hover:bg-white/[0.05] transition-colors cursor-pointer relative ${
                    isSelected ? 'bg-white/[0.05]' : ''
                  }`}
                >
                  {/* Left border highlight for selected conversation */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-r" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-pink-500/10 rounded-lg">
                      <Icon className="w-5 h-5 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-pink-300' : 'text-white'
                        }`}>
                          {name}
                        </h3>
                        {(conversation.last_message_at || conversation.last_message?.created_at) && (
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {formatConversationTime(
                              conversation.last_message_at || conversation.last_message?.created_at
                            )}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <p className="text-xs text-white/60 truncate">
                          {conversation.last_message.sender?.full_name || 'You'}:{' '}
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {unreadCount > 0 && (
                        <div className="flex-shrink-0">
                          <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-semibold rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        </div>
                      )}
                      <button
                        className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        aria-label={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await togglePin(conversation.id, conversation.is_pinned || false);
                        }}
                        title={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        <Pin className={`w-4 h-4 ${conversation.is_pinned ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>
                      <button
                        className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        aria-label="Delete conversation"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = window.confirm('Delete this conversation? This cannot be undone.');
                          if (!confirmed) return;
                          const ok = await deleteConversation(conversation.id);
                          if (ok && isSelected) {
                            // If we deleted the currently selected conversation, clear selection
                            onSelectConversation(null);
                          }
                        }}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}
      </div>

      {/* Start Conversation Modal */}
      <StartConversationModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onConversationCreated={async (conversationId) => {
          setIsStartModalOpen(false);
          // Refresh the conversation list to show the new conversation
          await refresh();
          onSelectConversation(conversationId);
        }}
      />
    </>
  );
}

