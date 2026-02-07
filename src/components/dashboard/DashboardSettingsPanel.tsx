'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ModuleId, MODULE_NAMES, MODULE_COLORS, WidgetConfig } from '@/types/dashboard';
import { WIDGET_REGISTRY, filterWidgetsByModules } from './widgets';
import { X, RotateCcw, Settings } from 'lucide-react';

interface DashboardSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  enabledModules: ModuleId[];
  visibleWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onResetToDefaults: () => void;
}

/**
 * Settings panel for customizing dashboard widgets
 */
export function DashboardSettingsPanel({
  isOpen,
  onClose,
  enabledModules,
  visibleWidgets,
  onToggleWidget,
  onResetToDefaults,
}: DashboardSettingsPanelProps) {
  // Group available widgets by module
  const widgetsByModule = enabledModules.reduce((acc, module) => {
    acc[module] = WIDGET_REGISTRY.filter((w) => w.module === module);
    return acc;
  }, {} as Record<ModuleId, WidgetConfig[]>);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md z-50',
          'bg-white dark:bg-[#0a0a0a] border-l border-theme dark:border-white/[0.06]',
          'transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
            <h2 className="text-lg font-semibold text-[rgb(var(--text-primary))] dark:text-white">
              Dashboard Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5 text-[rgb(var(--text-secondary))] dark:text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-140px)] p-4">
          <p className="text-sm text-[rgb(var(--text-secondary))] dark:text-white/60 mb-6">
            Choose which widgets to display on your dashboard. Changes are saved automatically.
          </p>

          {/* Widget toggles grouped by module */}
          <div className="space-y-6">
            {enabledModules.map((module) => {
              const widgets = widgetsByModule[module];
              if (!widgets || widgets.length === 0) return null;

              const colors = MODULE_COLORS[module];

              return (
                <div key={module}>
                  {/* Module header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-3 h-3 rounded-full', colors.bg.replace('bg-', 'bg-').replace('/10', ''))}
                         style={{ backgroundColor: colors.text.includes('blue') ? '#3B82F6' :
                                                   colors.text.includes('green') ? '#10B981' :
                                                   colors.text.includes('purple') ? '#8B5CF6' :
                                                   colors.text.includes('orange') ? '#F97316' :
                                                   colors.text.includes('gray') ? '#6B7280' :
                                                   colors.text.includes('amber') ? '#F59E0B' : '#6B7280' }} />
                    <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] dark:text-white">
                      {MODULE_NAMES[module]}
                    </h3>
                  </div>

                  {/* Widget toggles */}
                  <div className="space-y-2">
                    {widgets.map((widget) => {
                      const isVisible = visibleWidgets.includes(widget.id);

                      return (
                        <label
                          key={widget.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/[0.02] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-medium text-[rgb(var(--text-primary))] dark:text-white">
                              {widget.name}
                            </p>
                            <p className="text-xs text-[rgb(var(--text-tertiary))] dark:text-white/40 truncate">
                              {widget.description}
                            </p>
                          </div>
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => onToggleWidget(widget.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-theme dark:border-white/[0.06] bg-white dark:bg-[#0a0a0a]">
          <button
            onClick={onResetToDefaults}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme dark:border-white/[0.06] text-[rgb(var(--text-secondary))] dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Settings button to open the panel
 */
export function DashboardSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface dark:bg-white/[0.03] border border-theme dark:border-white/[0.06] hover:border-pink-500/50 dark:hover:border-pink-500/50 transition-colors"
      title="Dashboard settings"
    >
      <Settings className="w-4 h-4 text-[rgb(var(--text-secondary))] dark:text-white/60" />
      <span className="text-sm font-medium text-[rgb(var(--text-secondary))] dark:text-white/60 hidden sm:inline">
        Customize
      </span>
    </button>
  );
}
