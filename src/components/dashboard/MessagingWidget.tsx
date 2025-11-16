"use client";

import { useConversations } from '@/hooks/useConversations';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

export function MessagingWidget() {
  const { conversations, loading } = useConversations();
  
  const unreadCount = conversations.reduce((total, conv) => {
    return total + (conv.unread_count || 0);
  }, 0);

  const recentConversations = conversations
    .filter(conv => conv.unread_count && conv.unread_count > 0)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(236,72,153,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-pink-400" />
          <h2 className="text-lg font-semibold">Messages</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-semibold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/messaging"
          className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : recentConversations.length === 0 ? (
        <div className="space-y-2">
          <p className="text-slate-500 text-sm">No unread messages</p>
          <Link
            href="/dashboard/messaging"
            className="btn-gradient text-sm inline-block mt-2"
          >
            Start a Conversation
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {recentConversations.map((conv) => {
            const name = conv.name || 
              (conv.type === 'direct' 
                ? conv.participants?.find((p: any) => p.user_id !== conv.created_by)?.user?.full_name 
                : 'Group Chat') || 
              'Conversation';
            
            return (
              <Link
                key={conv.id}
                href={`/dashboard/messaging?conversation=${conv.id}`}
                className="block p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {name}
                    </div>
                    {conv.last_message && (
                      <div className="text-xs text-slate-400 truncate mt-1">
                        {conv.last_message.sender?.full_name || 'You'}: {conv.last_message.content}
                      </div>
                    )}
                  </div>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-pink-500 text-white text-xs font-semibold rounded-full flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {unreadCount > recentConversations.length && (
            <Link
              href="/dashboard/messaging"
              className="block text-center text-xs text-pink-400 hover:text-pink-300 mt-2"
            >
              +{unreadCount - recentConversations.length} more conversation{unreadCount - recentConversations.length !== 1 ? 's' : ''}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

