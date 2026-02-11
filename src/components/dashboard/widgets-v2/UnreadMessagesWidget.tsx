'use client';

import { WidgetCard } from '../WidgetCard';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { usePanelStore } from '@/lib/stores/panel-store';

interface UnreadMessagesWidgetProps {
  siteId: string;
  companyId: string;
}

/**
 * UnreadMessagesWidget - Shows unread message count with action buttons
 */
export default function UnreadMessagesWidget({ siteId, companyId }: UnreadMessagesWidgetProps) {
  const { unreadCount, loading } = useUnreadMessageCount();
  const { setMessagingOpen } = usePanelStore();

  if (loading) {
    return (
      <WidgetCard title="Unread Messages" module="msgly">
        <div className="animate-pulse flex flex-col items-center py-4">
          <div className="h-8 w-8 bg-black/5 dark:bg-white/5 rounded mb-2" />
          <div className="h-3 w-24 bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Unread Messages" module="msgly">
      <div className="flex flex-col items-center py-2">
        <span
          className={`text-2xl font-bold ${
            unreadCount > 0 ? 'text-teal-400' : 'text-[rgb(var(--text-disabled))]'
          }`}
        >
          {unreadCount}
        </span>
        <span className="text-[11px] text-[rgb(var(--text-disabled))] mb-3">
          {unreadCount === 1 ? 'unread message' : 'unread messages'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setMessagingOpen(true)}
            className="flex items-center px-2.5 py-1.5 rounded-md bg-teal-500/10 border border-teal-400/30 text-teal-400 text-[10.5px] font-medium hover:bg-teal-500/20 transition-colors"
          >
            Open Inbox
          </button>
          <button
            onClick={() => setMessagingOpen(true)}
            className="flex items-center px-2.5 py-1.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] text-[rgb(var(--text-disabled))] text-[10.5px] font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          >
            New Message
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}
