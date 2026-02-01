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
import { SuppressConsoleWarnings } from "@/components/dev/SuppressConsoleWarnings";
import { ConditionalGlobalComponents } from "@/components/layout/ConditionalGlobalComponents";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opsly - Operations Platform',
    description: 'Complete operations platform for hospitality, retail, and manufacturing businesses',
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: "#10B981",
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
                  let theme = 'dark'; // default
                  
                  if (stored === 'light' || stored === 'dark') {
                    theme = stored;
                  } else {
                    // Check system preference if no stored preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = prefersDark ? 'dark' : 'light';
                  }
                  
                  // Apply theme immediately to prevent flash
                  const root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                    root.classList.remove('light');
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                  }
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Opsly" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png?v=3" />
        <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png?v=3" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=3" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
      </head>
      <body className={`bg-neutral-950 text-white font-sans ${poppins.variable}`} suppressHydrationWarning>
        <ErrorBoundaryWrapper>
          <ReactQueryProvider>
            <QueryProvider>
              <AppProvider>
                <SiteContextProvider>
                  <SuppressConsoleWarnings />
                  <PWAProvider />
                  <NotificationInitializer />
                  <RouteLogger />
                  {children}
                  <Footer />
                  <Toaster position="top-right" richColors />
                  
                  {/* Global components - only shown on dashboard pages */}
                  <ConditionalGlobalComponents />
                </SiteContextProvider>
              </AppProvider>
            </QueryProvider>
          </ReactQueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
