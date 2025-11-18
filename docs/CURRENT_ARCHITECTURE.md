# Current Working Architecture

**Last Updated:** November 2025  
**Status:** Active Development

## 🎯 Primary Route Structure

### `/dashboard/*` - Main Application Routes ✅

All authenticated application pages are under `/dashboard/*`:

#### Organization Section

- `/dashboard/business` - Business details ✅
- `/dashboard/sites` - Sites management ✅
- `/dashboard/users` - User management ✅
- `/dashboard/training` - Training matrix ✅
- `/dashboard/calendar` - Manager calendar ✅
- `/dashboard/assets/contractors` - Contractors ✅
- `/dashboard/documents` - Documents ✅

#### Tasks Section

- `/dashboard/tasks` - My Tasks ✅
- `/dashboard/tasks/scheduled` - Scheduled tasks ✅
- `/dashboard/tasks/completed` - Completed tasks ✅
- `/dashboard/tasks/templates` - Task templates ✅
- `/dashboard/tasks/compliance` - Compliance templates ✅
- `/dashboard/tasks/active` - Active tasks ✅

#### SOPs Section

- `/dashboard/sops/list` - My SOPs ✅
- `/dashboard/sops/templates` - SOP Templates ✅
- `/dashboard/sops/libraries` - SOP Libraries ✅
- `/dashboard/sops/risk-assessments` - Risk Assessments ✅

#### Assets Section

- `/dashboard/assets` - Assets management ✅
- `/dashboard/assets/callout-logs` - Callout logs ✅
- `/dashboard/ppm` - PPM Schedule ✅

#### Checklists Section

- `/dashboard/checklists` - Checklists ✅
- `/dashboard/checklists/templates` - Checklist templates ✅

#### Logs Section

- `/dashboard/logs/attendance` - Attendance Register ✅
- `/logs/temperature` - Temperature Logs ✅

#### Other Main Pages

- `/dashboard` - Main dashboard ✅
- `/dashboard/eho-report` - EHO Readiness ✅
- `/dashboard/reports` - Reports ✅
- `/dashboard/settings` - Settings ✅

## 🚫 Routes That Are Broken/Placeholder

### Placeholder Pages (Need Implementation)

- `/dashboard/tasks` - Currently shows "Tasks coming soon" ⚠️
- `/dashboard/settings` - Basic placeholder ⚠️
- `/dashboard/reports` - Basic placeholder ⚠️
- `/dashboard/support` - Basic placeholder ⚠️

## 🔄 Redirect Routes (Backward Compatibility)

These routes redirect to `/dashboard/*` equivalents:

- `/organization/*` → `/dashboard/*` (via redirects)
- `/dashboard/organization/*` → `/dashboard/*` (via redirects)
- `/business-details` → `/dashboard/business` (via redirect)

## 🗑️ Routes to Avoid/Delete

### Debug Pages (Already Removed)

- ~~`/dashboard/quick`~~ - Removed ✅
- ~~`/dashboard/simple`~~ - Removed ✅
- ~~`/dashboard/minimal`~~ - Removed ✅
- ~~`/test-session`~~ - Removed ✅
- ~~`/test-search`~~ - Removed ✅
- ~~`/test-asset-modal`~~ - Removed ✅
- ~~`/debug`~~ - Removed ✅
- ~~`/debug-env`~~ - Removed ✅

### Playground Pages (Consider Removing)

- `/dashboard/sops-playground` - SOP testing playground ⚠️
- `/button-playground` - Button testing ⚠️
- `/card-playground` - Card testing ⚠️
- `/header-playground` - Header testing ⚠️
- `/design-system` - Design system testing ⚠️

## 🧩 Component Architecture

### Layout System

- **Root Layout** (`src/app/layout.tsx`) - Global providers, error boundary
- **Dashboard Layout** (`src/app/dashboard/layout.tsx`) - Uses NewMainSidebar with DashboardHeader
- **DashboardHeader** (`src/components/layouts/DashboardHeader.tsx`) - Main header component

### Navigation System

- **NewMainSidebar** (`src/components/layouts/NewMainSidebar.tsx`) - Primary navigation ✅
  - Grouped by sections (Organization, Tasks, SOPs, Assets, Checklists)
  - Hover popups for section navigation
  - Role-based filtering
  - Mobile-responsive

### State Management

- **AppContext** (`src/context/AppContext.tsx`) - Global app state
  - User data
  - Company data
  - Role management
  - ⚠️ Needs performance optimization (known issue)

### Data Fetching

- **React Query** (`@tanstack/react-query`) - Server state management
- **Supabase Client** (`src/lib/supabase/client.ts`) - Database client

## 🔒 Authentication & Authorization

- **Supabase Auth** - Authentication system
- **Role-based Access** - Controlled via feature flags
- **Protected Routes** - Middleware-based protection

## 📊 Database

- **Supabase PostgreSQL** - Primary database
- **Migrations** - Located in `supabase/migrations/`
- **RLS Policies** - Row-level security enabled

## 🎨 Styling

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Design Tokens** - Consistent spacing, colors, typography

## ⚠️ Known Issues & Technical Debt

### High Priority

1. **AppContext Performance** - Needs optimization (causing re-renders) ⚠️
   - Context value object recreated on every render (148 consumers)
   - **Fix:** Memoize context value with `useMemo` (see `docs/KNOWN_ISSUES_STATUS.md`)
   - **Priority:** High (but not blocking - monitor for performance issues)

### Resolved ✅

2. ~~**Duplicate Sites Pages**~~ - ✅ **RESOLVED** (only 1 main implementation exists at `/dashboard/sites`)
3. ~~**Route Conflicts**~~ - ✅ **RESOLVED** (all routes redirect to `/dashboard/*` structure)

### Medium Priority

1. **Placeholder Pages** - Several pages need implementation
2. **Error Handling** - Needs more comprehensive error boundaries
3. **Loading States** - Some pages lack proper loading indicators

### Low Priority

1. ~~**Playground Pages**~~ - ✅ Removed
2. ~~**Old Sidebar Components**~~ - ✅ Removed (LeftSidebar, HeaderLayout, MainSidebar, ContextualSidebar)
3. **Test Coverage** - Needs improvement

## 🚀 Next Steps

1. ✅ Consolidate route structure (ADR-001)
2. ✅ Standardize sidebar system (ADR-002)
3. ⏳ Remove playground pages
4. ⏳ Implement placeholder pages
5. ⏳ Optimize AppContext performance
6. ⏳ Add comprehensive error handling

## 📝 Notes for Developers

### Do NOT Touch (Working, but needs refactor)

- `AppContext.tsx` - Working but needs performance optimization
- `NewMainSidebar.tsx` - Active sidebar, don't break
- `/dashboard/sites` - Working, primary implementation

### Safe to Modify

- Placeholder pages (`/dashboard/settings`, `/dashboard/reports`)
- Playground pages (can be deleted)
- Test pages (can be deleted)

### Always Use

- `/dashboard/*` routes for new pages
- `NewMainSidebar` for navigation (in dashboard layout)
- Feature flags for new features
- ADRs for architectural decisions
