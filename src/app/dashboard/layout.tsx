"use client";

import React, { useState } from "react";
import NewMainSidebar from "@/components/layouts/NewMainSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import { useAppContext } from "@/context/AppContext";
import type { AppRole } from "@/lib/accessControl";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role: actualRole, loading } = useAppContext();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isDevMode = false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0D13]">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page flex min-h-screen bg-[#0B0D13] text-white">
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
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-6 lg:px-16">
          {children}
        </main>
      </div>

      {/* Dev toggle disabled */}
    </div>
  );
}