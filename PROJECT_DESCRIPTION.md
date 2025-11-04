# PROJECT DESCRIPTION: CHECKLY

**Last Updated:** January 31, 2025  
**Version:** 16.x  
**Status:** Production Ready

---

## EXECUTIVE SUMMARY

**Checkly** is a comprehensive health & safety, food safety, and operational compliance management platform designed for hospitality venues (restaurants, cafes, bars, hotels, retail outlets). The application provides end-to-end compliance tracking, automated task management, incident reporting, and regulatory documentation for multi-site hospitality operations.

### Core Mission

Transform chaotic, paper-based compliance workflows into streamlined digital processes that reduce risk, save time, and ensure consistent operational excellence across all venues.

---

## TECHNICAL ARCHITECTURE

### Technology Stack

#### Frontend

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4+
- **UI Components:** Custom design system based on Radix UI primitives
- **State Management:** React Context API + React Query (TanStack Query)
- **Rich Text Editing:** TipTap 3.x
- **Forms:** React Hook Form
- **Notifications:** Sonner
- **Animation:** Framer Motion

#### Backend & Database

- **Database:** Supabase (PostgreSQL 15+)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Real-time:** Supabase Realtime subscriptions
- **Edge Functions:** Supabase Edge Functions (Deno)
- **API:** Next.js API Routes + Server Actions

#### DevOps & Tools

- **Package Manager:** npm
- **Linting:** ESLint 9
- **Formatting:** Prettier 3.6+
- **Testing:** Vitest 3.2+
- **Git Hooks:** Husky + lint-staged
- **Bundle Analysis:** webpack-bundle-analyzer

### Infrastructure

- **Hosting:** Vercel (Production)
- **Database Hosting:** Supabase Cloud
- **CDN:** Vercel Edge Network
- **Environment:** Production, Staging, Development

---

## PROJECT STRUCTURE

```
my-app/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── dashboard/              # Main application interface
│   │   ├── organization/           # Org management
│   │   ├── api/                    # API routes
│   │   ├── (marketing)/            # Marketing pages
│   │   └── compliance/             # Compliance modules
│   ├── components/                 # React components
│   │   ├── ui/                     # Design system components
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── checklists/             # Checklist components
│   │   ├── sops/                   # SOP components
│   │   ├── tasks/                  # Task management
│   │   ├── assets/                 # Asset management
│   │   └── layout/                 # Layout components
│   ├── lib/                        # Utilities and helpers
│   │   ├── supabase/               # Database clients
│   │   ├── templates/              # Template system
│   │   └── utils/                  # Shared utilities
│   ├── types/                      # TypeScript definitions
│   ├── hooks/                      # Custom React hooks
│   ├── contexts/                   # React contexts
│   └── data/                       # Static data & templates
├── supabase/
│   ├── migrations/                 # Database migrations
│   ├── functions/                  # Edge functions
│   └── sql/                        # SQL scripts & docs
├── public/                         # Static assets
├── docs/                           # Documentation
└── scripts/                        # Utility scripts

```

---

## CORE FEATURES & MODULES

### 1. DASHBOARD & OVERVIEW

**Route:** `/dashboard`

Central command center providing real-time visibility into operational status across all sites.

**Key Features:**

- Welcome header with shift handover notes
- Quick action buttons for common tasks
- Asset overview with status indicators
- Emergency breakdown notifications
- Incident log feed
- Metrics grid (KPIs, compliance scores, task completion rates)
- Alerts and notifications feed

**Technical Implementation:**

- Server-side data fetching with React Query caching
- Real-time updates via Supabase subscriptions
- Glass-morphism UI design
- Responsive grid layouts

---

### 2. TASK MANAGEMENT SYSTEM

**Route:** `/dashboard/tasks`

Comprehensive task scheduling, assignment, and completion tracking system.

**Sub-Modules:**

- **Templates** (`/templates`): 18 pre-built task templates
- **Active Tasks** (`/active`): Current and pending tasks
- **Completed Tasks** (`/completed`): Historical completions
- **Compliance Tasks** (`/compliance`): Regulatory-specific tasks
- **My Tasks** (`/my-tasks`): Personal task queue

**Key Features:**

