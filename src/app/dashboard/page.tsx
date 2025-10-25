"use client";

import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import QuickActions from "@/components/dashboard/QuickActions";
import ShiftHandoverNotes from "@/components/dashboard/ShiftHandoverNotes";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import EmergencyBreakdowns from "@/components/dashboard/EmergencyBreakdowns";
import IncidentLog from "@/components/dashboard/IncidentLog";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import AssetOverview from "@/components/dashboard/AssetOverview";
export default function DashboardHomePage() {
  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1280px] px-6 md:px-8 lg:px-12 flex flex-col gap-6 text-white">
        <WelcomeHeader />
        <QuickActions />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AssetOverview />
            <EmergencyBreakdowns />
            <IncidentLog />
          </div>
          <div className="space-y-6">
            <AlertsFeed />
            <ShiftHandoverNotes />
          </div>
        </div>
        <MetricsGrid />
      </div>
    </div>
  );
}
