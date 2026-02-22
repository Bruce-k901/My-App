# Checkly Module - Overview

## Purpose and Scope

Checkly is Opsly's comprehensive **compliance and safety management module** for hospitality and food businesses. It provides end-to-end tools for managing daily tasks, standard operating procedures, risk assessments, incident reporting, and regulatory compliance tracking.

**Core Focus Areas:**

- Daily operational tasks and checklists
- Standard Operating Procedures (SOPs)
- Risk assessments (general and COSHH)
- Incident management (accidents, food poisoning, customer complaints, staff sickness)
- Temperature logging and monitoring
- EHO (Environmental Health Officer) readiness
- Compliance scoring and audit preparation

**Module Color:** Fuchsia (`#EC4899`) / Pink

---

## Navigation Structure

The Checkly sidebar navigation is organized into the following sections:

### Tasks

- **Dashboard** (`/dashboard/tasks`) - Task overview landing page
- **Today's Tasks** (`/dashboard/todays_tasks`) - Tasks due today
- **My Tasks** (`/dashboard/tasks/my-tasks`) - User's assigned tasks
- **Completed** (`/dashboard/tasks/completed`) - Completed task history

### Templates

- **Compliance Templates** (`/dashboard/tasks/compliance`) - Pre-built regulatory compliance task templates
- **Custom Templates** (`/dashboard/tasks/templates`) - User-created custom task templates

### SOPs

- **My SOPs** (`/dashboard/sops/list`) - Active standard operating procedures
- **Archived SOPs** (`/dashboard/sops/archive`) - Archived SOPs
- **SOP Templates** (`/dashboard/sops/templates`) - Templates for creating new SOPs
- **COSHH Data** (`/dashboard/sops/coshh`) - Chemical safety data sheets and COSHH register

### Risk Assessments

- **My RAs** (`/dashboard/risk-assessments`) - Active risk assessments
- **Archived RAs** (`/dashboard/risk-assessments/archive`) - Archived risk assessments
- **RA Templates** (`/dashboard/sops/ra-templates`) - Templates for creating risk assessments

### Incidents

- **All Incidents** (`/dashboard/incidents`) - Main incident management page with type filtering
- **Food Poisoning** (`/dashboard/incidents/food-poisoning`) - Food poisoning investigations
- **Customer Complaints** (`/dashboard/incidents/customer-complaints`) - Customer complaint tracking
- **Staff Sickness** (`/dashboard/incidents/staff-sickness`) - Staff illness and exclusion records
- **Incident Log** (`/dashboard/incidents/storage`) - Historical incident storage

### Logs

- **Temperature Logs** (`/dashboard/logs/temperature`) - Temperature monitoring records for food safety

---

## Key Features

### 1. Task Management

Daily operational checklists and compliance checks with support for:

- Temperature monitoring tasks (fridges, freezers, hot holding)
- Photo evidence capture
- Yes/No checklists
- Custom task fields
- Out-of-range action tracking (for temperature breaches)
- Task completion history

**Components:** `TaskCard`, `TaskCompletionModalNew`, `CompletedTaskCard`, `CreateTaskModal`

### 2. Standard Operating Procedures (SOPs)

Document and manage standard operating procedures:

- Pre-built templates (opening, closing, food prep, drinks service, cleaning)
- AI-assisted SOP generation
- Version control and archiving
- Print-ready formatting
- COSHH data integration

**Components:** `SOPPrintTemplate`, `SOPSubHeader`

### 3. Risk Assessments

Create and maintain risk assessments:

- General risk assessments
- COSHH risk assessments
- Manual handling assessments
- Fire risk assessments
- Template-based creation
- Annual review tracking

**Routes:**

- `/dashboard/risk-assessments` - Active assessments
- `/dashboard/risk-assessments/archive` - Archived assessments
- `/dashboard/sops/ra-templates` - RA templates

### 4. Incident Management

Comprehensive incident reporting and tracking:

**Incident Types:**

- **Accidents/Emergencies** - Workplace accidents, injuries, near misses
- **Food Poisoning** - Food poisoning investigations with detailed form
- **Customer Complaints** - Customer feedback and complaint resolution
- **Staff Sickness** - Staff illness logging and exclusion tracking

**Features:**

- Severity classification (critical, major, moderate, minor, near_miss)
- Status tracking (open, investigating, resolved, closed)
- PDF report generation
- Multi-site support
- Follow-up task generation