- **Task Templates Library:**
  - Food Safety (6 templates): Fridge temps, hot hold, allergen checks, FIFO, deliveries, deep cleans
  - Health & Safety (3 templates): Pre-opening walkthrough, incident reports, manual handling
  - Fire & Security (3 templates): Alarm tests, exit checks, extinguisher inspections
  - Cleaning & Maintenance (3 templates): Deep cleans, pest control, equipment PPM
  - Compliance & Audit (3 templates): Monthly audits, SOP reviews, training records

- **Scheduling System:**
  - Daily, weekly, monthly frequencies
  - Daypart assignment (Before Open, During Service, After Service, Anytime)
  - Recurrence patterns with custom intervals
  - Assignment by role or specific user
  - Multi-site support

- **Task Completion:**
  - Dynamic field rendering based on evidence types
  - Temperature input with validation
  - Pass/Fail toggles
  - Photo evidence capture
  - Digital signatures
  - Text notes and observations
  - Real-time status updates

- **Automated Actions:**
  - Contractor notifications on failure
  - Overdue alerts
  - Critical task escalation
  - Historical tracking for audits

**Technical Implementation:**

- `task_templates` table with 18+ fields
- `task_fields` table for dynamic form configuration
- `task_instances` table for scheduled occurrences
- `task_completion_logs` table for evidence storage
- Row Level Security (RLS) policies
- PostgreSQL triggers for automation

---

### 3. ASSET MANAGEMENT

**Route:** `/dashboard/assets`

Complete asset tracking and maintenance management.

**Key Features:**

- **Asset Categories:**
  - Equipment (fridges, freezers, ovens, etc.)
  - Appliances (PAT testing, electrical safety)
  - Vehicles & External assets
  - Infrastructure items

- **Asset Tracking:**
  - Serial numbers, make/model, purchase dates
  - Assignment to specific sites
  - Contractor assignment for maintenance
  - Warranty tracking
  - Depreciation calculations

- **Temperature Monitoring:**
  - Working temperature ranges
  - Out-of-range alerts
  - Historical temperature logs
  - Automated callouts

- **Maintenance & Callouts:**
  - PPM (Planned Preventive Maintenance) scheduling
  - Callout request system
  - Contractor dispatch
  - Repair history
  - Document attachments

**Technical Implementation:**

- `assets` table with comprehensive metadata
- `ppm_schedules` table for maintenance
- `callouts` table for emergency repairs
- `temperature_readings` table for logs
- RLS policies per company/site
- Storage bucket for asset documents

---

### 4. CHECKLISTS & DAILY OPERATIONS

**Route:** `/dashboard/checklists`

Pre-operational, operational, and closing checklists.

**Key Features:**

- **Template System:**
  - Pre-opening checklists
  - During-service checks
  - Closing procedures
  - Deep clean schedules

- **Checklist Completion:**
  - Interactive card interface
  - Daypart grouping
  - Real-time progress tracking
  - Completion stamps
  - Pass/Fail indicators

- **Templates Library:**
  - Card1 configuration system
  - Customizable templates
  - Smart search across all templates

**Technical Implementation:**

- `checklists` table for definitions
- `checklist_tasks` table for item tracking
- `checklist_completions` table for logs
- Glass card UI components
- Status-based filtering

---

### 5. SOP (STANDARD OPERATING PROCEDURES)

**Route:** `/dashboard/sops`

Documented procedures and operational standards.

**Key Features:**

- **SOP Management:**
  - Rich text editor (TipTap)
  - Custom block types:
    - Preparation headers
    - Process steps
    - Equipment lists
    - Ingredient tables
    - Storage information
    - PPE requirements
    - Post-finish checks
    - Compliance checkboxes
    - Image attachments
  - Version control
  - Approval workflows

- **Template Library:**
  - Opening procedures
  - Closing procedures
  - Cleaning templates
  - Service templates
  - Food & Drink templates

- **Risk Assessments:**
  - COSHH assessments
  - General risk assessments
  - Template-based workflows

**Technical Implementation:**

- `sops` table with JSON content storage
- `sop_attachments` table for files
- `sop_compliance_checks` table
- Storage bucket: `sop-uploads`
- Custom TipTap extensions

---

