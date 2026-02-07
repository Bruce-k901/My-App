'use client';

import Link from 'next/link';
import { WidgetCard } from '../WidgetCard';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

interface UnreadMessagesWidgetProps {
  siteId: string;
  companyId: string;
}

/**
 * UnreadMessagesWidget - Shows unread message count with action buttons
 */
export default function UnreadMessagesWidget({ siteId, companyId }: UnreadMessagesWidgetProps) {
  const { unreadCount, loading } = useUnreadMessageCount();

  if (loading) {
    return (
      <WidgetCard title="Unread Messages" module="msgly" viewAllHref="/dashboard/messaging">
        <div className="animate-pulse flex flex-col items-center py-4">
          <div className="h-8 w-8 bg-white/5 rounded mb-2" />
          <div className="h-3 w-24 bg-white/5 rounded" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Unread Messages" module="msgly" viewAllHref="/dashboard/messaging">
      <div className="flex flex-col items-center py-2">
        <span
          className={`text-2xl font-bold ${
            unreadCount > 0 ? 'text-teal-400' : 'text-white/40'
          }`}
        >
          {unreadCount}
        </span>
        <span className="text-[11px] text-white/40 mb-3">
          {unreadCount === 1 ? 'unread message' : 'unread messages'}
        </span>
        <div className="flex gap-2">
          <Link
            href="/dashboard/messaging"
            className="flex items-center px-2.5 py-1.5 rounded-md bg-teal-500/10 border border-teal-400/30 text-teal-400 text-[10.5px] font-medium hover:bg-teal-500/20 transition-colors"
          >
            Open Inbox
          </Link>
          <Link
            href="/dashboard/messaging?new=true"
            className="flex items-center px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-white/40 text-[10.5px] font-medium hover:bg-white/[0.06] transition-colors"
          >
            New Message
          </Link>
        </div>
      </div>
    </WidgetCard>
  );
}
