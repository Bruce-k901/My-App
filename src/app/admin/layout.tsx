"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
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
  X
} from 'lucide-react';
import { AdminPWAMetadata } from '@/components/admin/AdminPWAMetadata';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [viewingAsCompany, setViewingAsCompany] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsAdmin(true); // Allow login page to render
      return;
    }

    checkAdminAccess();
    
    // Check if we're viewing as another company
    const storedCompany = sessionStorage.getItem('admin_viewing_as_company');
    if (storedCompany) {
      setViewingAsCompany(JSON.parse(storedCompany));
    }
  }, [pathname]);

  async function checkAdminAccess() {
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
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_viewing_as_company');
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const exitViewAs = () => {
    sessionStorage.removeItem('admin_viewing_as_company');
    setViewingAsCompany(null);
    router.push('/admin/companies');
  };

  // Show nothing while checking auth (except for login page)
  if (isAdmin === null && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-[#0B0D13] flex items-center justify-center">
        <div className="text-white/60">Verifying access...</div>
      </div>
    );
  }

  // Login page renders without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/companies', icon: Building2, label: 'Companies' },
    { href: '/admin/users', icon: Users, label: 'All Users' },
    { href: '/admin/tasks', icon: ClipboardList, label: 'Task Analytics' },
    { href: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      <AdminPWAMetadata />
      <div className="min-h-screen bg-[#0B0D13] flex">
        {/* Sidebar */}
      <aside className="w-64 bg-white/[0.03] border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EC4899]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#EC4899]" />
            </div>
            <div>
              <div className="text-white font-semibold">Checkly Admin</div>
              <div className="text-white/40 text-xs">Platform Control</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#EC4899]/10 text-[#EC4899] border border-[#EC4899]/20'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-white/[0.06] hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* View As Banner */}
        {viewingAsCompany && (
          <div className="bg-orange-500/20 border-b border-orange-500/40 px-6 py-3 flex items-center justify-between">
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

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
    </>
  );
}

