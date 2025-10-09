"use client";

import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import QuickActions from "@/components/dashboard/QuickActions";
import ShiftHandoverNotes from "@/components/dashboard/ShiftHandoverNotes";
import EmergencyBreakdowns from "@/components/dashboard/EmergencyBreakdowns";
import IncidentLog from "@/components/dashboard/IncidentLog";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import AlertsFeed from "@/components/dashboard/AlertsFeed";

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1280px] px-6 md:px-8 lg:px-12 flex flex-col gap-6 text-white">
        <WelcomeHeader />
        <QuickActions />
        {/* Top section: Shift notes and Alerts side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="min-h-[260px]">
            <ShiftHandoverNotes />
          </div>
          <div className="min-h-[260px]">
            <AlertsFeed />
          </div>
        </div>
        <EmergencyBreakdowns />
        <IncidentLog />
        <MetricsGrid />
      </div>
    </div>
  );
}
