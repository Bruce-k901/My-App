"use client";

import { useConversations } from '@/hooks/useConversations';
import { MessageSquare } from '@/components/ui/icons';
import { usePanelStore } from '@/lib/stores/panel-store';

export function MessagingWidget() {
  const { conversations, loading } = useConversations();
  const { setMessagingOpen } = usePanelStore();

  const unreadCount = conversations.reduce((total, conv) => {
    return total + (conv.unread_count || 0);
  }, 0);

  const recentConversations = conversations
    .filter(conv => conv.unread_count && conv.unread_count > 0)
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-neutral-800 bg-[#141823] p-4 shadow-[0_0_20px_rgba(211,126,145,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#D37E91]" />
          <h2 className="text-lg font-semibold">Messages</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-[#D37E91] text-white text-xs font-semibold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setMessagingOpen(true)}
          className="text-xs text-[#D37E91] hover:text-[#D37E91] transition-colors"
        >
          View All
        </button>
      </div>

      {loading ? (
        <p className="text-theme-tertiary text-sm">Loading...</p>
      ) : recentConversations.length === 0 ? (
        <div className="space-y-2">
          <p className="text-theme-tertiary text-sm">No unread messages</p>
          <button
            onClick={() => setMessagingOpen(true)}
            className="btn-gradient text-sm inline-block mt-2"
          >
            Start a Conversation
          </button>
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
              <button
                key={conv.id}
                onClick={() => setMessagingOpen(true)}
                className="block w-full text-left p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-theme-primary truncate">
                      {name}
                    </div>
                    {conv.last_message && (
                      <div className="text-xs text-theme-tertiary truncate mt-1">
                        {conv.last_message.sender?.full_name || 'You'}: {conv.last_message.content}
                      </div>
                    )}
                  </div>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-[#D37E91] text-white text-xs font-semibold rounded-full flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {unreadCount > recentConversations.length && (
            <button
              onClick={() => setMessagingOpen(true)}
              className="block w-full text-center text-xs text-[#D37E91] hover:text-[#D37E91] mt-2"
            >
              +{unreadCount - recentConversations.length} more conversation{unreadCount - recentConversations.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
