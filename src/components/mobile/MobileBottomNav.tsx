"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckCircle, MessageSquare, Calendar, Menu } from "lucide-react";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  className?: string;
  onMenuOpen?: () => void;
  isBurgerMenuOpen?: boolean;
}

export function MobileBottomNav({ 
  className = "", 
  onMenuOpen,
  isBurgerMenuOpen = false 
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessageCount();

  const tabs = [
    {
      icon: Home,
      label: "Home",
      href: "/dashboard",
      active: pathname === "/dashboard",
      onClick: undefined,
    },
    {
      icon: CheckCircle,
      label: "Tasks",
      href: "/dashboard/workspace/tasks",
      active: pathname?.startsWith("/dashboard/workspace/tasks") || pathname?.startsWith("/dashboard/my_tasks") || pathname?.startsWith("/dashboard/todays_tasks"),
      badge: undefined, // TODO: Add task count
      onClick: undefined,
    },
    {
      icon: MessageSquare,
      label: "Messages",
      href: "/dashboard/workspace/messages",
      active: pathname?.startsWith("/dashboard/workspace/messages") || pathname?.startsWith("/dashboard/messaging"),
      badge: unreadCount > 0 ? unreadCount : undefined,
      onClick: undefined,
    },
    {
      icon: Calendar,
      label: "Schedule",
      href: "/dashboard/people/schedule",
      active: pathname?.startsWith("/dashboard/people/schedule"),
      onClick: undefined,
    },
    {
      icon: Menu,
      label: "Menu",
      href: undefined,
      active: isBurgerMenuOpen,
      onClick: onMenuOpen,
    },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 h-[60px] bg-[#1a1a1a] border-t border-white/[0.06] flex items-center justify-around z-40 safe-area-bottom",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = tab.active;

        const content = (
          <>
            <div className="relative">
              <Icon
                className={cn(
                  "w-6 h-6 transition-colors",
                  isActive ? "text-[#EC4899]" : "text-white/40"
                )}
              />
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EC4899] rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] transition-colors",
                isActive ? "text-[#EC4899]" : "text-white/40"
              )}
            >
              {tab.label}
            </span>
          </>
        );

        // If it's the Menu tab, render as button instead of Link
        if (tab.onClick) {
          return (
            <button
              key={`menu-${index}`}
              onClick={tab.onClick}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all",
                "active:scale-95"
              )}
            >
              {content}
            </button>
          );
        }

        return (
          <Link
            key={tab.href || `tab-${index}`}
            href={tab.href || "#"}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all",
              "active:scale-95"
            )}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
