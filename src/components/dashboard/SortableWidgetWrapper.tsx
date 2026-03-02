'use client';

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Maximize2 } from '@/components/ui/icons';
import {
  MODULE_ICON_COLOURS,
  MODULE_BADGE_COLOURS,
  WIDGET_REGISTRY,
  type ModuleId,
} from '@/config/widget-registry';
import type { WidgetSize } from '@/types/dashboard';
import { useDashboardPreferencesContext } from '@/context/DashboardPreferencesContext';
import { cn } from '@/lib/utils';

const SIZE_CYCLE: WidgetSize[] = ['small', 'tall', 'wide', 'large'];

const SIZE_LABELS: Record<WidgetSize, string> = {
  small: '1x1',
  medium: '1x1',
  tall: '1x2',
  wide: '2x1',
  large: '2x2',
};

interface SortableWidgetWrapperProps {
  id: string;
  isEditMode: boolean;
  module: ModuleId;
  children: ReactNode;
}

export function SortableWidgetWrapper({
  id,
  isEditMode,
  module,
  children,
}: SortableWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({ id, disabled: !isEditMode });
  const { preferences, updateWidgetSize } = useDashboardPreferencesContext();

  // Only apply transform, never scale — keeps widget at correct size while moving
  const adjustedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(adjustedTransform),
    transition: isSorting ? transition : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const iconColor = MODULE_ICON_COLOURS[module];
  const badgeColors = MODULE_BADGE_COLOURS[module];

  // Get current size (user override or registry default)
  const registrySize = WIDGET_REGISTRY[id]?.size || 'small';
  const currentSize: WidgetSize = preferences.widgetSizes[id] || registrySize;

  const handleCycleSize = () => {
    const currentIdx = SIZE_CYCLE.indexOf(currentSize);
    // If current size isn't in cycle (e.g. 'medium'), start from beginning
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % SIZE_CYCLE.length;
    updateWidgetSize(id, SIZE_CYCLE[nextIdx]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative h-full',
        isDragging && 'opacity-50'
      )}
    >
      {/* Edit mode toolbar */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute -top-7 left-0 right-0 z-10 flex items-center justify-between',
              'px-2 py-1 rounded-t-md',
              'bg-black/[0.04] dark:bg-white/[0.04]',
              'border border-b-0 border-module-fg/20'
            )}
          >
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'flex items-center gap-1 cursor-grab active:cursor-grabbing',
                'text-[10px] font-medium',
                iconColor
              )}
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drag</span>
            </button>

            {/* Resize button */}
            <button
              onClick={handleCycleSize}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded',
                'text-[10px] font-medium transition-colors',
                badgeColors.text,
                'hover:bg-module-fg/10'
              )}
              title={`Size: ${SIZE_LABELS[currentSize]} — click to cycle`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>{SIZE_LABELS[currentSize]}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'h-full rounded-lg transition-shadow duration-200',
          isEditMode && 'ring-1 ring-module-fg/20 mt-7',
          isDragging && 'shadow-lg shadow-black/10 dark:shadow-black/30'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default SortableWidgetWrapper;
