"use client";

import React from "react";
import NewMainSidebar from "@/components/layouts/NewMainSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import { useAppContext } from "@/context/AppContext";
import type { AppRole } from "@/lib/accessControl";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role: actualRole } = useAppContext();
  const isDevMode = false;

  return (
    <div className="dashboard-page flex min-h-screen bg-[#0B0D13] text-white">
      <NewMainSidebar />
      <main className="flex-1 ml-20 overflow-y-auto px-10 py-6 md:px-16">
        <DashboardHeader />
        {children}
      </main>

      {/* Dev toggle disabled */}
    </div>
  );
}