**Components:** `EmergencyIncidentModal`, `FoodPoisoningIncidentModal`, `CustomerComplaintModal`, `IncidentReportViewer`

### 5. Temperature Logging

Monitor and record temperatures for food safety compliance:

- Fridge/freezer temperature logging
- Hot holding temperature monitoring
- Automatic breach detection
- 30-day record retention for EHO inspections
- Temperature trend analysis

**API:** `/api/temperature/log`, `/api/temperature/breaches/export`

### 6. EHO Readiness & Compliance Scoring

Prepare for Environmental Health Officer inspections:

**Comprehensive UK EHO Requirements Tracking:**

- Food safety policies and HACCP plans
- Training records (food hygiene, allergen awareness)
- Daily temperature and opening/closing checklists
- Health & safety policies and competent person appointments
- Accident book and RIDDOR records
- Risk assessments (general, COSHH, manual handling, fire)
- Fire safety (alarm tests, extinguisher checks, emergency lighting)
- Training matrix and competency records
- Cleaning schedules and pest control logs
- PAT testing and equipment maintenance
- Insurance certificates (public liability, employers liability)
- Legal documents (premises licence, food registration)

**Features:**

- Real-time compliance scoring
- Category-based requirement grouping
- Evidence status tracking (found/missing/expired)
- EHO pack export (PDF/JSON/ZIP)
- 30-day record snapshots

**Components:** `EHOReadinessDashboard`, `EHOReportGenerator`, `EHOCards`, `EHOSection`, `EHOStatusTag`

**Routes:**

- `/compliance/eho-pack` - EHO readiness dashboard and export
- `/dashboard/compliance/eho` - Alternative EHO compliance view

---

## Route Map

### Task Routes

| Route                                | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `/dashboard/tasks`                   | Main task dashboard             |
| `/dashboard/todays_tasks`            | Today's scheduled tasks         |
| `/dashboard/tasks/my-tasks`          | User's assigned tasks           |
| `/dashboard/tasks/completed`         | Task completion history         |
| `/dashboard/tasks/compliance`        | Compliance task templates       |
| `/dashboard/tasks/templates`         | Custom task template management |
| `/dashboard/tasks/templates/builder` | Task template builder interface |
| `/dashboard/tasks/view/[id]`         | Individual task viewer          |

### SOP Routes

| Route                               | Purpose                        |
| ----------------------------------- | ------------------------------ |
| `/dashboard/sops/list`              | Active SOPs list               |
| `/dashboard/sops/archive`           | Archived SOPs                  |
| `/dashboard/sops/templates`         | SOP template library           |
| `/dashboard/sops/coshh`             | COSHH data sheets and register |
| `/dashboard/sops/view/[id]`         | SOP viewer                     |
| `/dashboard/sops/view/[id]/print`   | Print-ready SOP format         |
| `/dashboard/sops/food-template`     | Food preparation SOP template  |
| `/dashboard/sops/opening-template`  | Opening checklist template     |
| `/dashboard/sops/closing-template`  | Closing checklist template     |
| `/dashboard/sops/cleaning-template` | Cleaning schedule template     |
| `/dashboard/sops/service-template`  | Service SOP template           |
| `/dashboard/sops/[drink]-template`  | Beverage preparation templates |

### Risk Assessment Routes

| Route                                          | Purpose                   |
| ---------------------------------------------- | ------------------------- |
| `/dashboard/risk-assessments`                  | Active risk assessments   |
| `/dashboard/risk-assessments/archive`          | Archived risk assessments |
| `/dashboard/sops/ra-templates`                 | Risk assessment templates |
| `/dashboard/risk-assessments/general-template` | General RA template       |
| `/dashboard/risk-assessments/coshh-template`   | COSHH RA template         |

### Incident Routes

| Route                                      | Purpose                        |
| ------------------------------------------ | ------------------------------ |
| `/dashboard/incidents`                     | All incidents (with type tabs) |
| `/dashboard/incidents/food-poisoning`      | Food poisoning incidents       |
| `/dashboard/incidents/customer-complaints` | Customer complaints            |
| `/dashboard/incidents/staff-sickness`      | Staff sickness log             |
| `/dashboard/incidents/storage`             | Historical incident storage    |

### Compliance Routes

| Route                         | Purpose                       |
| ----------------------------- | ----------------------------- |
| `/compliance/eho-pack`        | EHO readiness dashboard       |
| `/dashboard/compliance/eho`   | EHO compliance view           |
| `/dashboard/logs/temperature` | Temperature logging interface |

---

## Key Components

