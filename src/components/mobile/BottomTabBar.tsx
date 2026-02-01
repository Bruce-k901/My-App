'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, CheckSquare, CalendarDays, Users, Menu } from 'lucide-react';
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
    if (pathname?.includes('/schedule') || pathname?.includes('/people')) return 'schedule';
    return 'home';
  };

  const currentActive = activeTab === 'more' ? getActiveFromPath() : (activeTab || getActiveFromPath());

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-[#1a1a1f]/95 backdrop-blur-lg",
        "border-t border-white/10",
        "pb-[env(safe-area-inset-bottom)]",
        "lg:hidden" // Hide on desktop
      )}
    >
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = tab.id === currentActive;
          const badgeCount = tab.id === 'tasks' ? badges.tasks : 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={cn(
                "flex flex-col items-center py-2 px-4 rounded-xl transition-all relative",
                "min-w-[64px] touch-manipulation",
                isActive
                  ? "text-[#FF6B9D]"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <div className="relative">
                <tab.icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-all"
                />
                {badgeCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-2 min-w-[18px] h-[18px]",
                    "bg-[#FF6B9D] text-white",
                    "rounded-full text-[10px] font-bold",
                    "flex items-center justify-center px-1"
                  )}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs mt-1 font-medium transition-colors",
                isActive && "text-[#FF6B9D]"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF6B9D] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