### 6. COMPLIANCE & REPORTING

**Route:** `/dashboard/compliance`

Regulatory compliance tracking and reporting.

**Key Features:**

- **EHO (Environmental Health Officer) Pack:**
  - Automated compliance report generation
  - Temperature logs export
  - Task completions summary
  - Incident history
  - Training records

- **Compliance Templates:**
  - Import from library
  - Clone and customize
  - Deploy to sites
  - Track completion rates

- **Automated Reports:**
  - Daily digests
  - Weekly summaries
  - Monthly audits
  - Export to PDF/CSV

**Technical Implementation:**

- `compliance_templates` table
- `compliance_records` table
- Edge Functions for report generation
- Scheduled cron jobs
- External API integrations (Companies House)

---

### 7. ORGANIZATION MANAGEMENT

**Route:** `/dashboard/organization` and `/organization`

Multi-site, multi-user organization management.

**Sub-Modules:**

- **Business Details** (`/business`): Company information
- **Sites** (`/sites`): Venue management
- **Users** (`/users`): User administration
- **Contractors** (`/contractors`): Third-party vendor management
- **Documents** (`/documents`): Corporate document library

**Key Features:**

- **Site Management:**
  - Multiple venue support
  - Site-specific settings
  - Geographic location mapping
  - Opening hours configuration
  - General Manager assignment

- **User Management:**
  - Role-based access control (Admin, Manager, Staff)
  - Invitation system
  - Profile management
  - Activity tracking
  - Archive functionality

- **Contractor Management:**
  - Contractor registry
  - Service assignments
  - Performance tracking
  - Document storage

- **Document Management:**
  - File uploads
  - Version control
  - Access permissions
  - Search and categorization

**Technical Implementation:**

- `companies` table
- `sites` table with location data
- `profiles` table with role metadata
- `contractors` table
- RLS policies based on company/site hierarchy

---

### 8. LIBRARIES SYSTEM

**Route:** `/dashboard/libraries`

Centralized product and resource libraries.

**Library Categories:**

- **Ingredients** (`/ingredients`): Food ingredient database
- **PPE** (`/ppe`): Personal protective equipment
- **Chemicals** (`/chemicals`): Cleaning and sanitization chemicals
- **Drinks** (`/drinks`): Beverage inventory
- **Disposables** (`/disposables`): Single-use items
- **Glassware** (`/glassware`): Service glassware
- **Packaging** (`/packaging`): Takeaway and storage packaging
- **Serving Equipment** (`/serving-equipment`): Service utensils
- **Appliances** (`/appliances`): PAT-tested appliances

**Key Features:**

- **Library Management:**
  - Catalog of items with specifications
  - Search and filter capabilities
  - Supplier information
  - COSHH data
  - Allergen information
  - Pricing and unit costs

- **Request System:**
  - Library item requests
  - Approval workflows
  - Integration with task system

**Technical Implementation:**

- 9 separate library tables (one per category)
- Unified search interface
- Request tracking table
- RLS policies for company isolation

---

### 9. INCIDENT & INCIDENT REPORTING

**Route:** `/dashboard/incidents`

Accident and incident tracking system.

**Key Features:**

- **Incident Capture:**
  - Multi-step reporting form
  - Photo attachments
  - Witness statements
  - Severity classification
  - Incident categories

- **Reporting & Analysis:**
  - Incident reports export
  - Trend analysis
  - Root cause investigation
  - Remedial action tracking

- **Automated Notifications:**
  - Manager alerts
  - External notifications (SMS/Email)
  - Follow-up task creation

**Technical Implementation:**

- `incidents` table
- `incident_witnesses` table
- Edge Function for notifications
- Storage bucket for photos

---

### 10. TEMPERATURE MONITORING

**Route:** `/dashboard/logs/temperature`

Temperature tracking and alerting.

**Key Features:**

- **Recording:**
  - Equipment-specific logs
  - Multiple readings per day
  - Minimum/maximum tracking
  - Target ranges

- **Alerts:**
  - Out-of-range notifications
  - Automated supervisor alerts
  - Historical trend analysis

- **Reports:**
  - Daily temperature summaries
  - Export for EHO inspections
  - Compliance verification

