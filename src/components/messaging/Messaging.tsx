"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { MessageSquare } from 'lucide-react';
import type { Message } from '@/types/messaging';

export function Messaging() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation') || null
  );
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);

  // Handler for reply from MessageThread
  const handleReplyToMessage = (message: Message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      senderName: message.sender?.full_name || message.sender?.email?.split('@')[0] || 'Unknown',
    });
  };

  // Update selected conversation when URL param changes
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam !== selectedConversationId) {
      setSelectedConversationId(conversationParam);
    }
  }, [searchParams]); // Remove selectedConversationId from deps to avoid loops

  // Handle conversation selection - update URL and state
  const handleSelectConversation = (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    
    // Update URL to reflect selected conversation
    if (conversationId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('conversation', conversationId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      // Clear conversation from URL
      router.replace(pathname, { scroll: false });
    }
  };

  // Shared messages hook - both MessageThread and MessageInput will use this
  // Key prop ensures hook resets when conversation changes
  const messagesHook = useMessages({
    conversationId: selectedConversationId || '',
    autoLoad: !!selectedConversationId,
  });

  return (
    <div className="flex h-[calc(100vh-72px)] bg-[#0B0D13] overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 flex-shrink-0 h-full overflow-hidden">
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Main - Message Thread */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {selectedConversationId ? (
          <>
            {/* Message Thread - Scrollable */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageThread 
                conversationId={selectedConversationId}
                messagesHook={messagesHook}
                onReply={handleReplyToMessage}
              />
            </div>
            {/* Message Input - Fixed at bottom */}
            <div className="flex-shrink-0">
              <MessageInput
                conversationId={selectedConversationId}
                sendMessage={messagesHook.sendMessage}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            </div>
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

