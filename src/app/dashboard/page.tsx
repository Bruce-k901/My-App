"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import { OpslyDashboard } from "@/components/dashboard/OpslyDashboard";
import {
  MobileHeader,
  WeatherWidget,
} from "@/components/mobile";
import { useAppContext } from "@/context/AppContext";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function DashboardHomePage() {
  const router = useRouter();
  const { companyId, loading, user, profile } = useAppContext();
  const { isMobile, isHydrated } = useIsMobile();

  // Note: Users should always have a company after signup (created in auth callback)
  // This redirect is a safety net in case something went wrong during signup
  useEffect(() => {
    if (!loading && user && !companyId) {
      // This can happen during first signup before company is created
      console.debug('User has no company yet (redirecting to business details to complete setup)');
      router.replace('/dashboard/business');
    }
  }, [loading, user, companyId, router]);

  // Show loading state while hydrating to prevent flash
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile View - Show mobile-optimized dashboard
  if (isMobile) {
    const userName = profile?.full_name ||
      (profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : 'User');

    return (
      <div className="min-h-screen bg-[#0f1220] text-white">
        {/* Mobile Header - UNCHANGED */}
        <MobileHeader
          userName={userName}
          unreadNotifications={0}
        />

        <div className="px-4 space-y-4 pb-24">
          {/* Weather Widget */}
          <WeatherWidget />

          {/* Opsly Dashboard - Mobile variant */}
          <OpslyDashboard variant="mobile" />
        </div>
      </div>
    );
  }

  // Desktop View
  return (
    <div className="flex flex-col w-full">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col gap-4 text-white">
        {/* Welcome Header - UNCHANGED */}
        <WelcomeHeader />

        {/* Opsly Dashboard - Desktop variant with pinned sidebar */}
        <OpslyDashboard variant="desktop" />

        {!loading && !companyId && (
          <div className="bg-[#171B2D] border border-white/[0.06] rounded-xl p-6 w-full">
            <p className="text-white/60 text-center">
              Company setup required to view compliance summary. Please complete your company profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
