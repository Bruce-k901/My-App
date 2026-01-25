"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { ChecklySidebar } from "@/components/checkly/sidebar-nav";
import { StocklySidebar } from "@/components/stockly/sidebar-nav";
import { TeamlySidebar } from "@/components/teamly/sidebar-nav";
import { PlanlySidebar } from "@/components/planly/sidebar-nav";
import { AssetlySidebar } from "@/components/assetly/sidebar-nav";
import AIAssistantWidget from "@/components/assistant/AIAssistantWidget";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [paddingClass, setPaddingClass] = useState('px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:pb-6 lg:px-16');
  const [showAIWidget, setShowAIWidget] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] dark:bg-[#0a0a0a]">
      {/* Header - Fixed at top (includes ModuleBar) */}
      <Header 
        onMobileMenuClick={() => setIsMobileMenuOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      
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
            overflow: 'hidden'
          } : {}}
        >
          <div className={`${paddingClass}`} style={{ paddingBottom: '80px' }}>
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation - Only show when NOT in a module (modules have their own mobile nav) */}
      {!showModuleSidebar && (
        <MobileBottomNav 
          className="lg:hidden" 
          onMenuOpen={() => setIsMobileMenuOpen(true)}
          isBurgerMenuOpen={isMobileMenuOpen}
        />
      )}
      
      {/* Hide global AI widget on messaging page - it's shown in ConversationHeader instead */}
      {showAIWidget && <AIAssistantWidget />}
    </div>
  );
}

export default DashboardLayout;