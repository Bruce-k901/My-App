"use client";

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { formatMessageTime } from '@/lib/utils/dateUtils';
import { Edit2, Trash2, Reply, Smile, MoreVertical, Copy, Forward, Check, CheckSquare, Tag, Bot } from '@/components/ui/icons';
import { isOpslyAssistant } from '@/lib/oa/identity';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Message, Conversation, TopicCategory } from '@/types/messaging';
import CreateTaskModal, { type ModalContext } from '@/components/tasks/CreateTaskModal';
import ConvertToCalloutModal from './ConvertToCalloutModal';
import ForwardMessageModal from './ForwardMessageModal';
import TopicTagModal from './TopicTagModal';
import { ActionPrompt } from './ActionPrompt';
import { analyzeMessage } from '@/lib/messaging/detectAction';

// Topic options for tagging messages
const TOPICS: Array<{ label: string; value: TopicCategory; color: string }> = [
  { label: '🛡️ Safety', value: 'safety', color: 'text-red-500' },
  { label: '🔧 Maintenance', value: 'maintenance', color: 'text-orange-500' },
  { label: '🔄 Operations', value: 'operations', color: 'text-cyan-500' },
  { label: '👥 HR', value: 'hr', color: 'text-[#D37E91]' },
  { label: '✅ Compliance', value: 'compliance', color: 'text-green-500' },
  { label: '⚠️ Incidents', value: 'incidents', color: 'text-red-600' },
  { label: '💬 General', value: 'general', color: 'text-theme-tertiary' },
];

const getTopicLabel = (topic: TopicCategory): string => {
  return TOPICS.find(t => t.value === topic)?.label || topic;
};

const getTopicColor = (topic: TopicCategory): string => {
  return TOPICS.find(t => t.value === topic)?.color || 'text-theme-tertiary';
};

