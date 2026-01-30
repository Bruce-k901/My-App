'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Truck,
  ClipboardList,
  Trash2,
  Menu,
} from 'lucide-react';

interface MobileNavItem {
  href?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}

interface StocklyMobileNavProps {
  onMoreClick?: () => void;
}

const mobileNavItems: MobileNavItem[] = [
  { href: '/dashboard/stockly', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/stockly/deliveries', icon: Truck, label: 'Deliveries' },
  { href: '/dashboard/stockly/stock-counts', icon: ClipboardList, label: 'Counts' },
  { href: '/dashboard/stockly/waste', icon: Trash2, label: 'Waste' },
  { icon: Menu, label: 'More' }, // No href - handled by onClick
];

export function StocklyMobileNav({ onMoreClick }: StocklyMobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 lg:hidden z-40">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item, index) => {
          const isActive = item.href 
            ? (pathname === item.href || 
               (item.href !== '/dashboard/stockly' && pathname.startsWith(item.href)))
            : false;

          // "More" button (no href)
          if (!item.href) {
            return (
              <button
                key={`more-${index}`}
                onClick={onMoreClick}
                className="flex flex-col items-center gap-1 py-3 px-4 text-neutral-500 hover:text-[#10B981] transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          }

          // Regular nav links
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-4 ${
                isActive ? 'text-[#10B981]' : 'text-neutral-500'
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


