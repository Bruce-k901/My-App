# Dashboard System Overview

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Widget Registry System](#widget-registry-system)
- [Dashboard Components](#dashboard-components)
- [Available Widgets](#available-widgets)
- [User Preferences & Settings](#user-preferences--settings)
- [Role-Based Defaults](#role-based-defaults)
- [Module System](#module-system)
- [Lazy Loading & Error Boundaries](#lazy-loading--error-boundaries)
- [Key Files Reference](#key-files-reference)

---

## Architecture Overview

The Opsly Dashboard is a modular, widget-based system built with Next.js 16, React, Tailwind CSS, and Framer Motion. It provides a customizable, role-aware interface that adapts to enabled modules and user preferences.

### Core Principles

- **Single Source of Truth**: Widget registry (`widget-registry.ts`) defines all widgets
- **Role-Based Defaults**: Different widgets shown based on user role (Owner, Admin, Manager, Staff, etc.)
- **Module Filtering**: Widgets only appear if their module is enabled for the company
- **User Customization**: Users can toggle widgets on/off via settings panel
- **Performance**: Lazy loading, React.Suspense, and error boundaries for each widget
- **Responsive**: Mobile and desktop layouts with different grid systems

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (DashboardSettings button)                              │
├─────────────────────────────────────────────────────────────────┤
│  EnhancedWeatherWidget                                          │
├─────────────────────────────────────────────────────────────────┤
│  QuickNavBar (Action buttons: Tasks, Rota, Production, etc.)   │
├─────────────────────────────────────────────────────────────────┤
│  KPIHeroSection (Always visible, not toggleable)               │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│  │ Tasks │ │ Comp. │ │ Incid.│ │ Orders│ │ Staff │           │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘           │
├─────────────────────────────────────────────────────────────────┤
│  ChartSection (2-column grid of chart widgets)                 │
│  ┌──────────────────────┐ ┌──────────────────────┐            │
│  │ Compliance Trend     │ │ Production Output    │            │
│  └──────────────────────┘ └──────────────────────┘            │
│  ┌──────────────────────┐ ┌──────────────────────┐            │
│  │ Stock Health         │ │ Order Pipeline       │            │
│  └──────────────────────┘ └──────────────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  WidgetGrid (3-column grid of operational widgets)             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│  │Compliance│ │Overdue  │ │Today's  │                          │
│  │ Score   │ │ Checks  │ │ Checks  │                          │
│  └─────────┘ └─────────┘ └─────────┘                          │
└─────────────────────────────────────────────────────────────────┘
│  DashboardSidebar (Pinned, always visible)                     │
│  ┌───────────────────────────────┐                             │
│  │ Activity Feed | Incidents     │                             │
│  │                               │                             │
│  └───────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Widget Registry System

The widget registry is the **single source of truth** for all dashboard widgets.

### Location

`src/config/widget-registry.ts`

### Widget Definition

```typescript
export interface WidgetDefinition {
  id: string;                    // Unique ID (e.g., "compliance_score")
  title: string;                 // Display name
  module: ModuleId;              // Module it belongs to
  size: WidgetSize;              // small | medium | large | wide
  section?: WidgetSection;       // 'charts' | 'operational' (default: operational)
  defaultRoles: RoleId[];        // Roles that see this widget by default
  component: React.LazyExoticComponent<...>;  // Lazy-loaded component
}
```

### Widget Sizes

```typescript
export const WIDGET_SIZE_CLASSES: Record<WidgetSize, string> = {
  small: "col-span-1", // 1 column
  medium: "col-span-1", // 1 column
  large: "col-span-1 lg:col-span-2 row-span-2", // 2 columns, 2 rows (desktop)
  wide: "col-span-1 lg:col-span-2", // 2 columns (charts)
};
```

### Widget Sections

- **`operational`** (default): Rendered in `WidgetGrid` (3-column grid)
- **`charts`**: Rendered in `ChartSection` (2-column grid)

### Example Widget Registration

```typescript
compliance_score: {
  id: 'compliance_score',
  title: 'Compliance Score',
  module: 'checkly',
  size: 'medium',
  defaultRoles: ['Admin', 'Owner', 'Manager', 'Staff'],
  component: lazy(() => import('@/components/dashboard/widgets-v2/ComplianceScoreWidget')),
}
```

---

## Dashboard Components

### Main Dashboard Component

**File**: `src/components/dashboard/OpslyDashboard.tsx`

Orchestrates all dashboard sections. Handles mobile vs desktop layouts.

**Props**:

- `variant?: 'mobile' | 'desktop'` - Layout variant

### KPI Hero Section (Always Visible)

**File**: `src/components/dashboard/KPIHeroSection.tsx`

Displays 5 key performance indicators as cards with sparklines. **Not toggleable** - always visible to all users.

**KPI Cards**:

- Tasks Completed
- Today's Compliance
- Open Incidents
- Pending Orders
- Staff On Shift

Each card shows:

- Current value
- Trend indicator (↑/↓)
- Sparkline (last 7 days)
- Status-based color (good/warning/urgent)

### Chart Section

**File**: `src/components/dashboard/ChartSection.tsx`

Renders chart widgets in a 2-column grid (mobile: 1 column). Only shows widgets with `section: 'charts'` from the registry.

**Features**:

- Filters by enabled modules
- Filters by user preferences
- Uses `React.lazy()` and `Suspense`
- Error boundaries per chart

### Widget Grid

**File**: `src/components/dashboard/WidgetGrid.tsx`

Renders operational widgets in a 3-column grid (mobile: 1 column). Excludes chart widgets.

**Features**:

- Role-based defaults if no preferences exist
- Module filtering
- Lazy loading with Suspense
- Error boundaries per widget
- Framer Motion animations

### Widget Card

**File**: `src/components/dashboard/WidgetCard.tsx`

Standard wrapper for operational widgets.

**Features**:

- Module-colored left border (3px)
- Module badge (small uppercase label)
- Optional "View all →" link
- Expand button support

**Helper Components**:

- `WidgetSkeleton` - Loading skeleton
- `CountBadge` - Status count badge
- `MiniItem` - List item
- `ProgressBar` - Progress indicator

### Chart Widget Card

**File**: `src/components/dashboard/charts/ChartWidgetCard.tsx`

Standard wrapper for chart widgets.

**Features**:

- Module-colored left border (4px)
- Elevated shadow
- White/dark background
- Min height 280px
- Consistent with chart styling

### Dashboard Settings

**File**: `src/components/dashboard/DashboardSettings.tsx`

Slide-out panel for toggling widget visibility.

**Features**:

- Settings gear icon in header
- Slide-out from right (300ms animation)
- Grouped by module
- Toggle switches for each widget
- "Reset to Defaults" button
- Auto-saves to database + localStorage

### Dashboard Sidebar (Pinned)

**File**: `src/components/dashboard/DashboardSidebar.tsx`

Fixed 280px sidebar (desktop) or full-screen overlay (mobile).

**Features**:

- **Always visible** - not customizable
- Two tabs: Activity Feed | Incidents
- Real-time incident updates
- "Report New Incident" button
- Pinned indicator at bottom

### Quick Nav Bar

**File**: `src/components/dashboard/QuickNavBar.tsx`

Quick action buttons for common tasks.

**Actions**:

- Today's Tasks
- Today's Rota
- Production Plan
- Calendar
- Messages
- Place Orders
- Receipt Orders

Filtered by enabled modules.

---

## Available Widgets

### Operational Widgets (Widget Grid)

| Widget ID                 | Title                   | Module  | Size   | Description                                  |
| ------------------------- | ----------------------- | ------- | ------ | -------------------------------------------- |
| `compliance_score`        | Compliance Score        | checkly | medium | Weekly compliance percentage with ring chart |
| `overdue_checks`          | Overdue Checks          | checkly | medium | List of overdue checklist tasks              |
| `todays_checks`           | Today's Checks          | checkly | medium | Checklist tasks due today                    |
| `low_stock_alerts`        | Low Stock Alerts        | stockly | medium | Products below reorder level                 |
| `pending_stock_orders`    | Pending Orders          | stockly | medium | Stock orders awaiting receipt                |
| `whos_on_today`           | Who's On Today          | teamly  | medium | Staff clocked in or scheduled                |
| `training_expiries`       | Training Expiries       | teamly  | medium | Upcoming training certificate expiries       |
| `todays_production`       | Today's Production      | planly  | medium | Production orders for today                  |
| `pending_customer_orders` | Pending Customer Orders | planly  | medium | Customer orders not yet produced             |
| `missing_orders`          | Missing Orders          | planly  | medium | Expected orders not yet received             |
| `overdue_maintenance`     | Overdue Maintenance     | assetly | medium | Assets with overdue maintenance              |
| `asset_issues`            | Asset Issues            | assetly | medium | Reported asset issues                        |
| `data_health`             | Data Health             | checkly | medium | Data quality indicators                      |
| `unread_messages`         | Unread Messages         | msgly   | medium | Unread message count                         |

### Chart Widgets (Chart Section)

| Widget ID                 | Title             | Module  | Size | Description                                  |
| ------------------------- | ----------------- | ------- | ---- | -------------------------------------------- |
| `compliance_trend_chart`  | Compliance Trend  | checkly | wide | 14-day compliance trend line                 |
| `production_output_chart` | Production Output | planly  | wide | Daily production volume over time            |
| `stock_health_chart`      | Stock Health      | stockly | wide | Stock levels and trends                      |
| `order_pipeline_chart`    | Order Pipeline    | planly  | wide | Orders by status over time                   |
| `eho_score_chart`         | EHO Readiness     | checkly | wide | Environmental Health Officer readiness score |
| `temperature_logs_chart`  | Temperature Logs  | checkly | wide | Temperature monitoring trends                |

---

## User Preferences & Settings

### Preference System

**Hook**: `useDashboardPreferences()` (`src/hooks/dashboard/useDashboardPreferences.ts`)

**Storage**:

1. **Database** (`user_dashboard_preferences` table) - Source of truth
2. **localStorage** - Cache for instant hydration

**Preference Shape**:

```typescript
interface DashboardPreferences {
  visibleWidgets: string[]; // Widget IDs that are visible
  widgetOrder: string[]; // Order of widgets (for future drag-drop)
  collapsedWidgets: string[]; // Collapsed state (mobile)
}
```

### Preference Flow

1. **Initial Load**:
   - Read from localStorage (instant hydration)
   - Fetch from database (authoritative)
   - If no DB preferences exist, use role-based defaults

2. **User Toggles Widget**:
   - Update React state (instant UI update)
   - Save to localStorage (persist across refreshes)
   - Upsert to database (sync across devices)

3. **Reset to Defaults**:
   - Clears user preferences
   - Restores role-based defaults
   - Updates localStorage + database

### Settings Panel Usage

```typescript
const {
  preferences, // Current preferences
  toggleWidget, // Toggle widget on/off
  resetToDefaults, // Reset to role defaults
  loading, // Loading state
} = useDashboardPreferences();

// Toggle a widget
await toggleWidget("compliance_score");

// Reset to defaults
await resetToDefaults();
```

---

## Role-Based Defaults

**File**: `src/hooks/dashboard/useRoleDefaults.ts`

Each role has a predefined set of default widgets shown on first visit.

### Role Mapping

```typescript
export type RoleSlug =
  | "owner"
  | "admin"
  | "site_manager"
  | "kitchen"
  | "front_of_house"
  | "warehouse"
  | "staff";
```

### Default Widgets by Role

#### Owner / Admin

- All chart widgets
- All operational widgets
- Full dashboard access

#### Site Manager

- Compliance trend chart
- Stock health chart
- EHO score chart
- Temperature logs chart
- Compliance score
- Overdue checks
- Today's checks
- Low stock alerts
- Who's on today
- Training expiries
- Asset issues
- Unread messages

#### Kitchen Staff

- Today's checks
- Overdue checks
- Low stock alerts
- Today's production
- Pending customer orders
- Who's on today
- Unread messages

#### Front of House

- Compliance score
- Today's checks
- Who's on today
- Unread messages

#### Warehouse

- Low stock alerts
- Pending stock orders
- Who's on today
- Overdue maintenance
- Unread messages

#### Staff

- Today's checks
- Who's on today
- Unread messages

### Role Detection

```typescript
export function getRoleSlug(profile: any): RoleSlug {
  // Priority: new roles system > legacy app_role > default 'staff'

  // 1. Try new roles.slug
  if (profile?.roles?.[0]?.slug) { ... }

  // 2. Try legacy app_role
  if (profile?.app_role) { ... }

  // 3. Try position_title or boh_foh
  if (profile?.boh_foh) { ... }

  // 4. Default to 'staff'
  return 'staff';
}
```

---

## Module System

### Module IDs

```typescript
export type ModuleId =
  | "checkly" // Compliance & Checklists
  | "stockly" // Stock Management
  | "teamly" // People & HR
  | "planly" // Production & Orders
  | "assetly" // Asset Management
  | "msgly"; // Messaging
```

### Module Colors (Dark Mode)

```typescript
export const MODULE_COLOURS: Record<ModuleId, string> = {
  checkly: "border-l-fuchsia-400", // Fuchsia/Pink
  stockly: "border-l-emerald-400", // Green
  teamly: "border-l-blue-400", // Blue
  planly: "border-l-orange-400", // Orange
  assetly: "border-l-cyan-400", // Cyan
  msgly: "border-l-teal-400", // Teal
};
```

### Module Badge Colors

```typescript
export const MODULE_BADGE_COLOURS: Record<ModuleId, { text: string; bg: string }> = {
  checkly: { text: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
  stockly: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  teamly: { text: "text-blue-400", bg: "bg-blue-500/10" },
  planly: { text: "text-orange-400", bg: "bg-orange-500/10" },
  assetly: { text: "text-cyan-400", bg: "bg-cyan-500/10" },
  msgly: { text: "text-teal-400", bg: "bg-teal-500/10" },
};
```

### Enabled Modules

**Hook**: `useEnabledModules()` (`src/hooks/dashboard/useEnabledModules.ts`)

**Database Table**: `company_modules`

```typescript
const {
  enabledModules, // Array of enabled ModuleId values
  loading, // Loading state
  error, // Error message if any
  refetch, // Refetch modules
} = useEnabledModules();
```

**Always Enabled**: `assetly`, `msgly`

**Core Modules** (enabled by default unless explicitly disabled):

- `checkly`
- `stockly`
- `teamly`
- `planly`

---

## Lazy Loading & Error Boundaries

### Lazy Loading Pattern

All widgets use `React.lazy()` for code splitting:

```typescript
component: lazy(() => import("@/components/dashboard/widgets-v2/ComplianceScoreWidget"));
```

**Benefits**:

- Smaller initial bundle
- Widgets load on-demand
- Better performance

### Suspense Boundaries

Each widget is wrapped in `React.Suspense`:

```tsx
<Suspense fallback={<WidgetSkeleton />}>
  <WidgetComponent siteId={siteId} companyId={companyId} />
</Suspense>
```

### Error Boundaries

Each widget has an error boundary to prevent cascade failures:

```tsx
<ErrorBoundary FallbackComponent={WidgetErrorFallback}>
  <Suspense fallback={<WidgetSkeleton />}>
    <WidgetComponent ... />
  </Suspense>
</ErrorBoundary>
```

If a widget crashes, it shows a small error card instead of breaking the entire dashboard.

### Widget Error Handling

Widgets should handle:

- **Table doesn't exist** (`error.code === '42P01'`): Degrade gracefully, show empty state
- **No data**: Show empty state with helpful message
- **Loading state**: Show skeleton or spinner
- **Failed queries**: Log to console, show error state

**Example**:

```typescript
const { data, error } = await supabase.from("checklist_tasks").select("*");

if (error) {
  if (error.code === "42P01") {
    // Table doesn't exist yet - show empty state
    return;
  }
  throw error;
}
```

---

## Key Files Reference

### Configuration

- **`src/config/widget-registry.ts`** - Single source of truth for all widgets

### Main Dashboard

- **`src/components/dashboard/OpslyDashboard.tsx`** - Main dashboard orchestrator
- **`src/components/dashboard/KPIHeroSection.tsx`** - Always-visible KPI cards
- **`src/components/dashboard/ChartSection.tsx`** - Chart widget renderer
- **`src/components/dashboard/WidgetGrid.tsx`** - Operational widget renderer
- **`src/components/dashboard/DashboardSidebar.tsx`** - Pinned sidebar (Activity Feed / Incidents)
- **`src/components/dashboard/QuickNavBar.tsx`** - Quick action buttons
- **`src/components/dashboard/DashboardSettings.tsx`** - Widget toggle settings panel

### Widget Wrappers

- **`src/components/dashboard/WidgetCard.tsx`** - Operational widget wrapper + helpers
- **`src/components/dashboard/charts/ChartWidgetCard.tsx`** - Chart widget wrapper

### Widgets (Operational)

- `src/components/dashboard/widgets-v2/ComplianceScoreWidget.tsx`
- `src/components/dashboard/widgets-v2/OverdueChecksWidget.tsx`
- `src/components/dashboard/widgets-v2/TodaysChecksWidget.tsx`
- `src/components/dashboard/widgets-v2/LowStockWidget.tsx`
- `src/components/dashboard/widgets-v2/PendingStockOrdersWidget.tsx`
- `src/components/dashboard/widgets-v2/WhosOnTodayWidget.tsx`
- `src/components/dashboard/widgets-v2/TrainingExpiriesWidget.tsx`
- `src/components/dashboard/widgets-v2/TodaysProductionWidget.tsx`
- `src/components/dashboard/widgets-v2/PendingCustomerOrdersWidget.tsx`
- `src/components/dashboard/widgets-v2/MissingOrdersWidget.tsx`
- `src/components/dashboard/widgets-v2/OverdueMaintenanceWidget.tsx`
- `src/components/dashboard/widgets-v2/AssetIssuesWidget.tsx`
- `src/components/dashboard/widgets-v2/DataHealthWidget.tsx`
- `src/components/dashboard/widgets-v2/UnreadMessagesWidget.tsx`

### Charts

- `src/components/dashboard/charts/ComplianceTrendChart.tsx`
- `src/components/dashboard/charts/ProductionOutputChart.tsx`
- `src/components/dashboard/charts/StockHealthChart.tsx`
- `src/components/dashboard/charts/OrderPipelineChart.tsx`
- `src/components/dashboard/charts/EHOScoreChart.tsx`
- `src/components/dashboard/charts/TemperatureLogsChart.tsx`

### Hooks

- **`src/hooks/dashboard/index.ts`** - Hook exports
- **`src/hooks/dashboard/useDashboardPreferences.ts`** - User preferences management
- **`src/hooks/dashboard/useEnabledModules.ts`** - Enabled modules detection
- **`src/hooks/dashboard/useRoleDefaults.ts`** - Role-based default widgets
- **`src/hooks/dashboard/useKPIData.ts`** - KPI hero section data
- **`src/hooks/dashboard/useChartTheme.ts`** - Chart theme colors

### Types

- **`src/types/dashboard.ts`** - Dashboard type definitions

---

## Building New Widgets

### Step 1: Create Widget Component

Create file in `src/components/dashboard/widgets-v2/MyNewWidget.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { WidgetCard } from '../WidgetCard';
import { supabase } from '@/lib/supabase';

interface MyNewWidgetProps {
  siteId: string;
  companyId: string;
}

export default function MyNewWidget({ siteId, companyId }: MyNewWidgetProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        let query = supabase
          .from('my_table')
          .select('*')
          .eq('company_id', companyId);

        // Site filtering
        if (siteId && siteId !== 'all') {
          query = query.eq('site_id', siteId);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01') {
            // Table doesn't exist - degrade gracefully
            setLoading(false);
            return;
          }
          throw error;
        }

        setData(data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyId, siteId]);

  if (loading) {
    return (
      <WidgetCard title="My Widget" module="checkly">
        <div className="animate-pulse">Loading...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title="My Widget"
      module="checkly"
      viewAllHref="/dashboard/my-page"
    >
      {/* Widget content */}
      <div>Count: {data.length}</div>
    </WidgetCard>
  );
}
```

### Step 2: Register in Widget Registry

Add to `src/config/widget-registry.ts`:

```typescript
my_new_widget: {
  id: 'my_new_widget',
  title: 'My New Widget',
  module: 'checkly',
  size: 'medium',
  section: 'operational',  // or 'charts'
  defaultRoles: ['Admin', 'Owner', 'Manager'],
  component: lazy(() => import('@/components/dashboard/widgets-v2/MyNewWidget')),
}
```

### Step 3: Add to Role Defaults (Optional)

Update `src/hooks/dashboard/useRoleDefaults.ts`:

```typescript
export const ROLE_DEFAULT_WIDGETS: Record<RoleSlug, string[]> = {
  owner: [
    // ... existing widgets
    "my_new_widget", // Add here
  ],
  // ... other roles
};
```

### Done!

The widget will now:

- Appear in dashboard settings toggle
- Show for users with the specified roles (by default)
- Be lazy-loaded and error-bounded
- Filter by enabled modules
- Respect user preferences

---

## Tips & Best Practices

### Widget Development

1. **Always handle loading states** - Use skeletons or spinners
2. **Handle empty states** - Show helpful messages, not blank cards
3. **Handle errors gracefully** - Especially `42P01` (table doesn't exist)
4. **Filter by site** - Use `if (siteId && siteId !== 'all') query.eq('site_id', siteId)`
5. **Use module colors** - Import from `widget-registry.ts`
6. **Keep widgets small** - 100-200 lines max, extract complex logic to hooks

### Performance

1. **Use React.lazy()** - Defined in registry, not in component
2. **Minimize dependencies** - Only include what's needed
3. **Optimize queries** - Use `.select()` to limit columns
4. **Cache when appropriate** - localStorage for instant hydration

### Styling

1. **Use design tokens** - `rgb(var(--text-primary))`, `var(--spacing-card)`
2. **Consistent sizing** - Follow existing widget patterns
3. **Module colors** - Fuchsia (checkly), Emerald (stockly), Blue (teamly), Orange (planly), Cyan (assetly), Teal (msgly)
4. **Status colors** - Urgent (fuchsia), Warning (blue), Good (emerald), Neutral (gray)

### Testing

1. **Test with no data** - Empty state should look good
2. **Test with table missing** - Should degrade gracefully
3. **Test with site filter** - Both "All Sites" and specific site
4. **Test as different roles** - Ensure role defaults work
5. **Test module disabled** - Widget should not appear

---

## Summary

The Opsly Dashboard is a sophisticated, modular system that provides:

- **Flexibility**: Users can customize what they see
- **Performance**: Lazy loading, error boundaries, code splitting
- **Accessibility**: Role-based defaults ensure relevant info for each user
- **Scalability**: Easy to add new widgets via registry
- **Reliability**: Graceful degradation when tables/data missing
- **Consistency**: Shared components, colors, and patterns

The **Widget Registry** is the heart of the system - all widget metadata lives there, making it easy to understand what's available and add new widgets.
