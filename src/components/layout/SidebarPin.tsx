'use client';

import { PanelLeftClose, PanelLeft } from '@/components/ui/icons';

interface SidebarPinProps {
  isCollapsed: boolean;
  onToggle: () => void;
  accentColor?: string;
}

/**
 * Small pin/toggle button rendered at the bottom of module sidebars.
 * Collapsed: shows expand icon. Expanded: shows collapse icon.
 */
export function SidebarPin({ isCollapsed, onToggle, accentColor }: SidebarPinProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-center w-full py-2 text-theme-tertiary hover:text-theme-secondary dark:hover:text-theme-secondary transition-colors group"
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
