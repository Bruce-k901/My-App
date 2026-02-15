'use client';

import { Suspense, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useEnabledModules } from '@/hooks/dashboard';
import { useDashboardPreferencesContext } from '@/context/DashboardPreferencesContext';
import { WIDGET_REGISTRY, WIDGET_SIZE_CLASSES, getDefaultWidgetsForRole, type ModuleId } from '@/config/widget-registry';
import { WidgetSkeleton } from './WidgetCard';
import { SortableWidgetWrapper } from './SortableWidgetWrapper';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from 'react-error-boundary';
import { WidgetSizeProvider } from './WidgetSizeContext';

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
  const { preferences, loading: prefsLoading, isEditMode, reorderWidgets } = useDashboardPreferencesContext();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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
  const filteredWidgets = useMemo(() => {
    return visibleWidgets.filter((widgetId) => {
      const widget = WIDGET_REGISTRY[widgetId];
      if (!widget) return false;
      if (widget.section === 'charts') return false;
      return enabledModules.includes(widget.module);
    });
  }, [visibleWidgets, enabledModules]);

  // Sort by widgetOrder from preferences
  const widgetsToRender = useMemo(() => {
    if (preferences.widgetOrder.length === 0) return filteredWidgets;

    const ordered = [...filteredWidgets];
    ordered.sort((a, b) => {
      const aIdx = preferences.widgetOrder.indexOf(a);
      const bIdx = preferences.widgetOrder.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
    return ordered;
  }, [filteredWidgets, preferences.widgetOrder]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = widgetsToRender.indexOf(active.id as string);
    const newIndex = widgetsToRender.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(widgetsToRender, oldIndex, newIndex);
    reorderWidgets(newOrder);
  }, [widgetsToRender, reorderWidgets]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

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

  const isDesktop = variant === 'desktop';
  const useDnd = isDesktop && isEditMode;

  // Build widget elements — DnD mode uses plain divs (no framer-motion layout)
  // to avoid conflicts with @dnd-kit's CSS transform positioning
  const renderWidgets = () =>
    widgetsToRender.map((widgetId, index) => {
      const widget = WIDGET_REGISTRY[widgetId];
      if (!widget) return null;

      const WidgetComponent = widget.component;
      const effectiveSize = preferences.widgetSizes?.[widgetId] || widget.size;
      const sizeClass = WIDGET_SIZE_CLASSES[effectiveSize] || 'col-span-1';

      const widgetElement = (
        <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
          <Suspense fallback={<WidgetSkeleton />}>
            <WidgetSizeProvider value={effectiveSize}>
              <WidgetComponent
                siteId={siteId || ''}
                companyId={companyId || ''}
              />
            </WidgetSizeProvider>
          </Suspense>
        </ErrorBoundary>
      );

      if (useDnd) {
        // In DnD mode: plain div — no layout animation, no AnimatePresence
        // @dnd-kit handles all transforms via useSortable
        return (
          <div
            key={widgetId}
            className={cn(sizeClass, 'h-full')}
          >
            <SortableWidgetWrapper
              id={widgetId}
              isEditMode={true}
              module={widget.module}
            >
              {widgetElement}
            </SortableWidgetWrapper>
          </div>
        );
      }

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
          {widgetElement}
        </motion.div>
      );
    });

  const gridClasses = cn(
    'grid gap-3 auto-rows-fr [grid-auto-flow:dense]',
    variant === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    useDnd && 'drag-active'
  );

  if (useDnd) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={widgetsToRender} strategy={rectSortingStrategy}>
          <div className={gridClasses}>
            {renderWidgets()}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="opacity-80 rotate-[1deg] pointer-events-none">
              <WidgetSkeleton />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={gridClasses}
    >
      <AnimatePresence mode="popLayout">
        {renderWidgets()}
      </AnimatePresence>
    </motion.div>
  );
}

export default WidgetGrid;
