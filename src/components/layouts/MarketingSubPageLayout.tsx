"use client";
import React, { useEffect } from "react";
import MarketingHeader from "./MarketingHeader";

export default function MarketingSubPageLayout({ children }: { children: React.ReactNode }) {
  // Force dark mode on marketing pages - light mode should only be available in dashboard
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    
    // Also prevent theme changes while on marketing pages
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
    <div className="marketing-page min-h-screen flex flex-col bg-transparent text-theme-primary">
      <MarketingHeader />
      <main className="flex-1 bg-transparent">{children}</main>
    </div>
  );
}