**Technical Implementation:**

- `temperature_readings` table
- RLS policies
- Automated triggers for alerts
- Integration with assets system

---

### 11. PPM (PLANNED PREVENTIVE MAINTENANCE)

**Route:** `/dashboard/ppm`

Maintenance scheduling and tracking.

**Key Features:**

- **Scheduling:**
  - Recurring maintenance plans
  - Asset-specific schedules
  - Contractor assignment
  - Calendar view

- **Tracking:**
  - Completion status
  - Contractor performance
  - Cost tracking
  - Document management

- **Automation:**
  - Auto-generation of tasks
  - Notification system
  - Overdue alerts

**Technical Implementation:**

- `ppm_schedules` table
- `ppm_records` table for completions
- Integration with assets and contractors
- Edge Function for task generation

---

### 12. NOTIFICATIONS & ALERTS

**Route:** `/notifications`

Centralized notification center.

**Key Features:**

- **Notification Types:**
  - Task assignments
  - Overdue alerts
  - Out-of-range temperatures
  - Incident reports
  - PPM reminders
  - Callout requests

- **Delivery Channels:**
  - In-app notifications
  - Email (via SendGrid)
  - SMS (optional)

- **Preferences:**
  - User-specific settings
  - Frequency controls
  - Digest options

**Technical Implementation:**

- `notifications` table
- Real-time subscriptions
- Edge Function: `send_daily_digest`
- Cron job scheduling

---

## AUTHENTICATION & SECURITY

### Authentication Flow

- **Provider:** Supabase Auth
- **Methods:** Email/Password, Magic Links
- **Session Management:** Server-side cookies via `@supabase/ssr`
- **Password Reset:** Secure token-based flow

### Authorization

- **Role-Based Access Control (RBAC):**
  - **Admin:** Full system access across all sites
  - **Manager:** Site-specific management permissions
  - **Staff:** Task completion and basic reporting

- **Row Level Security (RLS):**
  - All database tables protected by RLS policies
  - Company-level isolation
  - Site-level filtering
  - User-specific permissions

### Data Protection

- **Encryption:** HTTPS everywhere, encrypted storage
- **Audit Logging:** User activity tracking
- **GDPR Compliance:** User data export/deletion
- **Archived Records:** Soft delete with archival system

---

## DATABASE SCHEMA

### Core Tables

**Organizational:**

- `companies` - Organization metadata
- `sites` - Venue/location data
- `profiles` - User profiles and roles
- `contractors` - Third-party vendors

**Tasks & Checklists:**

- `task_templates` - Template definitions
- `task_fields` - Dynamic form fields
- `task_instances` - Scheduled tasks
- `task_completion_logs` - Completion evidence
- `checklists` - Checklist definitions
- `checklist_tasks` - Checklist items
- `checklist_completions` - Completion records

**Assets & Maintenance:**

- `assets` - Equipment and infrastructure
- `ppm_schedules` - Maintenance schedules
- `ppm_records` - Maintenance completions
- `callouts` - Emergency repairs
- `temperature_readings` - Temperature logs

**SOPs & Documentation:**

- `sops` - Standard operating procedures
- `sop_attachments` - File attachments
- `sop_compliance_checks` - Compliance tracking

**Compliance:**

- `compliance_templates` - Template library
- `compliance_records` - Completion tracking
- `incidents` - Incident reports
- `incident_witnesses` - Witness statements

**Libraries (9 tables):**

- `ingredients_library`
- `ppe_library`
- `chemicals_library`
- `drinks_library`
- `disposables_library`
- `glassware_library`
- `packaging_library`
- `equipment_library`
- `pat_appliances`

**System:**

- `notifications` - In-app notifications
- `activity_logs` - Audit trail
- `document_attachments` - File storage references

---

## API ENDPOINTS

### Next.js API Routes

**Organization:**

- `POST /api/company/create` - Create company
- `GET /api/company/setup-status` - Check setup completion
- `GET /api/sites` - List sites

**Users:**

- `POST /api/users/create` - Create user
- `GET /api/users/list` - List users

**Compliance:**

