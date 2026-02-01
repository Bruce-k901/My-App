'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  MoreHorizontal,
} from 'lucide-react';

const mobileNavItems = [
  { href: '/dashboard/people', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/people/leave', icon: CalendarDays, label: 'Leave' },
  { href: '/dashboard/people/attendance', icon: Clock, label: 'Time' },
  { href: '/dashboard/people/directory', icon: Users, label: 'People' },
  { href: '/dashboard/people/more', icon: MoreHorizontal, label: 'More' },
];

export function TeamlyMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0f1220] border-t border-gray-200 dark:border-white/[0.06] lg:hidden z-40">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          // Use exact match for dashboard, otherwise check if pathname starts with href
          const isActive = item.href === '/dashboard/people' 
            ? pathname === item.href
            : (pathname === item.href || pathname.startsWith(item.href + '/'));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-4 ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-white/50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

