'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { WidgetConfig, DashboardPreferences, ModuleId } from '@/types/dashboard';
import { WIDGET_REGISTRY, WidgetWrapper, sortWidgets, filterWidgetsByModules } from './widgets';
import { WidgetGridSkeleton } from './widgets/WidgetSkeleton';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ChevronDown, ChevronUp } from '@/components/ui/icons';

interface DashboardGridProps {
  preferences: DashboardPreferences;
  enabledModules: ModuleId[];
  companyId: string;
  siteId: string | null;
  onToggleCollapse: (widgetId: string) => void;
  loading?: boolean;
}

/**
 * Responsive grid layout for dashboard widgets
 */
export function DashboardGrid({
  preferences,
  enabledModules,
  companyId,
  siteId,
  onToggleCollapse,
  loading = false,
}: DashboardGridProps) {
  const { isMobile, isHydrated } = useIsMobile();

  // Filter and sort widgets
  const visibleWidgets = useMemo(() => {
    // Get available widgets for enabled modules
    const available = filterWidgetsByModules(enabledModules);

    // Filter to only visible widgets based on preferences
    const visible = available.filter((widget) =>
      preferences.visibleWidgets.includes(widget.id)
    );

    // Sort by user preference order
    return sortWidgets(visible, preferences.widgetOrder);
  }, [enabledModules, preferences.visibleWidgets, preferences.widgetOrder]);

  // Show skeleton while loading
  if (!isHydrated || loading) {
    return <WidgetGridSkeleton count={6} />;
  }

  // Empty state
  if (visibleWidgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white mb-2">
          No widgets visible
        </h3>
        <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-4 max-w-md">
          Click the settings icon to customize your dashboard and select which widgets to display.
        </p>
      </div>
    );
  }

  // Mobile layout - single column with collapsible cards
  if (isMobile) {
    return (
      <div className="space-y-3 pb-24">
        {visibleWidgets.map((widget) => (
          <WidgetWrapper
            key={widget.id}
            config={widget}
            companyId={companyId}
            siteId={siteId}
            isCollapsed={preferences.collapsedWidgets.includes(widget.id)}
            onToggleCollapse={() => onToggleCollapse(widget.id)}
            isMobile={true}
          />
        ))}
      </div>
    );
  }

  // Desktop layout - responsive grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {visibleWidgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(
            'col-span-1',
            widget.defaultSize === 'large' && 'lg:col-span-2'
          )}
        >
          <WidgetWrapper
            config={widget}
            companyId={companyId}
            siteId={siteId}
            isMobile={false}
          />
        </div>
      ))}
    </div>
  );
}
