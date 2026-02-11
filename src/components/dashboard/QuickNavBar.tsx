'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Users,
  Factory,
  ShoppingCart,
  PackageCheck,
  Calendar,
  MessageSquare,
  type LucideIcon,
} from '@/components/ui/icons';
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
 * Module colours: checkly=teamly (blush), stockly=emerald, teamly=blue, planly=orange, msgly=teal
 */
const QUICK_NAV_ITEMS: QuickNavItem[] = [
  {
    id: 'todays_tasks',
    label: "Today's Tasks",
    href: '/dashboard/todays_tasks',
    module: 'checkly',
    icon: ClipboardCheck,
    iconColor: 'text-teamly',
    hoverBorder: 'hover:border-teamly',
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
    id: 'production_plan',
    label: 'Production Plan',
    href: '/dashboard/planly/production-plan',
    module: 'planly',
    icon: Factory,
    iconColor: 'text-orange-400',
    hoverBorder: 'hover:border-orange-400',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/dashboard/calendar',
    module: 'checkly',
    icon: Calendar,
    iconColor: 'text-teamly',
    hoverBorder: 'hover:border-teamly',
  },
  {
    id: 'messages',
    label: 'Messages',
    href: '/dashboard/messaging',
    module: 'msgly',
    icon: MessageSquare,
    iconColor: 'text-teal-400',
    hoverBorder: 'hover:border-teal-400',
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
      {/* Framed container matching chart widget style */}
      <div
        className={cn(
          'bg-white dark:bg-[#171B2D]',
          'border-2 border-module-fg/[0.12]',
          'rounded-xl',
          'p-4',
          'shadow-lg shadow-black/[0.03] dark:shadow-black/20'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'text-[9px] font-semibold uppercase tracking-[0.06em]',
              'px-1.5 py-0.5 rounded',
              'text-slate-600 dark:text-slate-400',
              'bg-slate-100 dark:bg-slate-800/50'
            )}
          >
            Actions
          </span>
          <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">
            Quick Access
          </span>
        </div>

        {/* Buttons Grid */}
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
                'flex items-center gap-2 px-3.5 py-2.5',
                'bg-slate-50 dark:bg-slate-900/50',
                'border-2 border-module-fg/[0.12]',
                'rounded-lg',
                'text-sm text-[rgb(var(--text-primary))] font-medium',
                'hover:bg-slate-100 dark:hover:bg-slate-800/50',
                'hover:border-module-fg/[0.25]',
                'hover:shadow-md',
                'transition-all duration-200',
                item.hoverBorder,
                isMobile && 'min-h-[48px] justify-center' // Touch-friendly on mobile
              )}
            >
              <item.icon className={cn('w-4 h-4 flex-shrink-0', item.iconColor)} strokeWidth={2.5} />
              <span className={cn(isMobile ? 'text-xs' : 'whitespace-nowrap')}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickNavBar;
