"use client";

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { formatMessageTime } from '@/lib/utils/dateUtils';
import { Edit2, Trash2, Reply, Smile, MoreVertical, Copy, Forward, Check, CheckSquare, Tag } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Message, Conversation, TopicCategory } from '@/types/messaging';
import ConvertToTaskModal from './ConvertToTaskModal';
import CreateTaskModal from './CreateTaskModal';
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
  { label: '👥 HR', value: 'hr', color: 'text-pink-500' },
  { label: '✅ Compliance', value: 'compliance', color: 'text-green-500' },
  { label: '⚠️ Incidents', value: 'incidents', color: 'text-red-600' },
  { label: '💬 General', value: 'general', color: 'text-gray-400' },
];

const getTopicLabel = (topic: TopicCategory): string => {
  return TOPICS.find(t => t.value === topic)?.label || topic;
};

const getTopicColor = (topic: TopicCategory): string => {
  return TOPICS.find(t => t.value === topic)?.color || 'text-gray-400';
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
      className="group flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.06] transition max-w-sm"
    >
      <span className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-pink-400 truncate group-hover:text-pink-300">
          {file.name}
        </div>
        <div className="text-xs text-white/40">{formatFileSize(file.size)}</div>
      </div>
      <span className="text-white/40 group-hover:text-white/60 transition">↗</span>
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
        <div className="text-white/60">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/[0.02] overflow-hidden max-w-full min-h-0">
      {/* Messages - Scrollable */}
      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4 min-h-0 max-w-full"
        style={{ maxHeight: '100%' }}
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
                className={`flex gap-1.5 sm:gap-2 md:gap-3 min-w-0 max-w-full ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {showAvatar && !isOwn && (
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-semibold text-pink-400">
                    {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                {showAvatar && isOwn && <div className="flex-shrink-0 w-7 sm:w-8" />}

                <div
                  className={`flex flex-col max-w-[90%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] min-w-0 ${
                    isOwn ? 'items-end' : 'items-start'
                  }`}
                >
                  {showAvatar && message.sender && (message.sender.full_name || message.sender.email) && (
                    <div className="text-xs text-white/40 mb-0.5 sm:mb-1 px-1.5 sm:px-2">
                      {message.sender.full_name || message.sender.email?.split('@')[0]}
                    </div>
                  )}

                  {message.reply_to && message.reply_to.id && (
                    <div
                      className={`mb-1.5 sm:mb-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/[0.08] border-l-2 sm:border-l-3 border-pink-500/70 rounded text-[10px] sm:text-xs ${
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
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <Reply className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-400 flex-shrink-0" />
                        <div className="text-[10px] sm:text-xs text-white/50 font-medium">
                          {message.reply_to.sender?.full_name || message.reply_to.sender?.email?.split('@')[0] || 'Unknown'}
                        </div>
                      </div>
                      <div className="text-white/70 max-w-[120px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[250px] break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {message.reply_to.message_type === 'image' ? (
                          <span className="italic">📷 Photo</span>
                        ) : message.reply_to.message_type === 'file' ? (
                          <span className="italic break-all">📎 {message.reply_to.file_name || 'File'}</span>
                        ) : (
                          <span className="line-clamp-2 break-words" style={{ wordBreak: 'break-word' }}>{message.reply_to.content || 'Message'}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg min-w-0 max-w-full overflow-hidden ${
                      isOwn
                        ? 'bg-pink-500/20 text-white'
                        : 'bg-white/[0.05] text-white/90'
                    }`}
                  >
                    {message.message_type === 'image' && message.file_url ? (
                      <div className="max-w-full sm:max-w-xs md:max-w-sm mb-1.5 sm:mb-2 overflow-hidden">
                        <img
                          src={message.file_url}
                          alt={message.file_name || 'Image'}
                          className="rounded-lg cursor-pointer hover:opacity-90 transition w-full h-auto max-h-48 sm:max-h-64 object-contain"
                          onClick={() => window.open(message.file_url || '', '_blank')}
                          style={{ maxWidth: '100%', height: 'auto' }}
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
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words break-all max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {message.content}
                      </p>
                    )}

                    {message.edited_at && (
                      <span className="text-[10px] sm:text-xs text-white/30 italic ml-1.5 sm:ml-2">
                        (edited)
                      </span>
                    )}

                    {/* Topic badge */}
                    {message.topic && (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
                        <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className={getTopicColor(message.topic)}>
                          {getTopicLabel(message.topic)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] sm:text-xs text-white/40">
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
                      <div className="relative opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === message.id ? null : message.id);
                          }}
                          className="min-h-[32px] min-w-[32px] p-1 sm:p-1.5 rounded hover:bg-white/10 active:bg-white/15 text-white/60 hover:text-white transition-colors touch-manipulation"
                          title="Message actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreateTaskModalMessage(message);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                message.topic ? 'text-[#EC4899]' : 'text-gray-700'
                              }`}
                            >
                              <Tag className="w-4 h-4" />
                              {message.topic ? `Tagged: ${getTopicLabel(message.topic)}` : 'Add topic tag'}
                            </button>
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
                      <div className={`mt-1.5 sm:mt-2 ${isOwn ? 'ml-auto max-w-[90%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%]' : ''}`}>
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
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
            </div>
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/[0.05] rounded-lg">
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

      {/* Create Task Modal */}
      {createTaskModalMessage && (
        <CreateTaskModal
          message={createTaskModalMessage}
          conversationContext={{
            site_id: conversation?.site_id || undefined,
            asset_id: conversation?.context_type === 'asset' ? conversation.context_id || undefined : undefined,
          }}
          onClose={() => setCreateTaskModalMessage(null)}
          onSuccess={(taskId) => {
            setCreateTaskModalMessage(null);
            toast.success('Task created successfully!');
          }}
        />
      )}

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

