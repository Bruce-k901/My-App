"use client";

import React, { useState, useEffect } from 'react';
import { MessageSquare, FileText, Image as ImageIcon, CheckSquare, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/messaging';

interface ConversationContentTabsProps {
  conversationId: string;
}

type TabType = 'messages' | 'files' | 'images' | 'tasks';

export default function ConversationContentTabs({ conversationId }: ConversationContentTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messaging_messages')
          .select('*')
          .eq('channel_id', conversationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const files = messages.filter((m) => m.message_type === 'file' && m.file_url);
  const images = messages.filter((m) => m.message_type === 'image' && m.file_url);
  const tasks = messages.filter((m) => m.is_task && m.task_id);

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
    <div className="bg-white/[0.02] border-b border-white/[0.06]">
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/[0.06]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium
                ${isActive
                  ? 'bg-transparent text-[#EC4899] border border-[#EC4899]'
                  : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
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

      {/* Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {activeTab === 'files' && (
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
        )}

        {activeTab === 'images' && (
          <div className="grid grid-cols-3 gap-2">
            {images.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-white/40 text-sm">No images shared</div>
            ) : (
              images.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden group cursor-pointer"
                  onClick={() => window.open(image.file_url || '', '_blank')}
                >
                  {image.file_url && (
                    <img
                      src={image.file_url}
                      alt={image.file_name || 'Image'}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">No tasks created</div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                >
                  <CheckSquare className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{task.content}</p>
                    {task.task_id && (
                      <p className="text-xs text-white/40">Task ID: {task.task_id.substring(0, 8)}...</p>
                    )}
                  </div>
                  {task.task_id && (
                    <button
                      onClick={() => {
                        // Navigate to task detail page
                        window.location.href = `/dashboard/tasks?task=${task.task_id}`;
                      }}
                      className="px-3 py-1.5 text-xs bg-transparent text-[#EC4899] border border-[#EC4899] rounded-lg hover:shadow-[0_0_12px_rgba(236,72,153,0.7)] transition-all"
                    >
                      View Task
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

