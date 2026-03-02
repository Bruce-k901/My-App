import "./globals.css";
import { ReactNode } from "react";
import { Poppins } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { AppProvider } from "@/context/AppContext";
import { SiteContextProvider } from "@/contexts/SiteContext";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import Footer from "@/components/layouts/Footer";
import RouteLogger from "@/components/RouteLogger";
import { Toaster } from "sonner";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { NotificationInitializer } from "@/components/notifications/NotificationInitializer";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { MessageAlertSubscriber } from "@/components/notifications/MessageAlertSubscriber";
import { TaskAlertSubscriber } from "@/components/notifications/TaskAlertSubscriber";
import { SuppressConsoleWarnings } from "@/components/dev/SuppressConsoleWarnings";
import { ConditionalGlobalComponents } from "@/components/layout/ConditionalGlobalComponents";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
  ),
  title: {
    default: 'Opsly - Operations Platform',
    template: '%s | Opsly'
  },
  description: 'Complete operations platform for hospitality, retail, and manufacturing. Manage compliance, inventory, people, and production in one place.',
  keywords: ['operations platform', 'hospitality software', 'compliance management', 'inventory management', 'HR software', 'production management'],
  applicationName: 'Opsly',
  authors: [{ name: 'Opsly' }],
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Opsly",
  },
  openGraph: {
    title: 'Opsly - Operations Platform',
    description: 'Complete operations platform for hospitality, retail, and manufacturing businesses',
    siteName: 'Opsly',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opsly - Operations Platform',
    description: 'Complete operations platform for hospitality, retail, and manufacturing businesses',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-touch-icon-167x167.png', sizes: '167x167' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152' },
    ],
  },
  other: {
    'msapplication-TileColor': '#110f0d',
    'msapplication-config': '/browserconfig.xml',
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#0b0d13",
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        {/* Critical: Apply theme BEFORE React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const currentPath = window.location.pathname;
                  
                  // Force dark mode on all non-dashboard pages (marketing, login, signup, etc.)
                  // Light mode should only be available once users land on the dashboard
                  const isDashboardPage = currentPath.startsWith('/dashboard') ||
                                         currentPath.startsWith('/api') ||
                                         currentPath.startsWith('/_next') ||
                                         currentPath.startsWith('/learn');
                  
                  if (!isDashboardPage) {
                    // Marketing/auth pages - always dark
                    const root = document.documentElement;
                    root.classList.add('dark');
                    root.classList.remove('light');
                    return;
                  }
                  
                  // For dashboard pages, get theme from localStorage or system preference
                  const stored = localStorage.getItem('theme');
                  let resolved = 'dark'; // default

                  if (stored === 'system') {
                    // System preference mode
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    resolved = prefersDark ? 'dark' : 'light';
                  } else if (stored === 'light' || stored === 'dark') {
                    resolved = stored;
                  } else {
                    // No stored preference — check system
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    resolved = prefersDark ? 'dark' : 'light';
                  }

                  // Apply theme immediately to prevent flash
                  const root = document.documentElement;
                  if (resolved === 'dark') {
                    root.classList.add('dark');
                    root.classList.remove('light');
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                  }

                  // Also apply other preferences from localStorage cache
                  try {
                    const prefs = JSON.parse(localStorage.getItem('opsly_user_preferences') || '{}');
                    if (prefs.density === 'compact') root.classList.add('compact');
                    if (prefs.font_size === 'small') root.classList.add('font-size-small');
                    if (prefs.font_size === 'large') root.classList.add('font-size-large');
                    if (prefs.reduce_animations) root.classList.add('reduce-motion');
                    else root.classList.add('reduce-motion-off');
                    if (prefs.high_contrast === 'high') root.classList.add('high-contrast');
                  } catch(e) {}
                } catch (e) {
                  // If localStorage is unavailable, default to dark
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              })();
            `,
          }}
        />
        {/* Early script to suppress preload warnings before any resources load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                // Store original console methods
                const originalWarn = console.warn.bind(console);
                const originalError = console.error.bind(console);
                const originalLog = console.log.bind(console);
                
                // Comprehensive pattern matching for preload warnings
                function shouldSuppress(message) {
                  if (!message || typeof message !== 'string') return false;
                  const msg = message.toLowerCase();
                  
                  return (
                    // Direct preload warning patterns
                    msg.includes('was preloaded using link preload but not used') ||
                    msg.includes('preloaded using link preload') ||
                    msg.includes('preload but not used') ||
                    (msg.includes('preload') && msg.includes('not used within a few seconds')) ||
                    // Resource preload patterns
                    (msg.includes('resource') && msg.includes('preload') && msg.includes('not used')) ||
                    (msg.includes('preload') && msg.includes('windows load event')) ||
                    // File type patterns
                    (msg.includes('preload') && (msg.includes('.css') || msg.includes('.svg') || msg.includes('.png') || msg.includes('.jpg') || msg.includes('.jpeg') || msg.includes('.webp'))) ||
                    // Next.js specific patterns
                    (msg.includes('preload') && (msg.includes('_next/static') || msg.includes('_next/static/css') || msg.includes('_next/static/media'))) ||
                    (msg.includes('preload') && (msg.includes('app/layout') || msg.includes('app/dashboard'))) ||
                    // Generic preload warnings
                    (msg.includes('preload') && msg.includes('appropriate') && msg.includes('as value'))
                  );
                }
                
                // Override console.warn
                Object.defineProperty(console, 'warn', {
                  value: function(...args) {
                    const message = String(args[0] || '');
                    if (shouldSuppress(message)) return;
                    originalWarn.apply(console, args);
                  },
                  writable: true,
                  configurable: true
                });
                
                // Override console.error
                Object.defineProperty(console, 'error', {
                  value: function(...args) {
                    const message = String(args[0] || '');
                    if (shouldSuppress(message)) return;
                    originalError.apply(console, args);
                  },
                  writable: true,
                  configurable: true
                });
                
                // Override console.log (sometimes preload warnings come through here)
                Object.defineProperty(console, 'log', {
                  value: function(...args) {
                    const message = String(args[0] || '');
                    if (shouldSuppress(message)) return;
                    originalLog.apply(console, args);
                  },
                  writable: true,
                  configurable: true
                });
                
                // Intercept Performance API entries early
                if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
                  try {
                    const observer = new PerformanceObserver(function(list) {
                      // Suppress preload-related performance entries
                      for (const entry of list.getEntries()) {
                        const entryName = (entry.name || '').toLowerCase();
                        const entryType = entry.initiatorType || '';
                        
                        // Check if this is a preload entry that might trigger warnings
                        if (
                          entryType === 'link' ||
                          entryName.includes('_next/static') ||
                          entryName.includes('.css') ||
                          entryName.includes('.svg') ||
                          entryName.includes('.png') ||
                          entryName.includes('.jpg') ||
                          entryName.includes('.jpeg') ||
                          entryName.includes('.webp')
                        ) {
                          // Mark as processed to prevent warnings
                          // This doesn't prevent the warning but helps identify the source
                        }
                      }
                    });
                    
                    // Observe resource timing entries
                    try {
                      observer.observe({ entryTypes: ['resource', 'navigation'] });
                    } catch (e) {
                      // Some browsers may not support all entry types
                    }
                  } catch (e) {
                    // PerformanceObserver may not be available
                  }
                }
                
                // Fallback: window.onerror
                const originalOnError = window.onerror;
                window.onerror = function(msg, source, lineno, colno, error) {
                  if (msg && shouldSuppress(String(msg))) return true;
                  if (originalOnError) return originalOnError.call(window, msg, source, lineno, colno, error);
                  return false;
                };
              })();
            `,
          }}
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0b0d13" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Opsly" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={`bg-[#F5F5F2] dark:bg-neutral-950 text-theme-primary font-sans ${poppins.variable}`} suppressHydrationWarning>
        <ErrorBoundaryWrapper>
          <ReactQueryProvider>
            <QueryProvider>
              <AppProvider>
                <UserPreferencesProvider>
                <SiteContextProvider>
                  <SuppressConsoleWarnings />
                  <PWAProvider />
                  <NotificationInitializer />
                  <OfflineIndicator />
                  <MessageAlertSubscriber />
                  <TaskAlertSubscriber />
                  <RouteLogger />
                  {children}
                  <Footer />
                  <Toaster position="top-right" richColors offset={{ top: 'env(safe-area-inset-top, 0px)', right: 8 }} />
                  <SpeedInsights />
                  
                  {/* Global components - only shown on dashboard pages */}
                  <ConditionalGlobalComponents />
                </SiteContextProvider>
                </UserPreferencesProvider>
              </AppProvider>
            </QueryProvider>
          </ReactQueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
