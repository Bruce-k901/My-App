"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import EmergencyBreakdowns from "@/components/dashboard/EmergencyBreakdowns";
import IncidentLog from "@/components/dashboard/IncidentLog";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import AssetOverview from "@/components/dashboard/AssetOverview";
import ComplianceMetricsWidget from "@/components/dashboard/ComplianceMetricsWidget";
import DashboardQuickStats from "@/components/dashboard/DashboardQuickStats";
import { useAppContext } from "@/context/AppContext";

export default function DashboardHomePage() {
  const router = useRouter();
  const { companyId, siteId, loading, user } = useAppContext();
  
  // Note: Users should always have a company after signup (created in auth callback)
  // This redirect is a safety net in case something went wrong during signup
  useEffect(() => {
    if (!loading && user && !companyId) {
      // This can happen during first signup before company is created
      console.debug('User has no company yet (redirecting to business details to complete setup)');
      router.replace('/dashboard/business');
    }
  }, [loading, user, companyId, router]);
  
  // Don't render MetricsGrid if companyId is not available
  const shouldShowMetricsGrid = !loading && companyId;

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-full max-w-[1400px] px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col gap-6 sm:gap-8 text-[rgb(var(--text-primary))] dark:text-white">
        {/* Welcome Header */}
        <WelcomeHeader />
        
        {/* Quick Stats Cards - Top Priority */}
        {!loading && companyId && <DashboardQuickStats />}
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Calendar moved to slide-in panel - accessible via middle-right button */}
            
            {/* Compliance Metrics - More compact */}
            <ComplianceMetricsWidget />
            
            {/* Asset Overview */}
            <AssetOverview />
            
            {/* Emergency Breakdowns */}
            <EmergencyBreakdowns />
            
            {/* Incident Log */}
            <IncidentLog />
          </div>
          
          {/* Right Column - Sidebar Content */}
          <div className="lg:col-span-4 space-y-6">
            {/* Alerts Feed - Prominent placement */}
            <AlertsFeed />
            
            {/* Quick Actions Card */}
            <div className="bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <a
                  href="/dashboard/todays_tasks"
                  className="flex items-center gap-3 p-3 rounded-lg bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] transition-colors border border-theme dark:border-white/[0.06] group"
                >
                  <div className="p-2 bg-pink-100 dark:bg-pink-500/10 rounded-lg group-hover:bg-pink-200 dark:group-hover:bg-pink-500/20 transition-colors">
                    <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                    Today's Tasks
                  </span>
                </a>
                <a
                  href="/dashboard/incidents"
                  className="flex items-center gap-3 p-3 rounded-lg bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] transition-colors border border-theme dark:border-white/[0.06] group"
                >
                  <div className="p-2 bg-red-100 dark:bg-red-500/10 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-500/20 transition-colors">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                    Report Incident
                  </span>
                </a>
                <a
                  href="/dashboard/logs/attendance"
                  className="flex items-center gap-3 p-3 rounded-lg bg-theme-button dark:bg-white/[0.05] hover:bg-theme-button-hover dark:hover:bg-white/[0.08] transition-colors border border-theme dark:border-white/[0.06] group"
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                    Attendance Log
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Metrics Grid - Bottom Section */}
        {shouldShowMetricsGrid && (
          <MetricsGrid tenantId={companyId} siteId={siteId} />
        )}
        
        {!loading && !companyId && (
          <div className="bg-[rgb(var(--surface-elevated))] dark:bg-white/[0.03] border border-[rgb(var(--border))] dark:border-white/[0.06] rounded-xl p-6 w-full">
            <p className="text-[rgb(var(--text-secondary))] dark:text-white/60 text-center">
              Company setup required to view compliance summary. Please complete your company profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
