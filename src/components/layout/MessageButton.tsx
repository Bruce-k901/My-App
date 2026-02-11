"use client";

import { MessageSquare } from '@/components/ui/icons';
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { usePanelStore } from "@/lib/stores/panel-store";

export function MessageButton() {
  const { unreadCount } = useUnreadMessageCount();
  const { setMessagingOpen } = usePanelStore();

  return (
    <button
      onClick={() => setMessagingOpen(true)}
      className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
    >
      <MessageSquare className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D37E91] rounded-full text-white text-xs font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
