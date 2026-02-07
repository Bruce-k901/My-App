'use client';

import { WidgetProps, MODULE_COLORS } from '@/types/dashboard';
import { WidgetCard, WidgetLoading } from '../WidgetWrapper';
import { MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

export default function UnreadMessagesWidget({ companyId, siteId }: WidgetProps) {
  const { unreadCount, loading } = useUnreadMessageCount();
  const colors = MODULE_COLORS.msgly;

  if (loading) {
    return <WidgetLoading />;
  }

  return (
    <WidgetCard
      title="Unread Messages"
      icon={
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <MessageSquare className={cn('w-4 h-4', colors.text)} />
        </div>
      }
      viewAllHref="/dashboard/messaging"
    >
      <div className="flex flex-col items-center justify-center py-4">
        <div
          className={cn(
            'text-4xl font-bold',
            unreadCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-[rgb(var(--text-tertiary))] dark:text-white/40'
          )}
        >
          {unreadCount}
        </div>
        <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mt-1">
          {unreadCount === 1 ? 'unread message' : 'unread messages'}
        </p>

        {/* Quick action buttons */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/dashboard/messaging"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Open Inbox
          </Link>
          <Link
            href="/dashboard/messaging?new=true"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-[rgb(var(--text-secondary))] dark:text-white/60 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <Send className="w-3 h-3" />
            New Message
          </Link>
        </div>
      </div>
    </WidgetCard>
  );
}
