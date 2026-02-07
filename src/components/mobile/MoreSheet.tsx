'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileNav } from './MobileNavProvider';
import { QuickActionsGrid } from './QuickActionsGrid';

// Module icons for section headers
import {
  Package,        // Stockly
  Wrench,         // Assetly
  Users,          // Teamly
  MessageSquare,  // Msgly
} from 'lucide-react';

const moduleSections = [
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
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
        onClick={closeMoreSheet}
      />

      {/* Sheet - Dark theme */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "bg-[#1a1a1f] text-white rounded-t-3xl",
          "max-h-[80vh] overflow-hidden",
          "animate-in slide-in-from-bottom duration-300",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Quick Access</h2>
          <button
            onClick={closeMoreSheet}
            className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] overscroll-contain">
          <div className="px-5 py-4 space-y-6">

            {/* Quick Actions */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Priority Actions
              </h3>
              <QuickActionsGrid section="quick" />
            </section>

            {/* Module Sections */}
            {moduleSections.map((module) => (
              <section key={module.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${module.color}20` }}
                  >
                    <module.icon size={14} style={{ color: module.color }} />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {module.label}
                  </h3>
                  <span className="text-xs text-gray-600">
                    {module.subtitle}
                  </span>
                </div>
                <QuickActionsGrid section={module.id} />
              </section>
            ))}

            {/* Settings */}
            <section className="pt-2 border-t border-white/10">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
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
