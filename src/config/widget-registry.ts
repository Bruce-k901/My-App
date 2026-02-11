import { lazy, ComponentType } from 'react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'wide';
export type WidgetSection = 'charts' | 'operational';
export type ModuleId = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';
export type RoleId = 'Admin' | 'Owner' | 'Manager' | 'Staff';

export interface WidgetDefinition {
  id: string;
  title: string;
  module: ModuleId;
  size: WidgetSize;
  section?: WidgetSection;
  defaultRoles: RoleId[];
  component: React.LazyExoticComponent<ComponentType<{ siteId: string; companyId: string }>>;
}

// Grid span classes by widget size
export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-1',
  large: 'col-span-1 lg:col-span-2 row-span-2',
  wide: 'col-span-1 lg:col-span-2',
};

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
  missing_orders: {
    id: 'missing_orders',
    title: 'Missing Orders',
    module: 'planly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/MissingOrdersWidget')),
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

  // ── DATA HEALTH ──
  data_health: {
    id: 'data_health',
    title: 'Data Health',
    module: 'checkly',
    size: 'medium',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/widgets-v2/DataHealthWidget')),
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

  // ── CHART WIDGETS ──
  compliance_trend_chart: {
    id: 'compliance_trend_chart',
    title: 'Compliance Trend',
    module: 'checkly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/ComplianceTrendChart')),
  },
  production_output_chart: {
    id: 'production_output_chart',
    title: 'Production Output',
    module: 'planly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/ProductionOutputChart')),
  },
  stock_health_chart: {
    id: 'stock_health_chart',
    title: 'Stock Health',
    module: 'stockly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/StockHealthChart')),
  },
  order_pipeline_chart: {
    id: 'order_pipeline_chart',
    title: 'Order Pipeline',
    module: 'planly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/OrderPipelineChart')),
  },
  eho_score_chart: {
    id: 'eho_score_chart',
    title: 'EHO Readiness',
    module: 'checkly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/EHOScoreChart')),
  },
  temperature_logs_chart: {
    id: 'temperature_logs_chart',
    title: 'Temperature Logs',
    module: 'checkly',
    size: 'wide',
    section: 'charts',
    defaultRoles: ['Admin', 'Owner', 'Manager'],
    component: lazy(() => import('@/components/dashboard/charts/TemperatureLogsChart')),
  },
};

// ============================================================
// MODULE COLOURS - Theme-aware colour system
// Dark theme: uses light module colours (pop against dark bg)
// Light theme: uses dark module colours (read well on light bg)
// ============================================================
export const MODULE_COLOURS: Record<ModuleId, string> = {
  checkly: 'border-l-checkly-dark dark:border-l-checkly',
  stockly: 'border-l-stockly-dark dark:border-l-stockly',
  teamly: 'border-l-teamly-dark dark:border-l-teamly',
  planly: 'border-l-planly-dark dark:border-l-planly',
  assetly: 'border-l-assetly-dark dark:border-l-assetly',
  msgly: 'border-l-msgly-dark dark:border-l-msgly',
};

export const MODULE_BADGE_COLOURS: Record<ModuleId, { text: string; bg: string }> = {
  checkly: { text: 'text-checkly-dark dark:text-checkly', bg: 'bg-checkly-dark/[0.06] dark:bg-checkly/[0.12]' },
  stockly: { text: 'text-stockly-dark dark:text-stockly', bg: 'bg-stockly-dark/[0.06] dark:bg-stockly/[0.12]' },
  teamly: { text: 'text-teamly-dark dark:text-teamly', bg: 'bg-teamly-dark/[0.06] dark:bg-teamly/[0.12]' },
  planly: { text: 'text-planly-dark dark:text-planly', bg: 'bg-planly-dark/[0.06] dark:bg-planly/[0.12]' },
  assetly: { text: 'text-assetly-dark dark:text-assetly', bg: 'bg-assetly-dark/[0.06] dark:bg-assetly/[0.12]' },
  msgly: { text: 'text-msgly-dark dark:text-msgly', bg: 'bg-msgly-dark/[0.06] dark:bg-msgly/[0.12]' },
};

export const MODULE_ICON_COLOURS: Record<ModuleId, string> = {
  checkly: 'text-checkly-dark dark:text-checkly',
  stockly: 'text-stockly-dark dark:text-stockly',
  teamly: 'text-teamly-dark dark:text-teamly',
  planly: 'text-planly-dark dark:text-planly',
  assetly: 'text-assetly-dark dark:text-assetly',
  msgly: 'text-msgly-dark dark:text-msgly',
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
  urgent: { text: 'text-checkly', bg: 'bg-checkly/10', border: 'border-checkly/30' },
  warning: { text: 'text-teamly', bg: 'bg-teamly/10', border: 'border-teamly/30' },
  good: { text: 'text-stockly', bg: 'bg-stockly/10', border: 'border-stockly/30' },
  neutral: { text: 'text-[rgb(var(--text-disabled))]', bg: 'bg-black/[0.03] dark:bg-white/[0.03]', border: 'border-black/10 dark:border-white/10' },
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

// Get widgets by section
export function getWidgetsBySection(section: WidgetSection): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(
    (w) => (w.section || 'operational') === section
  );
}
