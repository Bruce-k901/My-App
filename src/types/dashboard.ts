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
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';

/**
 * Widget section for layout grouping
 */
export type WidgetSection = 'charts' | 'operational';

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
  checkly: { border: 'border-l-checkly', bg: 'bg-checkly/5 dark:bg-checkly/10', text: 'text-checkly/80 dark:text-checkly' },
  stockly: { border: 'border-l-stockly', bg: 'bg-stockly/5 dark:bg-stockly/10', text: 'text-stockly/80 dark:text-stockly' },
  teamly: { border: 'border-l-teamly', bg: 'bg-teamly/5 dark:bg-teamly/10', text: 'text-teamly/80 dark:text-teamly' },
  planly: { border: 'border-l-planly', bg: 'bg-planly/5 dark:bg-planly/10', text: 'text-planly/80 dark:text-planly' },
  assetly: { border: 'border-l-assetly', bg: 'bg-assetly/5 dark:bg-assetly/10', text: 'text-assetly/80 dark:text-assetly' },
  msgly: { border: 'border-l-msgly', bg: 'bg-msgly/5 dark:bg-msgly/10', text: 'text-msgly/80 dark:text-msgly' },
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
