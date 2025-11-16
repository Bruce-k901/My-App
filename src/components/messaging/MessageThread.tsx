"use client";

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { format, formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Reply, Smile, MoreVertical } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { Message } from '@/types/messaging';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { user } = useAppContext();
  const { messages, loading, sendMessage, editMessage, deleteMessage, markAsRead } =
    useMessages({ conversationId });
  const { typingUsers } = useTypingIndicator({ conversationId });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      // Get unread messages (messages not sent by current user)
      const unreadMessageIds = messages
        .filter((msg) => msg.sender_id !== user.id)
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        markAsRead(unreadMessageIds);
      }
    }
  }, [messages, user, markAsRead]);

  const isOwnMessage = (message: Message) => message.sender_id === user?.id;

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) {
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white/60">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.02]">
      {/* Messages */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-white/40 text-sm mb-2">No messages yet</div>
            <div className="text-white/20 text-xs">Start the conversation!</div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = isOwnMessage(message);
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showAvatar =
              !prevMessage ||
              prevMessage.sender_id !== message.sender_id ||
              new Date(message.created_at).getTime() -
                new Date(prevMessage.created_at).getTime() >
                300000; // 5 minutes

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {showAvatar && !isOwn && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-semibold text-pink-400">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {showAvatar && isOwn && <div className="flex-shrink-0 w-8" />}

                <div
                  className={`flex flex-col max-w-[70%] ${
                    isOwn ? 'items-end' : 'items-start'
                  }`}
                >
                  {showAvatar && (
                    <div className="text-xs text-white/40 mb-1 px-2">
                      {message.sender?.full_name || 'Unknown'}
                    </div>
                  )}

                  {message.reply_to && (
                    <div
                      className={`mb-1 px-3 py-1.5 bg-white/[0.05] border-l-2 border-pink-500/50 rounded text-xs text-white/60 ${
                        isOwn ? 'ml-auto' : ''
                      }`}
                    >
                      <div className="font-medium text-white/80">
                        {message.reply_to.sender?.full_name || 'Unknown'}
                      </div>
                      <div className="truncate max-w-[200px]">
                        {message.reply_to.content}
                      </div>
                    </div>
                  )}

                  <div
                    className={`group relative px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-pink-500/20 text-white'
                        : 'bg-white/[0.05] text-white/90'
                    }`}
                  >
                    {message.message_type === 'image' && message.file_url ? (
                      <img
                        src={message.file_url}
                        alt={message.file_name || 'Image'}
                        className="max-w-full rounded-lg mb-2"
                      />
                    ) : message.message_type === 'file' && message.file_url ? (
                      <a
                        href={message.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-pink-400 hover:text-pink-300"
                      >
                        <span>{message.file_name || 'Download file'}</span>
                        {message.file_size && (
                          <span className="text-xs text-white/40">
                            ({(message.file_size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </a>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}

                    {message.edited_at && (
                      <span className="text-xs text-white/30 italic ml-2">
                        (edited)
                      </span>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/40">
                        {formatMessageTime(message.created_at)}
                      </span>
                      {isOwn && (
                        <span className="text-xs text-white/30">
                          Sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
            </div>
            <div className="px-4 py-2 bg-white/[0.05] rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

