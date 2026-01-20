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
  DollarSign,
  Settings,
  Users,
  Tag,
  ChevronDown,
  ChevronRight,
  UserCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

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
    label: 'Tray Packing',
    href: '/dashboard/planly/tray-packing',
    icon: Package,
  },
  {
    type: 'link',
    label: 'Order Book',
    href: '/dashboard/planly/order-book',
    icon: NotebookText,
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
    type: 'link',
    label: 'Monthly Sales by Site',
    href: '/dashboard/planly/monthly-sales',
    icon: DollarSign,
  },
  {
    type: 'section',
    label: 'PRODUCTION SETUP',
    icon: Settings,
  },
  {
    type: 'link',
    label: 'Production Settings',
    href: '/dashboard/planly/settings',
    icon: Settings,
  },
  {
    type: 'link',
    label: 'Customers',
    href: '/dashboard/planly/customers',
    icon: Users,
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
        <div className="flex items-center gap-2 text-sm uppercase text-[#14B8A6] tracking-wider font-bold">
          <IconComponent className="w-5 h-5" suppressHydrationWarning />
          <span suppressHydrationWarning>{item.label}</span>
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
            ? 'bg-[#14B8A6]/20 text-[#14B8A6]'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
        }`}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
        <span className="flex-1" suppressHydrationWarning>{item.label}</span>
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
    return (
      <div>
        <Link
          href={item.href!}
          onClick={handleClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isParentActive || childActive
              ? 'bg-[#14B8A6]/20 text-[#14B8A6]'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
          <span className="flex-1" suppressHydrationWarning>{item.label}</span>
          <span className="text-neutral-500">
            {shouldExpand ? (
              <ChevronDown className="w-4 h-4" suppressHydrationWarning />
            ) : (
              <ChevronRight className="w-4 h-4" suppressHydrationWarning />
            )}
          </span>
        </Link>

        {shouldExpand && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children!.map((child) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
              const ChildIcon = child.icon || Package;
              
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    isChildActive
                      ? 'text-[#14B8A6]'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  <ChildIcon className="w-4 h-4" suppressHydrationWarning />
                  <span suppressHydrationWarning>{child.label}</span>
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

  return (
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full overflow-y-auto" suppressHydrationWarning>
      {/* Header */}
      <div className="p-4 bg-black dark:bg-neutral-900 border-b border-neutral-800">
        <Link href="/dashboard/planly" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14B8A6] to-teal-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white" suppressHydrationWarning>
            {APP_NAME}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 planly-sidebar-scrollbar">
        {navItems.map((item, index) => (
          <PlanlyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
        ))}
      </nav>

      {/* My Profile Quick Access */}
      <div className="p-4 border-t border-neutral-800">
        <Link
          href={`/dashboard/people/${profile?.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <UserCircle className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-white">{profile?.full_name || 'My Profile'}</p>
            <p className="truncate text-xs text-neutral-500">{profile?.position_title || 'Employee'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
