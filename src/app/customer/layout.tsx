'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { LogOut, Menu, X, ArrowLeft, ChevronDown } from '@/components/ui/icons';

interface CustomerOption {
  id: string;
  business_name: string;
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthenticated(!!session);

        if (!session && !pathname?.includes('/customer/login')) {
          router.push('/customer/login');
          setLoading(false);
          return;
        }

        if (session) {
          // Check if user is a platform admin or app owner
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_platform_admin, app_role')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          const isAdmin = profile?.is_platform_admin || profile?.app_role === 'Owner';

          if (isAdmin) {
            setIsAdminPreview(true);
            // Set flag immediately so child pages know not to redirect to login
            sessionStorage.setItem('admin_preview_mode', 'true');

            // Load all customers from planly
            try {
              const res = await fetch('/api/planly/customers?isActive=true');
              const json = await res.json();
              const rawList = json.data || json || [];
              const customerList = rawList.map((c: any) => ({
                id: c.id,
                business_name: c.name || c.business_name,
              }));

              if (customerList.length > 0) {
                setCustomers(customerList);

                // Restore previously selected customer or default to first
                const stored = sessionStorage.getItem('admin_preview_customer_id');
                if (stored && customerList.some((c: CustomerOption) => c.id === stored)) {
                  setSelectedCustomerId(stored);
                } else {
                  setSelectedCustomerId(customerList[0].id);
                  sessionStorage.setItem('admin_preview_customer_id', customerList[0].id);
                }
              }
            } catch (err) {
              console.error('Error loading customer list:', err);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      // Don't redirect admins in preview mode
      const inAdminPreview = sessionStorage.getItem('admin_preview_mode') === 'true';
      if (!session && !inAdminPreview && !pathname?.includes('/customer/login')) {
        router.push('/customer/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname, mounted]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/customer/login');
  };

  const handleBackToApp = () => {
    sessionStorage.removeItem('admin_preview_customer_id');
    sessionStorage.removeItem('admin_preview_mode');
    router.push('/dashboard/planly');
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    sessionStorage.setItem('admin_preview_customer_id', customerId);
    // Reload the page so all data re-fetches with the new customer
    window.location.reload();
  };

  // Don't show navigation on login page
  const isLoginPage = pathname === '/customer/login';

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0B0D13] flex items-center justify-center">
        <div className="text-theme-tertiary">Loading...</div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0B0D13] flex flex-col">
      {/* Admin Preview Bar */}
      {isAdminPreview && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-orange-400 text-xs font-medium shrink-0">PREVIEW MODE</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="bg-white/[0.05] border border-orange-500/30 rounded-lg px-3 py-1.5 text-sm text-theme-primary min-w-0 max-w-[280px] focus:outline-none focus:border-orange-500/60"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#1a1a2e] text-white">
                    {c.business_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBackToApp}
              className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-xs font-medium shrink-0 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Planly
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/[0.03] border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo/Brand */}
            <Link href="/customer/dashboard" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-theme-primary">Order Book</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/customer/dashboard"
                className={`text-sm transition-colors ${
                  pathname === '/customer/dashboard'
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/customer/orders"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/orders')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Orders
              </Link>
              <Link
                href="/customer/waste"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/waste')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Waste Tracking
              </Link>
              <Link
                href="/customer/messages"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/messages')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Messages
              </Link>
              <Link
                href="/customer/feedback"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/feedback')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Feedback
              </Link>
              {!isAdminPreview && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm text-theme-tertiary hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-theme-tertiary hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

            {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-white/[0.03]">
            <nav className="px-4 py-4 space-y-3">
              <Link
                href="/customer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname === '/customer/dashboard'
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/customer/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/orders')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Orders
              </Link>
              <Link
                href="/customer/waste"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/waste')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Waste Tracking
              </Link>
              <Link
                href="/customer/messages"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/messages')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Messages
              </Link>
              <Link
                href="/customer/feedback"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/feedback')
                    ? 'text-[#D37E91]'
                    : 'text-theme-tertiary hover:text-white'
                }`}
              >
                Feedback
              </Link>
              {!isAdminPreview ? (
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full py-2 text-sm text-theme-tertiary hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleBackToApp();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full py-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Planly
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
