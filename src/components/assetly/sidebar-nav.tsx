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
  Layers,
  UserCircle,
  Wrench,
} from '@/components/ui/icons';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { SidebarPin } from '@/components/layout/SidebarPin';

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
    label: 'PPM Groups',
    href: '/dashboard/assets/groups',
    icon: Layers,
  },
  {
    type: 'link',
    label: 'Troubleshoot AI',
    href: '/dashboard/assets/troubleshoot-setup',
    icon: Wrench,
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
        <div className="flex items-center gap-2 text-sm uppercase text-assetly-dark/35 dark:text-assetly/35 tracking-wider font-bold">
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
            ? 'text-assetly-dark dark:text-assetly bg-assetly-dark/[0.08] dark:bg-assetly/10 font-medium'
            : 'text-[#888] dark:text-theme-tertiary hover:text-[#555] dark:hover:text-theme-secondary hover:bg-assetly-dark/[0.04] dark:hover:bg-assetly/5'
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
  const { isCollapsed, showExpanded, isHoverExpanded, displayWidth, canPin, togglePin, handleMouseEnter, handleMouseLeave } = useSidebarMode();

  return (
    <aside
      className={`bg-sidebar-assetly-light dark:bg-sidebar-assetly border-r border-module-fg/[0.18] flex flex-col h-full transition-[width] duration-200 ${isHoverExpanded ? 'shadow-2xl z-50' : ''}`}
      style={{ width: displayWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      suppressHydrationWarning
    >
      {/* Header */}
      <div className={`${!showExpanded ? 'px-2 py-3' : 'px-4 py-5'} bg-sidebar-assetly-light dark:bg-sidebar-assetly border-b border-module-fg/[0.18]`}>
        <Link href="/dashboard/assets" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img src="/new_module_logos/assetly_light.svg" alt="Assetly" className={`${!showExpanded ? 'h-8' : 'h-[4.5rem]'} w-auto max-w-full dark:hidden`} />
          <img src="/new_module_logos/assetly_dark.svg" alt="Assetly" className={`${!showExpanded ? 'h-8' : 'h-[4.5rem]'} w-auto max-w-full hidden dark:block`} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${!showExpanded ? 'p-2 space-y-1' : 'p-4 space-y-1'} assetly-sidebar-scrollbar`}>
        {!showExpanded ? (
          navItems
            .filter(item => item.type !== 'section')
            .map((item, index) => {
              const Icon = item.icon;
              const href = item.href || '#';
              return (
                <Link
                  key={`${item.label}-${index}`}
                  href={href}
                  className="flex items-center justify-center w-full h-10 rounded-lg text-[#888] dark:text-theme-tertiary hover:bg-assetly-dark/[0.04] dark:hover:bg-assetly/5 hover:text-[#555] dark:hover:text-theme-secondary transition-colors"
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })
        ) : (
          navItems.map((item, index) => (
            <AssetlyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
          ))
        )}
      </nav>

      {/* Profile + Pin */}
      <div className="border-t border-module-fg/[0.18]">
        {showExpanded ? (
          <div className="p-4 pb-0">
            <Link
              href={`/dashboard/people/${profile?.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] dark:text-theme-tertiary hover:bg-assetly-dark/[0.04] dark:hover:bg-assetly/5 hover:text-[#555] dark:hover:text-theme-secondary transition-colors"
            >
              <UserCircle className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[#1a1a1a] dark:text-white">{profile?.full_name || 'My Profile'}</p>
                <p className="truncate text-xs text-[#999] dark:text-theme-tertiary">{profile?.position_title || 'Employee'}</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Link href={`/dashboard/people/${profile?.id}`} title={profile?.full_name || 'My Profile'} className="text-[#888] dark:text-theme-tertiary hover:text-[#555] dark:hover:text-theme-secondary transition-colors">
              <UserCircle className="w-5 h-5" />
            </Link>
          </div>
        )}
        {canPin && <SidebarPin isCollapsed={isCollapsed} onToggle={togglePin} />}
      </div>
    </aside>
  );
}
