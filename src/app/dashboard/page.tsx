"use client";

import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import EnhancedShiftHandover from "@/components/dashboard/EnhancedShiftHandover";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import EmergencyBreakdowns from "@/components/dashboard/EmergencyBreakdowns";
import IncidentLog from "@/components/dashboard/IncidentLog";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import AssetOverview from "@/components/dashboard/AssetOverview";
import ComplianceMetricsWidget from "@/components/dashboard/ComplianceMetricsWidget";
import { useAppContext } from "@/context/AppContext";

export default function DashboardHomePage() {
  const { companyId, siteId } = useAppContext();
  const tenantId = companyId || "mock-tenant";

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
        <MetricsGrid tenantId={tenantId} siteId={siteId} />
      </div>
    </div>
  );
}
