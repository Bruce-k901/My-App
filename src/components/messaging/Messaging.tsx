"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import ConversationContentTabs from './ConversationContentTabs';
import { ConversationHeader } from './ConversationHeader';
import { useMessages } from '@/hooks/useMessages';
import { MessageSquare, Menu, ArrowLeft } from 'lucide-react';
import type { Message } from '@/types/messaging';
import { supabase } from '@/lib/supabase';

export function Messaging() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation') || null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-open sidebar on mobile when no conversation is selected
  useEffect(() => {
    if (isMobile && !selectedConversationId) {
      setIsSidebarOpen(true);
    } else if (isMobile && selectedConversationId) {
      setIsSidebarOpen(false);
    }
  }, [isMobile, selectedConversationId]);

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
    
    // On mobile, close sidebar when conversation is selected
    setIsSidebarOpen(false);
    
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
    <div className="flex h-full w-full bg-[#0B0D13] overflow-hidden">
      {/* Mobile: Back Button - Only show when viewing a conversation */}
      {selectedConversationId && isMobile && (
        <button
          onClick={() => {
            setSelectedConversationId(null);
            setIsSidebarOpen(true);
            router.replace(pathname, { scroll: false });
          }}
          className="md:hidden fixed top-[88px] left-4 z-50 p-2 bg-white/[0.1] hover:bg-white/[0.15] backdrop-blur-sm border border-white/[0.1] rounded-lg text-white transition-colors shadow-lg"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}

      {/* Sidebar - Conversation List */}
      {/* Mobile: Overlay sidebar that slides in */}
      {/* Desktop: Always visible sidebar - FIXED WIDTH */}
      <aside
        className={`
          w-full md:w-80
          h-full
          flex-shrink-0
          bg-[#0B0D13] border-r border-white/[0.1]
          overflow-hidden
          flex flex-col
          ${
            isMobile 
              ? `fixed top-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
                  isSidebarOpen || !selectedConversationId ? 'translate-x-0' : '-translate-x-full'
                }`
              : ''
          }
        `}
        >
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </aside>

      {/* Mobile: Overlay backdrop when sidebar is open */}
      {isSidebarOpen && isMobile && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30"
        />
      )}

      {/* Main - Message Thread - TAKES REMAINING SPACE */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        {selectedConversationId ? (
          <>
            {/* Conversation Header - Fixed at top */}
            <ConversationHeader conversationId={selectedConversationId} />
            {/* Content Tabs - Fixed below header */}
            <div className="flex-shrink-0 border-b border-white/[0.06]">
              <ConversationContentTabs conversationId={selectedConversationId} />
            </div>
            {/* Message Thread - Scrollable */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <MessageThread 
                conversationId={selectedConversationId}
                messagesHook={messagesHook}
                onReply={handleReplyToMessage}
              />
            </div>
            {/* Message Input - Fixed at bottom */}
            <div className="flex-shrink-0 border-t border-white/[0.06]">
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
            <div className="text-center px-4">
              <MessageSquare className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Select a conversation
              </h2>
              <p className="text-white/60 text-sm">
                {isMobile 
                  ? 'Tap the menu button to view conversations'
                  : 'Choose a conversation from the sidebar to start messaging'}
              </p>
              {/* Mobile: Show button to open sidebar */}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mt-4 px-4 py-2 bg-transparent text-magenta-500 border-2 border-magenta-500 rounded-lg hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all"
                >
                  View Conversations
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
