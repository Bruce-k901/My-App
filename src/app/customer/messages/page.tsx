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
      const response = await fetch('/api/customer/messages');
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
          <Loader2 className="w-8 h-8 text-[#D37E91] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Messages</h1>
        <Button variant="secondary">
          + New Message
        </Button>
      </div>

      {threads.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-12 text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <p className="text-white/60 mb-4">No messages yet</p>
          <p className="text-sm text-white/40">Start a conversation with your supplier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/customer/messages/${thread.id}`}
              className="block p-4 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{thread.subject || 'No subject'}</span>
                    {thread.unread_count > 0 && (
                      <span className="px-2 py-0.5 bg-[#D37E91] text-white text-xs rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60">
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

