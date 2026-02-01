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
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { COURSES } from '@/lib/navigation-constants';

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
      { label: 'My Payslips', href: '/dashboard/people/payroll/my-payslips' },
    ],
  },
  {
    label: 'My Payslips',
    href: '/dashboard/people/payroll/my-payslips',
    icon: Wallet,
    roles: ['staff'],
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
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
            : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
        } ${isActive ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600 dark:before:bg-blue-400' : ''}`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 bg-blue-500 dark:bg-blue-500 text-white text-xs rounded-full">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <span className="text-gray-500 dark:text-white/50">
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
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-600 dark:before:bg-blue-400'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
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
  const userRole = profile?.app_role?.toLowerCase() || 'staff';

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.map(r => r.toLowerCase()).includes(userRole);
  });

  return (
    <aside className="w-64 bg-white dark:bg-[#0f1220] border-r border-gray-200 dark:border-white/[0.06] flex flex-col h-full" suppressHydrationWarning>
      {/* Header */}
      <div className="px-4 py-5 bg-neutral-900 border-b border-gray-200 dark:border-white/[0.06]">
        <Link href="/dashboard/people" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
          <img
            src="/module_logos/teamly.png"
            alt="Teamly"
            className="h-12 w-auto max-w-full"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 teamly-sidebar-scrollbar">
        {filteredItems.map((item) => (
          <TeamlyNavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* My Profile Quick Access */}
      <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
        <Link
          href={`/dashboard/people/${profile?.id}`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
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