### Task Components

- **TaskCard** (`src/components/checklists/TaskCard.tsx`) - Individual task display card
- **TaskCompletionModalNew** (`src/components/tasks/TaskCompletionModalNew.tsx`) - Task completion interface
- **CompletedTaskCard** (`src/components/checklists/CompletedTaskCard.tsx`) - Completed task display
- **CreateTaskModal** (`src/components/tasks/CreateTaskModal.tsx`) - Task creation modal
- **TemplateSelector** (`src/components/tasks/TemplateSelector.tsx`) - Template picker
- **TaskForm** (`src/components/tasks/TaskForm.tsx`) - Generic task form
- **TemperatureTaskForm** (`src/components/tasks/task-forms/TemperatureTaskForm.tsx`) - Temperature-specific form

### Task Renderers

- **TemplateRenderer** (`src/components/tasks/renderers/TemplateRenderer.tsx`) - Main template rendering logic
- **ChecklistRenderer** (`src/components/tasks/renderers/features/ChecklistRenderer.tsx`) - Checklist items
- **TemperatureRenderer** (`src/components/tasks/renderers/features/TemperatureRenderer.tsx`) - Temperature inputs
- **PhotoEvidenceRenderer** (`src/components/tasks/renderers/features/PhotoEvidenceRenderer.tsx`) - Photo capture
- **YesNoChecklistRenderer** (`src/components/tasks/renderers/features/YesNoChecklistRenderer.tsx`) - Yes/No questions

### Incident Components

- **EmergencyIncidentModal** (`src/components/incidents/EmergencyIncidentModal.tsx`) - Accident/emergency reporting
- **FoodPoisoningIncidentModal** (`src/components/incidents/FoodPoisoningIncidentModal.tsx`) - Food poisoning investigation form
- **CustomerComplaintModal** (`src/components/incidents/CustomerComplaintModal.tsx`) - Complaint logging
- **IncidentReportViewer** (`src/components/incidents/IncidentReportViewer.tsx`) - Incident report display and editing

### EHO Components

- **EHOReadinessDashboard** (`src/components/eho/EHOReadinessDashboard.tsx`) - Main EHO compliance dashboard
- **EHOReportGenerator** (`src/components/eho/EHOReportGenerator.tsx`) - EHO pack export interface
- **EHOCards** (`src/components/eho/EHOCards.tsx`) - Requirement category cards
- **EHOSection** (`src/components/eho/EHOSection.tsx`) - Collapsible requirement sections
- **EHOStatusTag** (`src/components/eho/EHOStatusTag.tsx`) - Status indicator badges

### SOP Components

- **SOPPrintTemplate** (`src/components/sops/SOPPrintTemplate.tsx`) - Print-ready SOP formatting
- **SOPSubHeader** (`src/components/sops/SOPSubHeader.tsx`) - SOP page sub-navigation

### Other Components

- **MonitorDurationModal** (`src/components/checklists/MonitorDurationModal.tsx`) - Duration tracking for monitoring tasks
- **OutOfRangeActionModal** (`src/components/tasks/components/OutOfRangeActionModal.tsx`) - Temperature breach action modal
- **OutOfRangeActionsSection** (`src/components/tasks/components/OutOfRangeActionsSection.tsx`) - Display out-of-range actions
- **OutOfRangeWarning** (`src/components/tasks/components/OutOfRangeWarning.tsx`) - Temperature warning indicator
- **AssetTemperatureInput** (`src/components/tasks/components/AssetTemperatureInput.tsx`) - Asset-linked temperature input

---

## Related API Endpoints

### Task APIs

- `POST /api/tasks/complete` - Complete a task
- `POST /api/tasks/create-ppm-followup` - Create planned maintenance follow-up task
- `GET /api/compliance/tasks` - Fetch compliance tasks
- `GET /api/compliance/complete` - Mark compliance item complete
- `POST /api/admin/generate-tasks` - Generate tasks from templates

### Compliance APIs

- `GET /api/compliance/templates` - Fetch task templates
- `POST /api/compliance/update-templates` - Update template definitions
- `GET /api/compliance/summary` - Compliance summary data
- `GET /api/compliance/calculate-score` - Calculate compliance score
- `POST /api/compliance/deploy` - Deploy templates to sites
- `POST /api/compliance/clone` - Clone templates
- `POST /api/compliance/import-templates` - Import template library
- `GET /api/compliance/out-of-range` - Fetch out-of-range temperature records

### EHO APIs