// File attachment display component
function FileAttachmentDisplay({ file }: { file: { url: string; name: string; size: number; type: string } }) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: just open in new tab
      window.open(file.url, '_blank');
    }
  };

  return (
    <a
      href={file.url}
      onClick={handleDownload}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3 rounded-lg border border-theme hover:bg-theme-surface-elevated dark:hover:bg-white/[0.06] transition max-w-sm"
    >
      <span className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#D37E91] dark:text-[#D37E91] truncate group-hover:text-[#D37E91] dark:group-hover:text-[#D37E91]">
          {file.name}
        </div>
        <div className="text-xs text-theme-tertiary">{formatFileSize(file.size)}</div>
      </div>
      <span className="text-theme-tertiary group-hover:text-theme-secondary dark:group-hover:text-theme-tertiary transition">↗</span>
    </a>
  );
}

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
  const [createTaskModalMessage, setCreateTaskModalMessage] = useState<Message | null>(null);
  const [calloutModalMessage, setCalloutModalMessage] = useState<Message | null>(null);
  const [forwardModalMessage, setForwardModalMessage] = useState<Message | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
  const [topicTagMessage, setTopicTagMessage] = useState<Message | null>(null);
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track which messages we've already tried to mark as read to avoid redundant upserts
  const processedReadMessageIds = useRef<Set<string>>(new Set());

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
        .filter((msg) => {
          const senderId = msg.sender_profile_id || msg.sender_id;
          return senderId !== user.id;
        })
        .map((msg) => msg.id);

      console.log('[DEBUG MessageThread] Extracting message IDs:', {
        totalMessages: messages.length,
        unreadMessageIds,
        messageDetails: messages
          .filter((msg) => {
            const senderId = msg.sender_profile_id || msg.sender_id;
            return senderId !== user.id;
          })
          .map((msg) => ({
            id: msg.id,
            sender_id: msg.sender_profile_id || msg.sender_id,
            content: msg.content?.substring(0, 50),
            created_at: msg.created_at,
          })),
      });

      // Filter out messages we've already processed to avoid redundant upserts
      const newUnreadMessageIds = unreadMessageIds.filter(
        (id) => !processedReadMessageIds.current.has(id)
      );

      if (newUnreadMessageIds.length > 0) {
        console.log('[DEBUG MessageThread] Calling markAsRead with:', {
          messageIds: newUnreadMessageIds,
          count: newUnreadMessageIds.length,
        });

        // Mark these messages as processed
        newUnreadMessageIds.forEach((id) => {
          processedReadMessageIds.current.add(id);
        });

        // Mark as delivered first (when message appears in UI)
        // Then mark as read (when user actually views it)
        markAsRead(newUnreadMessageIds).catch((err) => {
          console.error('[DEBUG MessageThread] markAsRead failed:', err);
          // If marking as read fails, remove from processed set so we can retry
          newUnreadMessageIds.forEach((id) => {
            processedReadMessageIds.current.delete(id);
          });
        });
      }
    }
  }, [messages, user, markAsRead]);

  // Reset processed messages when conversation changes
  useEffect(() => {
    processedReadMessageIds.current.clear();
  }, [conversationId]);

  const isOwnMessage = (message: Message) => {
    const senderId = message.sender_profile_id || message.sender_id;
    return senderId === user?.id;
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
    setForwardModalMessage(message);
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
    // Dismiss the suggestion immediately when user clicks "Create Task" or "Create Callout"
    handleDismissAction(message.id);
    
    if (actionType === 'callout') {
      setCalloutModalMessage(message);
    } else {
      setTaskModalMessage(message);
    }
  };

  const handleTopicSelect = async (topic: TopicCategory | null) => {
    if (!topicTagMessage) return;

    try {
      const { error } = await supabase
        .from('messaging_messages')
        .update({ topic })
        .eq('id', topicTagMessage.id);
      
      if (error) throw error;
      
      // Refresh messages to show updated tag
      messagesHook.refetchMessages();
      setTopicTagMessage(null);
    } catch (error) {
      console.error('Error updating topic tag:', error);
    }
  };

  // Show loading overlay instead of replacing content to prevent flicker
  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full relative">
        <div className="text-theme-secondary">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0D13] overflow-hidden">
      {/* Messages - Scrollable */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/20 scrollbar-track-transparent"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-theme-tertiary text-sm mb-2">No messages yet</div>
            <div className="text-theme-tertiary/20 text-xs">Start the conversation!</div>
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

            // Debug logging for tags (removed for production)

            return (
              <div
                key={message.id}
                data-message-id={message.id}
                className={`flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {showAvatar && !isOwn && (
                  isOpslyAssistant(message.sender_id) ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D37E91]/15 dark:bg-[#D37E91]/25 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-[#D37E91]" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D37E91]/10 dark:bg-[#D37E91]/25 flex items-center justify-center text-xs font-semibold text-[#D37E91] dark:text-[#D37E91]">
                      {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )
                )}
                {showAvatar && isOwn && <div className="flex-shrink-0 w-8" />}

                <div
                  className={`flex flex-col max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] ${
                    isOwn ? 'items-end' : 'items-start'
                  }`}
                >
                  {showAvatar && message.sender && (message.sender.full_name || message.sender.email) && (
                    <div className="text-xs text-theme-tertiary mb-1 px-2 flex items-center gap-1.5">
                      {message.sender.full_name || message.sender.email?.split('@')[0]}
                      {isOpslyAssistant(message.sender_id) && (
                        <span className="text-[10px] bg-[#D37E91]/15 text-[#D37E91] px-1.5 py-0.5 rounded-full font-medium">
                          Bot
                        </span>
                      )}
                    </div>
                  )}

                  {message.reply_to && message.reply_to.id && (
                    <div
                      className={`mb-2 px-3 py-2 bg-[#D37E91]/10 dark:bg-white/[0.08] border-l-3 border-[#D37E91] dark:border-[#D37E91]/70 rounded text-xs ${
                        isOwn ? 'ml-auto' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Scroll to the replied message
                        const repliedMessageElement = document.querySelector(`[data-message-id="${message.reply_to?.id}"]`);
                        if (repliedMessageElement) {
                          repliedMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Highlight briefly
                          repliedMessageElement.classList.add('ring-2', 'ring-[#D37E91]/50');
                          setTimeout(() => {
                            repliedMessageElement.classList.remove('ring-2', 'ring-[#D37E91]/50');
                          }, 2000);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Reply className="w-3 h-3 text-[#D37E91] dark:text-[#D37E91] flex-shrink-0" />
                        <div className="text-xs text-theme-secondary/50 font-medium">
                          {message.reply_to.sender?.full_name || message.reply_to.sender?.email?.split('@')[0] || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-theme-primary truncate max-w-[150px] xs:max-w-[200px] sm:max-w-[250px] break-words">
                        {message.reply_to.message_type === 'image' ? (
                          <span className="italic">📷 Photo</span>
                        ) : message.reply_to.message_type === 'file' ? (
                          <span className="italic break-all">📎 {message.reply_to.file_name || 'File'}</span>
                        ) : (
                          message.reply_to.content || 'Message'
                        )}
                      </div>
                    </div>
                  )}

                  {/* Forwarded message indicator */}
                  {message.metadata?.forwarded_from_message_id && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-theme-secondary/50">
                      <Forward className="w-3 h-3 text-[#D37E91] dark:text-[#D37E91] flex-shrink-0" />
                      <span>
                        Forwarded from {message.metadata?.forwarded_from_sender || 'Unknown'}
                      </span>
                    </div>
                  )}

                  <div
                    className={`group relative px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
                      isOwn
                        ? 'bg-[#D37E91]/10 dark:bg-white/[0.03] border border-[#D37E91]/30 dark:border-white/[0.06] text-theme-primary'
                        : 'bg-gray-100 dark:bg-white/[0.03] border border-theme text-theme-primary'
                    }`}
                  >
                    {message.message_type === 'image' && message.file_url ? (
                      <div className="max-w-xs md:max-w-sm mb-2">
                        <img
                          src={message.file_url}
                          alt={message.file_name || 'Image'}
                          className="rounded-lg cursor-pointer hover:opacity-90 transition w-full h-auto max-h-64 object-contain"
                          onClick={() => window.open(message.file_url || '', '_blank')}
                        />
                      </div>
                    ) : message.message_type === 'file' && message.file_url ? (
                      <FileAttachmentDisplay
                        file={{
                          url: message.file_url,
                          name: message.file_name || 'Download file',
                          size: message.file_size || 0,
                          type: message.file_type || 'application/octet-stream',
                        }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words text-theme-primary">
                        {message.content}
                      </p>
                    )}

                    {message.edited_at && (
                      <span className="text-xs text-theme-secondary italic ml-2">
                        (edited)
                      </span>
                    )}

                    {/* Topic badge */}
                    {message.topic && (
                      <div className="flex items-center gap-1 text-xs mt-2">
                        <Tag className="w-3 h-3" />
                        <span className={getTopicColor(message.topic)}>
                          {getTopicLabel(message.topic)}
                        </span>
                      </div>
                    )}

                    {/* Ticket source badge */}
                    {message.metadata?.source === 'ticket_comment' && message.metadata?.ticket_title && (
                      <a
                        href={message.metadata.ticket_link || `/dashboard/support/my-tickets/${message.metadata.ticket_id}`}
                        className="flex items-center gap-1.5 text-xs mt-2 text-[#D37E91] hover:underline"
                      >
                        <span>🎫</span>
                        <span>{message.metadata.ticket_title}</span>
                      </a>
                    )}

                    {/* WhatsApp bridge badge */}
                    {message.metadata?.source === 'whatsapp_bridge' && (
                      <div className="flex items-center gap-1.5 text-xs mt-2 text-emerald-600 dark:text-emerald-400">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.18-3.01.79.81-2.95-.19-.3A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
                        <span>via WhatsApp</span>
                        {message.metadata.wa_contact_name && (
                          <span className="text-theme-tertiary">{message.metadata.wa_contact_name}</span>
                        )}
                      </div>
                    )}

                    {/* OA action button */}
                    {message.metadata?.actionButton?.href && (
                      <Link
                        href={message.metadata.actionButton.href}
                        className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          message.metadata.actionButton.style === 'secondary'
                            ? 'bg-theme-surface-elevated text-theme-primary hover:bg-theme-hover border border-theme'
                            : 'bg-[#D37E91]/10 text-[#D37E91] hover:bg-[#D37E91]/20'
                        }`}
                      >
                        {message.metadata.actionButton.label || 'Open'}
                      </Link>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-theme-secondary">
                          {formatMessageTime(message.created_at)}
                        </span>
                        {isOwn && (
                          <div className="flex items-center">
                            {message.receipt_status === 'read' ? (
                              <span className="text-xs text-blue-600 dark:text-blue-400" title="Read">
                                ✓✓
                              </span>
                            ) : message.receipt_status === 'delivered' ? (
                              <span className="text-xs text-theme-secondary" title="Delivered">
                                ✓✓
                              </span>
                            ) : (
                              <span className="text-xs text-theme-secondary" title="Sent">
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
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-theme-secondary hover:text-theme-primary transition-colors"
                          title="Message actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === message.id && (
                          <div
                            ref={(el) => {
                              if (el) menuRefs.current.set(message.id, el);
                            }}
                            className="absolute right-0 bottom-full mb-2 bg-white dark:bg-[#1a1c24] backdrop-blur-sm rounded-lg shadow-lg border border-theme py-1 min-w-[160px] z-50"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReply(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:bg-theme-muted transition-colors"
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
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:bg-theme-muted transition-colors"
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
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:bg-theme-muted transition-colors"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                                  <span className="text-green-600 dark:text-green-500">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreateTaskModalMessage(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:bg-theme-muted transition-colors"
                            >
                              <CheckSquare className="w-4 h-4" />
                              Create Task
                            </button>
                            {!message.is_task && message.message_type === 'text' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskModalMessage(message);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-secondary hover:bg-theme-muted transition-colors"
                              >
                                <CheckSquare className="w-4 h-4" />
                                Convert to Task
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTopicTagMessage(message);
                                setActiveMenuId(null);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-theme-muted transition-colors ${
                                message.topic ? 'text-[#D37E91]' : 'text-theme-secondary'
                              }`}
                            >
                              <Tag className="w-4 h-4" />
                              {message.topic ? `Tagged: ${getTopicLabel(message.topic)}` : 'Add topic tag'}
                            </button>
                            {isOwn && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  await deleteMessage(message.id);
                                  toast.success('Message deleted');
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D37E91]/10 dark:bg-[#D37E91]/25 flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D37E91] dark:bg-[#D37E91] rounded-full animate-pulse" />
            </div>
            <div className="px-4 py-2 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 dark:bg-white/40 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-500 dark:bg-white/40 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Unified Create Task/Meeting Modal */}
      {createTaskModalMessage && (
        <CreateTaskModal
          isOpen={!!createTaskModalMessage}
          onClose={() => setCreateTaskModalMessage(null)}
          context={{
            source: 'message',
            messageId: createTaskModalMessage.id,
            messageContent: createTaskModalMessage.content,
            channelId: conversationId,
            preSelectedParticipants: conversation?.type === 'direct' && conversation?.participants
              ? conversation.participants
                  .filter(p => (p.profile_id || p.user_id) !== user?.id)
                  .map(p => p.profile_id || p.user_id || '')
                  .filter(Boolean)
              : undefined,
          }}
          onTaskCreated={(task) => {
            // Dismiss any action prompt for this message
            handleDismissAction(createTaskModalMessage.id);
            setCreateTaskModalMessage(null);
            toast.success('Task created successfully!');
          }}
        />
      )}

      {/* Unified Create Task/Meeting Modal (Convert to Task) */}
      {taskModalMessage && (
        <CreateTaskModal
          isOpen={!!taskModalMessage}
          onClose={() => setTaskModalMessage(null)}
          context={{
            source: 'message',
            messageId: taskModalMessage.id,
            messageContent: taskModalMessage.content,
            channelId: conversationId,
            preSelectedParticipants: conversation?.type === 'direct' && conversation?.participants
              ? conversation.participants
                  .filter(p => (p.profile_id || p.user_id) !== user?.id)
                  .map(p => p.profile_id || p.user_id || '')
                  .filter(Boolean)
              : undefined,
          }}
          onTaskCreated={(task) => {
            // Update the message to mark it as converted to task
            supabase
              .from('messaging_messages')
              .update({
                metadata: {
                  ...taskModalMessage.metadata,
                  is_task: true,
                  task_id: task.id,
                  action_taken: true,
                  action_type: 'task_created',
                  action_entity_id: task.id
                }
              })
              .eq('id', taskModalMessage.id);

            // Add a system message to the conversation
            if (user?.id) {
              supabase.from('messaging_messages').insert({
                channel_id: taskModalMessage.channel_id,
                sender_profile_id: user.id,
                content: `Created task: "${task.title}"`,
                message_type: 'text',
                metadata: {
                  type: 'task_created',
                  task_id: task.id,
                  original_message_id: taskModalMessage.id,
                }
              });
            }

            // Dismiss any action prompt for this message
            handleDismissAction(taskModalMessage.id);
            setTaskModalMessage(null);
            toast.success('Message converted to task successfully!');
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

      {/* Forward Message Modal */}
      {forwardModalMessage && (
        <ForwardMessageModal
          message={forwardModalMessage}
          isOpen={!!forwardModalMessage}
          onClose={() => setForwardModalMessage(null)}
          onSuccess={() => {
            setForwardModalMessage(null);
            // Messages will update automatically via real-time subscription
          }}
        />
      )}

      {/* Topic Tag Modal */}
      {topicTagMessage && (
        <TopicTagModal
          isOpen={!!topicTagMessage}
          onClose={() => setTopicTagMessage(null)}
          currentTopic={topicTagMessage.topic || null}
          onSelectTopic={handleTopicSelect}
        />
      )}
    </div>
  );
}

