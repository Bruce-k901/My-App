"use client";

import React, { useState, useEffect } from "react";
import NewMainSidebar from "@/components/layouts/NewMainSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import { useAppContext } from "@/context/AppContext";
import type { AppRole } from "@/lib/accessControl";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role: actualRole, loading } = useAppContext();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isDevMode = false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // CRITICAL FIX: Always render the EXACT same structure on server and client
  // Never conditionally render different top-level structures
  // The structure below is ALWAYS rendered, regardless of loading state
  // This ensures server HTML matches client HTML exactly during hydration
  
  return (
    <div 
      className="dashboard-page flex min-h-screen bg-[#0B0D13] text-white"
      suppressHydrationWarning
    >
      <NewMainSidebar 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 lg:ml-20 flex flex-col min-h-screen">
        {/* Sticky Header - iOS Safari compatible */}
        <div className="sticky top-0 z-50 bg-[#0B0D13] ios-sticky-header">
          <DashboardHeader onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>
        {/* Scrollable Content */}
        <main 
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-6 lg:px-16 relative"
          suppressHydrationWarning
        >
          {/* Always render children - never conditionally render different structures */}
          {children}
          {/* Loading overlay only appears after client-side mount (isMounted=true) */}
          {/* This prevents hydration mismatch because isMounted is false during SSR */}
          {/* Use suppressHydrationWarning since this content intentionally differs between SSR and client */}
          {isMounted && loading && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-[#0B0D13]/80 z-50"
              suppressHydrationWarning
            >
              <div className="text-white">Loading dashboard...</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}