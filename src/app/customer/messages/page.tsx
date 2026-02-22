'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2 } from '@/components/ui/icons';
import { Button } from '@/components/ui';

interface MessageThread {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  unread_count: number;
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<MessageThread[]>([]);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      // Support admin preview mode
      const previewId = typeof window !== 'undefined' ? sessionStorage.getItem('admin_preview_customer_id') : null;
      const url = previewId ? `/api/customer/messages?customer_id=${previewId}` : '/api/customer/messages';
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load messages');
      }
      
      const result = await response.json();
      setThreads(result.data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      // Show user-friendly error
      alert(error.message || 'Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-module-fg animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary">Messages</h1>
        <Button variant="secondary">
          + New Message
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="bg-theme-button border border-theme rounded-xl p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-theme-tertiary" />
          <p className="text-theme-tertiary mb-4">No messages yet</p>
          <p className="text-sm text-theme-tertiary">Start a conversation with your supplier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/customer/messages/${thread.id}`}
              className="block p-4 bg-theme-button border border-theme rounded-lg hover:bg-theme-hover hover:border-theme-hover transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-theme-primary">{thread.subject || 'No subject'}</span>
                    {thread.unread_count > 0 && (
                      <span className="px-2 py-0.5 bg-module-fg text-white text-xs rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-theme-tertiary">
                    {new Date(thread.last_message_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

