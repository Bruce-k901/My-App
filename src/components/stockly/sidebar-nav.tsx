'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ClipboardList,
  ShoppingCart,
  Building2,
  FileText,
  Truck,
  Receipt,
  ChefHat,
  Trash2,
  BarChart3,
  TrendingUp,
  PieChart,
  GitCompare,
  Coins,
  CreditCard,
  Tag,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Calendar,
  NotebookText,
  MapPin,
  DollarSign,
  Users,
  Store,
  Link as LinkIcon,
} from '@/components/ui/icons';
import { useState, useEffect } from 'react';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { SidebarPin } from '@/components/layout/SidebarPin';

type NavItemType = 'section' | 'link' | 'parent';

interface NavItem {
  type: NavItemType;
  label: string;
  icon: React.ElementType;
  href?: string; // Required for 'link' and 'parent'
  children?: { label: string; href: string; icon?: React.ElementType }[]; // Only for 'parent' type
}

// Define nav items as a constant
const navItems: NavItem[] = [
  {
    type: 'link',
    label: 'Dashboard',
    href: '/dashboard/stockly',
    icon: LayoutDashboard,
  },
  {
    type: 'section',
    label: 'INVENTORY',
    icon: Package,
  },
  {
    type: 'parent',
    label: 'Stock Items',
    href: '/dashboard/stockly/stock-items',
    icon: Package,
    children: [
      { label: 'Ingredients', href: '/dashboard/stockly/libraries/ingredients', icon: Package },
      { label: 'PPE', href: '/dashboard/stockly/libraries/ppe', icon: Package },
      { label: 'Chemicals', href: '/dashboard/stockly/libraries/chemicals', icon: Package },
      { label: 'Disposables', href: '/dashboard/stockly/libraries/disposables', icon: Package },
      { label: 'First Aid', href: '/dashboard/stockly/libraries/first-aid', icon: Package },
      { label: 'Packaging', href: '/dashboard/stockly/libraries/packaging', icon: Package },
    ],
  },
  {
    type: 'link',
    label: 'Storage Areas',
    href: '/dashboard/stockly/storage-areas',
    icon: Warehouse,
  },
  {
    type: 'link',
    label: 'Stock Counts',
    href: '/dashboard/stockly/stock-counts',
    icon: ClipboardList,
  },
  {
    type: 'section',
    label: 'PURCHASING',
    icon: ShoppingCart,
  },
  {
    type: 'link',
    label: 'Suppliers',
    href: '/dashboard/stockly/suppliers',
    icon: Building2,
  },
  {
    type: 'link',
    label: 'Orders',
    href: '/dashboard/stockly/orders',
    icon: FileText,
  },
  {
    type: 'link',
    label: 'Deliveries',
    href: '/dashboard/stockly/deliveries',
    icon: Truck,
  },
  {
    type: 'link',
    label: 'Credit Notes',
    href: '/dashboard/stockly/credit-notes',
    icon: Receipt,
  },
  {
    type: 'section',
    label: 'OPERATIONS',
    icon: ChefHat,
  },
  {
    type: 'link',
    label: 'Recipes',
    href: '/dashboard/stockly/recipes',
    icon: ChefHat,
  },
  {
    type: 'link',
    label: 'Waste Log',
    href: '/dashboard/stockly/waste',
    icon: Trash2,
  },
  {
    type: 'parent',
    label: 'REPORTS',
    href: '/dashboard/reports/stockly',
    icon: BarChart3,
    children: [
      { label: 'Sales', href: '/dashboard/stockly/sales', icon: TrendingUp },
      { label: 'Wastage', href: '/dashboard/reports/stockly/wastage', icon: Trash2 },
      { label: 'GP Analysis', href: '/dashboard/reports/stockly/gp', icon: PieChart },
      { label: 'Variance', href: '/dashboard/reports/stockly/variance', icon: GitCompare },
      { label: 'Stock Value', href: '/dashboard/reports/stockly/stock-value', icon: Coins },
      { label: 'Supplier Spend', href: '/dashboard/reports/stockly/supplier-spend', icon: CreditCard },
      { label: 'Dead Stock', href: '/dashboard/reports/stockly/dead-stock', icon: Package },
      { label: 'Prices', href: '/dashboard/reports/stockly/prices', icon: Tag },
    ],
  },
  {
    type: 'link',
    label: 'Settings',
    href: '/dashboard/stockly/settings',
    icon: Settings,
  },
];

