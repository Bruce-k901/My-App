'use client';

import { Suspense, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useEnabledModules } from '@/hooks/dashboard';
import { useDashboardPreferences } from '@/hooks/dashboard/useDashboardPreferences';
import { WIDGET_REGISTRY, getDefaultWidgetsForRole, type ModuleId } from '@/config/widget-registry';
import { WidgetSkeleton } from './WidgetCard';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from 'react-error-boundary';

interface WidgetGridProps {
  variant?: 'mobile' | 'desktop';
}

/**
 * WidgetErrorFallback - Shown when a widget crashes
 */
function WidgetErrorFallback({ error }: { error: Error }) {
  return (
    <div className="bg-[#171B2D] border border-white/[0.06] rounded-lg p-4">
      <div className="text-fuchsia-400 text-xs font-medium mb-1">Widget Error</div>
      <div className="text-white/40 text-xs">{error.message}</div>
    </div>
  );
}

/**
 * WidgetGrid - Responsive grid of dashboard widgets
 *
 * Layout:
 * - Desktop (>1024px): 3 columns
 * - Tablet (768-1024px): 2 columns
 * - Mobile (<768px): 1 column
 */
export function WidgetGrid({ variant = 'desktop' }: WidgetGridProps) {
  const { companyId, siteId, profile } = useAppContext();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();
  const { preferences, loading: prefsLoading } = useDashboardPreferences();

  // Determine user role
  const userRole = useMemo(() => {
    const role = profile?.app_role?.toLowerCase();
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'Staff';
  }, [profile?.app_role]);

  // Get visible widgets
  const visibleWidgets = useMemo(() => {
    // If preferences exist and have widgets, use them
    if (preferences.visibleWidgets.length > 0) {
      return preferences.visibleWidgets;
    }

    // Otherwise fall back to role defaults
    return getDefaultWidgetsForRole(userRole as any);
  }, [preferences.visibleWidgets, userRole]);

  // Filter widgets by enabled modules and visibility
  const widgetsToRender = useMemo(() => {
    return visibleWidgets.filter((widgetId) => {
      const widget = WIDGET_REGISTRY[widgetId];
      if (!widget) return false;

      // Check if module is enabled
      return enabledModules.includes(widget.module);
    });
  }, [visibleWidgets, enabledModules]);

  // Loading state
  if (modulesLoading || prefsLoading) {
    return (
      <div
        className={cn(
          'grid gap-3',
          variant === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  // No widgets to show
  if (widgetsToRender.length === 0) {
    return (
      <div className="bg-[#171B2D] border border-white/[0.06] rounded-lg p-8 text-center">
        <div className="text-white/40 text-sm">No widgets to display</div>
        <div className="text-white/20 text-xs mt-1">
          Enable modules or customize your dashboard settings
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        variant === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {widgetsToRender.map((widgetId) => {
        const widget = WIDGET_REGISTRY[widgetId];
        if (!widget) return null;

        const WidgetComponent = widget.component;

        return (
          <ErrorBoundary key={widgetId} FallbackComponent={WidgetErrorFallback}>
            <Suspense fallback={<WidgetSkeleton />}>
              <WidgetComponent
                siteId={siteId || ''}
                companyId={companyId || ''}
              />
            </Suspense>
          </ErrorBoundary>
        );
      })}
    </div>
  );
}

export default WidgetGrid;