- `GET /api/eho/summary` - EHO readiness summary
- `GET /api/eho/report` - Generate EHO report data
- `GET /api/eho/extended-data` - Extended EHO data for export
- `GET /api/eho/export` - Export EHO pack (PDF)
- `GET /api/eho/export/json` - Export EHO data as JSON
- `GET /api/eho/export/zip` - Export full EHO pack as ZIP

### Temperature APIs

- `POST /api/temperature/log` - Log temperature reading
- `GET /api/temperature/breaches/export` - Export temperature breach records

### Incident APIs

- `GET /api/incidents/[incidentId]/export` - Export individual incident report

### Cron/Scheduled APIs

- `POST /api/cron/health-check` - Scheduled compliance health check

### AI/Assistant APIs

- `POST /api/assistant/generate-sop` - AI-generate SOP content
- `POST /api/assistant/generate-risk-assessment` - AI-generate risk assessment content
- `POST /api/assistant/chat` - Chat with compliance assistant

---

## Dashboard Widgets

Checkly includes several dashboard widgets for real-time monitoring:

| Widget ID          | Title            | Size   | Purpose                       |
| ------------------ | ---------------- | ------ | ----------------------------- |
| `compliance_score` | Compliance Score | Medium | Overall compliance percentage |
| `overdue_checks`   | Overdue Checks   | Medium | Tasks past their due date     |
| `todays_checks`    | Today's Checks   | Medium | Tasks scheduled for today     |
| `data_health`      | Data Health      | Medium | Data integrity monitoring     |

**Widget Components:**

- `ComplianceScoreWidget` (`src/components/dashboard/widgets-v2/ComplianceScoreWidget.tsx`)
- `OverdueChecksWidget` (`src/components/dashboard/widgets-v2/OverdueChecksWidget.tsx`)
- `TodaysChecksWidget` (`src/components/dashboard/widgets-v2/TodaysChecksWidget.tsx`)
- `DataHealthWidget` (`src/components/dashboard/widgets-v2/DataHealthWidget.tsx`)

**Widget Registry:** `src/config/widget-registry.ts`

---

## Related Documentation

- **Light Mode Review** - `docs/modules/checkly/light-mode-review.md` - UI consistency and theming
- **Temperature Monitoring** - `docs/modules/assetly/temperature-monitoring.md` - Asset temperature tracking (Assetly integration)
- **Training Matrix** - Training records for compliance (Teamly integration)

---

## Module Architecture

### Data Flow

1. **Tasks** → `task_templates` table → Deployed to `site_checklists` → Completed as `checklist_completions`
2. **Incidents** → `incidents` table → Status tracking → PDF export
3. **Temperature** → Task completion → Out-of-range detection → Breach records
4. **Compliance Score** → Aggregate completion rates → Real-time calculation
5. **EHO Pack** → Query last 30 days of records → Export as PDF/JSON/ZIP

### State Management

- Uses `useAppContext()` for `companyId`, `siteId`, `profile`, `user`
- Task state hooks: `useTaskState`, `useTaskSubmission`
- Alert system: `useTaskAlerts`, `useAlerts`

### Supabase Tables

- `task_templates` - Master template definitions
- `site_checklists` - Deployed site-specific tasks
- `checklist_completions` - Completed task records
- `incidents` - Incident reports
- `temperature_logs` - Temperature monitoring records
- `documents` - SOPs, policies, certificates
- `risk_assessments` - Risk assessment records
- `training_records` - Training compliance data

---

## Integration Points

### With Other Modules

- **Teamly** - Training records, staff assignments, competency tracking
- **Assetly** - Asset temperature monitoring, equipment maintenance
- **Stockly** - COSHH data for chemicals and stock items
- **Msgly** - Incident notifications, compliance alerts

### External Systems

- PDF generation for reports and SOPs
- Email notifications for overdue tasks and incidents
- AI-assisted content generation (SOPs, risk assessments)

---

## Notes

- **Module Color:** Fuchsia (`#EC4899`) in light mode, Pink in dark mode
- **Primary Use Case:** Food safety and workplace compliance for hospitality venues
- **Key Requirement:** EHO readiness for UK food businesses
- **Compliance Framework:** Based on UK FSA (Food Standards Agency) and HSE requirements
- **Temperature Monitoring:** Critical for food safety - 30-day retention for EHO inspections
- **Task Scheduling:** Supports daily, weekly, monthly, and custom frequencies
- **Multi-site Support:** All features support company-wide or site-specific filtering
