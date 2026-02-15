'use client';

import { Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { useEnabledModules } from '@/hooks/dashboard';
import { useDashboardPreferences } from '@/hooks/dashboard/useDashboardPreferences';
import { WIDGET_REGISTRY, WIDGET_SIZE_CLASSES, getDefaultWidgetsForRole, type ModuleId } from '@/config/widget-registry';
import { WidgetSkeleton } from './WidgetCard';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from 'react-error-boundary';

interface WidgetGridProps {
  variant?: 'mobile' | 'desktop';
}

function WidgetErrorFallback({ error }: { error: Error }) {
  return (
    <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D] border border-module-fg/[0.12] rounded-lg p-4">
      <div className="text-teamly text-xs font-medium mb-1">Widget Error</div>
      <div className="text-[rgb(var(--text-disabled))] text-xs">{error.message}</div>
    </div>
  );
}

export function WidgetGrid({ variant = 'desktop' }: WidgetGridProps) {
  const { companyId, siteId, profile } = useAppContext();
  const { enabledModules, loading: modulesLoading } = useEnabledModules();
  const { preferences, loading: prefsLoading } = useDashboardPreferences();

  const userRole = useMemo(() => {
    const role = profile?.app_role?.toLowerCase();
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    if (role === 'manager') return 'Manager';
    return 'Staff';
  }, [profile?.app_role]);

  const visibleWidgets = useMemo(() => {
    if (preferences.visibleWidgets.length > 0) {
      return preferences.visibleWidgets;
    }
    return getDefaultWidgetsForRole(userRole as any);
  }, [preferences.visibleWidgets, userRole]);

  // Filter widgets — exclude chart-section widgets (rendered by ChartSection)
  const widgetsToRender = useMemo(() => {
    return visibleWidgets.filter((widgetId) => {
      const widget = WIDGET_REGISTRY[widgetId];
      if (!widget) return false;
      // Skip chart widgets — they're rendered in ChartSection
      if (widget.section === 'charts') return false;
      return enabledModules.includes(widget.module);
    });
  }, [visibleWidgets, enabledModules]);

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

  if (widgetsToRender.length === 0) {
    return (
      <div className="bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D] border border-module-fg/[0.12] rounded-lg p-8 text-center">
        <div className="text-[rgb(var(--text-disabled))] text-sm">No widgets to display</div>
        <div className="text-[rgb(var(--text-disabled))]/60 text-xs mt-1">
          Enable modules or customize your dashboard settings
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={cn(
        'grid gap-3 auto-rows-fr',
        variant === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      )}
    >
      <AnimatePresence mode="popLayout">
        {widgetsToRender.map((widgetId, index) => {
          const widget = WIDGET_REGISTRY[widgetId];
          if (!widget) return null;

          const WidgetComponent = widget.component;
          const sizeClass = WIDGET_SIZE_CLASSES[widget.size] || 'col-span-1';

          return (
            <motion.div
              key={widgetId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={cn(variant === 'mobile' ? '' : sizeClass, 'h-full')}
            >
              <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
                <Suspense fallback={<WidgetSkeleton />}>
                  <WidgetComponent
                    siteId={siteId || ''}
                    companyId={companyId || ''}
                  />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

export default WidgetGrid;
