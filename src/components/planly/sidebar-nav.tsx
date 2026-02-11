'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  LayoutDashboard,
  Package,
  Calendar,
  NotebookText,
  FileText,
  MapPin,
  Settings,
  Users,
  Tag,
  ChevronDown,
  ChevronRight,
  UserCircle,
  PlusCircle,
  Wand2,
  ExternalLink,
  MessageSquare,
} from '@/components/ui/icons';
import { useState, useEffect } from 'react';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { SidebarPin } from '@/components/layout/SidebarPin';

type NavItemType = 'section' | 'link' | 'parent';

interface NavItem {
  type: NavItemType;
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string; icon?: React.ElementType; roles?: string[] }[];
}

// Define nav items as a constant
const navItems: NavItem[] = [
  {
    type: 'link',
    label: 'Production Plan',
    href: '/dashboard/planly',
    icon: LayoutDashboard,
  },
  {
    type: 'section',
    label: 'PRODUCTION PLANNING',
    icon: Calendar,
  },
  {
    type: 'link',
    label: 'Packing Plan',
    href: '/dashboard/planly/order-book',
    icon: NotebookText,
  },
  {
    type: 'link',
    label: 'Place Order',
    href: '/dashboard/planly/orders/new',
    icon: PlusCircle,
  },
  {
    type: 'link',
    label: 'Delivery Notes',
    href: '/dashboard/planly/delivery-notes',
    icon: FileText,
  },
  {
    type: 'link',
    label: 'Delivery Schedule',
    href: '/dashboard/planly/delivery-schedule',
    icon: MapPin,
  },
  {
    type: 'section',
    label: 'PRODUCTION SETUP',
    icon: Settings,
  },
  {
    type: 'link',
    label: 'Setup Wizard',
    href: '/dashboard/planly/setup',
    icon: Wand2,
  },
  {
    type: 'parent',
    label: 'Production Settings',
    href: '/dashboard/planly/settings',
    icon: Settings,
    children: [
      { label: 'Production Setup', href: '/dashboard/planly/settings/production' },
      { label: 'Production Timeline', href: '/dashboard/planly/settings/process-templates' },
      { label: 'Equipment', href: '/dashboard/planly/settings/oven-trays' },
      { label: 'Cutoff Rules', href: '/dashboard/planly/settings/cutoff-rules' },
      { label: 'Packing & Delivery', href: '/dashboard/planly/settings/destination-groups' },
    ],
  },
  {
    type: 'parent',
    label: 'Customers',
    href: '/dashboard/planly/customers',
    icon: Users,
    children: [
      { label: 'Customer List', href: '/dashboard/planly/customers' },
      { label: 'Customer Support', href: '/dashboard/planly/customer-support', icon: MessageSquare, roles: ['Owner', 'Admin', 'Manager', 'platform_admin'] },
      { label: 'Customer Portal', href: '/customer/dashboard', icon: ExternalLink },
    ],
  },
  {
    type: 'link',
    label: 'Products',
    href: '/dashboard/planly/products',
    icon: Package,
  },
  {
    type: 'link',
    label: 'Product Pricing',
    href: '/dashboard/planly/pricing',
    icon: Tag,
  },
];

