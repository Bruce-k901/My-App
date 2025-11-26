"use client";

import dynamic from "next/dynamic";
import EnhancedShiftHandover from "@/components/dashboard/EnhancedShiftHandover";

// Dynamically import WelcomeHeader with SSR disabled to prevent hydration issues
// The loading component must match the initial render structure exactly
const WelcomeHeader = dynamic(() => import("@/components/dashboard/WelcomeHeader"), {
  ssr: false,
  loading: () => (
    <div className="text-white">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Welcome</h1>
          <p className="text-white/60 text-xs sm:text-sm md:text-base">
            <span className="opacity-0 select-none pointer-events-none">Monday, 1 January 2025</span>
          </p>
        </div>
      </div>
    </div>
  ),
});
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import EmergencyBreakdowns from "@/components/dashboard/EmergencyBreakdowns";
import IncidentLog from "@/components/dashboard/IncidentLog";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import AssetOverview from "@/components/dashboard/AssetOverview";
import ComplianceMetricsWidget from "@/components/dashboard/ComplianceMetricsWidget";
import { useAppContext } from "@/context/AppContext";

export default function DashboardHomePage() {
  const { companyId, siteId, loading } = useAppContext();
  
  // Don't render MetricsGrid if companyId is not available
  const shouldShowMetricsGrid = !loading && companyId;

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col gap-4 sm:gap-6 text-white">
        <WelcomeHeader />
        {/* Enhanced Shift Handover - Moved to top */}
        <EnhancedShiftHandover />
        {/* Compliance Metrics Widget - Prominent placement */}
        <ComplianceMetricsWidget />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AssetOverview />
            <EmergencyBreakdowns />
            <IncidentLog />
          </div>
          <div className="space-y-6">
            <AlertsFeed />
          </div>
        </div>
        {shouldShowMetricsGrid && (
          <MetricsGrid tenantId={companyId} siteId={siteId} />
        )}
        {!loading && !companyId && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 w-full">
            <p className="text-white/60 text-center">
              Company setup required to view compliance summary. Please complete your company profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
