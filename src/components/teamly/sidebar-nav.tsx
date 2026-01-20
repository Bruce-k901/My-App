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
    roles: ['admin', 'owner', 'manager'],
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
        href: `/dashboard/courses/${course.slug}`,
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
  
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;
  
  // Auto-expand if a child is active
  const childActive = item.children?.some(
    child => pathname === child.href || pathname.startsWith(child.href + '/')
  );

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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive || childActive
            ? 'bg-[#EC4899]/20 text-[#EC4899]'
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
        }`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 bg-[#EC4899] text-white text-xs rounded-full">
            {item.badge}
          </span>
        )}
        {hasChildren && (
          <span className="text-neutral-500">
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
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === child.href
                  ? 'text-[#EC4899]'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {child.label}
            </Link>
          ))}
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
    <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full" suppressHydrationWarning>
      {/* Header */}
      <div className="p-4 bg-black dark:bg-neutral-900 border-b border-neutral-800">
        <Link href="/dashboard/people" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-blue-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white" suppressHydrationWarning>
            {APP_NAME}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 teamly-sidebar-scrollbar">
        {filteredItems.map((item) => (
          <TeamlyNavItem key={item.href} item={item} />
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

