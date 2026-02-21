'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Clock,
  GraduationCap,
  ClipboardCheck,
  Target,
  Wallet,
  Briefcase,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  Calendar,
  UserCircle,
  Building2,
} from '@/components/ui/icons';
import { useState, useEffect, useMemo } from 'react';
import { COURSES } from '@/lib/navigation-constants';
import { useSidebarMode } from '@/hooks/useSidebarMode';
import { SidebarPin } from '@/components/layout/SidebarPin';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
  roles?: string[];
  badge?: number;
}

// Define nav items as a constant to ensure server/client consistency
const navItems: NavItem[] = [
  {
    label: 'People Dashboard', // Fixed label - do not change without clearing build cache
    href: '/dashboard/people',
    icon: LayoutDashboard,
  },
  {
    label: 'Employees',
    href: '/dashboard/people/employees',
    icon: Users,
    roles: ['admin', 'owner', 'manager'],
    children: [
      { label: 'All Employees', href: '/dashboard/people/employees' },
      { label: 'Add Employee', href: '/dashboard/people/directory/new' },
      { label: 'Org Chart', href: '/dashboard/people/employees/org-chart' },
    ],
  },
  {
    label: 'My Profile',
    href: '/dashboard/people/employees',
    icon: UserCircle,
    roles: ['staff'],
    children: [
      { label: 'View Profile', href: '/dashboard/people/employees' },
    ],
  },
  {
    label: 'Leave',
    href: '/dashboard/people/leave',
    icon: CalendarDays,
    children: [
      { label: 'Overview', href: '/dashboard/people/leave' },
      { label: 'Request Leave', href: '/dashboard/people/leave/request' },
      { label: 'Team Calendar', href: '/dashboard/people/leave/calendar' },
      { label: 'Balances', href: '/dashboard/people/leave/balances' },
    ],
  },
  {
    label: 'Schedule',
    href: '/dashboard/people/schedule',
    icon: Calendar,
    children: [
      { label: 'Rota', href: '/dashboard/people/schedule' },
      { label: 'My Availability', href: '/dashboard/people/schedule/availability' },
    ],
  },
  {
    label: 'Attendance',
    href: '/dashboard/people/attendance',
    icon: Clock,
    children: [
      { label: 'Time Clock', href: '/dashboard/people/attendance' },
      { label: 'Timesheets', href: '/dashboard/people/attendance/signoff' },
    ],
  },
  {
    label: 'Training',
    href: '/dashboard/people/training',
    icon: GraduationCap,
    children: [
      { label: 'Overview', href: '/dashboard/people/training' },
      { label: 'Compliance Matrix', href: '/dashboard/people/training/matrix' },
      { label: 'Record Training', href: '/dashboard/people/training/record' },
    ],
  },
  {
    label: 'Courses',
    href: '/dashboard/courses',
    icon: GraduationCap,
    children: [
      { label: 'All Courses', href: '/dashboard/courses' },
      ...COURSES.map(course => ({
        label: course.title,
        href: course.href,
      })),
    ],
  },
  {
    label: 'Onboarding',
    href: '/dashboard/people/onboarding',
    icon: UserPlus,
    roles: ['admin', 'owner', 'manager'],
    children: [
      { label: 'People to Onboard', href: '/dashboard/people/onboarding' },
      { label: 'Company Docs', href: '/dashboard/people/onboarding/company-docs' },
      { label: 'Packs', href: '/dashboard/people/onboarding/packs' },
      { label: 'My Docs', href: '/dashboard/people/onboarding/my-docs' },
    ],
  },
  {
    label: 'Reviews & Appraisals',
    href: '/dashboard/people/reviews',
    icon: Target,
    children: [
      { label: 'Overview', href: '/dashboard/people/reviews' },
      { label: 'My Reviews', href: '/dashboard/people/reviews/my-reviews' },
      { label: 'Team Reviews', href: '/dashboard/people/reviews/team' },
      { label: 'Templates', href: '/dashboard/people/reviews/templates' },
      { label: 'Schedule Review', href: '/dashboard/people/reviews/schedule' },
      { label: 'Employee Files', href: '/dashboard/people/reviews/files' },
    ],
  },
  {
    label: 'Payroll',
    href: '/dashboard/people/payroll',
    icon: Wallet,
    roles: ['admin', 'owner'],
    children: [
      { label: 'Pay Runs', href: '/dashboard/people/payroll' },
      { label: 'Pay Rates', href: '/dashboard/people/payroll/rates' },
    ],
  },
  {
    label: 'Recruitment',
    href: '/dashboard/people/recruitment',
    icon: Briefcase,
    roles: ['admin', 'owner', 'manager'],
    children: [
      { label: 'Jobs', href: '/dashboard/people/recruitment' },
      { label: 'Candidates', href: '/dashboard/people/recruitment/candidates' },
      { label: 'Post Job', href: '/dashboard/people/recruitment/jobs/new' },
    ],
  },
  {
    label: 'Settings',
    href: '/dashboard/people/settings',
    icon: Settings,
    roles: ['admin', 'owner'],
    children: [
      { label: 'General', href: '/dashboard/people/settings' },
      { label: 'Sites', href: '/dashboard/people/settings/sites' },
      { label: 'Departments', href: '/dashboard/people/settings/departments' },
      { label: 'Areas & Regions', href: '/dashboard/people/settings/areas' },
      { label: 'Approval Workflows', href: '/dashboard/people/settings/approvals' },
      { label: 'Roles & Permissions', href: '/dashboard/people/settings/roles' },
      { label: 'Shift Rules', href: '/dashboard/people/settings/shift-rules' },
      { label: 'Notifications', href: '/dashboard/people/settings/notifications' },
    ],
  },
];

