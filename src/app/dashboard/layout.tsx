"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileNavProvider, BottomTabBar, MoreSheet } from "@/components/mobile";
import { ChecklySidebar } from "@/components/checkly/sidebar-nav";
import { StocklySidebar } from "@/components/stockly/sidebar-nav";
import { TeamlySidebar } from "@/components/teamly/sidebar-nav";
import { PlanlySidebar } from "@/components/planly/sidebar-nav";
import { AssetlySidebar } from "@/components/assetly/sidebar-nav";
import AIAssistantWidget from "@/components/assistant/AIAssistantWidget";
import { useIsMobile } from "@/hooks/useIsMobile";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [paddingClass, setPaddingClass] = useState('px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16');
  const [showAIWidget, setShowAIWidget] = useState(true);
  const pathname = usePathname();
  const { isMobile } = useIsMobile();

  // Check if we're on the dashboard home page (mobile gets special treatment)
  const isDashboardHome = pathname === "/dashboard";

  useEffect(() => {
    // Only compute pathname-dependent values on client after mount
    const isMessagingPage = pathname?.includes('/messaging');
    const isTeamlyPage = pathname?.includes('/people') || pathname?.startsWith('/dashboard/courses');
    const isStocklyPage = pathname?.includes('/stockly');
    const isChecklyPage = pathname?.includes('/todays_tasks') || pathname?.includes('/tasks') || pathname?.includes('/checklists') || pathname?.includes('/incidents') || pathname?.includes('/sops') || pathname?.includes('/risk-assessments') || pathname?.includes('/logs');
    const isPlanlyPage = pathname?.includes('/planly');
    const isAssetlyPage = pathname?.includes('/assets') || pathname?.includes('/ppm');
    
    setPaddingClass(
      (isTeamlyPage || isStocklyPage || isChecklyPage || isPlanlyPage || isAssetlyPage)
        ? 'px-1 py-4 sm:px-2 sm:py-6 md:px-3 md:pb-6 lg:px-3' 
        : 'px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16'
    );
    setShowAIWidget(!isMessagingPage);
  }, [pathname]);

  // Determine which module sidebar to show
  // Check more specific paths first (todays_tasks) before general paths (tasks)
  const isCheckly = pathname?.startsWith('/dashboard/todays_tasks') || pathname?.startsWith('/dashboard/tasks') || pathname?.startsWith('/dashboard/checklists') || pathname?.startsWith('/dashboard/incidents') || pathname?.startsWith('/dashboard/sops') || pathname?.startsWith('/dashboard/risk-assessments') || pathname?.startsWith('/dashboard/logs');
  const isStockly = pathname?.startsWith('/dashboard/stockly');
  const isTeamly = pathname?.startsWith('/dashboard/people') || pathname?.startsWith('/dashboard/courses');
  const isPlanly = pathname?.startsWith('/dashboard/planly');
  const isAssetly = pathname?.startsWith('/dashboard/assets') || pathname?.startsWith('/dashboard/ppm');
  const showModuleSidebar = isCheckly || isStockly || isTeamly || isPlanly || isAssetly;

  // Mobile dashboard home gets a special full-screen layout
  if (isMobile && isDashboardHome) {
    return (
      <MobileNavProvider>
        <div className="min-h-screen bg-background pb-20">
          {/* Children handles its own layout */}
          {children}

          {/* Unified Mobile Navigation */}
          <BottomTabBar />
          <MoreSheet />
        </div>
      </MobileNavProvider>
    );
  }

  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-[rgb(var(--background))] dark:bg-[#0a0a0a]">
        {/* Header - Fixed at top (includes ModuleBar) */}
        <Header />

      <div className="flex">
        {/* Module-specific Sidebars - Only show when inside a module */}
        {showModuleSidebar && (
          <>
            {isCheckly && (
              <div className="hidden lg:block fixed left-0 top-[112px] h-[calc(100vh-112px)]">
                <ChecklySidebar />
              </div>
            )}
            {isStockly && (
              <div className="hidden lg:block fixed left-0 top-[112px] h-[calc(100vh-112px)]">
                <StocklySidebar />
              </div>
            )}
            {isTeamly && (
              <div className="hidden lg:block fixed left-0 top-[112px] h-[calc(100vh-112px)]">
                <TeamlySidebar />
              </div>
            )}
            {isPlanly && (
              <div className="hidden lg:block fixed left-0 top-[112px] h-[calc(100vh-112px)]">
                <PlanlySidebar />
              </div>
            )}
            {isAssetly && (
              <div className="hidden lg:block fixed left-0 top-[112px] h-[calc(100vh-112px)]">
                <AssetlySidebar />
              </div>
            )}
          </>
        )}

        {/* Main Content */}
        <main
          className={`flex-1 mt-[112px] bg-[#F5F5F2] dark:bg-transparent ${showModuleSidebar ? 'lg:ml-64' : ''} ${
            isCheckly ? 'checkly-page-scrollbar' :
            isStockly ? 'stockly-page-scrollbar' :
            isTeamly ? 'teamly-page-scrollbar' :
            isAssetly ? 'assetly-page-scrollbar' :
            isPlanly ? 'planly-page-scrollbar' :
            ''
          }`}
          style={showModuleSidebar ? {
            width: 'calc(100vw - 256px)',
            maxWidth: 'calc(100vw - 256px)',
          } : {}}
        >
          <div className={`${paddingClass}`} style={{ paddingBottom: '80px' }}>
            {children}
          </div>
        </main>
      </div>

      {/* Unified Mobile Navigation */}
      <BottomTabBar />
      <MoreSheet />

      {/* Hide global AI widget on messaging page - it's shown in ConversationHeader instead */}
      {showAIWidget && <AIAssistantWidget />}
      </div>
    </MobileNavProvider>
  );
}

export default DashboardLayout;