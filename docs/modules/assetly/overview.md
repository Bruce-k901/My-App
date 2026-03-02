# Assetly Module Overview

## Purpose

Assetly is the asset management module within Opsly, responsible for tracking physical assets, managing maintenance schedules (PPM), coordinating contractor callouts, and monitoring temperature-controlled equipment. It provides a complete lifecycle management system for equipment and infrastructure across sites.

## Scope

The module handles four primary areas:

1. **Asset Management** - Track all physical assets with detailed specifications, warranty information, and service history
2. **Contractor Management** - Maintain contractor database with contact details, rates, and site assignments
3. **PPM (Planned Preventative Maintenance)** - Schedule and track regular maintenance activities
4. **Callout System** - Create and manage reactive, warranty, and PPM-based contractor callouts
5. **Temperature Monitoring** - Track temperature logs for refrigeration and cooking equipment

## Navigation Structure

The module uses a dedicated sidebar (cyan theme) with the following sections:

### Main Routes

| Route                            | Label        | Icon            | Description                            |
| -------------------------------- | ------------ | --------------- | -------------------------------------- |
| `/dashboard/assets`              | Assets       | LayoutDashboard | Asset management dashboard (also home) |
| `/dashboard/assets`              | All Assets   | Package         | Full asset listing                     |
| `/dashboard/assets/contractors`  | Contractors  | Users           | Contractor database                    |
| `/dashboard/assets/callout-logs` | Callouts     | PhoneCall       | Callout log history                    |
| `/dashboard/ppm`                 | PPM Schedule | Calendar        | Maintenance schedule view              |

The sidebar also includes:

- Section header: "ASSET MANAGEMENT"
- Profile link at bottom (links to `/dashboard/people/[profile.id]`)
- Pin/collapse functionality for sidebar state

## Key Features

### Asset Management

- **Asset CRUD**: Create, view, edit, archive assets
- **CSV Import/Export**: Bulk upload/download asset data
- **Asset Categories**: Refrigeration, cooking, dishwashing, coffee, safety, other
- **Asset Details**: Brand, model, serial number, install date, warranty end date
- **Site Assignment**: Link assets to specific sites
- **Contractor Links**: Associate PPM, reactive, and warranty contractors per asset
- **Temperature Ranges**: Set working min/max temperatures for monitoring
- **Service Tracking**: Last service date, next service date, PPM frequency
- **Status Management**: Active, archived with timestamps

### Contractor Management

- **Contractor Database**: Name, contact details, email, phone, out-of-hours phone
- **Categories**: Organize by contractor specialty
- **Pricing Info**: Hourly rate, callout fee
- **Site Assignment**: Link contractors to specific sites
- **Contract Management**: Start date, expiry date, contract file upload
- **CSV/XLSX Import/Export**: Bulk operations
- **Multi-site Support**: Filter by site

### PPM Schedule

- **Calendar View**: Visual PPM schedule display
- **Service Records**: Track completed and upcoming maintenance
- **Asset Integration**: Links directly to asset records
- **Contractor Assignment**: Assign maintenance to specific contractors
- **Frequency Management**: Monthly intervals (e.g., 3, 6, 12 months)
- **Status Tracking**: Due, overdue, completed

### Callout System

- **Callout Types**: Reactive (breakdown), warranty, PPM
- **Priority Levels**: Low, medium, urgent
- **Status Workflow**: Open → Closed/Reopened
- **Fault Tracking**: Description, troubleshooting, repair summary
- **Document Uploads**: Worksheets, invoices, photos
- **Contractor Selection**: From database or custom entry
- **Timeline**: Created, closed, reopened timestamps
- **Site/Asset Context**: Full tracking of where and what
- **Notes**: Additional context and details

### Temperature Monitoring

- **Temperature Logging**: Record temps for assets during tasks
- **Range Alerts**: Automatic warnings when temps exceed min/max
- **Out-of-Range Actions**: Monitor (create follow-up task) or Callout (immediate action)
- **Troubleshooting Guides**: Category-based question sets
- **Photo Evidence**: Camera/upload support for callouts
- **Follow-up Tasks**: Auto-created monitoring tasks
- **Audit Trail**: Complete record of temp issues and responses

## Route Map

### Primary Routes

```
/dashboard/assets                    - Asset list and management
/dashboard/assets/contractors        - Contractor database
/dashboard/assets/callout-logs       - Callout history and management
/dashboard/ppm                       - PPM schedule view
/dashboard/logs/temperature          - Temperature logging page
/dashboard/archived-assets           - Archived assets (linked from assets page)
```

### Supporting Routes

```
/dashboard/people/[id]               - Profile page (linked from sidebar)
```

## Key Components

### Asset Components

- **AssetCard** (`src/components/assets/AssetCard.tsx`) - Individual asset card with archive action
- **AssetForm** (`src/components/assets/AssetForm.tsx`) - Asset creation/edit form
- **AssetModal** (`src/components/assets/AssetModal.tsx`) - Asset detail modal
- **AssetLogsDrawer** (`src/components/assets/AssetLogsDrawer.tsx`) - Asset history drawer
- **AssetTable** (`src/components/assets/AssetTable.tsx`) - Tabular asset view

### Contractor Components

- **ContractorCard** (`src/components/contractors/ContractorCard.tsx`) - Contractor display card
- **AddContractorModal** (`src/components/contractors/AddContractorModal.tsx`) - Add/edit contractor modal
- **ContractorForm** (`src/components/contractors/ContractorForm.tsx`) - Contractor form fields
- **ContractorSearchBar** (`src/components/contractors/ContractorSearchBar.tsx`) - Search functionality

### PPM Components

