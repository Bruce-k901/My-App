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
      <main className="flex-1 lg:ml-20 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-6 lg:px-16">
        <DashboardHeader onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        {children}
      </main>

      {/* Dev toggle disabled */}
    </div>
  );
}