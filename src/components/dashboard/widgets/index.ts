/**
 * Widget Registry
 * Central registry of all dashboard widgets with their configurations
 */

import { lazy } from 'react';
import { WidgetConfig, ModuleId } from '@/types/dashboard';

// Lazy load all widget components
const ComplianceScoreWidget = lazy(() => import('./checkly/ComplianceScoreWidget'));
const OverdueChecksWidget = lazy(() => import('./checkly/OverdueChecksWidget'));
const TodaysChecksWidget = lazy(() => import('./checkly/TodaysChecksWidget'));
const RecentIncidentsWidget = lazy(() => import('./checkly/RecentIncidentsWidget'));

const LowStockAlertsWidget = lazy(() => import('./stockly/LowStockAlertsWidget'));
const PendingOrdersWidget = lazy(() => import('./stockly/PendingOrdersWidget'));
const RecentDeliveriesWidget = lazy(() => import('./stockly/RecentDeliveriesWidget'));
const StockValueSummaryWidget = lazy(() => import('./stockly/StockValueSummaryWidget'));

const WhosOnTodayWidget = lazy(() => import('./teamly/WhosOnTodayWidget'));
const TrainingExpiriesWidget = lazy(() => import('./teamly/TrainingExpiriesWidget'));
const AbsenceAlertsWidget = lazy(() => import('./teamly/AbsenceAlertsWidget'));
const HoursThisWeekWidget = lazy(() => import('./teamly/HoursThisWeekWidget'));

const TodaysProductionWidget = lazy(() => import('./planly/TodaysProductionWidget'));
const PlanlyPendingOrdersWidget = lazy(() => import('./planly/PlanlyPendingOrdersWidget'));
const DeliveryScheduleWidget = lazy(() => import('./planly/DeliveryScheduleWidget'));

const OverdueMaintenanceWidget = lazy(() => import('./assetly/OverdueMaintenanceWidget'));
const AssetIssuesWidget = lazy(() => import('./assetly/AssetIssuesWidget'));
const UpcomingServiceWidget = lazy(() => import('./assetly/UpcomingServiceWidget'));

const UnreadMessagesWidget = lazy(() => import('./msgly/UnreadMessagesWidget'));
const RecentAnnouncementsWidget = lazy(() => import('./msgly/RecentAnnouncementsWidget'));

/**
 * Complete widget registry with all configurations
 */
