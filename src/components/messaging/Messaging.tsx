"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import ConversationContentTabs from './ConversationContentTabs';
import { useMessages } from '@/hooks/useMessages';
import { MessageSquare, Menu } from 'lucide-react';
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

  // TEST: Check get_user_company_id RPC function
  useEffect(() => {
    const testFunction = async () => {
      const { data, error } = await supabase.rpc('get_user_company_id');
      console.log('get_user_company_id Result:', data);
      console.log('get_user_company_id Error:', error);
    };
    testFunction();
  }, []);

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
    <div className="flex h-[calc(100vh-72px)] bg-[#0B0D13] overflow-hidden relative">
      {/* Mobile: Burger Button - Only show when viewing a conversation, takes us back to overview */}
      {selectedConversationId && (
        <button
          onClick={() => {
            setSelectedConversationId(null);
            setIsSidebarOpen(true);
            router.replace(pathname, { scroll: false });
          }}
          className="md:hidden fixed top-[76px] left-4 z-50 p-2 bg-white/[0.1] hover:bg-white/[0.15] rounded-lg text-white transition-colors"
          aria-label="Back to conversations overview"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar - Conversation List */}
      {/* Mobile: Overlay sidebar that slides in */}
      {/* Desktop: Always visible sidebar */}
      <div
        className={`
          fixed md:static
          top-[72px] left-0
          w-full md:w-80
          h-[calc(100vh-72px)]
          flex-shrink-0
          bg-[#0B0D13] border-r border-white/[0.1]
          z-40
          transition-transform duration-300 ease-in-out
          ${
            isMobile 
              ? (isSidebarOpen || !selectedConversationId ? 'translate-x-0' : '-translate-x-full')
              : 'translate-x-0'
          }
          overflow-hidden
        `}
        >
        <ConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Mobile: Overlay backdrop when sidebar is open */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-30 top-[72px]"
        />
      )}

      {/* Main - Message Thread */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full md:w-auto max-w-full">
        {selectedConversationId ? (
          <>
            {/* Content Tabs - Fixed at top */}
            <div className="flex-shrink-0">
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
      </div>
    </div>
  );
}

