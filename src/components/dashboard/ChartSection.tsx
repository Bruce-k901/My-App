'use client';

import { Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';
import { useAppContext } from '@/context/AppContext';
import { useEnabledModules, useDashboardPreferences } from '@/hooks/dashboard';
import {
  WIDGET_REGISTRY,
  getDefaultWidgetsForRole,
  getWidgetsBySection,
  type ModuleId,
} from '@/config/widget-registry';
import { ChartWidgetSkeleton } from './charts/ChartWidgetCard';
import { cn } from '@/lib/utils';

interface ChartSectionProps {
  variant: 'mobile' | 'desktop';
}

function ChartErrorFallback({ error }: { error: Error }) {
  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D] border border-module-fg/[0.12] rounded-lg p-4 min-h-[280px] flex items-center justify-center">
      <div>
        <div className="text-teamly text-xs font-medium mb-1">Chart Error</div>
        <div className="text-[rgb(var(--text-disabled))] text-xs">{error.message}</div>
      </div>
    </div>
  );
}

export function ChartSection({ variant }: ChartSectionProps) {
  const { companyId, siteId, profile } = useAppContext();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();
  const { preferences, loading: prefsLoading } = useDashboardPreferences();
  const isMobile = variant === 'mobile';

  // Get all chart widgets from registry
  const chartWidgets = useMemo(() => getWidgetsBySection('charts'), []);

  // Determine visible chart widgets
  const visibleCharts = useMemo(() => {
    const visibleIds = preferences.visibleWidgets.length > 0
      ? preferences.visibleWidgets
      : getDefaultWidgetsForRole(
          profile?.app_role?.toLowerCase() === 'owner'
            ? 'Owner'
            : profile?.app_role?.toLowerCase() === 'admin'
            ? 'Admin'
            : 'Manager' as any
        );

    return chartWidgets.filter((widget) => {
      // Must be in visible list
      if (!visibleIds.includes(widget.id)) return false;
      // Module must be enabled
      return enabledModules.includes(widget.module);
    });
  }, [chartWidgets, preferences.visibleWidgets, enabledModules, profile?.app_role]);

  if (modulesLoading || prefsLoading) {
    return (
      <div className={cn('grid gap-3 mb-5', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
        {[1, 2].map((i) => (
          <ChartWidgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (visibleCharts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn('grid gap-3 mb-5', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}
    >
      {visibleCharts.map((widget) => {
        const WidgetComponent = widget.component;
        return (
          <ErrorBoundary key={widget.id} FallbackComponent={ChartErrorFallback}>
            <Suspense fallback={<ChartWidgetSkeleton />}>
              <WidgetComponent
                siteId={siteId || ''}
                companyId={companyId || ''}
              />
            </Suspense>
          </ErrorBoundary>
        );
      })}
    </motion.div>
  );
}