export function StocklyNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState(false);

  // Only use toggle state for parent items, but hooks must be at top level
  const isParent = item.type === 'parent';
  const isParentActive = isParent && (pathname === item.href || (item.href && pathname.startsWith(item.href + '/')));
  const childActive = isParent && item.children?.some(
    child => pathname === child.href || pathname.startsWith(child.href + '/')
  );
  
  // Auto-expand on mount if active (but only if not manually toggled) - hooks at top level
  useEffect(() => {
    if (isParent && !manuallyToggled && (childActive || isParentActive)) {
      setIsOpen(true);
    }
  }, [isParent, childActive, isParentActive, manuallyToggled]);
  
  // Section headers are non-clickable
  if (item.type === 'section') {
    const IconComponent = item.icon;
    return (
      <div className="px-3 py-3 mt-4">
        <div className="flex items-center gap-2 text-sm uppercase text-stockly-dark/35 dark:text-stockly/35 tracking-wider font-bold">
          <IconComponent className="w-5 h-5" suppressHydrationWarning />
          <span suppressHydrationWarning>{item.label}</span>
        </div>
      </div>
    );
  }

  // Regular link items
  if (item.type === 'link') {
    // Dashboard should only be active on the exact dashboard route, not child routes
    const isActive = item.href === '/dashboard/stockly'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');
    
    const IconComponent = item.icon;
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-stockly-dark/[0.08] dark:bg-stockly/10 text-stockly-dark dark:text-stockly font-medium'
            : 'text-[#888] dark:text-white/50 hover:bg-stockly-dark/[0.04] dark:hover:bg-stockly/5 hover:text-[#555] dark:hover:text-white/80'
        }`}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
        <span className="flex-1" suppressHydrationWarning>{item.label}</span>
      </Link>
    );
  }

  // Parent items (REPORTS) - navigate AND toggle
  if (isParent) {
    // If manually toggled, respect isOpen state; otherwise auto-expand if active
    const shouldExpand = manuallyToggled 
      ? isOpen 
      : (isOpen || childActive || isParentActive);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const newIsOpen = !isOpen;
      setManuallyToggled(true);
      setIsOpen(newIsOpen);
      // Only navigate if expanding (not collapsing)
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
              ? 'bg-stockly-dark/[0.08] dark:bg-stockly/10 text-stockly-dark dark:text-stockly font-medium'
              : 'text-[#888] dark:text-white/50 hover:bg-stockly-dark/[0.04] dark:hover:bg-stockly/5 hover:text-[#555] dark:hover:text-white/80'
          }`}
        >
          <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
          <span className="flex-1" suppressHydrationWarning>{item.label}</span>
          <span className="text-[#999] dark:text-white/50">
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
              const isChildActive = pathname === child.href || (child.href && pathname.startsWith(child.href + '/'));
              const ChildIcon = child.icon || BarChart3;
              
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors relative ${
                    isChildActive
                      ? 'bg-stockly-dark/[0.08] dark:bg-stockly/10 text-stockly-dark dark:text-stockly font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-stockly-dark dark:before:bg-stockly'
                      : 'text-[#888] dark:text-white/50 hover:text-[#555] dark:hover:text-white/80 hover:bg-stockly-dark/[0.04] dark:hover:bg-stockly/5'
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

// App name constant - must be the same on server and client
const APP_NAME = 'Stockly';

export function StocklySidebar() {
  const { profile } = useAppContext();
  const { isCollapsed, showExpanded, isHoverExpanded, displayWidth, togglePin, handleMouseEnter, handleMouseLeave } = useSidebarMode();

  return (
    <aside
      className={`bg-sidebar-stockly-light dark:bg-sidebar-stockly border-r border-module-fg/[0.18] flex flex-col h-full transition-[width] duration-200 ${isHoverExpanded ? 'shadow-2xl z-50' : ''}`}
      style={{ width: displayWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      suppressHydrationWarning
    >
      {/* Header */}
      <div className={`${!showExpanded ? 'px-2 py-3' : 'px-4 py-5'} bg-sidebar-stockly-light dark:bg-sidebar-stockly border-b border-module-fg/[0.18]`}>
        <Link href="/dashboard/stockly" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img src="/new_module_logos/stockly_light.svg" alt="Stockly" className={`${!showExpanded ? 'h-8' : 'h-12'} w-auto max-w-full dark:hidden`} />
          <img src="/new_module_logos/stockly_dark.svg" alt="Stockly" className={`${!showExpanded ? 'h-8' : 'h-12'} w-auto max-w-full hidden dark:block`} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${!showExpanded ? 'p-2 space-y-1' : 'p-4 space-y-1'} stockly-sidebar-scrollbar`}>
        {!showExpanded ? (
          navItems
            .filter(item => item.type !== 'section')
            .map((item, index) => {
              const Icon = item.icon;
              const href = item.href || (item.children?.[0]?.href) || '#';
              return (
                <Link key={`${item.label}-${index}`} href={href} className="flex items-center justify-center w-full h-10 rounded-lg text-[#888] dark:text-white/50 hover:bg-stockly-dark/[0.04] dark:hover:bg-stockly/5 hover:text-[#555] dark:hover:text-white/80 transition-colors" title={item.label}>
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })
        ) : (
          navItems.map((item, index) => (
            <StocklyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
          ))
        )}
      </nav>

      {/* Profile + Pin */}
      <div className="border-t border-module-fg/[0.18]">
        {showExpanded ? (
          <div className="p-4 pb-0">
            <Link href={`/dashboard/people/${profile?.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] dark:text-white/50 hover:bg-stockly-dark/[0.04] dark:hover:bg-stockly/5 hover:text-[#555] dark:hover:text-white/80 transition-colors">
              <UserCircle className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[#1a1a1a] dark:text-white">{profile?.full_name || 'My Profile'}</p>
                <p className="truncate text-xs text-[#999] dark:text-white/50">{profile?.position_title || 'Employee'}</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Link href={`/dashboard/people/${profile?.id}`} title={profile?.full_name || 'My Profile'} className="text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors">
              <UserCircle className="w-5 h-5" />
            </Link>
          </div>
        )}
        <SidebarPin isCollapsed={isCollapsed} onToggle={togglePin} />
      </div>
    </aside>
  );
}

