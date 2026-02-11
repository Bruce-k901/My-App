'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useDashboardPreferences, useEnabledModules } from '@/hooks/dashboard';
import { QuickNavBar } from './QuickNavBar';
import { DashboardGrid } from './DashboardGrid';
import { DashboardSettingsPanel, DashboardSettingsButton } from './DashboardSettingsPanel';
import { WidgetGridSkeleton } from './widgets/WidgetSkeleton';
import { DashboardVariant } from '@/types/dashboard';

interface ModularDashboardProps {
  variant?: DashboardVariant;
}

/**
 * Main orchestrator component for the modular dashboard
 * Combines QuickNavBar, DashboardGrid, and DashboardSettingsPanel
 */
export function ModularDashboard({ variant = 'desktop' }: ModularDashboardProps) {
  const { companyId, siteId, loading: contextLoading } = useAppContext();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();
  const {
    preferences,
    loading: prefsLoading,
    toggleWidget,
    toggleCollapse,
    resetToDefaults,
  } = useDashboardPreferences();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isLoading = contextLoading || modulesLoading || prefsLoading;

  // Show loading state
  if (isLoading || !companyId) {
    return (
      <div className="space-y-6">
        {/* Quick Nav skeleton */}
        <div className="h-16 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
        {/* Grid skeleton */}
        <WidgetGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with settings button (desktop only) */}
      {variant === 'desktop' && (
        <div className="flex items-center justify-between">
          <div /> {/* Spacer for alignment */}
          <DashboardSettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      )}

      {/* Quick Navigation Bar */}
      <QuickNavBar />

      {/* Widget Grid */}
      <DashboardGrid
        preferences={preferences}
        enabledModules={enabledModules}
        companyId={companyId}
        siteId={siteId}
        onToggleCollapse={toggleCollapse}
        loading={isLoading}
      />

      {/* Settings Panel */}
      <DashboardSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        enabledModules={enabledModules}
        visibleWidgets={preferences.visibleWidgets}
        onToggleWidget={toggleWidget}
        onResetToDefaults={resetToDefaults}
      />

      {/* Mobile settings button (fixed bottom) */}
      {variant === 'mobile' && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-[#D37E91] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
