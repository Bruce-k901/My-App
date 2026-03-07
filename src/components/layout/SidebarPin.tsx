'use client';

import { PanelLeftClose, PanelLeft } from '@/components/ui/icons';

interface SidebarPinProps {
  isCollapsed: boolean;
  onToggle: () => void;
  accentColor?: string;
}

/**
 * Small pin/toggle button rendered inline next to the profile section in module sidebars.
 * Collapsed sidebar: shows expand icon. Expanded sidebar: shows collapse icon.
 */
export function SidebarPin({ isCollapsed, onToggle, accentColor }: SidebarPinProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary transition-colors group"
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? (
        <PanelLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
      ) : (
        <PanelLeftClose className="w-4 h-4 group-hover:scale-110 transition-transform" />
      )}
    </button>
  );
}
