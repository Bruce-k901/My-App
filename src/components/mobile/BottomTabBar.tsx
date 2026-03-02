'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, CheckSquare, CalendarDays, Users, Menu } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';

const tabs = [
  { id: 'home', icon: Home, label: 'Home', href: '/dashboard' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks', href: '/dashboard/todays_tasks' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar', href: '/dashboard/calendar' },
  { id: 'schedule', icon: Users, label: 'Rota', href: '/dashboard/people/schedule' },
  { id: 'more', icon: Menu, label: 'More', href: null }, // Opens sheet, no navigation
] as const;

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTab, setActiveTab, openMoreSheet, badges } = useMobileNav();

  const handleTabClick = (tab: typeof tabs[number]) => {
    if (tab.id === 'more') {
      openMoreSheet();
      return;
    }
    setActiveTab(tab.id);
    if (tab.href) {
      router.push(tab.href);
    }
  };

  // Determine active tab from pathname
  const getActiveFromPath = () => {
    if (pathname === '/dashboard') return 'home';
    if (pathname?.includes('/todays_tasks') || pathname?.includes('/tasks') || pathname?.includes('/checklists')) return 'tasks';
    if (pathname?.includes('/calendar')) return 'calendar';
    if (pathname?.includes('/people/schedule')) return 'schedule';
    return 'home';
  };

  const currentActive = activeTab === 'more' ? getActiveFromPath() : (activeTab || getActiveFromPath());

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-white/95 dark:bg-[#1a1a1f]/95 backdrop-blur-lg",
        "border-t border-black/10 dark:border-white/10",
        "pb-[env(safe-area-inset-bottom)]",
        "lg:hidden" // Hide on desktop
      )}
    >
      <div className="flex items-center justify-around py-1">
        {tabs.map((tab) => {
          const isActive = tab.id === currentActive;
          const badgeCount = tab.id === 'tasks' ? badges.tasks : 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={cn(
                "flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative",
                "min-w-[56px] touch-manipulation",
                isActive
                  ? "text-[#FF6B9D]"
                  : "text-theme-tertiary hover:text-theme-tertiary"
              )}
            >
              <div className="relative">
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-all"
                />
                {badgeCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-2 min-w-[16px] h-[16px]",
                    "bg-[#FF6B9D] text-white",
                    "rounded-full text-[9px] font-bold",
                    "flex items-center justify-center px-0.5"
                  )}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 font-medium transition-colors",
                isActive && "text-[#FF6B9D]"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
