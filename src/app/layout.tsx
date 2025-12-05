import "./globals.css";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { AppProvider } from "@/context/AppContext";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import Footer from "@/components/layouts/Footer";
import RouteLogger from "@/components/RouteLogger";
import { Toaster } from "sonner";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { NotificationInitializer } from "@/components/notifications/NotificationInitializer";
import { SuppressConsoleWarnings } from "@/components/dev/SuppressConsoleWarnings";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Checkly",
  description: "Chaos into clarity for hospitality operations.",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Checkly",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
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
  // Suppress GoTrueClient spam in dev logs (server-side only)
  if (process.env.NODE_ENV === "development") {
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0]?.toString().includes("GoTrueClient")) return;
      originalLog(...args);
    };
  }

  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* Early suppression script - runs IMMEDIATELY before any resources load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // CRITICAL: This must run FIRST, before Next.js or React loads
              // Suppress preload warnings (harmless - resources are loaded when components render)
              (function() {
                'use strict';
                const originalWarn = console.warn.bind(console);
                const originalError = console.error.bind(console);
                
                function shouldSuppress(message) {
                  if (!message || typeof message !== 'string') return false;
                  const msg = message.toLowerCase();
                  // Catch all variations of preload warnings, including CSS files
                  // Match patterns like: "The resource <URL> was preloaded using link preload but not used"
                  return (
                    msg.includes('was preloaded using link preload but not used') ||
                    msg.includes('preloaded using link preload') ||
                    msg.includes('preload but not used') ||
                    msg.includes('checkly_logo_touching_blocks') ||
                    (msg.includes('resource') && msg.includes('preload') && msg.includes('not used')) ||
                    (msg.includes('preload') && (msg.includes('svg') || msg.includes('css') || msg.includes('media') || msg.includes('static') || msg.includes('_next'))) ||
                    (msg.includes('preload') && msg.includes('.css')) ||
                    (msg.includes('_next/static/css') && msg.includes('preload')) ||
                    (msg.includes('app/layout.css') || (msg.includes('app/dashboard') && msg.includes('.css')))
                  );
                }

                // Override console.warn - catch everything
                Object.defineProperty(console, 'warn', {
                  value: function(...args) {
                    const message = String(args[0] || '');
                    if (shouldSuppress(message)) {
                      return; // Suppress silently
                    }
                    originalWarn.apply(console, args);
                  },
                  writable: true,
                  configurable: true
                });

                // Override console.error - also catch errors
                Object.defineProperty(console, 'error', {
                  value: function(...args) {
                    const message = String(args[0] || '');
                    if (shouldSuppress(message)) {
                      return; // Suppress silently
                    }
                    originalError.apply(console, args);
                  },
                  writable: true,
                  configurable: true
                });

                // Also hook into window.onerror as a fallback
                const originalOnError = window.onerror;
                window.onerror = function(msg, source, lineno, colno, error) {
                  if (msg && shouldSuppress(String(msg))) {
                    return true; // Suppress
                  }
                  if (originalOnError) {
                    return originalOnError.call(window, msg, source, lineno, colno, error);
                  }
                  return false;
                };

                // Handle chunk load errors - auto-reload on deployment cache mismatch
                window.addEventListener('error', function(event) {
                  const target = event.target;
                  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    const src = target.src || target.href || '';
                    if (src.includes('/_next/static/') && event.message && (
                      event.message.includes('ChunkLoadError') ||
                      event.message.includes('Loading chunk') ||
                      event.message.includes('Failed to fetch dynamically imported module')
                    )) {
                      console.warn('Chunk load error detected, reloading page...');
                      // Only reload once per session to prevent loops
                      if (!sessionStorage.getItem('chunk-reload-attempted')) {
                        sessionStorage.setItem('chunk-reload-attempted', 'true');
                        setTimeout(() => {
                          window.location.reload();
                        }, 100);
                      }
                    }
                  }
                }, true);

                // Also catch unhandled promise rejections from chunk loading
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  if (reason && (
                    reason.message?.includes('ChunkLoadError') ||
                    reason.message?.includes('Loading chunk') ||
                    reason.message?.includes('Failed to fetch dynamically imported module') ||
                    reason.name === 'ChunkLoadError'
                  )) {
                    console.warn('Chunk load error in promise, reloading page...');
                    event.preventDefault();
                    if (!sessionStorage.getItem('chunk-reload-attempted')) {
                      sessionStorage.setItem('chunk-reload-attempted', 'true');
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    }
                  }
                });

                // Suppress PerformanceObserver warnings about CSS preload
                if (typeof PerformanceObserver !== 'undefined') {
                  try {
                    const perfObserver = new PerformanceObserver(function(list) {
                      // Suppress CSS preload warnings by not processing them
                      for (const entry of list.getEntries()) {
                        const name = entry.name.toLowerCase();
                        if (
                          name.includes('_next/static/css') ||
                          name.includes('app/layout.css') ||
                          name.includes('app/dashboard') && name.includes('.css') ||
                          name.includes('checkly_logo_touching_blocks') ||
                          (name.includes('_next/static/media') && name.includes('.svg'))
                        ) {
                          // Suppress by not logging
                          return;
                        }
                      }
                    });
                    if (perfObserver && typeof perfObserver.observe === 'function') {
                      perfObserver.observe({ entryTypes: ['resource'] });
                    }
                  } catch (e) {
                    // PerformanceObserver might not support all entry types
                  }
                }
              })();
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Checkly" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png?v=3" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png?v=3" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=3" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
      </head>
      <body className="bg-neutral-950 text-white font-sans" suppressHydrationWarning>
        <ErrorBoundaryWrapper>
          <ReactQueryProvider>
            <QueryProvider>
              <AppProvider>
                <SuppressConsoleWarnings />
                <PWAProvider />
                <NotificationInitializer />
                <RouteLogger />
                {children}
                <Footer />
                <Toaster position="top-right" richColors />
              </AppProvider>
            </QueryProvider>
          </ReactQueryProvider>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
