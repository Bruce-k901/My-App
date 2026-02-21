'use client';

import React, { useEffect } from 'react';
import { X } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';
import { QuickActionsGrid } from './QuickActionsGrid';
import { MOBILE_Z } from '@/lib/mobile-layout';

// Module icons for section headers
import {
  Package,        // Stockly
  Wrench,         // Assetly
  Users,          // Teamly
  MessageSquare,  // Msgly
  ClipboardList,  // Checkly
} from '@/components/ui/icons';

const moduleSections = [
  { id: 'checkly', label: 'Checkly', subtitle: 'Compliance', icon: ClipboardList, color: '#F1E194' },
  { id: 'stockly', label: 'Stockly', subtitle: 'Inventory', icon: Package, color: '#10B981' },
  { id: 'assetly', label: 'Assetly', subtitle: 'Assets', icon: Wrench, color: '#0EA5E9' },
  { id: 'teamly', label: 'Teamly', subtitle: 'People', icon: Users, color: '#8B5CF6' },
  { id: 'msgly', label: 'Msgly', subtitle: 'Messaging', icon: MessageSquare, color: '#F59E0B' },
] as const;

export function MoreSheet() {
  const { isMoreSheetOpen, closeMoreSheet } = useMobileNav();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMoreSheet();
    };

    if (isMoreSheetOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMoreSheetOpen, closeMoreSheet]);

  if (!isMoreSheetOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 ${MOBILE_Z.sheetBackdrop} bg-black/60 backdrop-blur-sm animate-in fade-in-0`}
        onClick={closeMoreSheet}
      />

      {/* Sheet - Dark theme */}
      <div
        className={cn(
          `fixed inset-x-0 bottom-0 ${MOBILE_Z.sheet}`,
          "bg-white dark:bg-[#1a1a1f] text-theme-primary rounded-t-3xl",
          "max-h-[85vh] overflow-hidden",
          "animate-in slide-in-from-bottom duration-300",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-black/10 dark:border-white/10">
          <h2 className="text-lg font-semibold text-theme-primary">Quick Access</h2>
          <button
            onClick={closeMoreSheet}
            className="p-2 -mr-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-theme-tertiary" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] overscroll-contain">
          <div className="px-5 pt-2 pb-2 space-y-3">

            {/* Quick Actions */}
            <section>
              <h3 className="text-[10px] font-semibold text-theme-tertiary uppercase tracking-wider mb-2">
                Priority Actions
              </h3>
              <QuickActionsGrid section="quick" />
            </section>

            {/* Module Sections */}
            {moduleSections.map((module) => (
              <section key={module.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${module.color}20` }}
                  >
                    <module.icon size={12} style={{ color: module.color }} />
                  </div>
                  <h3 className="text-[10px] font-semibold text-theme-tertiary uppercase tracking-wider">
                    {module.label}
                  </h3>
                  <span className="text-[10px] text-theme-secondary">
                    {module.subtitle}
                  </span>
                </div>
                <QuickActionsGrid section={module.id} />
              </section>
            ))}

            {/* Settings */}
            <section className="pt-2 border-t border-black/10 dark:border-white/10">
              <h3 className="text-[10px] font-semibold text-theme-tertiary uppercase tracking-wider mb-2">
                Settings
              </h3>
              <QuickActionsGrid section="settings" />
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
