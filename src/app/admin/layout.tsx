"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AdminFaviconSetter } from '@/components/admin/AdminFaviconSetter';
import { useTicketCount } from '@/hooks/tickets/useTicketCount';
import {
  Shield,
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  X,
  ArrowLeft,
  LifeBuoy
} from '@/components/ui/icons';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [viewingAsCompany, setViewingAsCompany] = useState<{ id: string; name: string } | null>(null);
  const { count: ticketCount } = useTicketCount();

  // Admin is always dark — force dark class on HTML element
  // (handles client-side navigation from dashboard which may be in light mode)
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsAdmin(true);
      return;
    }

    checkAdminAccess();
    
    // Check if we're viewing as another company
    if (typeof window !== 'undefined') {
      try {
        const storedCompany = sessionStorage.getItem('admin_viewing_as_company');
        if (storedCompany) {
          setViewingAsCompany(JSON.parse(storedCompany));
        }
      } catch (error) {
        console.error('Error reading sessionStorage:', error);
      }
    }
  }, [pathname]);

  async function checkAdminAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_platform_admin')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile?.is_platform_admin) {
        router.push('/admin/login');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/admin/login');
    }
  }

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_viewing_as_company');
    }
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const exitViewAs = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_viewing_as_company');
    }
    setViewingAsCompany(null);
    router.push('/admin/companies');
  };

  // Show loading while checking auth
  if (isAdmin === null && pathname !== '/admin/login') {
    return (
      <div className="h-screen bg-[#0B0D13] flex items-center justify-center">
        <div className="text-white/60">Verifying access...</div>
      </div>
    );
  }

  // Login page renders without layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/companies', icon: Building2, label: 'Companies' },
    { href: '/admin/users', icon: Users, label: 'All Users' },
    { href: '/admin/tasks', icon: ClipboardList, label: 'Task Analytics' },
    { href: '/admin/tickets', icon: LifeBuoy, label: 'Support Tickets' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <AdminFaviconSetter />
      <div className="h-screen bg-[#0B0D13] flex overflow-hidden">
      {/* Fixed Sidebar */}
      <aside className="w-64 bg-white/[0.03] border-r border-white/[0.06] flex flex-col flex-shrink-0">
        {/* Logo Header */}
        <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D37E91]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#D37E91]" />
            </div>
            <div>
              <div className="text-white font-semibold">Opsly Admin</div>
              <div className="text-white/40 text-xs">Platform Control</div>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isTicketsPage = item.href === '/admin/tickets';
            const showBadge = isTicketsPage && ticketCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#D37E91]/10 text-[#D37E91] border border-[#D37E91]/20'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#D37E91] text-white rounded-full min-w-[20px] text-center">
                    {ticketCount > 99 ? '99+' : ticketCount}
                  </span>
                )}
                {isActive && !showBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Fixed */}
        <div className="p-4 border-t border-white/[0.06] flex-shrink-0 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-white/[0.06] hover:text-white w-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-white/[0.06] hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Flex Column */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* View As Banner - Fixed at top */}
        {viewingAsCompany && (
          <div className="bg-orange-500/20 border-b border-orange-500/40 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-orange-400" />
              <span className="text-orange-200">
                <span className="font-semibold">Viewing as:</span> {viewingAsCompany.name}
              </span>
            </div>
            <button
              onClick={exitViewAs}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg text-orange-200 text-sm transition-colors"
            >
              <X className="w-4 h-4" />
              Exit View
            </button>
          </div>
        )}

        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8" key={pathname}>
            {children}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
