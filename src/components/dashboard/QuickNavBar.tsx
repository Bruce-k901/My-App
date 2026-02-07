'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  ClipboardList,
  Users,
  Factory,
  ShoppingCart,
  PackageCheck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEnabledModules } from '@/hooks/dashboard';
import { useIsMobile } from '@/hooks/useIsMobile';

type ModuleId = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';

interface QuickNavItem {
  id: string;
  label: string;
  href: string;
  module: ModuleId;
  icon: LucideIcon;
  // Using the new module colour system
  iconColor: string;
  hoverBorder: string;
}

/**
 * Quick navigation items configuration
 * Module colours: checkly=fuchsia, stockly=emerald, teamly=blue, planly=orange
 */
const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    id: 'opening_checks',
    label: 'Opening Checks',
    href: '/dashboard/todays_tasks?type=opening',
    module: 'checkly',
    icon: ClipboardCheck,
    iconColor: 'text-fuchsia-400',
    hoverBorder: 'hover:border-fuchsia-400',
  },
  {
    id: 'closing_checks',
    label: 'Closing Checks',
    href: '/dashboard/todays_tasks?type=closing',
    module: 'checkly',
    icon: ClipboardList,
    iconColor: 'text-fuchsia-400',
    hoverBorder: 'hover:border-fuchsia-400',
  },
  {
    id: 'todays_rota',
    label: "Today's Rota",
    href: '/dashboard/people/schedule',
    module: 'teamly',
    icon: Users,
    iconColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-400',
  },
  {
    id: 'production_tasks',
    label: 'Production Tasks',
    href: '/dashboard/planly/production-plan',
    module: 'planly',
    icon: Factory,
    iconColor: 'text-orange-400',
    hoverBorder: 'hover:border-orange-400',
  },
  {
    id: 'place_orders',
    label: 'Place Orders',
    href: '/dashboard/stockly/orders/new',
    module: 'stockly',
    icon: ShoppingCart,
    iconColor: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-400',
  },
  {
    id: 'receipt_orders',
    label: 'Receipt Orders',
    href: '/dashboard/stockly/deliveries',
    module: 'stockly',
    icon: PackageCheck,
    iconColor: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-400',
  },
];

export function QuickNavBar() {
  const { enabledModules, loading } = useEnabledModules();
  const { isMobile } = useIsMobile();

  // Filter items by enabled modules
  const filteredItems = useMemo(() => {
    return QUICK_NAV_ITEMS.filter((item) => enabledModules.includes(item.module));
  }, [enabledModules]);

  if (loading || filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-2">
        Quick Actions
      </div>
      <div
        className={cn(
          'gap-2',
          isMobile
            ? 'grid grid-cols-2' // 2 columns on mobile for touch-friendly buttons
            : 'flex flex-wrap' // Horizontal row on desktop
        )}
      >
        {filteredItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2',
              'bg-white/[0.03] border border-white/[0.06] rounded-lg',
              'text-sm text-white/60 font-medium',
              'hover:bg-white/[0.06] transition-all duration-150',
              item.hoverBorder,
              isMobile && 'min-h-[44px] justify-center' // Touch-friendly on mobile
            )}
          >
            <item.icon className={cn('w-4 h-4 flex-shrink-0', item.iconColor)} />
            <span className={cn(isMobile ? 'text-xs' : 'whitespace-nowrap')}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default QuickNavBar;
