"use client";

import { ReactNode, useEffect } from "react";
import AuthLogoHeader from "./AuthLogoHeader";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  // Force dark mode on auth pages (login, signup, etc.) - light mode should only be available in dashboard
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    
    // Also prevent theme changes while on auth pages
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target === root && !target.classList.contains('dark')) {
            // If light class was added, remove it and add dark
            root.classList.remove('light');
            root.classList.add('dark');
          }
        }
      });
    });
    
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0d13]">
      <AuthLogoHeader />
      <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 sm:px-6 py-6 sm:py-8">{children}</div>
    </div>
  );
}
