"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, FileText, Image as ImageIcon, CheckSquare, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/messaging';
import MessageImageGallery from './MessageImageGallery';

interface ConversationContentTabsProps {
  conversationId: string;
}

type TabType = 'messages' | 'files' | 'images' | 'tasks';

export default function ConversationContentTabs({ conversationId }: ConversationContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    // Load tasks created from messages in this conversation
    const loadTasks = async () => {
      try {
        // Get message IDs from this conversation - increase limit to ensure we capture all tasks
        // Tasks can be created from any message in the conversation, so we need a wider range
        const { data: conversationMessages } = await supabase
          .from('messaging_messages')
          .select('id')
          .eq('channel_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1000); // Increased from 500 to capture more messages

        if (!conversationMessages || conversationMessages.length === 0) {
          setTasks([]);
          return;
        }

        const messageIds = conversationMessages.map(m => m.id);

        // Fetch tasks that were created from these messages
        // Also check if created_from_message_id is not null to ensure we only get message-created tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('created_from_message_id', messageIds)
          .not('created_from_message_id', 'is', null)
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

    const loadMessages = async () => {
      setLoading(true);
      try {
        // Load messages - limit to prevent loading too many at once
        // For tabs view, we only need recent messages to show counts
        const { data: messagesData, error } = await supabase
          .from('messaging_messages')
          .select('*')
          .eq('channel_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        // Fetch sender profiles separately
        if (messagesData && messagesData.length > 0) {
          const senderIds = [...new Set(messagesData.map(m => m.sender_profile_id || m.sender_id).filter(Boolean))];
          if (senderIds.length > 0) {
            const query = supabase.from('profiles').select('id, full_name, email');
            const { data: profiles } = senderIds.length === 1
              ? await query.eq('id', senderIds[0])
              : await query.in('id', senderIds);
            
            if (profiles) {
              const profilesMap = new Map(profiles.map(p => [p.id, p]));
              // Enrich messages with sender data
              const enrichedMessages = messagesData.map(msg => {
                const senderId = msg.sender_profile_id || msg.sender_id;
                return {
                  ...msg,
                  sender: profilesMap.get(senderId) || null,
                  sender_name: profilesMap.get(senderId)?.full_name || null,
                };
              });
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
    loadTasks();

    // Subscribe to new messages and task changes
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
          // Use setTimeout to ensure the task has been created in the database
          setTimeout(() => {
            loadTasks();
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // Reload tasks when tasks table changes
          // Only reload if the task has a created_from_message_id that might be in this conversation
          if (payload.new?.created_from_message_id) {
            loadTasks();
          }
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
      <div className="bg-white dark:bg-[#0B0D13] border-b border-gray-200 dark:border-white/[0.06] p-4">
        <div className="text-gray-600 dark:text-white text-sm">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0B0D13] border-b border-gray-200 dark:border-white/[0.06]">
      {/* Tabs */}
      <div className="flex gap-1 p-1.5 sm:p-2 border-b border-gray-200 dark:border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-medium flex-shrink-0
                ${isActive
                  ? 'bg-transparent text-[#EC4899] border border-[#EC4899]'
                  : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/80 hover:bg-gray-50 dark:hover:bg-white/[0.05]'
                }
              `}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  text-xs px-1.5 sm:px-2 py-0.5 rounded-full
                  ${isActive
                    ? 'bg-pink-100 dark:bg-[#EC4899]/30 text-pink-700 dark:text-[#EC4899]'
                    : 'bg-gray-100 dark:bg-white/[0.1] text-gray-600 dark:text-white/60'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === 'files' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-white/40 text-sm">No files shared</div>
              ) : (
                files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-[#EC4899] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{file.file_name || 'Unknown file'}</p>
                      {file.file_size && (
                        <p className="text-xs text-gray-500 dark:text-white/40">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>
                  </div>
                  {file.file_url && (
                    <button
                      onClick={() => handleDownload(file.file_url!, file.file_name || 'file')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4 text-gray-600 dark:text-white/60" />
                    </button>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="h-full overflow-hidden flex flex-col">
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-white/40">
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
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-white/40 text-sm">No tasks created from messages</div>
              ) : (
                tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition cursor-pointer"
                  onClick={() => {
                    window.location.href = `/dashboard/tasks?task=${task.id}`;
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.status === 'todo' ? 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                      task.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                      task.status === 'completed' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                      'bg-gray-50 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-600 dark:text-white/60 mb-2 line-clamp-2">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className="text-xs text-gray-500 dark:text-white/40 mb-2">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                  <button
                    className="mt-2 text-xs text-[#EC4899] hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/dashboard/tasks?task=${task.id}`;
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
    </div>
  );
}

