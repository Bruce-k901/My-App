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
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 lg:hidden z-40">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard/people' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-4 ${
                isActive ? 'text-[#EC4899]' : 'text-neutral-500'
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

