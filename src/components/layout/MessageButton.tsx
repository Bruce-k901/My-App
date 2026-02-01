"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

export function MessageButton() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessageCount();
  const isActive = pathname?.startsWith("/dashboard/messaging") || pathname?.startsWith("/notifications");

  return (
    <Link
      href="/dashboard/messaging"
      className={`
        relative w-10 h-10 rounded-lg flex items-center justify-center transition-all
        ${isActive
          ? "bg-black/[0.08] dark:bg-white/[0.12] border border-[#EC4899]"
          : "bg-black/[0.03] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
        }
      `}
    >
      <MessageSquare className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EC4899] rounded-full text-white text-xs font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
