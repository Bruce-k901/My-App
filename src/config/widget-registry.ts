import { lazy, ComponentType } from 'react';

export type WidgetSize = 'small' | 'medium';
export type ModuleId = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';
export type RoleId = 'Admin' | 'Owner' | 'Manager' | 'Staff';

export interface WidgetDefinition {
  id: string;
  title: string;
  module: ModuleId;
  size: WidgetSize;
  defaultRoles: RoleId[];
  component: React.LazyExoticComponent<ComponentType<{ siteId: string; companyId: string }>>;
}

// ============================================================
// WIDGET REGISTRY - Single source of truth for all widgets
// ============================================================
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // ── CHECKLY ──
  compliance_score: {
    id: 'compliance_score',
    title: 'Compliance Score',
    module: 'checkly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager', 'Staff'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/ComplianceScoreWidget')),
  },
  overdue_checks: {
    id: 'overdue_checks',
    title: 'Overdue Checks',
    module: 'checkly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager', 'Staff'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/OverdueChecksWidget')),
  },
  todays_checks: {
    id: 'todays_checks',
    title: "Today's Checks",
    module: 'checkly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager', 'Staff'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/TodaysChecksWidget')),
  },

  // ── STOCKLY ──
  low_stock_alerts: {
    id: 'low_stock_alerts',
    title: 'Low Stock Alerts',
    module: 'stockly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/LowStockWidget')),
  },
  pending_stock_orders: {
    id: 'pending_stock_orders',
    title: 'Pending Orders',
    module: 'stockly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/PendingStockOrdersWidget')),
  },

  // ── TEAMLY ──
  whos_on_today: {
    id: 'whos_on_today',
    title: "Who's On Today",
    module: 'teamly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/WhosOnTodayWidget')),
  },
  training_expiries: {
    id: 'training_expiries',
    title: 'Training Expiries',
    module: 'teamly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/TrainingExpiriesWidget')),
  },

  // ── PLANLY ──
  todays_production: {
    id: 'todays_production',
    title: "Today's Production",
    module: 'planly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/TodaysProductionWidget')),
  },
  pending_customer_orders: {
    id: 'pending_customer_orders',
    title: 'Pending Customer Orders',
    module: 'planly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/PendingCustomerOrdersWidget')),
  },

  // ── ASSETLY ──
  overdue_maintenance: {
    id: 'overdue_maintenance',
    title: 'Overdue Maintenance',
    module: 'assetly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/OverdueMaintenanceWidget')),
  },
  asset_issues: {
    id: 'asset_issues',
    title: 'Asset Issues',
    module: 'assetly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/AssetIssuesWidget')),
  },

  // ── MSGLY ──
  unread_messages: {
    id: 'unread_messages',
    title: 'Unread Messages',
    module: 'msgly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager', 'Staff'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/UnreadMessagesWidget')),
  },
};

// ============================================================
// MODULE COLOURS - Dark mode colour system
// ============================================================
export const MODULE_COLOURS: Record<ModuleId, string> = {
  checkly: 'border-l-fuchsia-400',
  stockly: 'border-l-emerald-400',
  teamly: 'border-l-blue-400',
  planly: 'border-l-orange-400',
  assetly: 'border-l-cyan-400',
  msgly: 'border-l-teal-400',
};

export const MODULE_BADGE_COLOURS: Record<ModuleId, { text: string; bg: string }> = {
  checkly: { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
  stockly: { text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  teamly: { text: 'text-blue-400', bg: 'bg-blue-500/10' },
  planly: { text: 'text-orange-400', bg: 'bg-orange-500/10' },
  assetly: { text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  msgly: { text: 'text-teal-400', bg: 'bg-teal-500/10' },
};

export const MODULE_ICON_COLOURS: Record<ModuleId, string> = {
  checkly: 'text-fuchsia-400',
  stockly: 'text-emerald-400',
  teamly: 'text-blue-400',
  planly: 'text-orange-400',
  assetly: 'text-cyan-400',
  msgly: 'text-teal-400',
};

export const MODULE_LABELS: Record<ModuleId, string> = {
  checkly: 'Checkly',
  stockly: 'Stockly',
  teamly: 'Teamly',
  planly: 'Planly',
  assetly: 'Assetly',
  msgly: 'Msgly',
};

// ============================================================
// STATUS COLOURS - Use these instead of traffic lights
// ============================================================
export const STATUS_COLOURS = {
  urgent: { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-400/30' },
  warning: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/30' },
  good: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/30' },
  neutral: { text: 'text-white/40', bg: 'bg-white/[0.03]', border: 'border-white/10' },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Get widgets for a specific role (default visibility)
export function getDefaultWidgetsForRole(role: RoleId): string[] {
  return Object.values(WIDGET_REGISTRY)
    .filter(widget => widget.defaultRoles.includes(role))
    .map(widget => widget.id);
}

// Get widgets for a specific module
export function getWidgetsForModule(module: ModuleId): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(widget => widget.module === module);
}

// Get all widgets grouped by module
export function getWidgetsGroupedByModule(): Record<ModuleId, WidgetDefinition[]> {
  const grouped: Record<ModuleId, WidgetDefinition[]> = {
    checkly: [],
    stockly: [],
    teamly: [],
    planly: [],
    assetly: [],
    msgly: [],
  };

  Object.values(WIDGET_REGISTRY).forEach(widget => {
    grouped[widget.module].push(widget);
  });

  return grouped;
}

// Get widget definition by ID
export function getWidgetById(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[id];
}
