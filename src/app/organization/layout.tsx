import React from "react";
import DashboardSidebar from "@/components/layouts/DashboardSidebar";
import DashboardHeader from "@/components/layouts/DashboardHeader";
import OrgSubHeader from "@/components/organization/OrgSubHeader";
import OrgPageTransition from "@/components/organization/OrgPageTransition";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-page flex min-h-screen bg-[#0B0D13] text-white">
      {/* Global sidebar */}
      <DashboardSidebar />
      {/* Main content area offset by sidebar */}
      <main className="flex-1 ml-20 overflow-y-auto px-10 py-6 md:px-16">
        {/* Global header */}
        <DashboardHeader />
        {/* Organization subheader (tabs) */}
        <div className="sticky top-0 z-10 bg-[#0b0f1a] py-4 px-6 border-b border-gray-800/40">
          <OrgSubHeader />
        </div>
        {/* Page content */}
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <OrgPageTransition>{children}</OrgPageTransition>
        </div>
      </main>
    </div>
  );
}