export const WIDGET_REGISTRY: WidgetConfig[] = [
  // ============ CHECKLY WIDGETS ============
  {
    id: 'checkly.compliance_score',
    module: 'checkly',
    name: 'Compliance Score',
    description: 'Current site compliance score with trend indicator',
    component: ComplianceScoreWidget,
    defaultSize: 'small',
    roles: ['all'],
    priority: 10,
  },
  {
    id: 'checkly.overdue_checks',
    module: 'checkly',
    name: 'Overdue Checks',
    description: 'Tasks and checks past their due date',
    component: OverdueChecksWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 15,
  },
  {
    id: 'checkly.todays_checks',
    module: 'checkly',
    name: "Today's Checks",
    description: 'Checklist tasks due today with completion status',
    component: TodaysChecksWidget,
    defaultSize: 'medium',
    roles: ['all'],
    priority: 20,
  },
  {
    id: 'checkly.recent_incidents',
    module: 'checkly',
    name: 'Recent Incidents',
    description: 'Last 5 incidents logged with status',
    component: RecentIncidentsWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 25,
  },

  // ============ STOCKLY WIDGETS ============
  {
    id: 'stockly.low_stock_alerts',
    module: 'stockly',
    name: 'Low Stock Alerts',
    description: 'Products below minimum stock levels',
    component: LowStockAlertsWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager', 'kitchen', 'warehouse'],
    priority: 30,
  },
  {
    id: 'stockly.pending_orders',
    module: 'stockly',
    name: 'Pending Orders',
    description: 'Purchase orders awaiting delivery',
    component: PendingOrdersWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'warehouse'],
    priority: 35,
  },
  {
    id: 'stockly.recent_deliveries',
    module: 'stockly',
    name: 'Recent Deliveries',
    description: 'Last 5 deliveries received',
    component: RecentDeliveriesWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'warehouse'],
    priority: 40,
  },
  {
    id: 'stockly.stock_value_summary',
    module: 'stockly',
    name: 'Stock Value',
    description: 'Total inventory value by category',
    component: StockValueSummaryWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin'],
    priority: 45,
  },

  // ============ TEAMLY WIDGETS ============
  {
    id: 'teamly.whos_on_today',
    module: 'teamly',
    name: "Who's On Today",
    description: 'Staff scheduled for today with shift times',
    component: WhosOnTodayWidget,
    defaultSize: 'medium',
    roles: ['all'],
    priority: 50,
  },
  {
    id: 'teamly.training_expiries',
    module: 'teamly',
    name: 'Training Expiries',
    description: 'Staff with training expiring within 30 days',
    component: TrainingExpiriesWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 55,
  },
  {
    id: 'teamly.absence_alerts',
    module: 'teamly',
    name: 'Absence Alerts',
    description: 'Staff currently absent or with approved leave',
    component: AbsenceAlertsWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 60,
  },
  {
    id: 'teamly.hours_this_week',
    module: 'teamly',
    name: 'Hours This Week',
    description: 'Scheduled vs contracted hours for the week',
    component: HoursThisWeekWidget,
    defaultSize: 'small',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 65,
  },

  // ============ PLANLY WIDGETS ============
  {
    id: 'planly.todays_production',
    module: 'planly',
    name: "Today's Production",
    description: 'Production tasks for today with progress',
    component: TodaysProductionWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager', 'kitchen'],
    priority: 70,
  },
  {
    id: 'planly.pending_orders',
    module: 'planly',
    name: 'Pending Orders',
    description: 'Customer orders not yet scheduled',
    component: PlanlyPendingOrdersWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager', 'kitchen'],
    priority: 75,
  },
  {
    id: 'planly.delivery_schedule',
    module: 'planly',
    name: 'Delivery Schedule',
    description: 'Upcoming deliveries for next 3 days',
    component: DeliveryScheduleWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager', 'kitchen', 'warehouse'],
    priority: 80,
  },

  // ============ ASSETLY WIDGETS ============
  {
    id: 'assetly.overdue_maintenance',
    module: 'assetly',
    name: 'Overdue Maintenance',
    description: 'Assets with overdue maintenance tasks',
    component: OverdueMaintenanceWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager', 'warehouse'],
    priority: 85,
  },
  {
    id: 'assetly.asset_issues',
    module: 'assetly',
    name: 'Asset Issues',
    description: 'Assets flagged with faults or issues',
    component: AssetIssuesWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'site_manager'],
    priority: 90,
  },
  {
    id: 'assetly.upcoming_service',
    module: 'assetly',
    name: 'Upcoming Service',
    description: 'Assets due for service within 14 days',
    component: UpcomingServiceWidget,
    defaultSize: 'medium',
    roles: ['owner', 'admin', 'warehouse'],
    priority: 95,
  },

  // ============ MSGLY WIDGETS ============
  {
    id: 'msgly.unread_messages',
    module: 'msgly',
    name: 'Unread Messages',
    description: 'Count of unread messages with quick access',
    component: UnreadMessagesWidget,
    defaultSize: 'small',
    roles: ['all'],
    priority: 100,
  },
  {
    id: 'msgly.recent_announcements',
    module: 'msgly',
    name: 'Recent Announcements',
    description: 'Latest company-wide announcements',
    component: RecentAnnouncementsWidget,
    defaultSize: 'medium',
    roles: ['all'],
    priority: 105,
  },
];

/**
 * Get widget by ID
 */
export function getWidgetById(id: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

/**
 * Get all widgets for a specific module
 */
export function getWidgetsByModule(module: ModuleId): WidgetConfig[] {
  return WIDGET_REGISTRY.filter((w) => w.module === module);
}

/**
 * Filter widgets by enabled modules
 */
export function filterWidgetsByModules(enabledModules: ModuleId[]): WidgetConfig[] {
  return WIDGET_REGISTRY.filter((w) => enabledModules.includes(w.module));
}

/**
 * Sort widgets by their configured order or priority
 */
export function sortWidgets(widgets: WidgetConfig[], order?: string[]): WidgetConfig[] {
  if (!order || order.length === 0) {
    return [...widgets].sort((a, b) => a.priority - b.priority);
  }

  const orderMap = new Map(order.map((id, idx) => [id, idx]));

  return [...widgets].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? a.priority + 1000;
    const orderB = orderMap.get(b.id) ?? b.priority + 1000;
    return orderA - orderB;
  });
}

// Re-export types and components
export { WidgetWrapper, WidgetCard, WidgetEmptyState, WidgetLoading } from './WidgetWrapper';
export { WidgetSkeleton, WidgetGridSkeleton } from './WidgetSkeleton';