- `POST /api/compliance/clone` - Clone template
- `POST /api/compliance/complete` - Complete compliance task
- `POST /api/compliance/deploy` - Deploy to sites
- `GET /api/compliance/tasks` - Get compliance tasks
- `GET /api/compliance/templates` - List templates

**Contractors:**

- `GET /api/contractor-search` - Search contractors

**External Integrations:**

- `POST /api/companyEnrich` - Enrich company data
- `GET /api/companyLookup` - Lookup company details

**Automation:**

- `POST /api/admin/generate-tasks` - Generate task instances
- `POST /api/invite` - Send invitation
- `POST /api/send-email` - Send email
- `POST /api/send-sms` - Send SMS

---

## SUPABASE EDGE FUNCTIONS

**Automation Functions:**

- `send_daily_digest` - Daily summary notifications (06:00 UTC cron)
- `generate_daily_tasks` - Generate recurring tasks
- `generate-ppm-notifications` - PPM reminders
- `process_incident_notifications` - Incident alerts

**Maintenance Functions:**

- `cleanup_tasks` - Archive old tasks
- `cleanup-old-task-records` - Cleanup task logs
- `clone_templates_to_sites` - Template deployment
- `create_site_defaults` - Site initialization
- `generate_eho_pack` - EHO report generation
- `import_task_library` - Template library import

---

## MIGRATIONS & DATABASE MANAGEMENT

### Key Migrations

**Phase 1: Foundation (Oct 2024)**

- `001_create_checklist_schema.sql` - Checklist system
- `001_create_task_template_schema.sql` - Task system
- `001_create_compliance_schema.sql` - Compliance tracking

**Phase 2: Task System (Jan 2025)**

- `20250123000000_create_task_system.sql` - Full task management
- `20250123000001_create_callout_system.sql` - Asset callouts

**Phase 3: SOPs (Jan 2025)**

- `20250125000000_create_sop_attachments.sql` - File attachments
- `20250125000001_create_sop_uploads_bucket.sql` - Storage setup
- `20250127000000_create_sop_entries.sql` - SOP content

**Phase 4: Performance & Cleanup (Jan 2025)**

- `20250101000000_add_performance_indexes.sql` - Query optimization
- `20250127000001_add_working_temp_ranges_to_assets.sql` - Temp monitoring
- `20250128000002_add_callout_followup_tasks.sql` - Callout automation
- `20250130000001_backfill_bain_maries_and_contractors.sql` - Data migration
- `20250130000003_create_pat_appliances_table.sql` - PAT testing

### Current Schema Version: **30+ migrations** applied

---

## DEPLOYMENT & ENVIRONMENT

### Environment Variables

**Required:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://*.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
SUPABASE_URL=https://*.supabase.co

# Application
NEXT_PUBLIC_APP_ENV=production|staging|development

# External APIs
COMPANIES_HOUSE_KEY=***  # Optional
SENDGRID_KEY=***         # Optional
```

### Build Configuration

**Production Build:**

```bash
npm run build  # Creates standalone output
npm start      # Starts production server
```

**Development:**

```bash
npm run dev        # Webpack dev server
npm run dev:turbo  # Turbopack dev server
```

**Testing:**

```bash
npm run test  # Vitest
npm run lint  # ESLint
```

---

## UI/UX DESIGN SYSTEM

### Color Palette

- **Primary:** Magenta/Pink (`#EC4899`)
- **Secondary:** Blue (`#3B82F6`)
- **Background:** Dark (`#0B0D13`, `#151B22`)
- **Accents:** Green, Yellow, Red for status indicators
- **Glass Effect:** `bg-white/[0.03] border-white/[0.06]`

### Typography

- **Headings:** Bold, gradient text effects
- **Body:** Inter or system fonts
- **Mono:** Code/technical text

### Components

- **Cards:** Glass-morphism with hover effects
- **Buttons:** Gradient backgrounds, rounded corners
- **Forms:** Consistent styling, validation feedback
- **Modals:** Overlay with backdrop blur
- **Tables:** Sortable, filterable, responsive

### Responsive Breakpoints

- **Mobile:** `< 640px`
- **Tablet:** `640px - 1024px`
- **Desktop:** `> 1024px`

---

## PERFORMANCE OPTIMIZATION

### Implemented Optimizations