export function PlanlyNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState(false);

  const isParent = item.type === 'parent';
  const isParentActive = isParent && (pathname === item.href || (item.href && pathname.startsWith(item.href + '/')));
  const childActive = isParent && item.children?.some(
    child => pathname === child.href || pathname.startsWith(child.href + '/')
  );

  useEffect(() => {
    if (isParent && !manuallyToggled && (childActive || isParentActive)) {
      setIsOpen(true);
    }
  }, [isParent, childActive, isParentActive, manuallyToggled]);

  if (item.type === 'section') {
    const IconComponent = item.icon;
    return (
      <div className="px-3 py-3 mt-4">
        <div className="flex items-center gap-2 text-sm uppercase text-planly-dark/35 dark:text-planly/35 tracking-wider font-bold">
          <IconComponent className="w-5 h-5" />
          <span>{item.label}</span>
        </div>
      </div>
    );
  }

  if (item.type === 'link') {
    const isActive = item.href === '/dashboard/planly'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');

    const IconComponent = item.icon;
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-planly-dark/[0.08] dark:bg-planly/10 text-planly-dark dark:text-planly font-medium'
            : 'text-[#888] dark:text-white/50 hover:bg-planly-dark/[0.04] dark:hover:bg-planly/5 hover:text-[#555] dark:hover:text-white/80'
        }`}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  }

  if (isParent) {
    const shouldExpand = manuallyToggled
      ? isOpen
      : (isOpen || childActive || isParentActive);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const newIsOpen = !isOpen;
      setManuallyToggled(true);
      setIsOpen(newIsOpen);
      if (newIsOpen && item.href) {
        router.push(item.href);
      }
    };

    const IconComponent = item.icon;
    // Only highlight parent if it's the exact page AND no child is active
    const shouldHighlightParent = isParentActive && !childActive;

    return (
      <div>
        <Link
          href={item.href!}
          onClick={handleClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            shouldHighlightParent
              ? 'bg-planly-dark/[0.08] dark:bg-planly/10 text-planly-dark dark:text-planly font-medium'
              : 'text-[#888] dark:text-white/50 hover:bg-planly-dark/[0.04] dark:hover:bg-planly/5 hover:text-[#555] dark:hover:text-white/80'
          }`}
        >
          <IconComponent className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          <span className="text-[#999] dark:text-white/50">
            {shouldExpand ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        </Link>

        {shouldExpand && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children!.map((child) => {
              const isChildActive = pathname === child.href || (child.href && pathname.startsWith(child.href + '/'));
              const ChildIcon = child.icon || Package;

              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors relative ${
                    isChildActive
                      ? 'bg-planly-dark/[0.08] dark:bg-planly/10 text-planly-dark dark:text-planly font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-planly-dark dark:before:bg-planly'
                      : 'text-[#888] dark:text-white/50 hover:text-[#555] dark:hover:text-white/80'
                  }`}
                >
                  <ChildIcon className="w-4 h-4" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}

const APP_NAME = 'Planly';

export function PlanlySidebar() {
  const { profile } = useAppContext();
  const { isCollapsed, showExpanded, isHoverExpanded, displayWidth, togglePin, handleMouseEnter, handleMouseLeave } = useSidebarMode();

  // Filter children based on user role
  const userRole = profile?.app_role || '';
  const filteredNavItems = navItems.map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => {
          if (!child.roles) return true;
          return child.roles.includes(userRole);
        }),
      };
    }
    return item;
  });

  return (
    <aside
      className={`bg-sidebar-planly-light dark:bg-sidebar-planly border-r border-module-fg/[0.18] flex flex-col h-full transition-[width] duration-200 ${isHoverExpanded ? 'shadow-2xl z-50' : ''}`}
      style={{ width: displayWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      suppressHydrationWarning
    >
      {/* Header */}
      <div className={`${!showExpanded ? 'px-2 py-3' : 'px-4 py-5'} bg-sidebar-planly-light dark:bg-sidebar-planly border-b border-module-fg/[0.18]`}>
        <Link href="/dashboard/planly" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img src="/new_module_logos/planly_light.svg" alt="Planly" className={`${!showExpanded ? 'h-8' : 'h-12'} w-auto max-w-full dark:hidden`} />
          <img src="/new_module_logos/planly_dark.svg" alt="Planly" className={`${!showExpanded ? 'h-8' : 'h-12'} w-auto max-w-full hidden dark:block`} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${!showExpanded ? 'p-2 space-y-1' : 'p-4 space-y-1'} planly-sidebar-scrollbar`}>
        {!showExpanded ? (
          filteredNavItems
            .filter(item => item.type !== 'section')
            .map((item, index) => {
              const Icon = item.icon;
              const href = item.href || (item.children?.[0]?.href) || '#';
              return (
                <Link
                  key={`${item.label}-${index}`}
                  href={href}
                  className="flex items-center justify-center w-full h-10 rounded-lg text-[#888] dark:text-white/50 hover:bg-planly-dark/[0.04] dark:hover:bg-planly/5 hover:text-[#555] dark:hover:text-white/80 transition-colors"
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })
        ) : (
          filteredNavItems.map((item, index) => (
            <PlanlyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
          ))
        )}
      </nav>

      {/* Profile + Pin */}
      <div className="border-t border-module-fg/[0.18]">
        {showExpanded ? (
          <div className="p-4 pb-0">
            <Link
              href={`/dashboard/people/${profile?.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] dark:text-white/50 hover:bg-planly-dark/[0.04] dark:hover:bg-planly/5 hover:text-[#555] dark:hover:text-white/80 transition-colors"
            >
              <UserCircle className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[#1a1a1a] dark:text-white">{profile?.full_name || 'My Profile'}</p>
                <p className="truncate text-xs text-[#888] dark:text-white/50">{profile?.position_title || 'Employee'}</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Link href={`/dashboard/people/${profile?.id}`} title={profile?.full_name || 'My Profile'} className="text-[#888] dark:text-white/50 hover:text-[#555] dark:hover:text-white/80 transition-colors">
              <UserCircle className="w-5 h-5" />
            </Link>
          </div>
        )}
        <SidebarPin isCollapsed={isCollapsed} onToggle={togglePin} />
      </div>
    </aside>
  );
}
