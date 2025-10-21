"use client";

import React from "react";
import DashboardSidebar from "@/components/layouts/DashboardSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import DashboardProvider from "@/components/providers/DashboardProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-page flex min-h-screen bg-[#0B0D13] text-white">
      <DashboardSidebar />
      <main className="flex-1 ml-20 overflow-y-auto px-10 py-6 md:px-16">
        {/* Header */}
        <DashboardHeader />
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </main>
    </div>
  );
}