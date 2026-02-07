/**
 * Dashboard Type Definitions
 * Types for the modular dashboard system with widgets, preferences, and module filtering
 */

import { ComponentType } from 'react';

/**
 * Module identifiers for the Opsly platform
 */
export type ModuleId = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';

/**
 * Widget size hints for grid layout
 */
export type WidgetSize = 'small' | 'medium' | 'large';

/**
 * Role slugs used for default widget visibility
 */
export type RoleSlug =
  | 'owner'
  | 'admin'
  | 'site_manager'
  | 'kitchen'
  | 'front_of_house'
  | 'warehouse'
  | 'staff';

/**
 * Props passed to every widget component
 */
export interface WidgetProps {
  companyId: string;
  siteId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Configuration for a single widget in the registry
 */
export interface WidgetConfig {
  /** Unique identifier in format "module.widget_name" */
  id: string;
  /** Module this widget belongs to */
  module: ModuleId;
  /** Display name shown in UI */
  name: string;
  /** Short description for settings panel */
  description: string;
  /** The React component to render */
  component: ComponentType<WidgetProps>;
  /** Size hint for grid layout */
  defaultSize: WidgetSize;
  /** Roles that see this widget by default. Use 'all' for everyone */
  roles: (RoleSlug | 'all')[];
  /** Display priority (lower = higher priority) */
  priority: number;
  /** Optional auto-refresh interval in milliseconds */
  refreshInterval?: number;
  /** Optional minimum height in pixels */
  minHeight?: number;
}

/**
 * User's dashboard preferences stored in the database
 */
export interface DashboardPreferences {
  /** Array of widget IDs that are visible */
  visibleWidgets: string[];
  /** Array of widget IDs in display order */
  widgetOrder: string[];
  /** Array of widget IDs that are collapsed (mobile) */
  collapsedWidgets: string[];
}

/**
 * Database row for user_dashboard_preferences table
 */
export interface DashboardPreferencesRow {
  id: string;
  user_id: string;
  site_id: string | null;
  visible_widgets: string[];
  widget_order: string[];
  collapsed_widgets?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Module colors for visual identification
 * Updated to match Opsly dark mode colour system
 */
export const MODULE_COLORS: Record<ModuleId, { border: string; bg: string; text: string }> = {
  checkly: { border: 'border-l-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/10', text: 'text-fuchsia-600 dark:text-fuchsia-400' },
  stockly: { border: 'border-l-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  teamly: { border: 'border-l-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  planly: { border: 'border-l-orange-400', bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  assetly: { border: 'border-l-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  msgly: { border: 'border-l-teal-400', bg: 'bg-teal-100 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
};

/**
 * Module display names
 */
export const MODULE_NAMES: Record<ModuleId, string> = {
  checkly: 'Checkly',
  stockly: 'Stockly',
  teamly: 'Teamly',
  planly: 'Planly',
  assetly: 'Assetly',
  msgly: 'Msgly',
};

/**
 * Quick navigation button configuration
 */
export interface QuickNavItem {
  id: string;
  label: string;
  href: string;
  module: ModuleId;
  icon: string;
}

/**
 * Dashboard variant for responsive layouts
 */
export type DashboardVariant = 'mobile' | 'desktop';
