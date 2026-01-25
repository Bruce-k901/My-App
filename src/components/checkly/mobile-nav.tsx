'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, ClipboardList, AlertTriangle, Calendar } from 'lucide-react';

interface MobileNavProps {
  onMoreClick?: () => void;
}

export function ChecklyMobileNav({ onMoreClick }: MobileNavProps = {}) {
  const pathname = usePathname();

  const tabs = [
    {
      icon: Calendar,
      label: 'Today',
      href: '/dashboard/todays_tasks',
      active: pathname === '/dashboard/todays_tasks',
    },
    {
      icon: CheckSquare,
      label: 'Tasks',
      href: '/dashboard/tasks/my-tasks',
      active: pathname?.startsWith('/dashboard/tasks'),
    },
    {
      icon: ClipboardList,
      label: 'Checklists',
      href: '/dashboard/checklists',
      active: pathname?.startsWith('/dashboard/checklists'),
    },
    {
      icon: AlertTriangle,
      label: 'Incidents',
      href: '/dashboard/incidents',
      active: pathname?.startsWith('/dashboard/incidents'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-neutral-900 border-t border-neutral-800 flex items-center justify-around z-40 lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.active;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
              isActive ? 'text-[#EC4899]' : 'text-neutral-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
