'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';

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
        setLoading(false);

        // Redirect to login if not authenticated (except on login page)
        if (!session && !pathname?.includes('/customer/login')) {
          router.push('/customer/login');
        }
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
      if (!session && !pathname?.includes('/customer/login')) {
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

  // Don't show navigation on login page
  const isLoginPage = pathname === '/customer/login';

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0B0D13] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0B0D13] flex flex-col">
      {/* Header */}
      <header className="bg-white/[0.03] border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo/Brand */}
            <Link href="/customer/dashboard" className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold text-white">Order Book</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/customer/dashboard"
                className={`text-sm transition-colors ${
                  pathname === '/customer/dashboard'
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/customer/orders"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/orders')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Orders
              </Link>
              <Link
                href="/customer/waste"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/waste')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Waste Tracking
              </Link>
              <Link
                href="/customer/messages"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/messages')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Messages
              </Link>
              <Link
                href="/customer/feedback"
                className={`text-sm transition-colors ${
                  pathname?.startsWith('/customer/feedback')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Feedback
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white/60 hover:text-white"
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
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/customer/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/orders')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Orders
              </Link>
              <Link
                href="/customer/waste"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/waste')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Waste Tracking
              </Link>
              <Link
                href="/customer/messages"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/messages')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Messages
              </Link>
              <Link
                href="/customer/feedback"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm transition-colors ${
                  pathname?.startsWith('/customer/feedback')
                    ? 'text-[#EC4899]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Feedback
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

