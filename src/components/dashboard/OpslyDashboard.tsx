'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { QuickNavBar } from './QuickNavBar';
import { WidgetGrid } from './WidgetGrid';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardSettings } from './DashboardSettings';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

interface OpslyDashboardProps {
  variant?: 'mobile' | 'desktop';
}

/**
 * OpslyDashboard - Main dashboard layout component
 *
 * Features:
 * - Quick navigation bar with module-filtered shortcuts
 * - Widget grid (3 cols desktop, 2 cols tablet, 1 col mobile)
 * - Pinned right sidebar with Activity Feed and Incidents
 * - Settings panel for widget customization
 */
export function OpslyDashboard({ variant }: OpslyDashboardProps) {
  const { isMobile } = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDesktop = variant === 'desktop' || (!variant && !isMobile);
  const isMobileView = variant === 'mobile' || (!variant && isMobile);

  // Mobile layout
  if (isMobileView) {
    return (
      <div className="pb-4">
        {/* Quick Actions */}
        <QuickNavBar />

        {/* Widget Grid */}
        <WidgetGrid variant="mobile" />

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-20 right-4 w-12 h-12 bg-fuchsia-500 rounded-full flex items-center justify-center shadow-lg z-30"
        >
          <Menu className="w-5 h-5 text-white" />
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
    );
  }

  // Desktop layout
  return (
    <div className="flex h-[calc(100vh-180px)] -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12">
      {/* Main content area */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-12 py-2">
        {/* Header with settings */}
        <div className="flex items-center justify-between mb-4">
          <div /> {/* Spacer */}
          <DashboardSettings />
        </div>

        {/* Quick Actions */}
        <QuickNavBar />

        {/* Widget Grid */}
        <WidgetGrid variant="desktop" />
      </div>

      {/* Pinned right sidebar — always visible */}
      <DashboardSidebar />
    </div>
  );
}

export default OpslyDashboard;
