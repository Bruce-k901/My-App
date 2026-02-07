'use client';

import { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardPreferences } from '@/hooks/dashboard/useDashboardPreferences';
import { useEnabledModules } from '@/hooks/dashboard';
import {
  WIDGET_REGISTRY,
  MODULE_LABELS,
  MODULE_BADGE_COLOURS,
  getWidgetsGroupedByModule,
  type ModuleId,
} from '@/config/widget-registry';

/**
 * DashboardSettings - Slide-out panel for widget visibility toggles
 */
export function DashboardSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { preferences, toggleWidget, resetToDefaults, loading } = useDashboardPreferences();
  const { enabledModules } = useEnabledModules();

  const widgetsByModule = getWidgetsGroupedByModule();

  // Filter to only show enabled modules
  const modulesToShow = (Object.keys(widgetsByModule) as ModuleId[]).filter((module) =>
    enabledModules.includes(module)
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
        title="Dashboard Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 bg-[#171B2D] border-l border-white/[0.06] z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Dashboard Settings</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-120px)]">
          <p className="text-[11px] text-white/40 mb-4">
            Toggle widgets on or off to customize your dashboard. Changes are saved automatically.
          </p>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              {modulesToShow.map((module) => {
                const widgets = widgetsByModule[module];
                const badgeColors = MODULE_BADGE_COLOURS[module];

                if (widgets.length === 0) return null;

                return (
                  <div key={module}>
                    {/* Module header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'text-[9px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded',
                          badgeColors.text,
                          badgeColors.bg
                        )}
                      >
                        {MODULE_LABELS[module]}
                      </span>
                    </div>

                    {/* Widget toggles */}
                    <div className="space-y-1">
                      {widgets.map((widget) => {
                        const isVisible = preferences.visibleWidgets.includes(widget.id);

                        return (
                          <label
                            key={widget.id}
                            className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-white/[0.03] cursor-pointer transition-colors"
                          >
                            <span className="text-[12px] text-white/60">{widget.title}</span>
                            {/* Toggle switch */}
                            <button
                              onClick={() => toggleWidget(widget.id)}
                              className={cn(
                                'relative w-9 h-5 rounded-full transition-colors',
                                isVisible
                                  ? 'bg-fuchsia-500/30'
                                  : 'bg-white/10'
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                                  isVisible
                                    ? 'left-4.5 bg-fuchsia-400'
                                    : 'left-0.5 bg-white/40'
                                )}
                                style={{
                                  left: isVisible ? '18px' : '2px',
                                }}
                              />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06] bg-[#171B2D]">
          <button
            onClick={resetToDefaults}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md bg-white/[0.03] border border-white/[0.06] text-white/40 text-[11px] font-medium hover:bg-white/[0.06] hover:text-white/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}

export default DashboardSettings;
