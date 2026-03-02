'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, Calendar, MessageSquare, MoreHorizontal, UserX, Clock, ClipboardList } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';
import { usePanelStore } from '@/lib/stores/panel-store';
import { haptics } from '@/lib/haptics';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const quickAccessItems = [
  {
    id: 'tasks',
    label: "Today's Tasks",
    icon: CheckSquare,
    href: '/dashboard/todays_tasks',
    color: 'text-checkly dark:text-checkly',
    bg: 'bg-checkly/10 dark:bg-checkly/10',
  },
  {
    id: 'rota',
    label: "Today's Rota",
    icon: Users,
    href: '/dashboard/people/schedule',
    color: 'text-teamly-dark dark:text-teamly',
    bg: 'bg-teamly/10 dark:bg-teamly/10',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    href: '/dashboard/calendar',
    color: 'text-planly-dark dark:text-planly',
    bg: 'bg-planly/10 dark:bg-planly/10',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageSquare,
    href: null,
    color: 'text-msgly-dark dark:text-msgly',
    bg: 'bg-msgly/10 dark:bg-msgly/10',
  },
  {
    id: 'sickness',
    label: 'Log Sickness',
    icon: UserX,
    href: '/dashboard/incidents/staff-sickness',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 dark:bg-red-500/10',
  },
  {
    id: 'clockin',
    label: 'Clock In/Out',
    icon: Clock,
    href: '/dashboard/people/attendance',
    color: 'text-teamly-dark dark:text-teamly',
    bg: 'bg-teamly/10 dark:bg-teamly/10',
  },
  {
    id: 'place-order',
    label: 'Place Order',
    icon: ClipboardList,
    href: '/dashboard/stockly/orders/new',
    color: 'text-stockly-dark dark:text-stockly',
    bg: 'bg-stockly/10 dark:bg-stockly/10',
  },
] as const;

export function QuickAccess() {
  const router = useRouter();
  const { openMoreSheet } = useMobileNav();
  const { setMessagingOpen } = usePanelStore();
  const { unreadCount } = useUnreadMessageCount();

  const handleItemClick = (clickedItem: typeof quickAccessItems[number]) => {
    haptics.light();
    if (clickedItem.id === 'messages') {
      setMessagingOpen(true);
    } else if (clickedItem.href) {
      router.push(clickedItem.href);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-theme-tertiary uppercase tracking-wider">
        Quick Access
      </h2>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        {quickAccessItems.map((action) => (
          <motion.button
            key={action.id}
            variants={item}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleItemClick(action)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4",
              "backdrop-blur-xl bg-black/[0.03] dark:bg-white/[0.08]",
              "border border-black/[0.06] dark:border-white/[0.12]",
              "shadow-lg shadow-black/5",
              "rounded-xl min-h-[100px]",
              "hover:bg-black/[0.05] dark:hover:bg-white/[0.12]",
              "transition-all touch-manipulation"
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center relative", action.bg)}>
              <action.icon size={24} className={action.color} />
              {action.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-[#D37E91] text-white text-[11px] font-bold rounded-full shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-theme-primary text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* More button */}
      <button
        onClick={() => {
          haptics.medium();
          openMoreSheet();
        }}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3",
          "backdrop-blur-xl bg-black/[0.02] dark:bg-white/[0.06]",
          "border border-black/[0.05] dark:border-white/[0.10]",
          "rounded-xl text-sm text-theme-tertiary",
          "hover:bg-black/[0.04] dark:hover:bg-white/[0.10]",
          "active:scale-[0.98]",
          "transition-all touch-manipulation"
        )}
      >
        <MoreHorizontal size={18} />
        <span>More actions</span>
      </button>
    </div>
  );
}
