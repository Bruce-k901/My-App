"use client";

import { useState } from "react";
import NewMainSidebar from "@/components/layouts/NewMainSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import AIAssistantWidget from "@/components/assistant/AIAssistantWidget";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="dashboard-page flex h-screen bg-[#0B0D13] text-white overflow-hidden">
      <NewMainSidebar 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 lg:ml-20 flex flex-col min-h-screen">
        <div className="sticky top-0 z-50 bg-[#0B0D13] ios-sticky-header">
          <DashboardHeader onMobileMenuClick={() => setIsMobileSidebarOpen(true)} />
        </div>
        <main className="flex-1 relative overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16 w-full" style={{ paddingTop: '80px', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', height: 'calc(100vh - 72px)', marginTop: '0' }}>
          {children}
        </main>
      </div>
      <AIAssistantWidget />
    </div>
  );
}

export default DashboardLayout;