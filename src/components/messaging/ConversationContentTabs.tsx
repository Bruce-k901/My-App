"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, FileText, Image as ImageIcon, CheckSquare, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/messaging';
import MessageImageGallery from './MessageImageGallery';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';

interface ConversationContentTabsProps {
  conversationId: string;
  onBack?: () => void;
  isMobile?: boolean;
  messagesHook?: any;
  onReply?: (message: Message) => void;
  replyTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

type TabType = 'messages' | 'files' | 'images' | 'tasks';

export default function ConversationContentTabs({ conversationId, onBack, isMobile, messagesHook, onReply, replyTo, onCancelReply }: ConversationContentTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        // Load messages
        const { data: messagesData, error } = await supabase
          .from('messaging_messages')
          .select('*')
          .eq('channel_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch sender profiles separately
        if (messagesData && messagesData.length > 0) {
          const senderIds = [...new Set(messagesData.map(m => m.sender_id).filter(Boolean))];
          if (senderIds.length > 0) {
            const query = supabase.from('profiles').select('id, full_name, email');
            const { data: profiles } = senderIds.length === 1
              ? await query.eq('id', senderIds[0])
              : await query.in('id', senderIds);
            
            if (profiles) {
              const profilesMap = new Map(profiles.map(p => [p.id, p]));
              // Enrich messages with sender data
              const enrichedMessages = messagesData.map(msg => ({
                ...msg,
                sender: profilesMap.get(msg.sender_id) || null,
                sender_name: profilesMap.get(msg.sender_id)?.full_name || null,
              }));
              setMessages(enrichedMessages);
            } else {
              setMessages(messagesData);
            }
          } else {
            setMessages(messagesData);
          }
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Load tasks created from messages in this conversation
    const loadTasks = async () => {
      try {
        // Get all message IDs from this conversation
        const { data: conversationMessages } = await supabase
          .from('messaging_messages')
          .select('id')
          .eq('channel_id', conversationId)
          .is('deleted_at', null);

        if (!conversationMessages || conversationMessages.length === 0) {
          setTasks([]);
          return;
        }

        const messageIds = conversationMessages.map(m => m.id);

        // Fetch tasks that were created from these messages
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('created_from_message_id', messageIds)
          .order('created_at', { ascending: false });

        if (tasksError) {
          console.error('Error loading tasks:', tasksError);
          setTasks([]);
          return;
        }

        setTasks(tasksData || []);
      } catch (error) {
        console.error('Error loading tasks:', error);
        setTasks([]);
      }
    };

    loadTasks();

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messaging_messages',
          filter: `channel_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev]);
          // Reload tasks in case a new task was created from this message
          loadTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          // Reload tasks when tasks table changes
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const files = messages.filter((m) => m.message_type === 'file' && m.file_url);
  const images = messages.filter((m) => m.message_type === 'image' && m.file_url);
  // Tasks are now fetched separately from the tasks table

  const tabs = [
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare, count: messages.length },
    { id: 'files' as TabType, label: 'Files', icon: FileText, count: files.length },
    { id: 'images' as TabType, label: 'Images', icon: ImageIcon, count: images.length },
    { id: 'tasks' as TabType, label: 'Tasks', icon: CheckSquare, count: tasks.length },
  ];

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-white/[0.02] border-b border-white/[0.06] p-4">
        <div className="text-white/60 text-sm">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden max-w-full">
      {/* Tabs Bar - Fixed at top */}
      <div className="flex-shrink-0 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="flex items-center gap-1 sm:gap-2 p-2 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
          {/* Mobile: Back Button */}
          {isMobile && onBack && (
            <button
              onClick={onBack}
              className="md:hidden flex-shrink-0 min-h-[36px] min-w-[36px] p-2 bg-transparent border border-[#EC4899] text-[#EC4899] hover:bg-[#EC4899]/10 hover:shadow-[0_0_12px_rgba(236,72,153,0.5)] active:bg-[#EC4899]/20 rounded-lg transition-all duration-200 ease-in-out touch-manipulation mr-1"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all text-sm font-medium flex-shrink-0
                  ${isActive
                    ? 'bg-transparent text-[#EC4899] border border-[#EC4899]'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                  }
                `}
                title={tab.label}
              >
                <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`
                    text-xs px-1.5 sm:px-2 py-0.5 rounded-full
                    ${isActive
                      ? 'bg-[#EC4899]/30 text-[#EC4899]'
                      : 'bg-white/[0.1] text-white/60'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content - Takes remaining space and scrolls internally */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col max-w-full">
        {/* Always show messages when messagesHook is available */}
        {messagesHook ? (
          <>
            {/* Show tab content above messages when not on messages tab */}
            {activeTab !== 'messages' && (
              <div className="flex-shrink-0 border-b border-white/[0.06] max-h-[50%] overflow-hidden flex flex-col">
                {activeTab === 'files' && (
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 max-w-full">
                    <div className="space-y-2">
                      {files.length === 0 ? (
                        <div className="text-center py-8 text-white/40 text-sm">No files shared</div>
                      ) : (
                        files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-[#EC4899] flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{file.file_name || 'Unknown file'}</p>
                                {file.file_size && (
                                  <p className="text-xs text-white/40">
                                    {(file.file_size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            </div>
                            {file.file_url && (
                              <button
                                onClick={() => handleDownload(file.file_url!, file.file_name || 'file')}
                                className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors"
                                title="Download file"
                              >
                                <Download className="h-4 w-4 text-white/60" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'images' && (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {images.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-white/40">
                        <span className="text-4xl mb-2">🖼️</span>
                        <p className="text-sm">No images in this conversation</p>
                      </div>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <MessageImageGallery
                          images={images.map(img => ({
                            id: img.id,
                            file_url: img.file_url || '',
                            file_name: img.file_name || 'Image',
                            created_at: img.created_at,
                            sender_name: img.sender?.full_name || img.sender?.email?.split('@')[0],
                            sender: img.sender,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'tasks' && (
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 max-w-full">
                    <div className="space-y-2">
                      {tasks.length === 0 ? (
                        <div className="text-center py-8 text-white/40 text-sm">No tasks created from messages</div>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition cursor-pointer"
                            onClick={() => {
                              router.push(`/dashboard/tasks/todo?task=${task.id}`);
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-white">
                                {task.title}
                              </h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                task.status === 'todo' ? 'bg-yellow-500/20 text-yellow-400' :
                                task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-white/60 mb-2 line-clamp-2">{task.description}</p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-white/40 mb-2">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </p>
                            )}
                            <button
                              className="mt-2 text-xs text-[#EC4899] hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/tasks/todo?task=${task.id}`);
                              }}
                            >
                              View Task →
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Messages Thread - Always visible, takes remaining space */}
            <div className={`flex-1 min-h-0 overflow-hidden ${activeTab !== 'messages' ? 'border-t border-white/[0.06]' : ''}`}>
              <MessageThread 
                conversationId={conversationId}
                messagesHook={messagesHook}
                onReply={onReply}
              />
            </div>
            {/* Message Input - Always visible at bottom */}
            <div className="flex-shrink-0">
              <MessageInput
                conversationId={conversationId}
                sendMessage={messagesHook.sendMessage}
                replyTo={replyTo}
                onCancelReply={onCancelReply}
              />
            </div>
          </>
        ) : (
          // Fallback when messagesHook is not available
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 max-w-full">
            <div className="text-center py-8 text-white/40 text-sm">Loading messages...</div>
          </div>
        )}
      </div>
    </div>
  );
}

