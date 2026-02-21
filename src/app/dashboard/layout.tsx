"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileNavProvider, BottomTabBar, MoreSheet } from "@/components/mobile";
import { ChecklySidebar } from "@/components/checkly/sidebar-nav";
import { StocklySidebar } from "@/components/stockly/sidebar-nav";
import { TeamlySidebar } from "@/components/teamly/sidebar-nav";
import { PlanlySidebar } from "@/components/planly/sidebar-nav";
import { AssetlySidebar } from "@/components/assetly/sidebar-nav";
import AIAssistantWidget from "@/components/assistant/AIAssistantWidget";
import { SearchModal } from "@/components/search";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebarMode } from "@/hooks/useSidebarMode";
import { useAppContext } from "@/context/AppContext";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAppContext();
  const router = useRouter();
  const [paddingClass, setPaddingClass] = useState('px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16');
  const [showAIWidget, setShowAIWidget] = useState(true);
  const pathname = usePathname();
  const { isMobile } = useIsMobile();
  const { width: sidebarWidth } = useSidebarMode();

  // Redirect to login if session expired
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    // Only compute pathname-dependent values on client after mount
    const isMessagingPage = pathname?.includes('/messaging');
    const isTeamlyPage = pathname?.includes('/people') || pathname?.startsWith('/dashboard/courses');
    const isStocklyPage = pathname?.includes('/stockly');
    const isChecklyPage = pathname?.includes('/todays_tasks') || pathname?.includes('/tasks') || pathname?.includes('/checklists') || pathname?.includes('/incidents') || pathname?.includes('/sops') || pathname?.includes('/risk-assessments') || pathname?.includes('/logs') || pathname?.includes('/equipment');
    const isPlanlyPage = pathname?.includes('/planly');
    const isAssetlyPage = pathname?.includes('/assets') || pathname?.includes('/ppm');

    setPaddingClass(
      (isTeamlyPage || isStocklyPage || isChecklyPage || isPlanlyPage || isAssetlyPage)
        ? 'px-1 py-4 sm:px-2 sm:py-6 md:px-3 md:pb-6 lg:px-3'
        : 'px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16'
    );
    setShowAIWidget(!isMessagingPage);
  }, [pathname]);

  // Render a stable placeholder while checking auth — prevents hydration mismatch
  // by keeping a consistent DOM element in the {children} slot of the root layout
  if (loading || !user) {
    return (
      <MobileNavProvider>
        <div className="min-h-screen bg-[rgb(var(--module-bg-tint))] text-theme-primary" />
      </MobileNavProvider>
    );
  }

  // Determine which module sidebar to show
  const isCheckly = pathname?.startsWith('/dashboard/todays_tasks') || pathname?.startsWith('/dashboard/tasks') || pathname?.startsWith('/dashboard/checklists') || pathname?.startsWith('/dashboard/incidents') || pathname?.startsWith('/dashboard/sops') || pathname?.startsWith('/dashboard/risk-assessments') || pathname?.startsWith('/dashboard/logs') || pathname?.startsWith('/dashboard/equipment');
  const isStockly = pathname?.startsWith('/dashboard/stockly') || pathname?.startsWith('/dashboard/reports/stockly');
  const isTeamly = pathname?.startsWith('/dashboard/people') || pathname?.startsWith('/dashboard/courses');
  const isPlanly = pathname?.startsWith('/dashboard/planly');
  const isAssetly = pathname?.startsWith('/dashboard/assets') || pathname?.startsWith('/dashboard/ppm');
  const showModuleSidebar = isCheckly || isStockly || isTeamly || isPlanly || isAssetly;
  const moduleClass = isCheckly ? 'module-checkly' :
                      isStockly ? 'module-stockly' :
                      isTeamly  ? 'module-teamly'  :
                      isPlanly  ? 'module-planly'  :
                      isAssetly ? 'module-assetly' : '';

  // ============================================
  // MOBILE LAYOUT - No desktop header/sidebar
  // ============================================
  if (isMobile) {
    return (
      <MobileNavProvider>
        <div className={`dashboard-page ${moduleClass} bg-[rgb(var(--module-bg-tint))] text-theme-primary w-full max-w-[100vw] overflow-x-hidden`}>
          {/* No desktop header on mobile - pages handle their own headers */}
          <main className="w-full min-w-0 overflow-x-hidden">
            {children}
          </main>

          {/* Mobile Navigation */}
          <BottomTabBar />
          <MoreSheet />
          <SearchModal />
        </div>
      </MobileNavProvider>
    );
  }

  // ============================================
  // DESKTOP LAYOUT - Full header, sidebars
  // ============================================
  return (
    <MobileNavProvider>
      <div className={`min-h-screen ${moduleClass} bg-[rgb(var(--module-bg-tint))] text-theme-primary`}>
        {/* Header - Fixed at top (includes ModuleBar) */}
        <Header />

        <div className="flex">
          {/* Module-specific Sidebars - Only show when inside a module */}
          {showModuleSidebar && (
            <>
              {isCheckly && (
                <div className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-64px)] z-[35]">
                  <ChecklySidebar />
                </div>
              )}
              {isStockly && (
                <div className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-64px)] z-[35]">
                  <StocklySidebar />
                </div>
              )}
              {isTeamly && (
                <div className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-64px)] z-[35]">
                  <TeamlySidebar />
                </div>
              )}
              {isPlanly && (
                <div className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-64px)] z-[35]">
                  <PlanlySidebar />
                </div>
              )}
              {isAssetly && (
                <div className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-64px)] z-[35]">
                  <AssetlySidebar />
                </div>
              )}
            </>
          )}

          {/* Main Content */}
          <main
            className="flex-1 mt-[112px] bg-transparent transition-[margin,width,max-width] duration-200 module-page-scrollbar"
            style={showModuleSidebar ? {
              marginLeft: sidebarWidth,
              width: `calc(100vw - ${sidebarWidth})`,
              maxWidth: `calc(100vw - ${sidebarWidth})`,
            } : {}}
          >
            <div className={`${paddingClass}`} style={{ paddingBottom: '80px' }}>
              {children}
            </div>
          </main>
        </div>

        {/* Hide global AI widget on messaging page */}
        {showAIWidget && <AIAssistantWidget />}
        <SearchModal />
      </div>
    </MobileNavProvider>
  );
}

export default DashboardLayout;
