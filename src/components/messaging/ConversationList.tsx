"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useAppContext } from '@/context/AppContext';
import { MessageSquare, Users, Building2, User, Search, Plus, Trash2, Pin, ChevronDown, ChevronUp, Bot } from '@/components/ui/icons';
import { formatConversationTime } from '@/lib/utils/dateUtils';
import { supabase } from '@/lib/supabase';
import { OA_PROFILE_ID } from '@/lib/oa/identity';
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

  // Debug: Track modal state changes (removed for production)
  // useEffect(() => {
  //   console.log('Start Conversation Modal state changed:', isStartModalOpen);
  // }, [isStartModalOpen]);

  // Get user's channel IDs
  useEffect(() => {
    const fetchUserChannels = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('messaging_channel_members')
        .select('channel_id')
        .eq('profile_id', user.id);
      
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
      // Only count topics from recent messages (last 30 days) to keep query efficient
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data } = await supabase
        .from('messaging_messages')
        .select('topic, channel_id')
        .in('channel_id', userChannelIds)
        .not('topic', 'is', null)
        .is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString());

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
    // For direct messages, always show the OTHER person's name (not the channel name)
    if (conversation.type === 'direct' || conversation.channel_type === 'direct') {
      const currentUserId = user?.id;
      if (!currentUserId) {
        return conversation.name || 'Direct Message';
      }
      
      // Find the other participant (not the current user)
      // Check both profile_id and user_id for compatibility
      const otherParticipant = conversation.participants?.find(
        (p: any) => {
          const participantId = p.profile_id || p.user_id;
          return participantId && participantId !== currentUserId && !p.left_at;
        }
      );
      
      if (otherParticipant) {
        // Try to get name from enriched user object (from useConversations enrichment)
        if (otherParticipant.user?.full_name) {
          return otherParticipant.user.full_name;
        }
        if (otherParticipant.user?.email) {
          return otherParticipant.user.email.split('@')[0];
        }
        // Fallback to direct properties (if enrichment didn't work)
        if (otherParticipant.full_name) {
          return otherParticipant.full_name;
        }
        if (otherParticipant.email) {
          return otherParticipant.email.split('@')[0];
        }
      }
      
      // Fallback: use channel name if it's not the current user's info
      if (conversation.name && 
          conversation.name !== user?.email && 
          conversation.name !== user?.id &&
          conversation.name !== user?.email?.split('@')[0]) {
        return conversation.name;
      }
      
      return 'Direct Message';
    }
    
    // For group/site/team channels, use the channel name
    return conversation.name || 'Unnamed Conversation';
  };

  /** Check if a conversation is a DM with Opsly Assistant */
  const isOAConversation = (conversation: Conversation): boolean => {
    if (conversation.name === 'Opsly Assistant') return true;
    return conversation.participants?.some(
      (p: any) => (p.profile_id || p.user_id) === OA_PROFILE_ID && !p.left_at
    ) || false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-theme-secondary">Loading conversations...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-[#0B0D13] overflow-hidden">
        {/* Header with Start Button - Fixed at top with exact height */}
        <div className="flex-shrink-0 p-4 border-b border-theme bg-white dark:bg-[#0B0D13] h-[140px] flex flex-col justify-between">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsStartModalOpen(true);
            }}
            onMouseDown={(e) => {
              // Prevent any potential form submission or other default behavior
              e.preventDefault();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-transparent text-[#D37E91] border-2 border-[#D37E91] text-sm font-medium rounded-lg hover:shadow-[0_0_15px_rgba(211, 126, 145,0.5)] transition-all h-[40px] cursor-pointer pointer-events-auto"
            type="button"
            aria-label="Start a new conversation"
          >
            <Plus className="w-4 h-4" />
            Start Conversation
          </button>
          <div className="relative h-[40px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-10 pr-4 bg-theme-button border border-theme rounded-lg text-theme-primary placeholder-gray-400 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#D37E91]/50"
            />
          </div>
        </div>

        {/* Topic Filter - Expandable */}
        <div className="flex-shrink-0 border-b border-theme bg-white dark:bg-[#0B0D13]">
          <button
            onClick={() => setIsTopicFilterExpanded(!isTopicFilterExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-theme-surface-elevated dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-theme-secondary">Filter by Topic</h3>
              {(filters.topicCategory || filters.isPinned) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D37E91]/10 dark:bg-[#D37E91]/30 text-[#D37E91] dark:text-[#D37E91]">
                  Active
                </span>
              )}
            </div>
            {isTopicFilterExpanded ? (
              <ChevronUp className="w-4 h-4 text-theme-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-theme-secondary" />
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
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-[#D37E91]/30 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-white/20 mb-4" />
            <p className="text-theme-secondary text-sm">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-white/[0.05]">
            {filteredConversations.map((conversation) => {
              const Icon = getConversationIcon(conversation.type);
              const isSelected = conversation.id === selectedConversationId;
              const name = getConversationName(conversation);
              const unreadCount = conversation.unread_count || 0;

              const isOA = isOAConversation(conversation);

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full p-4 hover:bg-theme-surface-elevated dark:hover:bg-white/[0.03] transition-colors cursor-pointer relative ${
                    isSelected ? 'bg-gray-50 dark:bg-white/[0.03]' : ''
                  }`}
                >
                  {/* Left border highlight for selected conversation */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D37E91] rounded-r" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${
                      isOA ? 'bg-[#D37E91]/15 dark:bg-[#D37E91]/25' : 'bg-[#D37E91]/10 dark:bg-[#D37E91]/15'
                    }`}>
                      {isOA ? (
                        <Bot className="w-5 h-5 text-[#D37E91]" />
                      ) : (
                        <Icon className="w-5 h-5 text-[#D37E91] dark:text-[#D37E91]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm font-semibold truncate flex items-center gap-1.5 ${
                          isSelected ? 'text-[#D37E91] dark:text-[#D37E91]' : 'text-theme-primary'
                        }`}>
                          {name}
                          {isOA && (
                            <span className="text-[10px] bg-[#D37E91]/15 text-[#D37E91] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                              Bot
                            </span>
                          )}
                          {conversation.name?.includes('(WhatsApp)') && (
                            <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.18-3.01.79.81-2.95-.19-.3A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
                          )}
                        </h3>
                        {(conversation.last_message_at || conversation.last_message?.created_at) && (
                          <span className="text-xs text-theme-tertiary flex-shrink-0 ml-2">
                            {formatConversationTime(
                              conversation.last_message_at || conversation.last_message?.created_at
                            )}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <p className="text-xs text-theme-secondary truncate">
                          {conversation.last_message.sender?.full_name || 'You'}:{' '}
                          {conversation.last_message.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {unreadCount > 0 && (
                        <div className="flex-shrink-0">
                          <span className="px-2 py-0.5 bg-[#D37E91] text-white text-xs font-semibold rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        </div>
                      )}
                      <button
                        className="p-2 rounded hover:bg-theme-muted text-theme-secondary hover:text-theme-primary transition-colors"
                        aria-label={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await togglePin(conversation.id, conversation.is_pinned || false);
                        }}
                        title={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        <Pin className={`w-4 h-4 ${conversation.is_pinned ? 'fill-yellow-500 dark:fill-yellow-400 text-yellow-500 dark:text-yellow-400' : ''}`} />
                      </button>
                      <button
                        className="p-2 rounded hover:bg-theme-muted text-theme-secondary hover:text-theme-primary transition-colors"
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
        onClose={() => {
          setIsStartModalOpen(false);
        }}
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

