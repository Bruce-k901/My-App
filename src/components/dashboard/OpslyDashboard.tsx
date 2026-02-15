'use client';

import { useState } from 'react';
import { Menu, GripVertical } from '@/components/ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickNavBar } from './QuickNavBar';
import { WidgetGrid } from './WidgetGrid';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardSettings } from './DashboardSettings';
import { KPIHeroSection } from './KPIHeroSection';
import { ChartSection } from './ChartSection';
import { EnhancedWeatherWidget } from './EnhancedWeatherWidget';
import { DashboardPreferencesProvider } from '@/context/DashboardPreferencesContext';
import { EditModeToggle } from './EditModeToggle';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface OpslyDashboardProps {
  variant?: 'mobile' | 'desktop';
}

export function OpslyDashboard({ variant }: OpslyDashboardProps) {
  const { isMobile } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDesktop = variant === 'desktop' || (!variant && !isMobile);
  const isMobileView = variant === 'mobile' || (!variant && isMobile);

  // Mobile layout
  if (isMobileView) {
    return (
      <DashboardPreferencesProvider>
        <div className="pb-4">
          {/* Weather */}
          <EnhancedWeatherWidget />

          {/* Quick Actions */}
          <QuickNavBar />

          {/* KPI Hero */}
          <KPIHeroSection variant="mobile" />

          {/* Charts */}
          <ChartSection variant="mobile" />

          {/* Widget Grid */}
          <WidgetGrid variant="mobile" />

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed bottom-20 right-4 w-12 h-12 bg-teamly rounded-full flex items-center justify-center shadow-lg z-30"
          >
            <Menu className="w-5 h-5 text-theme-primary" />
          </button>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 flex">
              <div
                className="flex-1 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <DashboardSidebar isOpen={true} onClose={() => setSidebarOpen(false)} />
            </div>
          )}
        </div>
      </DashboardPreferencesProvider>
    );
  }

  // Desktop layout
  return (
    <DashboardPreferencesProvider>
      <div className="flex h-[calc(100vh-180px)] -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12">
        {/* Main content area */}
        <div className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-12 py-2">
          {/* Header with settings */}
          <div className="flex items-center justify-between mb-4">
            <div /> {/* Spacer */}
            <div className="flex items-center gap-2">
              <EditModeToggle />
              <DashboardSettings />
            </div>
          </div>

          {/* Weather */}
          <EnhancedWeatherWidget />

          {/* Quick Actions */}
          <QuickNavBar />

          {/* KPI Hero */}
          <KPIHeroSection variant="desktop" />

          {/* Charts */}
          <ChartSection variant="desktop" />

          {/* Widget Grid */}
          <WidgetGrid variant="desktop" />
        </div>

        {/* Pinned right sidebar — always visible */}
        <DashboardSidebar />
      </div>
    </DashboardPreferencesProvider>
  );
}

export default OpslyDashboard;