- **Server Components:** Default for most pages
- **React Query:** Caching and prefetching
- **Route Preloading:** Automatic navigation hints
- **Image Optimization:** Next.js Image component
- **Code Splitting:** Dynamic imports for large modules
- **Bundle Analysis:** webpack-bundle-analyzer integration

### Performance Metrics

- **Build Time:** ~10-15 seconds
- **First Load JS:** < 200KB
- **Lighthouse Score:** > 90
- **Database Query:** < 50ms average

---

## TESTING STRATEGY

### Test Types

- **Unit Tests:** Vitest for utilities and hooks
- **Integration Tests:** API route testing
- **E2E Tests:** (Planned) Playwright

### Current Coverage

- **Hooks:** Partial coverage
- **Utils:** Good coverage
- **Components:** Limited coverage
- **API Routes:** Manual testing

---

## INTEGRATIONS

### External Services

- **Companies House API:** UK company data lookup
- **SendGrid:** Email delivery
- **SMS Provider:** (Optional) SMS notifications
- **Postcode Lookup:** UK postcode validation

### Future Integrations (Planned)

- **Xero/QuickBooks:** Accounting integration
- **GDPR Tools:** Data compliance automation
- **Analytics:** Business intelligence dashboards

---

## ROADMAP & FUTURE ENHANCEMENTS

### Q1 2025

- ✅ Task system consolidation
- ✅ SOP template system
- ✅ Library request workflows
- 🔄 Enhanced reporting dashboard
- 🔄 Mobile app (React Native)

### Q2 2025

- 🔄 Advanced analytics
- 🔄 AI-powered insights
- 🔄 Multi-language support
- 🔄 Enhanced mobile experience

### Q3-Q4 2025

- 🔄 International expansion
- 🔄 Industry-specific modules
- 🔄 Marketplace for templates
- 🔄 API for third-party integrations

---

## KNOWN LIMITATIONS & TECHNICAL DEBT

### Current Challenges

1. **Multiple Route Hierarchies:** Legacy `/dashboard`, `/organization`, `/dashboard/organization` coexist
2. **Sidebar Systems:** Multiple sidebar implementations
3. **Debug Pages:** Scattered test pages need cleanup
4. **Type Safety:** Some `any` types remain
5. **Test Coverage:** Limited automated testing

### Planned Refactoring

- Consolidate routing structure
- Standardize sidebar system
- Remove debug/test pages
- Improve type coverage
- Expand test suite

---

## CONTRIBUTION GUIDELINES

### Code Standards

- **TypeScript:** Strict mode enabled
- **ESLint:** Next.js + Prettier configs
- **Commits:** Conventional commit messages
- **Branching:** Feature branches from `main`

### Pull Request Process

1. Create feature branch
2. Implement changes
3. Run `npm run lint` and `npm run test`
4. Create PR with description
5. Code review required
6. Merge after approval

---

## DOCUMENTATION

### Available Documentation

- **README.md:** Setup and environment
- **COMPREHENSIVE_CODEBASE_AUDIT.md:** Architecture overview
- **MIGRATION_GUIDE.md:** Database migrations
- **TASK_TEMPLATES_SETUP.md:** Task system documentation
- **SOP_TEMPLATES_IMPLEMENTATION.md:** SOP system guide

### API Documentation

- API routes documented in code comments
- Supabase functions have inline docs
- TypeScript types serve as contracts

---

## SUPPORT & MAINTENANCE

### Deployment Process

1. Merge to `main` branch
2. Automatic Vercel deployment
3. Database migrations applied via Supabase CLI
4. Health checks and monitoring

### Monitoring

- **Vercel Analytics:** Performance metrics
- **Supabase Dashboard:** Database health
- **Error Tracking:** (Planned) Sentry integration

### Security Updates

- Regular dependency updates
- Security audit via `npm audit`
- Automated patch applications

---

## LICENSE & COPYRIGHT

**Copyright:** Checkly Limited  
**License:** Proprietary  
**Status:** Private repository

---

## CONTACT & RESOURCES

**Development Team:** Bruce & Team  
**Repository:** Private GitHub  
**Project Management:** Internal tools  
**Documentation:** Internal wiki

---

**END OF PROJECT DESCRIPTION**
