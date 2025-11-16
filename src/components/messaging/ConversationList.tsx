"use client";

import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useAppContext } from '@/context/AppContext';
import { MessageSquare, Users, Building2, User, Search, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/types/messaging';
import { StartConversationModal } from './StartConversationModal';

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { conversations, loading, deleteConversation } = useConversations();
  const { user } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      conv.participants?.some((p: any) =>
        p.user?.full_name?.toLowerCase().includes(searchLower)
      ) ||
      conv.last_message?.content?.toLowerCase().includes(searchLower)
    );
  });

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
      <div className="flex flex-col h-full bg-white/[0.03] border-r border-white/[0.1]">
        {/* Header with Start Button */}
        <div className="p-4 border-b border-white/[0.1]">
          <button
            onClick={() => setIsStartModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 text-white text-sm font-medium rounded-lg hover:bg-pink-600 transition-colors mb-3"
          >
            <Plus className="w-4 h-4" />
            Start Conversation
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
          </div>
        </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
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
                  className={`w-full p-4 hover:bg-white/[0.05] transition-colors ${
                    isSelected ? 'bg-white/[0.08] border-l-2 border-pink-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onSelectConversation(conversation.id)}
                      className="flex-shrink-0 p-2 bg-pink-500/10 rounded-lg"
                      aria-label="Open conversation"
                    >
                      <Icon className="w-5 h-5 text-pink-400" />
                    </button>
                    <div className="flex-1 min-w-0" onClick={() => onSelectConversation(conversation.id)}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {name}
                        </h3>
                        {conversation.last_message_at && (
                          <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.last_message_at), {
                              addSuffix: true,
                            })}
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
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <div className="flex-shrink-0">
                          <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-semibold rounded-full">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        </div>
                      )}
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
      </div>

      {/* Start Conversation Modal */}
      <StartConversationModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onConversationCreated={(conversationId) => {
          setIsStartModalOpen(false);
          onSelectConversation(conversationId);
        }}
      />
    </>
  );
}