export function TeamlyNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  const hasChildren = item.children && item.children.length > 0;
  
  // Check if a child is active (exact match or starts with child href + '/')
  const childActive = item.children?.some(
    child => pathname === child.href || (child.href && pathname.startsWith(child.href + '/'))
  );
  
  // CRITICAL: Only highlight parent if it's the exact current page AND no child is active
  // For items without children, highlight ONLY on exact match
  // Also check that pathname doesn't start with item.href + '/' to prevent parent highlighting when on child routes
  const isActive = hasChildren 
    ? (pathname === item.href && !childActive)
    : (pathname === item.href && !pathname.startsWith(item.href + '/'))

  return (
    <div>
      <Link
        href={hasChildren ? '#' : item.href}
        onClick={(e) => {
          if (hasChildren) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
          isActive
            ? 'bg-teamly-dark/[0.08] dark:bg-teamly/10 text-teamly-dark dark:text-teamly font-medium'
            : 'text-[#888] dark:text-theme-tertiary hover:text-[#555] dark:hover:text-theme-secondary hover:bg-teamly-dark/[0.04] dark:hover:bg-teamly/5'
        } ${isActive ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-teamly-dark dark:before:bg-teamly' : ''}`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 bg-teamly dark:bg-teamly text-white text-xs rounded-full">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <span className="text-theme-tertiary">
            {isOpen || childActive ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
      </Link>
      
      {hasChildren && (isOpen || childActive) && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children!.map((child) => {
            // Check if any child has an exact match first
            const hasExactMatch = item.children!.some(c => pathname === c.href);
            
            let isChildActive: boolean;
            
            if (hasExactMatch) {
              // If there's an exact match, only that child should be active
              isChildActive = pathname === child.href;
            } else {
              // No exact match, check for startsWith matches
              const exactMatch = pathname === child.href;
              const startsWithMatch = child.href && pathname.startsWith(child.href + '/');
              
              // Check if any other child is a more specific match
              const hasMoreSpecificMatch = item.children!.some(otherChild => {
                if (otherChild.href === child.href) return false;
                const otherStartsWith = pathname.startsWith(otherChild.href + '/');
                return otherStartsWith && otherChild.href.length > child.href.length;
              });
              
              isChildActive = exactMatch || (startsWithMatch && !hasMoreSpecificMatch);
            }
            
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block px-3 py-1.5 rounded text-sm transition-colors relative ${
                  isChildActive
                    ? 'bg-teamly-dark/[0.08] dark:bg-teamly/10 text-teamly-dark dark:text-teamly font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-teamly-dark dark:before:bg-teamly'
                    : 'text-[#888] dark:text-theme-tertiary hover:text-[#555] dark:hover:text-theme-secondary hover:bg-teamly-dark/[0.04] dark:hover:bg-teamly/5'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// App name constant - must be the same on server and client
const APP_NAME = 'Teamly';

export function TeamlySidebar() {
  const { profile } = useAppContext();
  const { isCollapsed, showExpanded, isHoverExpanded, displayWidth, canPin, togglePin, handleMouseEnter, handleMouseLeave } = useSidebarMode();
  const userRole = profile?.app_role?.toLowerCase() || 'staff';

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.map(r => r.toLowerCase()).includes(userRole);
  });

  return (
    <aside
      className={`bg-sidebar-teamly-light dark:bg-sidebar-teamly border-r border-module-fg/[0.18] flex flex-col h-full transition-[width] duration-200 ${isHoverExpanded ? 'shadow-2xl z-50' : ''}`}
      style={{ width: displayWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      suppressHydrationWarning
    >
      {/* Header */}
      <div className={`${!showExpanded ? 'px-2 py-3' : 'px-4 py-5'} bg-sidebar-teamly-light dark:bg-sidebar-teamly border-b border-module-fg/[0.18]`}>
        <Link href="/dashboard/people" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img src="/new_module_logos/teamly_light.svg" alt="Teamly" className={`${!showExpanded ? 'h-8' : 'h-[4.5rem]'} w-auto max-w-full dark:hidden`} />
          <img src="/new_module_logos/teamly_dark.svg" alt="Teamly" className={`${!showExpanded ? 'h-8' : 'h-[4.5rem]'} w-auto max-w-full hidden dark:block`} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${!showExpanded ? 'p-2 space-y-1' : 'p-4 space-y-1'} teamly-sidebar-scrollbar`}>
        {!showExpanded ? (
          filteredItems.map((item, index) => {
            const Icon = item.icon;
            const href = item.href || (item.children?.[0]?.href) || '#';
            return (
              <Link
                key={`${item.label}-${index}`}
                href={href}
                className="flex items-center justify-center w-full h-10 rounded-lg text-[#888] dark:text-theme-tertiary hover:bg-teamly-dark/[0.04] dark:hover:bg-teamly/5 hover:text-[#555] dark:hover:text-theme-secondary transition-colors"
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })
        ) : (
          filteredItems.map((item) => (
            <TeamlyNavItem key={item.href} item={item} />
          ))
        )}
      </nav>

      {/* Profile + Pin */}
      <div className="border-t border-module-fg/[0.18]">
        {showExpanded ? (
          <div className="p-4 pb-0">
            <Link
              href={`/dashboard/people/${profile?.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] dark:text-theme-tertiary hover:text-[#555] dark:hover:text-theme-secondary hover:bg-teamly-dark/[0.04] dark:hover:bg-teamly/5 transition-colors"
            >
              <UserCircle className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[#1a1a1a] dark:text-white">{profile?.full_name || 'My Profile'}</p>
                <p className="truncate text-xs text-theme-tertiary">{profile?.position_title || 'Employee'}</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <Link href={`/dashboard/people/${profile?.id}`} title={profile?.full_name || 'My Profile'} className="text-theme-secondary hover:text-theme-primary transition-colors">
              <UserCircle className="w-5 h-5" />
            </Link>
          </div>
        )}
        {canPin && <SidebarPin isCollapsed={isCollapsed} onToggle={togglePin} />}
      </div>
    </aside>
  );
}

