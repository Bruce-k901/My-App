'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  LayoutDashboard,
  Package,
  Users,
  PhoneCall,
  Calendar,
  UserCircle,
} from 'lucide-react';

type NavItemType = 'section' | 'link' | 'parent';

interface NavItem {
  type: NavItemType;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string; icon?: React.ElementType }[];
}

// Define nav items as a constant
const navItems: NavItem[] = [
  {
    type: 'link',
    label: 'Assets',
    href: '/dashboard/assets',
    icon: LayoutDashboard,
  },
  {
    type: 'section',
    label: 'ASSET MANAGEMENT',
    icon: Package,
  },
  {
    type: 'link',
    label: 'All Assets',
    href: '/dashboard/assets',
    icon: Package,
  },
  {
    type: 'link',
    label: 'Contractors',
    href: '/dashboard/assets/contractors',
    icon: Users,
  },
  {
    type: 'link',
    label: 'Callouts',
    href: '/dashboard/assets/callout-logs',
    icon: PhoneCall,
  },
  {
    type: 'link',
    label: 'PPM Schedule',
    href: '/dashboard/ppm',
    icon: Calendar,
  },
];

export function AssetlyNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();

  if (item.type === 'section') {
    const IconComponent = item.icon;
    return (
      <div className="px-3 py-3 mt-4">
        <div className="flex items-center gap-2 text-sm uppercase text-cyan-600 dark:text-cyan-400 tracking-wider font-bold">
          <IconComponent className="w-5 h-5" suppressHydrationWarning />
          <span suppressHydrationWarning>{item.label}</span>
        </div>
      </div>
    );
  }

  if (item.type === 'link') {
    const isActive = item.href === '/dashboard/assets'
      ? pathname === item.href || pathname === '/dashboard/assets'
      : pathname === item.href || pathname.startsWith(item.href + '/');

    const IconComponent = item.icon;
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 font-medium'
            : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
        }`}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
        <span className="flex-1" suppressHydrationWarning>{item.label}</span>
      </Link>
    );
  }

  return null;
}

const APP_NAME = 'Assetly';

export function AssetlySidebar() {
  const { profile } = useAppContext();

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col h-full overflow-y-auto" suppressHydrationWarning>
      {/* Header */}
      <div className="px-4 py-5 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
        <Link href="/dashboard/assets" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img
            src="/module_logos/assetly.png"
            alt="Assetly"
            className="h-12 w-auto max-w-full"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 assetly-sidebar-scrollbar">
        {navItems.map((item, index) => (
          <AssetlyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
        ))}
      </nav>

      {/* My Profile Quick Access */}
      <div className="p-4 border-t border-gray-200 dark:border-neutral-800">
        <Link
          href={`/dashboard/people/${profile?.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <UserCircle className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-gray-900 dark:text-white">{profile?.full_name || 'My Profile'}</p>
            <p className="truncate text-xs text-gray-500 dark:text-white/50">{profile?.position_title || 'Employee'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
