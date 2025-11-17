import "./globals.css";
import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import QueryProvider from "@/components/providers/QueryProvider";
import { AppProvider } from "@/context/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  manifest: "/manifest.json",
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
    <html lang="en" className={manrope.variable}>
      <head>
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Suppress CSS preload warnings in development (harmless HMR artifacts)
                (function() {
                  const originalWarn = console.warn;
                  console.warn = function(...args) {
                    const message = args[0]?.toString() || '';
                    if (message.includes('was preloaded using link preload but not used')) {
                      return;
                    }
                    originalWarn.apply(console, args);
                  };
                })();
              `,
            }}
          />
        )}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
      <body className="bg-neutral-950 text-white font-sans">
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
