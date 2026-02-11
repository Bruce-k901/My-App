'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import {
  MODULE_BADGE_COLOURS,
  MODULE_LABELS,
  type ModuleId,
} from '@/config/widget-registry';

interface WidgetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  module: ModuleId;
  children: ReactNode;
}

export function WidgetDetailModal({
  isOpen,
  onClose,
  title,
  module,
  children,
}: WidgetDetailModalProps) {
  const badgeColors = MODULE_BADGE_COLOURS[module];
  const moduleLabel = MODULE_LABELS[module];

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50',
              'inset-4 lg:inset-[10%]',
              'bg-[rgb(var(--surface-elevated))] dark:bg-[#171B2D]',
              'border border-module-fg/[0.12] rounded-xl',
              'flex flex-col',
              'overflow-hidden'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-module-fg/[0.12]">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-[0.06em]',
                    'px-1.5 py-0.5 rounded',
                    badgeColors.text,
                    badgeColors.bg
                  )}
                >
                  {moduleLabel}
                </span>
                <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">
                  {title}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-[rgb(var(--text-disabled))] hover:text-[rgb(var(--text-primary))] hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
