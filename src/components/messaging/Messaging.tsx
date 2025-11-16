"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { MessageSquare } from 'lucide-react';

export function Messaging() {
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation') || null
  );
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);

  // Update selected conversation when URL param changes
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam) {
      setSelectedConversationId(conversationParam);
    }
  }, [searchParams]);

  const { sendMessage } = useMessages({
    conversationId: selectedConversationId || '',
    autoLoad: !!selectedConversationId,
  });

  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (!selectedConversationId) return;
    await sendMessage(content, replyToId);
  };

  return (
    <div className="flex h-[calc(100vh-72px)] bg-[#0B0D13]">
      {/* Sidebar - Conversation List */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Main - Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <MessageThread conversationId={selectedConversationId} />
            <MessageInput
              conversationId={selectedConversationId}
              onSendMessage={handleSendMessage}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Select a conversation
              </h2>
              <p className="text-white/60 text-sm">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

