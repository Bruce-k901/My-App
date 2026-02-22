# Opsly Application Architecture Overview

**Last Updated**: 2026-02-10
**Version**: 2.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Module Architecture](#module-architecture)
4. [Route Structure](#route-structure)
5. [Layout Hierarchy](#layout-hierarchy)
6. [Navigation System](#navigation-system)
7. [State Management](#state-management)
8. [Key Patterns](#key-patterns)

---

## System Overview

Opsly is a multi-module SaaS operations platform built for hospitality, retail, and manufacturing businesses. The application is architected as a unified platform with distinct modules, each providing specialized functionality while sharing common infrastructure.

### Core Technologies

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS v4, dark-first theme system
- **State Management**: React Context, Zustand stores
- **Build**: Webpack (requires `--webpack` flag due to custom config)

### Platform Structure

```
┌─────────────────────────────────────────────────────────┐
│                   Root Layout                           │
│  - Theme system (dark-first, system-aware)              │
│  - Provider stack (AppContext, UserPreferences, etc)    │
│  - Global components (PWA, Notifications, Alerts)       │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   Dashboard           Customer              Admin
   (7 modules)         (Portal)            (Platform)
```

---

## Module Architecture

### The Seven Modules

Opsly consists of 6 operational modules plus 1 customer-facing portal:

| Module              | Route                                       | Color             | Description                                                                    |
| ------------------- | ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| **Checkly**         | `/dashboard/tasks`, `/dashboard/checklists` | Fuchsia (#EC4899) | Task management, compliance checks, SOPs, risk assessments, incident reporting |
| **Stockly**         | `/dashboard/stockly`                        | Emerald (#10B981) | Inventory management, stock counts, supplier orders, waste tracking            |
| **Teamly**          | `/dashboard/people`                         | Blue (#2563EB)    | HR, attendance, payroll, training matrix, scheduling                           |
| **Planly**          | `/dashboard/planly`                         | Teal (#14B8A6)    | Production planning, order book, customer management, lamination               |
| **Assetly**         | `/dashboard/assets`                         | Sky (#0284C7)     | Asset tracking, maintenance schedules, PPM                                     |
| **Msgly**           | `/dashboard/messaging`                      | Teal (#14B8A6)    | Internal messaging, notifications (no dedicated sidebar)                       |
| **Customer Portal** | `/customer`                                 | Orange (#F97316)  | Customer-facing order management, waste logging, reports                       |

### Module Structure Pattern

Each module follows a consistent architecture:

```
/dashboard/[module]/
├── page.tsx                    # Module landing/dashboard page
├── [feature]/
│   ├── page.tsx               # Feature page
│   └── [id]/page.tsx          # Detail page
└── settings/                   # Module-specific settings
    └── page.tsx

/components/[module]/
├── sidebar-nav.tsx            # Module sidebar navigation
├── [FeatureComponent].tsx     # Feature-specific components
└── ...

/hooks/[module]/
└── use*.ts                    # Module-specific hooks

/app/api/[module]/
└── [endpoint]/route.ts        # Module API endpoints
```

### Module Color System

Each module has a signature color used consistently across:

- Module bar active states
- Sidebar navigation highlights
- Widget accents and headers
- Border highlights when active
- Icon and badge colors

---

## Route Structure

### High-Level Route Tree

```
/
├── /                           # Marketing landing page
├── /login                      # Authentication
├── /signup                     # Registration
├── /setup-account              # Onboarding
│
├── /dashboard                  # Main app root
│   ├── /                       # Dashboard home (widgets)
│   │
│   ├── /tasks                  # CHECKLY module
│   ├── /todays_tasks
│   ├── /checklists
│   ├── /incidents
│   ├── /sops
│   ├── /risk-assessments
│   ├── /logs
│   │
│   ├── /stockly                # STOCKLY module
│   │   ├── /inventory
│   │   ├── /stock-counts
│   │   ├── /orders
│   │   ├── /reports
│   │   └── /settings
│   │
│   ├── /people                 # TEAMLY module
│   │   ├── /attendance
│   │   ├── /payroll
│   │   ├── /training
│   │   └── /settings
│   │
│   ├── /planly                 # PLANLY module
│   │   ├── /order-book
│   │   ├── /production-plan
│   │   ├── /customers
│   │   └── /settings
│   │
│   ├── /assets                 # ASSETLY module
│   │   ├── /inventory
│   │   └── /ppm
│   │
│   ├── /messaging              # MSGLY (no sidebar)
│   │
│   ├── /calendar               # Cross-module calendar
│   ├── /reports                # Cross-module reports
│   │
│   ├── /sites                  # Organization (burger menu)
│   ├── /users
│   └── /business
│
├── /customer                   # Customer portal
│   ├── /                       # Customer dashboard
│   ├── /orders
│   ├── /standing-orders
│   ├── /waste
│   └── /reports
│
├── /admin                      # Platform admin
│   ├── /                       # Admin dashboard
│   ├── /tickets
│   └── /health-check-test
│
├── /settings                   # Global settings
│   ├── /                       # User settings
│   └── /companies
│
├── /compliance                 # Compliance tools
│   └── /eho-pack
│
└── /api                        # API routes
    ├── /assistant              # AI assistant endpoints
    ├── /customer               # Customer portal APIs
    ├── /[module]               # Module-specific APIs
    ├── /billing
    ├── /compliance
    ├── /attendance
    └── ...
```

---

## Layout Hierarchy

### Root Layout (`src/app/layout.tsx`)

The root layout establishes the foundation:

```typescript
<html>
  <head>
    {/* Theme initialization script (runs before hydration) */}
    {/* Preload warning suppression */}
  </head>
  <body>
    <ErrorBoundaryWrapper>
      <ReactQueryProvider>
        <QueryProvider>
          <AppProvider>
            <UserPreferencesProvider>
              <SiteContextProvider>
                {/* Global components */}
                <SuppressConsoleWarnings />
                <PWAProvider />
                <NotificationInitializer />
                <OfflineIndicator />
                <MessageAlertSubscriber />
                <TaskAlertSubscriber />

                {children}

                <Footer />
                <Toaster />
                <ConditionalGlobalComponents />
              </SiteContextProvider>
            </UserPreferencesProvider>
          </AppProvider>
        </QueryProvider>
      </ReactQueryProvider>
    </ErrorBoundaryWrapper>
  </body>
</html>
```

**Key Provider Responsibilities**:

- `AppProvider`: User auth, profile, company, site context
- `UserPreferencesProvider`: Theme, density, font size, accessibility
- `SiteContextProvider`: Multi-site management
- `ReactQueryProvider`: Server state caching
- `ErrorBoundaryWrapper`: Global error handling

### Dashboard Layout (`src/app/dashboard/layout.tsx`)

The dashboard layout provides the authenticated app shell:

**Desktop Layout**:

```
┌────────────────────────────────────────────────────────┐
│                     Header (64px)                      │
│  Logo | Context | Site | Search | ... | AI | Menu      │
├────────────────────────────────────────────────────────┤
│                   ModuleBar (56px)                     │
│  Checkly | Stockly | Teamly | Assetly | Planly         │
├──────────┬─────────────────────────────────────────────┤
│  Module  │                                             │
│ Sidebar  │           Main Content                      │
│ (240px)  │           (flex-1)                          │
│          │                                             │
│          │                                             │
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

**Mobile Layout**:

```
┌────────────────────────────────┐
│                                │
│                                │
│         Main Content           │
│      (full screen, pb-20)      │
│                                │
│                                │
├────────────────────────────────┤
│       Bottom Tab Bar           │
│  Home | Tasks | More | Alerts  │
└────────────────────────────────┘
```

**Module Sidebar Detection**:

```typescript
const isCheckly = pathname?.startsWith('/dashboard/todays_tasks') ||
                  pathname?.startsWith('/dashboard/tasks') || ...
const isStockly = pathname?.startsWith('/dashboard/stockly');
const isTeamly = pathname?.startsWith('/dashboard/people');
// etc.

// Conditionally render module sidebar
{showModuleSidebar && (
  <>
    {isCheckly && <ChecklySidebar />}
    {isStockly && <StocklySidebar />}
    {isTeamly && <TeamlySidebar />}
    // etc.
  </>
)}
```

---

## Navigation System

### Desktop Navigation Components

#### 1. Header (`src/components/layout/Header.tsx`)

**Position**: Fixed top (z-40, h-16)
**Background**: Light blue (#EFF6FF) / Dark gray (#1a1a1a)

**Left Section**:

- Mobile menu button (hamburger, `<768px` only)
- Opsly logo (icon only)
- ContextSwitcher (company/business selector)
- SiteFilter (multi-site dropdown)

**Center Section**:

- SearchBar (global search, desktop only)
- Mobile search icon (`<768px` only)

**Right Section**:

- ThemeToggle (dark/light/system)
- MessageButton (notifications bell with badge)
- Calendar button (opens calendar panel)
- "Ask AI" button (opens AI assistant)
- BurgerMenu button (organization menu)
- ProfileDropdown (user avatar)

#### 2. ModuleBar (`src/components/layout/ModuleBar.tsx`)

**Position**: Fixed below header (top-16, z-30, h-14)
**Background**: Light blue (#EFF6FF) / Dark gray (#1a1a1a)

**Structure**:

```typescript
modules = [
  { name: "Checkly", href: "/dashboard/tasks", icon: CheckSquare, color: "#EC4899" },
  { name: "Stockly", href: "/dashboard/stockly", icon: Package, color: "#10B981" },
  { name: "Teamly", href: "/dashboard/people", icon: Users, color: "#2563EB" },
  { name: "Assetly", href: "/dashboard/assets", icon: Wrench, color: "#0284C7" },
  { name: "Planly", href: "/dashboard/planly", icon: Factory, color: "#14B8A6" },
];
```

Active module is highlighted with its brand color.

**Right Side**: ClockInButton (attendance quick action)

#### 3. Module Sidebars

**Position**: Fixed left (top-112px, z-30)
**Width**: 240px (expanded) or 64px (collapsed)
**Behavior**: Collapsible with pin toggle

Each module sidebar contains:

- Module dashboard link
- Section headers (uppercase, gray)
- Feature links with icons
- Expandable parent items (with chevrons)
- Settings link at bottom

**Example** (`ChecklySidebar`):

```
┌────────────────────┐
│ Dashboard          │
├────────────────────┤
│ TASKS              │
│ ○ Today's Tasks    │
│ ○ All Tasks        │
│ ○ Templates        │
├────────────────────┤
│ COMPLIANCE         │
│ ▼ Checklists       │
│   ○ Active         │
│   ○ Templates      │
│ ○ Incidents        │
│ ○ SOPs             │
├────────────────────┤
│ ⚙ Settings         │
└────────────────────┘
```

#### 4. BurgerMenu (`src/components/layout/BurgerMenu.tsx`)

**Position**: Fixed right slide-out panel (z-50, w-320px)
**Trigger**: Menu button in header (desktop only)

**Menu Structure** (role-based):

```typescript
// ADMIN view:
{
  Organization: [
    { Sites, Users, Companies, Business Setup, Documents }
  ],
  Workspace: [
    { Reports, EHO Readiness, My Tickets, Archive }
  ],
  Settings: [
    { Settings, Billing }
  ],
  Account: [
    { Profile, Sign Out }
  ],
  Platform: [  // only for is_platform_admin
    { Admin Portal }
  ]
}

// MANAGER view:
{
  Organization: [
    { Sites, Business Setup, Documents }
  ],
  Workspace: [
    { Reports, EHO Readiness, My Tickets, Archive }
  ],
  Settings: [
    { Settings }
  ],
  Account: [
    { Profile, Sign Out }
  ]
}

// STAFF view:
{
  Workspace: [
    { My Tickets }
  ],
  Account: [
    { Profile, Sign Out }
  ]
}
```

### Mobile Navigation

**Bottom Tab Bar** (z-50, fixed bottom, h-16):

- Home (dashboard)
- Tasks (todays_tasks)
- More (MoreSheet with all modules)
- Alerts (notifications)

**MoreSheet**: Slide-up drawer with:

- All 7 modules
- Quick actions
- Account options

---

## State Management

### 1. AppContext (`src/context/AppContext.tsx`)

**Global application state**, provided at root layout.

```typescript
interface AppContextType {
  user: User | null; // Supabase user
  session: Session | null; // Auth session
  profile: any | null; // User profile from profiles table
  companyId: string | null; // Active company ID
  company: any | null; // Company details
  siteId: string | null; // Selected site ID (header filter)
  role: string | null; // User role: Admin | Manager | Staff
  userId: string | null; // User ID
  loading: boolean; // Auth loading state
  signOut: () => Promise<void>;
  setCompany: (company: any | null) => void;
  setSelectedSite: (siteId: string | null) => void;
  selectedSiteId: string | null; // Persisted in localStorage
}
```

**Key Features**:

- Fetches user profile and company on auth state change
- Supports "View As" mode for platform admins
- Selected site persists in localStorage
- Fallback to API routes if RLS blocks direct queries
- Auto-retries with exponential backoff

**Usage**:

```typescript
import { useAppContext } from "@/context/AppContext";

function MyComponent() {
  const { companyId, siteId, profile, role } = useAppContext();
  // ...
}
```

### 2. UserPreferencesContext (`src/context/UserPreferencesContext.tsx`)

**User preferences and theme management**, provided at root layout.

```typescript
interface UserPreferences {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  font_size: "normal" | "small" | "large";
  reduce_animations: boolean;
  high_contrast: "normal" | "high";
  sidebar_mode: "expanded" | "collapsed";
  default_site_id: string | null;
  dashboard_layout: string[]; // Widget order
  enabled_modules: string[];
  // ... more preferences
}
```

**Storage Strategy**:

- Hydrates from localStorage on mount (fast)
- Fetches from Supabase `user_preferences` table
- Debounced writes (400ms) to Supabase
- Applies CSS classes to `<html>` for theming

**Theme System**:

- `'system'`: Follows OS preference with MediaQuery listener
- `'light'` | `'dark'`: Explicit theme selection
- Theme applied via inline script in `<head>` (prevents flash)

**Usage**:

```typescript
import { useUserPreferences } from "@/context/UserPreferencesContext";

function MyComponent() {
  const { preferences, updatePreference } = useUserPreferences();

  updatePreference("theme", "dark");
  updatePreference("density", "compact");
}
```

### 3. Zustand Stores

#### panel-store (`src/lib/stores/panel-store.ts`)

Manages slide-out panel states (messaging, calendar, AI assistant, search).

```typescript
interface PanelStore {
  messagingOpen: boolean;
  calendarOpen: boolean;
  aiAssistantOpen: boolean;
  searchOpen: boolean;
  setMessagingOpen: (open: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  setAiAssistantOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}
```

**Usage**:

```typescript
import { usePanelStore } from '@/lib/stores/panel-store';

function Header() {
  const { setAiAssistantOpen } = usePanelStore();
  return <button onClick={() => setAiAssistantOpen(true)}>Ask AI</button>;
}
```

#### sidebar-store (`src/lib/stores/sidebar-store.ts`)

Session-level sidebar pin state (overrides user preference).

```typescript
interface SidebarStore {
  pinOverride: "collapsed" | "expanded" | null; // null = use preference
  setPinOverride: (mode: SidebarMode | null) => void;
}
```

### 4. React Query (TanStack Query)

Used for server state caching in widgets and data-heavy components.

**Provider**: `ReactQueryProvider` in root layout
**Common pattern**:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["widgets", "compliance_score", companyId, siteId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("compliance_tasks")
      .select("*")
      .eq("company_id", companyId);
    if (error) throw error;
    return data;
  },
  enabled: !!companyId,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Key Patterns

### 1. Site Filtering

All multi-site queries follow this pattern:

```typescript
const { companyId, siteId } = useAppContext();

let query = supabase.from("tasks").select("*").eq("company_id", companyId);

if (siteId && siteId !== "all") {
  query = query.eq("site_id", siteId);
}

const { data, error } = await query;
```

### 2. Role-Based Access

Routes, components, and queries check `role`:

```typescript
const { role } = useAppContext();

if (role === "Admin" || role === "Owner" || role === "Manager") {
  // Show admin features
}
```

**Widget Registry**:

```typescript
const widget = {
  id: "compliance_score",
  defaultRoles: ["Admin", "Owner", "Manager", "Staff"],
  // ...
};
```

### 3. Error Boundaries

All widgets and critical sections use error boundaries:

```typescript
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<ErrorFallback />}>
  <Widget />
</ErrorBoundary>
```

**Error Code Handling**:

- `42P01`: Table doesn't exist (gracefully hide widget)
- `PGRST116`: No rows returned (expected)
- `406`: RLS blocked (fallback to API route)

### 4. Lazy Loading

All widgets and heavy components use React.lazy:

```typescript
const ComplianceScoreWidget = lazy(() =>
  import('@/components/dashboard/widgets-v2/ComplianceScoreWidget')
);

<Suspense fallback={<Skeleton />}>
  <ComplianceScoreWidget />
</Suspense>
```

### 5. Supabase Query Pattern

**Standard pattern**:

```typescript
useEffect(() => {
  if (!companyId) return;

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from("table").select("*").eq("company_id", companyId);

      if (error) throw error;
      setData(data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [companyId, siteId]);
```

**RLS Fallback**:

```typescript
// Try direct query first
let { data, error } = await supabase.from("table").select("*");

// If RLS blocks (406), fallback to API route
if (error?.code === "406" || error?.status === 406) {
  const response = await fetch("/api/table/get");
  data = await response.json();
}
```

### 6. Module Color System

Module colors are centrally defined and consistently applied:

```typescript
const MODULE_COLORS = {
  checkly: "#EC4899", // Fuchsia
  stockly: "#10B981", // Emerald
  teamly: "#2563EB", // Blue
  assetly: "#0284C7", // Sky
  planly: "#14B8A6", // Teal
  msgly: "#14B8A6", // Teal
};

// Applied in:
// - ModuleBar active states
// - Sidebar highlights
// - Widget borders/headers
// - Button accents
```

### 7. Dashboard Widget System

**Widget Registry** (`src/config/widget-registry.ts`):

```typescript
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  compliance_score: {
    id: "compliance_score",
    title: "Compliance Score",
    module: "checkly",
    size: "medium", // small | medium | large | wide
    section: "charts", // charts | operational
    defaultRoles: ["Admin", "Owner", "Manager", "Staff"],
    component: lazy(() => import("@/components/dashboard/widgets-v2/ComplianceScoreWidget")),
  },
  // ... 25+ more widgets
};
```

**Widget Grid**:

```typescript
// Responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {enabledWidgets.map((widgetId) => {
    const widget = WIDGET_REGISTRY[widgetId];
    const Component = widget.component;
    return (
      <div key={widgetId} className={WIDGET_SIZE_CLASSES[widget.size]}>
        <Suspense fallback={<SkeletonWidget />}>
          <ErrorBoundary>
            <Component siteId={siteId} companyId={companyId} />
          </ErrorBoundary>
        </Suspense>
      </div>
    );
  })}
</div>
```

### 8. Mobile-First Responsive Design

**Breakpoints**:

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Common patterns**:

```typescript
// Hide on mobile, show on desktop
<div className="hidden lg:block">...</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">...</div>

// Responsive sizing
<div className="w-full lg:w-1/2">...</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">...</div>
```

---

## Summary

Opsly's architecture is designed for:

1. **Modularity**: Each module is self-contained with its own routes, components, and API endpoints
2. **Scalability**: Lazy loading, code splitting, and React Query caching ensure performance at scale
3. **Consistency**: Shared layout hierarchy, color system, and patterns across all modules
4. **Extensibility**: New modules follow the same architecture pattern
5. **User Experience**: Dark-first theme, responsive design, offline support, real-time updates
6. **Multi-tenancy**: Company and site filtering built into core patterns
7. **Role-based Access**: Fine-grained permissions across routes, components, and data

The platform's architecture emphasizes developer experience with clear conventions, type safety, and comprehensive error handling while maintaining flexibility for future growth.
