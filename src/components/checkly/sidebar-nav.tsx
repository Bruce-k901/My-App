'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  AlertTriangle,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  UserCircle,
  CheckCircle2,
  Clock,
  FileCode,
  ShieldCheck,
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
    label: 'Dashboard',
    href: '/dashboard/tasks',
    icon: LayoutDashboard,
  },
  {
    type: 'section',
    label: 'TASKS',
    icon: CheckSquare,
  },
  {
    type: 'link',
    label: "Today's Tasks",
    href: '/dashboard/todays_tasks',
    icon: Calendar,
  },
  {
    type: 'link',
    label: 'My Tasks',
    href: '/dashboard/tasks/my-tasks',
    icon: CheckCircle2,
  },
  {
    type: 'link',
    label: 'Completed',
    href: '/dashboard/tasks/completed',
    icon: CheckSquare,
  },
  {
    type: 'section',
    label: 'TEMPLATES',
    icon: FileCode,
  },
  {
    type: 'link',
    label: 'Compliance Templates',
    href: '/dashboard/tasks/compliance',
    icon: ShieldCheck,
  },
  {
    type: 'link',
    label: 'Custom Task Builder',
    href: '/dashboard/tasks/templates',
    icon: FileText,
  },
  {
    type: 'section',
    label: 'SOPS',
    icon: FileText,
  },
  {
    type: 'parent',
    label: 'SOPs',
    href: '/dashboard/sops/list',
    icon: FileText,
    children: [
      { label: 'My SOPs', href: '/dashboard/sops/list', icon: FileText },
      { label: 'Archived SOPs', href: '/dashboard/sops/archive', icon: FileText },
      { label: 'SOP Templates', href: '/dashboard/sops/templates', icon: FileCode },
      { label: 'COSHH Data', href: '/dashboard/sops/coshh', icon: ShieldCheck },
    ],
  },
  {
    type: 'section',
    label: 'RISK ASSESSMENTS',
    icon: ShieldCheck,
  },
  {
    type: 'parent',
    label: 'Risk Assessments',
    href: '/dashboard/risk-assessments',
    icon: ShieldCheck,
    children: [
      { label: 'My RAs', href: '/dashboard/risk-assessments', icon: ShieldCheck },
      { label: 'Archived RAs', href: '/dashboard/risk-assessments/archive', icon: ShieldCheck },
      { label: 'RA Templates', href: '/dashboard/sops/ra-templates', icon: FileCode },
    ],
  },
  {
    type: 'section',
    label: 'INCIDENTS',
    icon: AlertTriangle,
  },
  {
    type: 'parent',
    label: 'Incidents',
    href: '/dashboard/incidents',
    icon: AlertTriangle,
    children: [
      { label: 'All Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
      { label: 'Food Poisoning', href: '/dashboard/incidents/food-poisoning', icon: AlertTriangle },
      { label: 'Customer Complaints', href: '/dashboard/incidents/customer-complaints', icon: AlertTriangle },
      { label: 'Staff Sickness', href: '/dashboard/incidents/staff-sickness', icon: AlertTriangle },
      { label: 'Incident Log', href: '/dashboard/incidents/storage', icon: FileText },
    ],
  },
  {
    type: 'section',
    label: 'LOGS',
    icon: Clock,
  },
  {
    type: 'link',
    label: 'Temperature Logs',
    href: '/dashboard/logs/temperature',
    icon: Clock,
  },
];

export function ChecklyNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [manuallyToggled, setManuallyToggled] = useState(false);

  const isParent = item.type === 'parent';
  const isParentActive = isParent && (pathname === item.href || (item.href && pathname.startsWith(item.href + '/')));
  const childActive = isParent && item.children?.some(
    child => pathname === child.href || pathname.startsWith(child.href + '/')
  );
  
  // Auto-expand on mount if active (but only if not manually toggled)
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
        <div className="flex items-center gap-2 text-sm uppercase text-[#EC4899] dark:text-[#EC4899] tracking-wider font-bold">
          <IconComponent className="w-5 h-5" suppressHydrationWarning />
          <span suppressHydrationWarning>{item.label}</span>
        </div>
      </div>
    );
  }

  // Regular link items
  if (item.type === 'link') {
    // Dashboard should only be active on the exact dashboard route, not child routes
    const isActive = item.href === '/dashboard/tasks'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');
    
    const IconComponent = item.icon;
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-[#EC4899]/20 dark:bg-[#EC4899]/20 text-[#EC4899] dark:text-[#EC4899]'
            : 'text-[rgb(var(--text-secondary))] dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-neutral-800 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
        }`}
      >
        <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
        <span className="flex-1" suppressHydrationWarning>{item.label}</span>
      </Link>
    );
  }

  // Parent items (Incidents) - navigate AND toggle
  if (isParent) {
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
              ? 'bg-[#EC4899]/20 dark:bg-[#EC4899]/20 text-[#EC4899] dark:text-[#EC4899]'
              : 'text-[rgb(var(--text-secondary))] dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-neutral-800 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
          }`}
        >
          <IconComponent className="w-5 h-5 flex-shrink-0" suppressHydrationWarning />
          <span className="flex-1" suppressHydrationWarning>{item.label}</span>
          <span className="text-[rgb(var(--text-tertiary))] dark:text-neutral-500">
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
              const ChildIcon = child.icon || AlertTriangle;
              
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors relative ${
                    isChildActive
                      ? 'bg-[#EC4899]/20 dark:bg-[#EC4899]/20 text-[#EC4899] dark:text-[#EC4899] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#EC4899] dark:before:bg-[#EC4899]'
                      : 'text-[rgb(var(--text-tertiary))] dark:text-neutral-500 hover:text-[rgb(var(--text-primary))] dark:hover:text-white'
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
const APP_NAME = 'Checkly';

export function ChecklySidebar() {
  const { profile } = useAppContext();

  return (
    <aside className="w-64 bg-blue-50 dark:bg-neutral-900 border-r border-[rgb(var(--border))] dark:border-neutral-800 flex flex-col h-full" suppressHydrationWarning>
      {/* Header */}
      <div className="px-4 py-5 bg-black dark:bg-neutral-900 border-b border-[rgb(var(--border))] dark:border-neutral-800">
        <Link href="/dashboard/tasks" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img
            src="/assets/checkly_logo_touching_blocks.svg"
            alt="Checkly"
            className="h-12 w-auto max-w-full"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 checkly-sidebar-scrollbar">
        {navItems.map((item, index) => (
          <ChecklyNavItem key={`${item.type}-${item.label}-${index}`} item={item} />
        ))}
      </nav>

      {/* My Profile Quick Access */}
      <div className="p-4 border-t border-[rgb(var(--border))] dark:border-neutral-800">
        <Link
          href={`/dashboard/people/${profile?.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[rgb(var(--text-secondary))] dark:text-neutral-400 hover:bg-black/[0.03] dark:hover:bg-neutral-800 hover:text-[rgb(var(--text-primary))] dark:hover:text-white transition-colors"
        >
          <UserCircle className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[rgb(var(--text-primary))] dark:text-white">{profile?.full_name || 'My Profile'}</p>
            <p className="truncate text-xs text-[rgb(var(--text-tertiary))] dark:text-neutral-500">{profile?.position_title || 'Employee'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
