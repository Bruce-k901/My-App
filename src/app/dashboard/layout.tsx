"use client";

import React, { useState, useEffect } from "react";
import NewMainSidebar from "@/components/layouts/NewMainSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import AIAssistantWidget from "@/components/assistant/AIAssistantWidget";
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

  // CRITICAL FIX: Render consistent structure to prevent hydration mismatches
  // Use exact same className strings that won't change between server and client
  // IMPORTANT: Use h-full (not min-h-screen) to constrain height for proper scrolling
  const LAYOUT_CONTAINER_CLASS = "flex-1 lg:ml-20 flex flex-col h-full min-w-0";
  const LAYOUT_HEADER_CLASS = "sticky top-0 z-50 bg-[#0B0D13] ios-sticky-header";
  // Header is 72px tall and sticky - use a spacer div to ensure content starts below header
  // This is more reliable than padding-top and works consistently across all pages
  const LAYOUT_MAIN_CLASS = "flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-6 lg:px-16 relative w-full";
  
  return (
    <div 
      className="dashboard-page flex h-screen bg-[#0B0D13] text-white overflow-hidden"
    >
      <NewMainSidebar 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div 
        className={LAYOUT_CONTAINER_CLASS}
        suppressHydrationWarning
      >
        {/* Fixed Header - Always anchored to top */}
        <div 
          className={LAYOUT_HEADER_CLASS}
        >
          <DashboardHeader onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>
        {/* Scrollable Content - Only this area scrolls */}
        <main 
          className={LAYOUT_MAIN_CLASS}
        >
          {/* Spacer div to ensure ALL content starts below the 72px sticky header */}
          {/* This is more reliable than padding-top and works for all pages */}
          <div className="h-[72px] w-full flex-shrink-0" aria-hidden="true" />
          {/* Always render children - never conditionally render different structures */}
          {/* Don't block rendering with loading overlay - let pages handle their own loading states */}
          {children}
        </main>
      </div>
      {/* AI Assistant Widget */}
      <AIAssistantWidget />
    </div>
  );
}