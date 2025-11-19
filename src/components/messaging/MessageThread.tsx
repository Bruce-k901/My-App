"use client";

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { format, formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Reply, Smile, MoreVertical, Copy, Forward, Check, CheckSquare } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import type { Message, Conversation } from '@/types/messaging';
import ConvertToTaskModal from './ConvertToTaskModal';
import ConvertToCalloutModal from './ConvertToCalloutModal';
import { ActionPrompt } from './ActionPrompt';
import { analyzeMessage } from '@/lib/messaging/detectAction';

interface MessageThreadProps {
  conversationId: string;
  messagesHook: ReturnType<typeof useMessages>;
  onReply?: (message: Message) => void;
}

export function MessageThread({ conversationId, messagesHook, onReply }: MessageThreadProps) {
  const { user } = useAppContext();
  const { messages, loading, editMessage, deleteMessage, markAsRead } = messagesHook;
  const { typingUsers } = useTypingIndicator({ conversationId });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [taskModalMessage, setTaskModalMessage] = useState<Message | null>(null);
  const [calloutModalMessage, setCalloutModalMessage] = useState<Message | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Fetch conversation details for context
  useEffect(() => {
    if (!conversationId) return;

    const loadConversation = async () => {
      const { data } = await supabase
        .from('messaging_channels')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (data) {
        // Map to Conversation type for backward compatibility
        setConversation({
          ...data,
          type: data.channel_type || data.type,
          site_id: data.entity_type === 'site' ? data.entity_id : data.site_id,
        } as Conversation);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length, messages]);

  // Mark messages as delivered and read when viewing
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      // Get unread messages (messages not sent by current user)
      const unreadMessageIds = messages
        .filter((msg) => msg.sender_id !== user.id)
        .map((msg) => msg.id);

      if (unreadMessageIds.length > 0) {
        // Mark as delivered first (when message appears in UI)
        // Then mark as read (when user actually views it)
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId) {
        const menuElement = menuRefs.current.get(activeMenuId);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setActiveMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  const handleCopy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleForward = (message: Message) => {
    // TODO: Implement forward functionality - open forward modal
    // For now, copy the message content with forward prefix
    const forwardText = `Forwarded message:\n"${message.content}"\n- ${message.sender?.full_name || 'Unknown'}`;
    navigator.clipboard.writeText(forwardText).catch(console.error);
    // Show a toast or notification
    alert('Message copied to clipboard. Paste it in the conversation you want to forward to.');
  };

  const handleReply = (message: Message) => {
    if (onReply) {
      onReply(message);
    }
  };

  // Check if message should show action prompt
  const shouldShowActionPrompt = (message: Message): { show: boolean; type?: 'callout' | 'task'; confidence?: 'high' | 'medium' | 'low' } => {
    // Don't show if already converted to task/callout
    if (message.is_task || message.metadata?.action_taken) {
      return { show: false };
    }

    // Don't show if dismissed
    if (dismissedActions.has(message.id)) {
      return { show: false };
    }

    // Don't show for system messages
    if (message.is_system || message.message_type === 'system') {
      return { show: false };
    }

    // Analyze message
    const suggestion = analyzeMessage(message.content, {
      topic_category: conversation?.topic_category || undefined,
      context_type: conversation?.context_type || undefined,
      context_id: conversation?.context_id || undefined,
      site_id: conversation?.site_id || undefined,
    });

    if (suggestion.shouldSuggest && suggestion.type) {
      return {
        show: true,
        type: suggestion.type,
        confidence: suggestion.confidence,
      };
    }

    return { show: false };
  };

  const handleDismissAction = (messageId: string) => {
    setDismissedActions(prev => new Set(prev).add(messageId));
  };

  const handleQuickAction = (message: Message, actionType: 'callout' | 'task') => {
    if (actionType === 'callout') {
      setCalloutModalMessage(message);
    } else {
      setTaskModalMessage(message);
    }
  };

  // Show loading overlay instead of replacing content to prevent flicker
  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full relative">
        <div className="text-white/60">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.02] overflow-hidden">
      {/* Messages - Scrollable */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 min-h-0"
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

            // Debug logging for tags (remove after debugging)
            if (isOwn && (showAvatar || message.reply_to)) {
              console.log('🔍 TAG DEBUG for message:', {
                messageId: message.id,
                showAvatar,
                hasReplyTo: !!message.reply_to,
                replyToId: message.reply_to?.id,
                prevMessageSenderId: prevMessage?.sender_id,
                currentSenderId: message.sender_id,
                timeDiff: prevMessage ? new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() : 'N/A',
                senderName: message.sender?.full_name || message.sender?.email,
              });
            }

            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {showAvatar && !isOwn && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-semibold text-pink-400">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {showAvatar && isOwn && <div className="flex-shrink-0 w-8" />}

                <div
                  className={`flex flex-col max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${
                    isOwn ? 'items-end' : 'items-start'
                  }`}
                >
                  {showAvatar && message.sender && (message.sender.full_name || message.sender.email) && (
                    <div className="text-xs text-white/40 mb-1 px-2">
                      {message.sender.full_name || message.sender.email?.split('@')[0]}
                    </div>
                  )}

                  {message.reply_to && message.reply_to.id && message.reply_to.content && (
                    <div
                      className={`mb-2 px-3 py-2 bg-white/[0.08] border-l-3 border-pink-500/70 rounded text-xs ${
                        isOwn ? 'ml-auto' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Scroll to the replied message
                        const repliedMessageElement = document.querySelector(`[data-message-id="${message.reply_to?.id}"]`);
                        if (repliedMessageElement) {
                          repliedMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Highlight briefly
                          repliedMessageElement.classList.add('ring-2', 'ring-pink-500/50');
                          setTimeout(() => {
                            repliedMessageElement.classList.remove('ring-2', 'ring-pink-500/50');
                          }, 2000);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-3 h-3 text-pink-400 flex-shrink-0" />
                        <div className="text-xs text-white/50 font-medium">
                          {message.reply_to.sender?.full_name || message.reply_to.sender?.email?.split('@')[0] || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-white/70 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[250px] break-words">
                        {message.reply_to.message_type === 'image' ? (
                          <span className="italic">📷 Photo</span>
                        ) : message.reply_to.message_type === 'file' ? (
                          <span className="italic break-all">📎 {message.reply_to.file_name || 'File'}</span>
                        ) : (
                          message.reply_to.content
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={`group relative px-3 sm:px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-pink-500/20 text-white'
                        : 'bg-white/[0.05] text-white/90'
                    }`}
                  >
                    {message.message_type === 'image' && message.file_url ? (
                      <img
                        src={message.file_url}
                        alt={message.file_name || 'Image'}
                        className="max-w-full h-auto rounded-lg mb-2"
                        style={{ maxWidth: '100%', height: 'auto' }}
                      />
                    ) : message.message_type === 'file' && message.file_url ? (
                      <a
                        href={message.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-pink-400 hover:text-pink-300 break-words max-w-full"
                      >
                        <span className="break-all text-sm sm:text-base min-w-0 max-w-full">
                          {message.file_name || 'Download file'}
                        </span>
                        {message.file_size && (
                          <span className="text-xs text-white/40 whitespace-nowrap flex-shrink-0">
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

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">
                          {formatMessageTime(message.created_at)}
                        </span>
                        {isOwn && (
                          <div className="flex items-center">
                            {message.receipt_status === 'read' ? (
                              <span className="text-xs text-blue-400" title="Read">
                                ✓✓
                              </span>
                            ) : message.receipt_status === 'delivered' ? (
                              <span className="text-xs text-white/60" title="Delivered">
                                ✓✓
                              </span>
                            ) : (
                              <span className="text-xs text-white/40" title="Sent">
                                ✓
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Actions Menu */}
                      <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === message.id ? null : message.id);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Message actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === message.id && (
                          <div
                            ref={(el) => {
                              if (el) menuRefs.current.set(message.id, el);
                            }}
                            className="absolute right-0 bottom-full mb-2 bg-white/[0.95] backdrop-blur-sm rounded-lg shadow-lg border border-white/20 py-1 min-w-[160px] z-50"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReply(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Reply className="w-4 h-4" />
                              Reply
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForward(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <Forward className="w-4 h-4" />
                              Forward
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-4 h-4 text-green-500" />
                                  <span className="text-green-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                            {!message.is_task && message.message_type === 'text' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskModalMessage(message);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <CheckSquare className="w-4 h-4" />
                                Convert to Task
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete this message?')) {
                                    await deleteMessage(message.id);
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Prompt */}
                {(() => {
                  const actionCheck = shouldShowActionPrompt(message);
                  if (actionCheck.show && actionCheck.type) {
                    return (
                      <div className={`mt-2 ${isOwn ? 'ml-auto max-w-[85%] sm:max-w-[75%] md:max-w-[70%]' : ''}`}>
                        <ActionPrompt
                          message={message}
                          suggestionType={actionCheck.type}
                          confidence={actionCheck.confidence || 'medium'}
                          onAction={(type) => handleQuickAction(message, type)}
                          onDismiss={() => handleDismissAction(message.id)}
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
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

      {/* Convert to Task Modal */}
      {taskModalMessage && (
        <ConvertToTaskModal
          message={taskModalMessage}
          conversationContext={{
            site_id: conversation?.site_id || undefined,
            asset_id: conversation?.context_type === 'asset' ? conversation.context_id || undefined : undefined,
          }}
          onClose={() => setTaskModalMessage(null)}
          onSuccess={(taskId) => {
            setTaskModalMessage(null);
            // Messages will update automatically via real-time subscription
          }}
        />
      )}

      {/* Convert to Callout Modal */}
      {calloutModalMessage && (
        <ConvertToCalloutModal
          message={calloutModalMessage}
          conversationContext={{
            site_id: conversation?.site_id || undefined,
            asset_id: conversation?.context_type === 'asset' ? conversation.context_id || undefined : undefined,
          }}
          onClose={() => setCalloutModalMessage(null)}
          onSuccess={(calloutId) => {
            setCalloutModalMessage(null);
            // Messages will update automatically via real-time subscription
          }}
        />
      )}
    </div>
  );
}

