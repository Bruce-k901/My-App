"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import { OpslyDashboard } from "@/components/dashboard/OpslyDashboard";
import { MobileHomeScreen } from "@/components/mobile";
import { useAppContext } from "@/context/AppContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Rocket, X } from "@/components/ui/icons";

export default function DashboardHomePage() {
  const router = useRouter();
  const { companyId, company, loading, user, role } = useAppContext();
  const { isMobile, isHydrated } = useIsMobile();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isAdmin = ['Admin', 'Owner', 'General Manager'].includes(role || '');
  const setupIncomplete = company && (company as Record<string, unknown>).setup_complete === false;
  const showSetupBanner = isAdmin && setupIncomplete && !bannerDismissed;

  // Note: Users should always have a company after signup (created in auth callback)
  // This redirect is a safety net in case something went wrong during signup
  useEffect(() => {
    if (!loading && user && !companyId) {
      console.debug('User has no company yet (redirecting to business details to complete setup)');
      router.replace('/dashboard/business');
    }
  }, [loading, user, companyId, router]);

  // Show loading state while hydrating to prevent flash
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-teamly border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile View - Purpose-built mobile home screen
  if (isMobile) {
    return <MobileHomeScreen />;
  }

  // Desktop View
  return (
    <div className="flex flex-col w-full">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 flex flex-col gap-4 text-theme-primary">
        {/* Setup-incomplete banner — dismissible */}
        {showSetupBanner && (
          <div className="flex items-center gap-3 p-3 bg-teamly/10 dark:bg-teamly/[0.08] border border-teamly/20 rounded-lg">
            <Rocket className="h-5 w-5 text-teamly flex-shrink-0" />
            <p className="text-sm text-theme-primary flex-1">
              Your setup isn&apos;t finished yet.{' '}
              <Link href="/dashboard/business" className="font-medium text-teamly hover:underline">
                Continue Getting Started
              </Link>
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1 text-theme-tertiary hover:text-theme-secondary rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Welcome Header - UNCHANGED */}
        <WelcomeHeader />

        {/* Opsly Dashboard - Desktop variant with pinned sidebar */}
        <OpslyDashboard variant="desktop" />

        {!loading && !companyId && (
          <div className="bg-[#171B2D] border border-white/[0.06] rounded-xl p-6 w-full">
            <p className="text-theme-tertiary text-center">
              Company setup required to view compliance summary. Please complete your company profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