- **PPMSchedulePage** (`src/components/ppm/PPMSchedulePage.tsx`) - Main PPM schedule view
- **PPMCalendar** (`src/components/ppm/PPMCalendar.tsx`) - Calendar interface
- **PPMCard** (`src/components/ppm/PPMCard.tsx`) - PPM entry card
- **PPMDrawer** (`src/components/ppm/PPMDrawer.tsx`) - PPM details drawer
- **AddPPMModal** (`src/components/ppm/AddPPMModal.tsx`) - Create/edit PPM modal
- **ServiceCompletionModal** (`src/components/ppm/ServiceCompletionModal.tsx`) - Mark service complete
- **PPMFollowupModal** (`src/components/ppm/PPMFollowupModal.tsx`) - Follow-up actions

### Callout Components

- **CalloutModal** (`src/components/modals/CalloutModal.tsx`) - Full callout creation form
- **OutOfRangeActionModal** (`src/components/tasks/components/OutOfRangeActionModal.tsx`) - Choose monitor/callout
- **MonitorDurationModal** - Select monitoring duration
- **MonitorCalloutModal** (`src/components/templates/features/MonitorCalloutModal.tsx`) - Template-based choice
- **TroubleshootReel** (`src/components/ui/TroubleshootReel.tsx`) - Troubleshooting Q&A interface
- **ConvertToCalloutModal** - Convert message to callout (messaging integration)

### Navigation Component

- **AssetlySidebar** (`src/components/assetly/sidebar-nav.tsx`) - Module sidebar with navigation items

## Database Tables

### Core Tables

| Table              | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `assets`           | Asset records with specs, warranty, contractors, temp ranges |
| `contractors`      | Contractor database with contact and pricing info            |
| `callouts`         | Callout records with status, type, fault details             |
| `ppm_schedules`    | PPM maintenance schedules (inferred)                         |
| `temperature_logs` | Temperature readings per asset (inferred)                    |

### Supporting Tables

| Table                     | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `contractor_categories`   | Contractor categorization                         |
| `sites`                   | Site information (linked to assets)               |
| `profiles`                | User profiles (created_by, reported_by)           |
| `checklist_tasks`         | Task integration (callout follow-ups, monitoring) |
| `task_completion_records` | Audit trail for callout reports                   |

### Storage Buckets

| Bucket              | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `callout_documents` | Primary storage for callout worksheets/invoices      |
| `sop-photos`        | Fallback storage for callout photos                  |
| `global_docs`       | Fallback for documents if primary bucket unavailable |

## API Endpoints

While no dedicated API routes were found in `src/app/api/`, the module uses:

1. **Direct Supabase queries** from components
2. **RPC functions** for complex operations:
   - `create_callout()` - Create callout with validation
   - `close_callout()` - Close callout and update status
   - `reopen_callout()` - Reopen closed callout
   - `get_asset_callouts()` - Fetch callout history
   - `import_contractors_csv()` - Bulk contractor import

3. **Standard CRUD** via Supabase client for:
   - Assets table operations
   - Contractors table operations
   - Temperature logs
   - PPM schedules

## Integration Points

### Task System (Checkly)

- **Temperature warnings** in task completion modal trigger callout/monitor actions
- **Callout report tasks** created as completed tasks with full audit trail
- **Follow-up tasks** auto-created as pending tasks for next day
- **Monitoring tasks** created for re-check follow-ups

### Messaging (Msgly)

- Convert messages to callouts via ConvertToCalloutModal
- Link callouts to message threads

### Sites

- Assets assigned to sites
- Contractors assigned to sites
- Site filtering throughout module

### Templates

- Temperature logging feature with callout integration
- Pass/fail features can trigger callouts
- Workflow escalation rules for measurements/inspections

## Callout System Workflows

### Active Flow (Today's Tasks)

```
Temperature out of range → OutOfRangeActionModal → Choose Monitor/Callout
→ useTaskSubmission → Simple callout/monitor task creation
```

### Legacy Flow (Full Callout)

```
Place Callout button → CalloutModal → Troubleshooting + Contractor + Photos
→ Create callout + report task + follow-up task
```

See [callout-system.md](./callout-system.md) for locked implementation details.

## Module Theme

- **Primary color**: Cyan (`cyan-600`, `cyan-500`)
- **Logo**: `assetly_light.svg` / `assetly_dark.svg`
- **Icon convention**: Lucide icons throughout

## Related Documentation

- [callout-system.md](./callout-system.md) - Complete callout flow (LOCKED)
- [callout-setup.md](./callout-setup.md) - Database migration setup
- [callout-monitor.md](./callout-monitor.md) - Monitor/callout activation flows
- [temperature-monitoring.md](./temperature-monitoring.md) - Temperature warning system (LOCKED)

## Key State Management

### Site Filtering

Uses `useSiteFilter()` hook:

- `applySiteFilter()` - Apply site filter to queries
- `selectedSiteId` - Current site selection
- `isAllSites` - Boolean for all-sites view

### Context

Uses `useAppContext()`:

- `companyId` - Current company
- `siteId` - Current site (may be 'all')
- `profile` - User profile
- `user` - Auth user

### React Query

- Cache key pattern: `["assets", companyId, siteId]`
- Automatic refetch on company/site change
- 5-minute stale time for asset lists

## Notes

- **Cyan theme** distinguishes Assetly from other modules (checkly=fuchsia, stockly=emerald, etc.)
- **Mobile responsive** - all components adapt to small screens
- **Dark mode support** - full theme coverage with Tailwind dark: prefix
- **CSV/XLSX support** - Uses Papa Parse and XLSX libraries
- **Photo upload** - Supports both camera capture and file picker
- **Site-aware** - All data respects site filtering
- **Audit trails** - Callout reports stored as completed tasks with full data
- **Locked systems** - Callout and temperature warning flows are documented and protected
