# Codebase Analysis & Documentation

**Generated:** 2025-01-21  
**Purpose:** Complete architectural documentation for major refactor planning  
**Project:** Next.js 15 Multi-Module Hospitality Compliance Platform

---

## Executive Summary

### Quick Stats

- **Total Database Tables:** 100+ (across public and stockly schemas)
- **Checkly Features:** ~25 completed, ~5 partial, ~10 planned
- **Stockly Features:** ~40 completed, ~10 partial, ~15 planned
- **Teamly Features:** ~35 completed, ~8 partial, ~12 planned
- **Shared Infrastructure:** 20+ tables, 100+ components, 50+ utilities

### Key Findings

1. **Three-Module Architecture:** Checkly (compliance), Stockly (inventory), Teamly (HR) - can work standalone or bundled
2. **Complex Database Schema:** 100+ tables across multiple schemas with extensive RLS policies
3. **Extensive Feature Set:** Full compliance tracking, inventory management, HR/payroll, messaging, reporting
4. **Modern Tech Stack:** Next.js 15 (App Router), React 19, Supabase, TypeScript, Tailwind CSS
5. **Multi-Tenant Design:** Company-scoped data with site-level access controls

### Recommended Actions

1. **Schema Consolidation:** Review duplicate functionality across modules
2. **RLS Policy Audit:** Ensure all policies are properly tested and optimized
3. **Component Library:** Standardize shared components (100+ components need categorization)
4. **Type Safety:** Complete TypeScript types for all database tables
5. **Documentation:** API documentation for all routes (80+ API endpoints)

---

## 1. DATABASE SCHEMA ANALYSIS

### Core Shared Tables (Public Schema)

#### `companies`

- **Module:** Shared (All)
- **Columns:**
  - `id`: uuid (PK)
  - `name`: text
  - `slug`: text (unique)
  - `created_at`, `updated_at`: timestamptz
- **Foreign Keys:** None (root table)
- **Indexes:** `idx_companies_slug` (unique)
- **RLS Policies:** Company-scoped access via profiles
- **Used By:** All modules (Checkly, Stockly, Teamly)

#### `sites`

- **Module:** Shared (All)
- **Columns:**
  - `id`: uuid (PK)
  - `company_id`: uuid (FK → companies.id)
  - `name`: text
  - `address`: jsonb
  - `created_at`, `updated_at`: timestamptz
- **Foreign Keys:** `company_id → companies(id)`
- **Indexes:** `idx_sites_company`
- **RLS Policies:** Site access via company membership
- **Used By:** All modules for location-specific data

#### `profiles`

- **Module:** Shared (All)
- **Columns:**
  - `id`: uuid (PK, FK → auth.users.id)
  - `company_id`: uuid (FK → companies.id)
  - `site_id`: uuid (FK → sites.id, nullable)
  - `full_name`: text
  - `email`: text
  - `app_role`: text (owner, admin, manager, staff)
  - `phone`: text
  - `created_at`, `updated_at`: timestamptz
- **Foreign Keys:**
  - `id → auth.users(id)`
  - `company_id → companies(id)`
- **Indexes:** `idx_profiles_company`, `idx_profiles_email`
- **RLS Policies:** Users can read own profile, company admins can read all company profiles
- **Used By:** All modules for user management

#### `user_roles`

- **Module:** Shared (All)
- **Columns:**
  - `profile_id`: uuid (FK → profiles.id)
  - `company_id`: uuid (FK → companies.id)
  - `role`: text (owner, admin, manager, supervisor, staff)
  - `created_at`: timestamptz
  - Primary Key: (profile_id, company_id)
- **Foreign Keys:**
  - `profile_id → profiles(id)`
  - `company_id → companies(id)`
- **Indexes:** Composite PK index
- **RLS Policies:** Company-scoped access
- **Used By:** All modules for role-based access control

#### `company_modules`

- **Module:** Shared (All)
- **Columns:**
  - `id`: uuid (PK)
  - `company_id`: uuid (FK → companies.id)
  - `module`: text (checkly, stockly, peoply)
  - `is_enabled`: boolean
  - `enabled_at`: timestamptz
  - `settings`: jsonb
  - Unique: (company_id, module)
- **Foreign Keys:** `company_id → companies(id)`
- **Used By:** All modules to track enabled features

### Checkly Module Tables (Public Schema)

#### `task_templates`

- **Module:** Checkly
- **Purpose:** Template definitions for recurring tasks
- **Key Columns:**
  - `id`, `company_id`, `name`, `description`
  - `task_type`: text (temperature, pest_control, fire_alarm, etc.)
  - `frequency`: text (daily, weekly, monthly)
  - `template_fields`: jsonb
  - `is_active`: boolean
- **RLS:** Company-scoped
- **Used By:** Task generation system, compliance pages

#### `checklist_tasks`

- **Module:** Checkly
- **Purpose:** Actual task instances from templates
- **Key Columns:**
  - `id`, `template_id`, `company_id`, `site_id`
  - `assigned_to`: uuid (FK → profiles.id)
  - `status`: text (pending, in_progress, completed)
  - `due_time`: timestamptz
  - `completed_at`: timestamptz
  - `completion_data`: jsonb
- **RLS:** Company-scoped with assignment visibility
- **Used By:** Tasks pages, today's tasks, compliance tracking

#### `task_completion_records`

- **Module:** Checkly
- **Purpose:** Historical records of completed tasks
- **Key Columns:**
  - `id`, `task_id`, `completed_by`, `completion_data`, `recorded_at`
- **Used By:** Compliance reporting, audit trails

#### `temperature_logs`

- **Module:** Checkly
- **Purpose:** Temperature readings from equipment
- **Key Columns:**
  - `id`, `task_id`, `equipment_id`, `temperature`, `recorded_at`, `recorded_by`
- **Used By:** Temperature monitoring, compliance scoring

#### `temperature_breach_actions`

- **Module:** Checkly
- **Purpose:** Actions taken when temperatures breach limits
- **Key Columns:**
  - `id`, `temperature_log_id`, `action_type`, `action_details`, `taken_by`, `taken_at`
- **Used By:** Temperature breach workflow

#### `site_compliance_score`

- **Module:** Checkly
- **Purpose:** Calculated compliance scores per site
- **Key Columns:**
  - `id`, `site_id`, `score`, `calculated_at`, `period_start`, `period_end`
- **Used By:** Compliance dashboard, EHO reports

#### `incidents`

- **Module:** Checkly
- **Purpose:** Incident/accident reporting
- **Key Columns:**
  - `id`, `company_id`, `site_id`
  - `incident_type`: text (slip_trip, cut, burn, fire, food_poisoning, etc.)
  - `severity`: text (near_miss, minor, moderate, major, critical, fatality)
  - `casualties`: jsonb
  - `witnesses`: jsonb
  - `riddor_reportable`: boolean
  - `photos`: text[], `documents`: text[]
- **RLS:** Company-scoped
- **Used By:** Incidents pages, reporting

#### `first_aid_supplies_library`

- **Module:** Checkly
- **Purpose:** First aid supply catalog
- **Key Columns:**
  - `id`, `company_id`, `item_name`, `category`, `standard_compliance`, `supplier`, `unit_cost`
- **Used By:** First aid kit management

#### `first_aid_kit_requirements`

- **Module:** Checkly
- **Purpose:** Requirements for first aid kits based on venue/staff
- **Key Columns:**
  - `id`, `company_id`, `site_id`, `venue_type`, `staff_count`, `requirements`: jsonb
- **Used By:** First aid compliance

### Stockly Module Tables (Stockly Schema)

#### `stockly.stock_items`

- **Module:** Stockly
- **Purpose:** Canonical stock item definitions
- **Key Columns:**
  - `id`, `company_id`, `category_id`, `name`, `sku`
  - `base_unit_id`: uuid (FK → uom.id)
  - `yield_percent`: decimal
  - `track_stock`: boolean
  - `par_level`, `reorder_qty`: decimal
  - `allergens`: text[]
  - `costing_method`: text (weighted_avg, fifo, last_price)
  - `current_cost`: decimal
- **RLS:** Company-scoped via `stockly_company_access()`
- **Used By:** Inventory management, recipes, ordering

#### `stockly.product_variants`

- **Module:** Stockly
- **Purpose:** Supplier-specific variants of stock items
- **Key Columns:**
  - `id`, `stock_item_id`, `supplier_id`
  - `supplier_code`, `product_name`, `brand`, `barcode`
  - `pack_size`, `pack_unit_id`, `conversion_factor`
  - `current_price`, `price_per_base`
  - `is_preferred`: boolean
- **RLS:** Inherited from parent stock_item
- **Used By:** Purchasing, price comparison, delivery matching

#### `stockly.stock_levels`

- **Module:** Stockly
- **Purpose:** Current stock quantities per site/storage area
- **Key Columns:**
  - `id`, `stock_item_id`, `site_id`, `storage_area_id`
  - `quantity`: decimal
  - `avg_cost`, `value`, `total_value`: decimal
  - `last_movement_at`, `last_count_at`: timestamptz
  - Unique: (stock_item_id, site_id, storage_area_id)
- **RLS:** Site-scoped
- **Used By:** Stock counts, transfers, reports

#### `stockly.stock_movements`

- **Module:** Stockly
- **Purpose:** All stock movements (purchases, transfers, waste, etc.)
- **Key Columns:**
  - `id`, `company_id`, `stock_item_id`
  - `movement_type`: text (purchase, transfer_out, transfer_in, waste, pos_drawdown, etc.)
  - `quantity`: decimal
  - `from_site_id`, `to_site_id`, `from_storage_id`, `to_storage_id`
  - `unit_cost`, `total_cost`: decimal
  - `ref_type`, `ref_id`: uuid (links to source document)
- **RLS:** Company-scoped
- **Used By:** Stock history, cost tracking, reports

#### `stockly.deliveries`

- **Module:** Stockly
- **Purpose:** Goods received notes / deliveries
- **Key Columns:**
  - `id`, `company_id`, `site_id`, `supplier_id`
  - `delivery_date`: date
  - `delivery_note_number`, `invoice_number`: text
  - `subtotal`, `vat_total`, `tax`, `total`: decimal
  - `ai_processed`: boolean (for invoice OCR)
  - `status`: text (draft, pending_review, confirmed, disputed)
- **RLS:** Company-scoped
- **Used By:** Purchasing workflow, invoice processing

#### `stockly.delivery_lines`

- **Module:** Stockly
- **Purpose:** Line items on deliveries
- **Key Columns:**
  - `id`, `delivery_id`, `product_variant_id`, `storage_area_id`
  - `quantity`, `unit_price`, `line_total`: decimal
  - `vat_rate`, `vat_amount`, `line_total_inc_vat`: decimal
  - `qty_base_units`: decimal
  - `ai_match_confidence`: decimal (for auto-matching)
- **RLS:** Inherited from delivery
- **Used By:** Invoice matching, stock receipt

#### `stockly.suppliers`

- **Module:** Stockly
- **Purpose:** Supplier master data
- **Key Columns:**
  - `id`, `company_id`, `name`, `code`
  - `contact_name`, `email`, `phone`, `address`: jsonb
  - `ordering_method`: text (app, whatsapp, email, phone, portal, rep)
  - `ordering_config`: jsonb
  - `payment_terms_days`, `minimum_order_value`
- **RLS:** Company-scoped
- **Used By:** Purchasing, ordering, supplier management

#### `stockly.recipes`

- **Module:** Stockly
- **Purpose:** Recipe definitions
- **Key Columns:**
  - `id`, `company_id`, `name`, `description`
  - `recipe_type`: text (prep_item, menu_item, batch)
  - `yield_quantity`, `yield_unit_id`
  - `total_cost`, `cost_per_unit`: decimal
  - `instructions`: text
  - `created_by`, `updated_by`: uuid
- **RLS:** Company-scoped
- **Used By:** Recipe management, costing, production planning

#### `stockly.recipe_ingredients`

- **Module:** Stockly
- **Purpose:** Ingredients in recipes
- **Key Columns:**
  - `id`, `recipe_id`, `stock_item_id`
  - `quantity`, `unit_id`: uuid
  - `cost_per_unit`, `line_cost`: decimal
- **RLS:** Inherited from recipe
- **Used By:** Recipe costing, ingredient pulling

#### `stockly.stock_counts`

- **Module:** Stockly
- **Purpose:** Stock count sessions
- **Key Columns:**
  - `id`, `company_id`, `site_id`, `count_date`: date
  - `status`: text (draft, in_progress, completed, approved)
  - `counted_by`, `approved_by`: uuid
- **RLS:** Company-scoped
- **Used By:** Stock counting workflow

#### `stockly.stock_count_items`

- **Module:** Stockly
- **Purpose:** Individual items counted
- **Key Columns:**
  - `id`, `stock_count_id`, `stock_item_id`, `storage_area_id`
  - `system_qty`, `counted_qty`: decimal
  - `variance_qty`, `variance_value`: decimal
- **RLS:** Inherited from stock_count
- **Used By:** Variance analysis, stock adjustments

#### `stockly.waste_logs` / `stockly.waste_log_lines`

- **Module:** Stockly
- **Purpose:** Waste tracking
- **Key Columns:**
  - `waste_date`, `waste_reason`, `total_cost`
  - Line items: `stock_item_id`, `quantity`, `unit_cost`, `line_cost`
- **RLS:** Company-scoped
- **Used By:** Waste reporting, cost analysis

#### `stockly.storage_areas`

- **Module:** Stockly
- **Purpose:** Storage locations (fridges, freezers, dry stores, etc.)
- **Key Columns:**
  - `id`, `site_id`, `name`, `area_type`: text (chilled, frozen, ambient, bar, cellar)
  - `sort_order`, `is_active`: boolean
- **RLS:** Site-scoped
- **Used By:** Stock levels, transfers, organization

### Teamly Module Tables (Public Schema)

#### `staff_attendance`

- **Module:** Teamly
- **Purpose:** Clock in/out records
- **Key Columns:**
  - `id`, `user_id`, `company_id`, `site_id`
  - `clock_in_time`, `clock_out_time`: timestamptz
  - `shift_status`: text (on_shift, off_shift)
  - `total_hours`: decimal (auto-calculated)
  - `shift_notes`: text
- **Constraints:** Prevents duplicate active shifts, ensures clock_out >= clock_in
- **RLS:** Users can read own, managers can read company
- **Used By:** Attendance pages, payroll, shift management

#### `attendance_logs` (VIEW)

- **Module:** Teamly
- **Purpose:** Read-only view of attendance with date column for filtering
- **Note:** This is a VIEW that maps to `staff_attendance` table
- **Key Difference:** Has `clock_in_date` column (not `clock_in_at::date`) for PostgREST compatibility
- **Used By:** Attendance queries, reporting
- **Important:** Write operations redirected to `staff_attendance` via fetch interceptor

#### `employee_site_assignments`

- **Module:** Teamly
- **Purpose:** Multi-site employee assignments
- **Key Columns:**
  - `id`, `profile_id`, `site_id`, `start_date`, `end_date`, `is_primary`: boolean
- **RLS:** Company-scoped
- **Used By:** Site access control, employee directory

#### `scheduled_shifts`

- **Module:** Teamly
- **Purpose:** Rota/shift scheduling
- **Key Columns:**
  - `id`, `site_id`, `profile_id`, `shift_date`, `start_time`, `end_time`
  - `shift_type`: text, `status`: text (scheduled, confirmed, swapped, cancelled)
  - `created_by`, `approved_by`: uuid
- **RLS:** Site-scoped
- **Used By:** Rota management, shift swapping

#### `leave_requests`

- **Module:** Teamly
- **Purpose:** Leave/holiday requests
- **Key Columns:**
  - `id`, `profile_id`, `leave_type_id`, `start_date`, `end_date`
  - `status`: text (pending, approved, rejected, cancelled)
  - `requested_at`, `approved_by`, `approved_at`: timestamptz
- **RLS:** User can read own, managers can read team
- **Used By:** Leave management, availability

#### `leave_balances`

- **Module:** Teamly
- **Purpose:** Annual leave entitlement and usage
- **Key Columns:**
  - `id`, `profile_id`, `leave_type_id`, `year`, `entitlement_days`, `used_days`, `remaining_days`
- **RLS:** User can read own, managers can read team
- **Used By:** Leave planning, entitlement tracking

#### `reviews` / `review_responses` / `review_templates`

- **Module:** Teamly
- **Purpose:** Performance review system
- **Key Columns:**
  - `review_id`, `reviewer_id`, `reviewee_id`, `template_id`, `status`
  - `responses`: jsonb (structured responses to template questions)
  - `overall_rating`, `completed_at`
- **RLS:** Participants can read their reviews
- **Used By:** Performance management, 1-on-1s

#### `payroll_runs` / `payroll_run_items`

- **Module:** Teamly
- **Purpose:** Payroll processing
- **Key Columns:**
  - `run_id`, `company_id`, `site_id`, `pay_period_start`, `pay_period_end`
  - `status`: text (draft, calculated, approved, paid)
  - Line items: `profile_id`, `hours`, `rate`, `gross_pay`, `deductions`, `net_pay`
- **RLS:** Company-scoped (admin/managers only)
- **Used By:** Payroll pages, payslip generation

#### `jobs` / `candidates` / `applications` / `offer_letters`

- **Module:** Teamly
- **Purpose:** Recruitment workflow
- **Key Columns:**
  - Jobs: `id`, `company_id`, `title`, `description`, `status`, `posted_at`
  - Candidates: `id`, `company_id`, `full_name`, `email`, `phone`, `cv_url`
  - Applications: `id`, `job_id`, `candidate_id`, `status`, `applied_at`, `stage`
  - Offers: `id`, `application_id`, `offer_details`: jsonb, `status`, `expires_at`
- **RLS:** Company-scoped
- **Used By:** Recruitment pages, candidate management

#### `employee_onboarding_assignments` / `employee_documents`

- **Module:** Teamly
- **Purpose:** Onboarding workflow
- **Key Columns:**
  - Assignments: `id`, `profile_id`, `pack_id`, `assigned_at`, `completed_at`
  - Documents: `id`, `profile_id`, `document_type`, `file_url`, `status`, `acknowledged_at`
- **RLS:** User can read own, HR can read all
- **Used By:** Onboarding pages, document management

### Messaging System Tables (Public Schema)

#### `conversations`

- **Module:** Shared (Messaging)
- **Purpose:** Chat conversations (DM, group, site, team)
- **Key Columns:**
  - `id`, `company_id`, `site_id`, `type`: text (direct, group, site, team)
  - `name`, `description`, `avatar_url`
  - `created_by`, `last_message_at`, `archived_at`
- **RLS:** Participants can read
- **Used By:** Messaging pages, notifications

#### `messages`

- **Module:** Shared (Messaging)
- **Purpose:** Individual messages
- **Key Columns:**
  - `id`, `conversation_id`, `sender_id`, `reply_to_id`
  - `content`: text, `message_type`: text (text, file, image, system, location)
  - `file_url`, `file_name`, `file_size`, `file_type`
  - `metadata`: jsonb, `deleted_at`: timestamptz (soft delete)
- **RLS:** Participants can read messages in their conversations
- **Used By:** Chat interface, message threads

#### `conversation_participants`

- **Module:** Shared (Messaging)
- **Purpose:** Users in conversations
- **Key Columns:**
  - `conversation_id`, `user_id` (composite PK)
  - `role`: text (admin, member), `joined_at`, `left_at`
  - `last_read_at`, `last_read_message_id`
  - `muted_until`, `notification_preferences`: jsonb
- **RLS:** Participants can read participants list
- **Used By:** Conversation management, read receipts

#### `message_reads` / `message_reactions` / `message_mentions`

- **Module:** Shared (Messaging)
- **Purpose:** Read receipts, emoji reactions, @mentions
- **Key Columns:** Standard message interaction tracking
- **RLS:** Participants can read interactions in their conversations
- **Used By:** Chat features, notifications

### Notification System (Public Schema)

#### `notifications`

- **Module:** Shared
- **Purpose:** In-app notifications
- **Key Columns:**
  - `id`, `user_id`, `company_id`, `site_id`
  - `type`: text (task_due, message, approval, system)
  - `title`, `message`, `action_url`
  - `severity`: text (info, warning, critical)
  - `read_at`, `created_at`
- **RLS:** User can read own notifications
- **Used By:** Notification center, push notifications

### Order Book System (Public Schema) - Stockly Production Module

#### `order_book_customers` / `order_book_suppliers` / `order_book_products`

- **Module:** Stockly (Production)
- **Purpose:** Customer/supplier/product master data for wholesale
- **Key Columns:** Standard CRM/product catalog fields
- **RLS:** Company-scoped
- **Used By:** Production planning, order management

#### `order_book_orders` / `order_book_order_items`

- **Module:** Stockly (Production)
- **Purpose:** Customer orders
- **Key Columns:**
  - `order_number`, `customer_id`, `order_date`, `delivery_date`
  - `status`, `total_amount`, line items with quantities
- **RLS:** Company-scoped
- **Used By:** Order management, fulfillment

#### `order_book_production_schedule`

- **Module:** Stockly (Production)
- **Purpose:** Production planning and scheduling
- **Key Columns:**
  - `schedule_date`, `product_id`, `quantity`, `status`
- **RLS:** Company-scoped
- **Used By:** Production dashboard, scheduling

### Supporting Tables

#### `uom` (Units of Measure)

- **Module:** Shared (Stockly primary)
- **Purpose:** Standard units (kg, g, L, ml, ea, doz, etc.)
- **Key Columns:** `id`, `name`, `abbreviation`, `unit_type`, `base_multiplier`, `is_base`
- **Seeded:** Standard hospitality units pre-loaded
- **Used By:** Stockly for quantity conversions

#### `departments` / `areas` / `regions`

- **Module:** Shared (Teamly/Organization)
- **Purpose:** Organizational hierarchy
- **Key Columns:** Standard hierarchy with `company_id`, `parent_id`
- **RLS:** Company-scoped
- **Used By:** Directory, org chart, approvals

#### `roles` / `permissions` / `role_permissions`

- **Module:** Shared (Teamly)
- **Purpose:** RBAC system
- **Key Columns:**
  - Roles: `id`, `company_id`, `name`, `description`
  - Permissions: `id`, `name`, `resource`, `action`
  - Role-Permissions: Many-to-many mapping
- **RLS:** Company-scoped
- **Used By:** Access control throughout app

### Views and Functions

#### `active_shifts` (VIEW)

- **Purpose:** Currently on-shift staff
- **Source:** `staff_attendance` WHERE `shift_status = 'on_shift'`
- **Used By:** Dashboard widgets, shift handover

#### `todays_attendance` (VIEW)

- **Purpose:** Today's attendance records with profile info
- **Source:** `staff_attendance` JOIN `profiles` WHERE `clock_in_time::date = CURRENT_DATE`
- **Used By:** Attendance pages, reporting

#### `attendance_logs` (VIEW)

- **Purpose:** Read-only attendance with `clock_in_date` column
- **Important:** PostgREST compatibility - avoids `clock_in_at::date` syntax
- **Used By:** Attendance queries (SELECT only)
- **Note:** Write operations must use `staff_attendance` table

#### Helper Functions

- `get_active_shift(p_user_id UUID)`: Get user's current shift
- `get_staff_on_shift_at_site(p_site_id UUID)`: Get all staff on shift at site
- `auto_clock_out_old_shifts()`: Auto-clock-out shifts >24 hours
- `stockly_company_access(p_company_id UUID)`: RLS helper for Stockly
- `is_conversation_participant(conv_id, user_uuid)`: Messaging RLS helper

---

## 2. FEATURE INVENTORY BY MODULE

### CHECKLY Module

#### `/dashboard/tasks`

- ✅ Task list view (active tasks)
- ✅ Task filtering by status, date, type
- ✅ Task completion modal
- ✅ Task assignment
- ⚠️ Task scheduling UI (backend exists, UI partial)
- ❌ Bulk task operations

#### `/dashboard/tasks/compliance`

- ✅ Pre-built compliance templates (7 types)
  - Temperature checks (fridge/freezer, hot holding)
  - Fire alarm tests
  - Pest control inspections
  - First aid kit inspections
  - Fire extinguisher inspections
  - Extraction contractor templates
  - Lighting inspections
  - Workplace inspections
  - Emergency incident reports
  - Food poisoning investigations
  - Training records
- ✅ Template configuration
- ✅ Deploy templates to create recurring tasks
- ✅ Compliance scoring calculation

#### `/dashboard/tasks/templates`

- ✅ Custom template builder
- ✅ Template library
- ✅ Template fields (text, number, checkbox, measurement, etc.)
- ✅ Repeatable sections
- ⚠️ Template versioning (backend exists, UI missing)
- ❌ Template sharing between companies

#### `/dashboard/tasks/active`

- ✅ Active tasks list (pending, in_progress, overdue)
- ✅ Filter by status, date, assignee
- ✅ Task detail view
- ✅ Quick completion
- ⚠️ Task reminders/notifications (backend exists)

#### `/dashboard/tasks/completed`

- ✅ Completed tasks history
- ✅ Filter by date range
- ✅ View completion data
- ✅ Export completed tasks
- ❌ Completion analytics/charts

#### `/dashboard/compliance`

- ✅ Compliance overview dashboard
- ✅ Site compliance scores
- ✅ Task completion rates
- ✅ EHO readiness pack
- ✅ Compliance scanning cron job
- ⚠️ Compliance trends (partial)

#### `/dashboard/compliance/eho`

- ✅ EHO report generator
- ✅ EHO readiness dashboard
- ✅ Compliance cards (temperature, cleaning, documentation, etc.)
- ✅ EHO export (PDF, Excel)
- ✅ Extended data functions
- ✅ Summary reports

#### `/dashboard/incidents`

- ✅ Incident reporting form
- ✅ Incident list view
- ✅ Incident types (slip/trip, cuts, burns, fires, food poisoning)
- ✅ RIDDOR assessment
- ✅ Casualty/witness tracking
- ✅ Photo/document attachments
- ✅ Incident detail view
- ⚠️ Incident analytics (partial)

#### `/dashboard/checklists`

- ✅ Checklist view (today's tasks)
- ✅ Task card components
- ✅ Completion modal with workflows
- ✅ Monitor duration modal
- ✅ Completed task cards
- ⚠️ Checklist templates (separate from task templates)

#### `/dashboard/assets`

- ✅ Asset management
- ✅ Asset categories
- ✅ Asset logs
- ✅ Contractor assignments
- ✅ PPM (Preventive Planned Maintenance) tracking
- ✅ Asset archiving
- ⚠️ Asset lifecycle management (partial)

#### `/dashboard/libraries`

- ✅ Library system for reusable content
  - Ingredients
  - PPE
  - Chemicals
  - Drinks
  - Disposables
  - Glassware
  - Packaging
  - Serving Equipment
  - Appliances
  - First Aid Supplies
- ✅ Library request system
- ✅ Library templates
- ✅ Multi-site library stock management
- ✅ Library stock transfers
- ⚠️ Library versioning (partial)

#### `/dashboard/sops`

- ✅ SOP (Standard Operating Procedure) management
- ✅ SOP templates
- ✅ SOP versioning
- ✅ SOP archive
- ✅ SOP compliance tracking
- ✅ SOP categories (food, cleaning, service, etc.)
- ⚠️ SOP approval workflow (backend exists)

#### `/dashboard/risk-assessments`

- ✅ Risk assessment management
- ✅ RA templates
- ✅ RA versioning
- ✅ RA archive
- ✅ COSHH assessments
- ⚠️ RA approval workflow (partial)

#### `/dashboard/logs/temperature`

- ✅ Temperature log viewer
- ✅ Temperature breach alerts
- ✅ Temperature trends
- ✅ Equipment temperature history
- ⚠️ Temperature analytics (partial)

### STOCKLY Module

#### `/dashboard/stockly`

- ✅ Stockly dashboard/overview
- ✅ Quick actions
- ✅ Stock alerts (low stock, out of stock)
- ✅ Recent deliveries
- ✅ Recent waste logs

#### `/dashboard/stockly/stock-items`

- ✅ Stock item management
- ✅ Stock item categories
- ✅ SKU management
- ✅ Product variants (supplier-specific)
- ✅ Base unit configuration
- ✅ Yield percentage tracking
- ✅ Allergen tracking
- ✅ Costing methods (weighted avg, FIFO, last price)
- ✅ Par levels and reorder quantities
- ⚠️ Bulk import/export (partial)
- ❌ Barcode scanning integration

#### `/dashboard/stockly/suppliers`

- ✅ Supplier management
- ✅ Supplier contact information
- ✅ Ordering methods (app, WhatsApp, email, phone, portal)
- ✅ Payment terms
- ✅ Minimum order values
- ✅ Delivery schedules
- ⚠️ Supplier performance metrics (partial)
- ❌ Supplier rating system

#### `/dashboard/stockly/deliveries`

- ✅ Delivery/invoice entry
- ✅ AI invoice processing (OCR)
- ✅ Invoice matching to product variants
- ✅ Delivery line items
- ✅ VAT calculation
- ✅ Price change detection
- ✅ Substitution tracking
- ✅ Delivery confirmation workflow
- ✅ Delivery disputes
- ⚠️ Bulk delivery processing (partial)
- ❌ Delivery scheduling calendar

#### `/dashboard/stockly/stock-counts`

- ✅ Stock count creation
- ✅ Stock count by storage area
- ✅ System vs counted quantity
- ✅ Variance calculation
- ✅ Variance approval workflow
- ✅ Stock count review
- ✅ Count adjustments
- ✅ Stock count history
- ⚠️ Cycle counting (partial)
- ❌ Mobile stock count app

#### `/dashboard/stockly/stock-levels`

- ✅ Current stock levels view
- ✅ Stock by site and storage area
- ✅ Stock value calculations
- ✅ Stock movement history
- ✅ Low stock alerts
- ✅ Out of stock alerts
- ⚠️ Stock forecasting (partial)
- ❌ ABC analysis

#### `/dashboard/stockly/storage-areas`

- ✅ Storage area management
- ✅ Storage area types (chilled, frozen, ambient, bar, cellar)
- ✅ Multi-site storage areas
- ✅ Storage area organization
- ⚠️ Storage capacity tracking (partial)

#### `/dashboard/stockly/recipes`

- ✅ Recipe management
- ✅ Recipe ingredients
- ✅ Recipe costing (automated)
- ✅ Recipe yield tracking
- ✅ Recipe instructions
- ✅ Prep items
- ✅ Recipe archive
- ✅ Recipe versioning (backend exists)
- ⚠️ Recipe scaling (partial)
- ❌ Recipe nutritional information

#### `/dashboard/stockly/waste`

- ✅ Waste log entry
- ✅ Waste reasons (expired, damaged, spillage, etc.)
- ✅ Waste line items
- ✅ Waste cost calculation
- ✅ Waste reporting
- ✅ Waste trends
- ✅ Photo attachments
- ✅ Link to Checkly tasks
- ⚠️ Waste forecasting (partial)
- ❌ Waste analytics dashboard

#### `/dashboard/stockly/transfers`

- ✅ Inter-site transfers
- ✅ Transfer creation
- ✅ Transfer confirmation
- ✅ Transfer history
- ⚠️ Transfer scheduling (partial)

#### `/dashboard/stockly/orders`

- ✅ Purchase order creation
- ✅ Order templates
- ✅ Order to supplier (various methods)
- ✅ Order tracking
- ✅ Order history
- ⚠️ Standing orders (backend exists, UI partial)
- ❌ Order automation rules

#### `/dashboard/stockly/production`

- ✅ Production dashboard
- ✅ Order book management
- ✅ Customer management
- ✅ Product catalog
- ✅ Customer pricing
- ✅ Standing orders
- ✅ Production scheduling
- ✅ Delivery scheduling
- ✅ Tray packing view
- ✅ Monthly sales tracking
- ✅ Production settings
- ⚠️ Sales forecasting (partial)
- ❌ Production capacity planning

#### `/dashboard/stockly/reports`

- ✅ Stock value report
- ✅ Supplier spend report
- ✅ GP (Gross Profit) report
- ✅ Wastage report
- ✅ Variance report
- ✅ Price history report
- ✅ Dead stock report
- ✅ Export reports (PDF, Excel)
- ⚠️ Custom report builder (partial)
- ❌ Scheduled report delivery

#### `/dashboard/stockly/settings`

- ✅ Stockly module settings
- ✅ Category management
- ✅ Unit of measure management
- ⚠️ Costing method defaults (partial)

### TEAMLY Module

#### `/dashboard/people`

- ✅ People dashboard/overview
- ✅ Employee directory
- ✅ Org chart
- ✅ Employee profiles
- ✅ Multi-site employee assignments
- ✅ Employee search and filters
- ⚠️ Employee analytics (partial)

#### `/dashboard/people/attendance`

- ✅ Attendance log viewer
- ✅ Clock in/out functionality
- ✅ Shift notes
- ✅ Today's attendance
- ✅ Attendance history
- ✅ Attendance signoff workflow
- ✅ Payroll period selector
- ✅ Time entry editing
- ✅ Week summary view
- ✅ Employer costs summary
- ⚠️ Attendance analytics (partial)
- ❌ Shift templates

#### `/dashboard/people/schedule`

- ✅ Rota/shift scheduling
- ✅ Shift patterns
- ✅ Shift assignment
- ✅ Shift swapping
- ✅ Shift approval workflow
- ✅ Availability management
- ✅ Availability requests
- ✅ Rota views (calendar, list)
- ✅ Rota forecasts
- ✅ Rota templates
- ⚠️ Shift optimization (partial)
- ❌ Auto-scheduling algorithms

#### `/dashboard/people/leave`

- ✅ Leave request submission
- ✅ Leave request approval
- ✅ Leave calendar view
- ✅ Leave balances
- ✅ Leave types configuration
- ✅ Leave blackout dates
- ✅ Public holidays
- ⚠️ Leave forecasting (partial)
- ❌ Leave carryover rules

#### `/dashboard/people/payroll`

- ✅ Payroll run creation
- ✅ Pay period management
- ✅ Time entry aggregation
- ✅ Pay rate configuration
- ✅ Payslip generation
- ✅ Payroll export (Xero, Sage, QuickBooks, generic)
- ✅ Tronc management
- ✅ Employer costs calculation
- ✅ Payroll settings
- ⚠️ Payroll analytics (partial)
- ❌ Automated payroll processing

#### `/dashboard/people/recruitment`

- ✅ Job posting
- ✅ Candidate management
- ✅ Application tracking
- ✅ Interview scheduling
- ✅ Offer letter generation
- ✅ Application confirmation system
- ✅ Candidate search
- ✅ Application stages
- ⚠️ Interview feedback (partial)
- ❌ Candidate scoring/ranking

#### `/dashboard/people/onboarding`

- ✅ Onboarding pack assignment
- ✅ Employee document management
- ✅ Document acknowledgements
- ✅ Onboarding progress tracking
- ✅ Company document templates
- ✅ Global document templates
- ✅ Employee document instances
- ⚠️ Onboarding automation (partial)
- ❌ Onboarding checklists

#### `/dashboard/people/reviews`

- ✅ Performance review templates
- ✅ Review scheduling
- ✅ Review completion
- ✅ Review responses
- ✅ 1-on-1 meetings
- ✅ Goals management
- ✅ Review history
- ✅ Team reviews
- ✅ Review files/attachments
- ✅ Company values and behaviors
- ✅ Scoring scales
- ⚠️ Review analytics (partial)
- ❌ 360-degree reviews

#### `/dashboard/people/training`

- ✅ Training course library
- ✅ Training records
- ✅ Training matrix
- ✅ Training certificates
- ✅ Training compliance tracking
- ✅ Training bookings
- ✅ Expiring training alerts
- ⚠️ Training analytics (partial)
- ❌ Custom training courses

#### `/dashboard/people/settings`

- ✅ General settings
- ✅ Department management
- ✅ Role management
- ✅ Permission management
- ✅ Site management
- ✅ Area management
- ✅ Region management
- ✅ Approval hierarchy
- ✅ Shift rules configuration
- ✅ Notification settings
- ✅ Leave type configuration
- ⚠️ Workflow builder (partial)

### SHARED Features

#### `/dashboard/messaging`

- ✅ Direct messages
- ✅ Group chats
- ✅ Site-wide chats
- ✅ Team chats
- ✅ Message threads
- ✅ File attachments
- ✅ Image sharing
- ✅ Read receipts
- ✅ Message reactions
- ✅ @Mentions
- ✅ Typing indicators
- ✅ Conversation search
- ✅ Message search
- ⚠️ Message pinning (backend exists, UI partial)
- ⚠️ Topics/channels (backend exists, UI partial)
- ❌ Voice messages
- ❌ Video calls

#### `/dashboard/notifications`

- ✅ Notification center
- ✅ Notification types (task_due, message, approval, system)
- ✅ Notification severity (info, warning, critical)
- ✅ Read/unread status
- ✅ Push notifications (backend exists)
- ✅ Email notifications (backend exists)
- ⚠️ Notification preferences (partial)
- ❌ Notification grouping

#### `/dashboard/reports`

- ✅ Report generation
- ✅ Report export (PDF, Excel)
- ✅ Custom date ranges
- ⚠️ Report scheduling (partial)
- ❌ Custom report builder

#### `/dashboard/settings`

- ✅ User settings
- ✅ Company settings
- ✅ Site settings
- ✅ Module settings
- ✅ Billing settings
- ⚠️ Audit log (partial)
- ❌ Advanced configuration

---

## 3. SHARED INFRASTRUCTURE

### Shared Database Tables

**Used by 2+ modules:**

- `companies`: All modules
- `sites`: All modules
- `profiles`: All modules
- `user_roles`: All modules
- `company_modules`: All modules
- `conversations` / `messages`: All modules (messaging)
- `notifications`: All modules
- `departments` / `areas` / `regions`: Teamly, Checkly (organization)
- `roles` / `permissions`: Teamly, Checkly (access control)

### Shared Components

**Global UI Components (`src/components/ui/`):**

- Button, Input, Select, Textarea, Label
- Card, Dialog, Drawer, Dropdown Menu
- Table, Tabs, Accordion
- Badge, Alert, Toast (sonner)
- DatePicker, Calendar
- Form components (react-hook-form + zod)
- Loading states, Error boundaries
- File upload components
- PDF viewer
- Rich text editor (Tiptap)

**Layout Components:**

- `NewMainSidebar`: Main navigation sidebar
- `DashboardLayout`: Dashboard wrapper
- `AuthLayout`: Authentication pages layout
- `CustomerLayout`: Customer portal layout

**Shared Feature Components:**

- `SmartSearch`: Global search component
- `FileUpload`: File upload with Supabase Storage
- `PDFGenerator`: PDF export utility
- `ExportExcel`: Excel export utility
- `PermissionGate`: RBAC component wrapper
- `ErrorBoundary`: Error handling wrapper

**Module-Specific Component Locations:**

- `src/components/checklists/`: Checkly task components
- `src/components/stockly/`: Stockly inventory components
- `src/components/messaging/`: Messaging components
- `src/components/people/`: Teamly HR components

### Shared Utilities (`src/lib/`)

**Authentication & Authorization:**

- `supabase.ts`: Browser client (singleton)
- `supabase-server.ts`: Server-side client factory
- `supabaseHelpers.ts`: Common Supabase helpers
- `authHelpers.ts`: Auth utilities
- `roles.ts`: Role management
- `accessControl.ts`: Permission checking
- `sessionManager.ts`: Session management

**Data Fetching & State:**

- `useUser.ts`: User data hook
- `useDebouncedValue.ts`: Debounced input hook
- `dashboard-cache.ts`: Dashboard data caching
- `swr` / `@tanstack/react-query`: Data fetching libraries

**Business Logic:**

- `companyHelpers.ts`: Company management
- `task-generation.ts`: Task creation logic
- `template-features.ts`: Template feature detection
- `shift-utils.ts`: Shift calculations
- `payroll/calculations.ts`: Payroll math
- `payroll/exports/`: Payroll export formats
- `stockly/stock-utils.ts`: Stock calculations
- `order-book/customer.ts`: Order book helpers

**File Handling:**

- `storage/signedUrls.ts`: Supabase Storage signed URLs
- `pdf-generator.ts`: PDF generation (jsPDF)
- `export-pdf.ts`: PDF export utilities
- `export-excel.ts`: Excel export utilities
- `incident-report-pdf.ts`: Incident PDF generation

**Email & Notifications:**

- `emails/portalInvitation.ts`: Email templates
- `notifications/pushNotifications.ts`: Push notification helpers
- `notifications/attendance.ts`: Attendance notifications

**Utilities:**

- `utils.ts`: General utilities (cn, formatDate, etc.)
- `utils/dateUtils.ts`: Date formatting and calculations
- `utils/idGenerator.ts`: ID generation
- `utils/skuGenerator.ts`: SKU generation
- `utils/unitLookup.ts`: Unit conversion
- `utils/recipeIdGenerator.ts`: Recipe ID generation
- `utils/sopVersioning.ts`: SOP version management
- `utils/raVersioning.ts`: RA version management
- `utils/evaluateCompliance.ts`: Compliance scoring
- `utils/libraryHelpers.ts`: Library management
- `utils/prepItemRecipeFlow.ts`: Prep item workflow

**External Services:**

- `geocoding.ts`: Address geocoding
- `postcodeMap.ts`: UK postcode utilities
- `timezones.ts`: Timezone handling
- `pwa.ts`: PWA configuration
- `featureFlags.ts`: Feature flag management

### Shared Hooks (`src/hooks/` or `src/lib/hooks/`)

- `useClientState.ts`: Client-side state management
- `useAttendance.ts`: Attendance data hook (if exists)
- Custom hooks likely embedded in components

### Shared Types (`src/types/`)

**Core Types:**

- `supabase.ts`: Auto-generated database types (12,000+ lines)
- `index.ts`: Re-exported types
- `guards.ts`: Type guards
- `constants.ts`: Type constants

**Feature Types:**

- `checklist.ts` / `checklist-types.ts`: Task/checklist types
- `temperature.ts`: Temperature monitoring types
- `ppm.ts`: Asset maintenance types
- `messaging.ts`: Messaging types
- `teamly.ts`: HR types
- `reviews.ts`: Performance review types
- `approval.ts`: Approval workflow types
- `library.types.ts`: Library content types
- `permissions.ts`: Permission types
- `departments.ts`: Department types
- `teamly-settings.ts`: Teamly configuration types
- `general-settings.ts`: General settings types
- `company-closures.ts`: Closure types
- `archived-user.ts`: Archived user types

---

## 4. DATA FLOW ANALYSIS

### Flow 1: Create Stock Count (Stockly)

**Starting Point:** `/dashboard/stockly/stock-counts`

**User Actions:**

1. Click "New Stock Count"
2. Select site and count date
3. Select storage areas to count
4. For each area, scan/enter items and quantities
5. Review variances
6. Approve count

**Tables Touched (in order):**

1. `stock_counts` - INSERT (create count session)
2. `stock_count_items` - INSERT (for each item counted)
3. `stock_count_items` - UPDATE (system_qty from stock_levels)
4. `stock_counts` - UPDATE (status: draft → in_progress → completed)
5. `stock_movements` - INSERT (count_adjustment type, if approved)
6. `stock_levels` - UPDATE (adjust quantity based on variance)
7. `stock_counts` - UPDATE (approved_by, approved_at)

**Components Used:**

- `CreateCountModal`
- `StockCountCard`
- `StockCountReview`
- `VarianceTable`

**API Calls:**

- `POST /api/stockly/stock-counts` (create)
- `GET /api/stockly/stock-counts/[id]` (fetch)
- `PATCH /api/stockly/stock-counts/[id]` (update items)
- `POST /api/stockly/stock-counts/[id]/approve` (approve)

**End State:** Stock count completed and approved, stock levels updated, adjustment movement recorded

### Flow 2: Create Task (Checkly)

**Starting Point:** `/dashboard/tasks/compliance` or `/dashboard/tasks/templates`

**User Actions:**

1. Select compliance template or custom template
2. Configure template (frequency, sites, assignees)
3. Deploy template (creates task instances)
4. Task appears in assigned user's task list
5. User completes task
6. Completion data saved

**Tables Touched (in order):**

1. `task_templates` - SELECT (if using existing template) or INSERT (if creating custom)
2. Cron job or manual trigger generates `checklist_tasks` - INSERT (creates task instances)
3. `notifications` - INSERT (task_due notification to assignee)
4. `checklist_tasks` - SELECT (user views task)
5. `checklist_tasks` - UPDATE (status: pending → in_progress)
6. `task_completion_records` - INSERT (save completion data)
7. `checklist_tasks` - UPDATE (status: in_progress → completed, completed_at)
8. `site_compliance_score` - UPDATE (recalculate score)
9. `notifications` - INSERT (completion notification to manager)

**Components Used:**

- `TemperatureCheckTemplate` (or other template components)
- `MasterTemplateModal`
- `TaskCard`
- `TaskCompletionModal`

**API Calls:**

- `POST /api/compliance/deploy` (deploy template)
- `GET /api/compliance/tasks` (fetch tasks)
- `POST /api/tasks/complete` (complete task)
- `GET /api/compliance/calculate-score` (recalculate compliance)

**End State:** Task completed, compliance score updated, notifications sent

### Flow 3: User Login and Company Selection

**Starting Point:** `/login`

**User Actions:**

1. Enter email/password
2. Submit login form
3. Redirected to dashboard
4. If multi-company access, select company
5. Dashboard loads with company context

**Tables Touched (in order):**

1. `auth.users` - SELECT (Supabase Auth)
2. `profiles` - SELECT (fetch user profile)
3. `company_modules` - SELECT (check enabled modules)
4. `companies` - SELECT (fetch company data)
5. `sites` - SELECT (fetch user's accessible sites)
6. `user_roles` - SELECT (fetch user's roles)
7. Various module tables - SELECT (load dashboard data)

**Components Used:**

- `LoginPage`
- `AppContext` (auth state management)
- `DashboardRouter`
- `DashboardLayout`

**API Calls:**

- `supabase.auth.signInWithPassword()` (auth)
- Client-side Supabase queries (profile, company, etc.)

**End State:** User authenticated, company context set, dashboard loaded

### Flow 4: Create Ingredient (Stockly)

**Starting Point:** `/dashboard/stockly/stock-items`

**User Actions:**

1. Click "New Stock Item"
2. Enter item details (name, category, base unit, etc.)
3. Save item
4. Optionally add product variants (supplier-specific)
5. Set par levels and reorder quantities

**Tables Touched (in order):**

1. `stock_categories` - SELECT (fetch categories)
2. `uom` - SELECT (fetch units of measure)
3. `stock_items` - INSERT (create stock item)
4. `product_variants` - INSERT (optional, for each supplier variant)
5. `stock_levels` - INSERT (initialize stock level at sites)
6. `stock_items` - UPDATE (if adding variants after creation)

**Components Used:**

- `StockItemModal`
- `StockItemForm`
- `ProductVariantForm`

**API Calls:**

- `GET /api/stockly/categories` (fetch categories)
- `POST /api/stockly/stock-items` (create item)
- `POST /api/stockly/product-variants` (add variants)

**End State:** Stock item created, variants added (if any), initial stock levels set

### Flow 5: Clock In (Teamly)

**Starting Point:** `/dashboard/people/attendance` or dashboard widget

**User Actions:**

1. Click "Clock In" button
2. Select site (if multi-site)
3. Optionally add shift notes
4. Confirm clock in

**Tables Touched (in order):**

1. `staff_attendance` - SELECT (check for existing active shift)
2. `sites` - SELECT (verify site access)
3. `staff_attendance` - INSERT (create new shift record)
4. `notifications` - INSERT (clock_in notification, optional)
5. `attendance_logs` VIEW - SELECT (for display, read-only)

**Components Used:**

- `ClockInOut` component
- `ClockInButton`

**API Calls:**

- `POST /api/attendance/clock-in`
- `GET /api/attendance/status` (check current status)

**End State:** User clocked in, shift record created, on-shift status active

### Flow 6: Send Message (Messaging)

**Starting Point:** `/dashboard/messaging`

**User Actions:**

1. Select or create conversation
2. Type message
3. Optionally attach file/image
4. Send message

**Tables Touched (in order):**

1. `conversations` - SELECT or INSERT (if new conversation)
2. `conversation_participants` - SELECT or INSERT (add participants)
3. `storage.buckets` - INSERT (if file attachment, upload to Supabase Storage)
4. `messages` - INSERT (create message)
5. `conversations` - UPDATE (update last_message_at via trigger)
6. `message_mentions` - INSERT (if @mentions detected)
7. `notifications` - INSERT (notification to recipients)
8. `message_reads` - INSERT (mark sender as read)

**Components Used:**

- `MessagingWidget`
- `ConversationList`
- `MessageList`
- `MessageInput`
- `FileUpload`

**API Calls:**

- Client-side Supabase real-time subscriptions
- `supabase.storage.from('messages').upload()` (if file)
- `supabase.from('messages').insert()` (message)

**End State:** Message sent, conversation updated, notifications sent to recipients

---

## 5. NAVIGATION & ROUTING STRUCTURE

### Root Routes

```
/
├── app/
│   ├── (marketing)/          # Marketing pages
│   │   ├── checkly-features/
│   │   ├── features/
│   │   ├── marketing/
│   │   ├── onboarding/
│   │   ├── pricing/
│   │   └── why-checkly/
│   │
│   ├── (auth)/               # Auth pages
│   │   ├── login/            ✅ Full login page
│   │   ├── signup/           ✅ Signup page
│   │   ├── forgot-password/  ✅ Password reset
│   │   ├── reset-password/   ✅ Password reset confirmation
│   │   ├── new-password/     ✅ New password form
│   │   └── auth/callback/    ✅ OAuth callback
│   │
│   ├── dashboard/            # Main app (protected)
│   │   ├── layout.tsx        ✅ Dashboard layout with sidebar
│   │   ├── page.tsx          ✅ Dashboard home/overview
│   │   ├── loading.tsx       ✅ Loading state
│   │   │
│   │   ├── tasks/            # CHECKLY - Tasks
│   │   │   ├── page.tsx      ❌ (removed, use active/completed)
│   │   │   ├── compliance/   ✅ Compliance templates
│   │   │   ├── templates/    ✅ Custom templates
│   │   │   ├── active/       ✅ Active tasks
│   │   │   ├── completed/    ✅ Completed tasks
│   │   │   └── view/[id]/    ✅ Task detail view
│   │   │
│   │   ├── checklists/       # CHECKLY - Checklists
│   │   │   ├── page.tsx      ✅ Today's checklists
│   │   │   └── templates/    ✅ Checklist templates
│   │   │
│   │   ├── compliance/       # CHECKLY - Compliance
│   │   │   ├── page.tsx      ✅ Compliance dashboard
│   │   │   └── eho/          ✅ EHO readiness
│   │   │
│   │   ├── incidents/        # CHECKLY - Incidents
│   │   │   ├── page.tsx      ✅ Incident list
│   │   │   ├── new/          ✅ New incident
│   │   │   ├── customer-complaints/  ✅ Customer complaints
│   │   │   ├── food-poisoning/       ✅ Food poisoning
│   │   │   ├── staff-sickness/       ✅ Staff sickness
│   │   │   └── storage/              ✅ Storage incidents
│   │   │
│   │   ├── assets/           # CHECKLY - Assets
│   │   │   ├── page.tsx      ✅ Asset list
│   │   │   ├── contractors/  ✅ Contractor management
│   │   │   └── callout-logs/ ✅ Callout history
│   │   │
│   │   ├── libraries/        # CHECKLY - Libraries
│   │   │   ├── page.tsx      ✅ Library overview
│   │   │   ├── ingredients/  ✅ Ingredients library
│   │   │   ├── ppe/          ✅ PPE library
│   │   │   ├── chemicals/    ✅ Chemicals library
│   │   │   ├── drinks/       ✅ Drinks library
│   │   │   ├── disposables/  ✅ Disposables library
│   │   │   ├── glassware/    ✅ Glassware library
│   │   │   ├── packaging/    ✅ Packaging library
│   │   │   ├── serving-equipment/  ✅ Serving equipment
│   │   │   ├── appliances/   ✅ Appliances
│   │   │   ├── first-aid/    ✅ First aid supplies
│   │   │   ├── create/       ✅ Create library item
│   │   │   ├── templates/    ✅ Library templates
│   │   │   └── my-requests/  ✅ Library requests
│   │   │
│   │   ├── sops/             # CHECKLY - SOPs
│   │   │   ├── page.tsx      ✅ SOP list
│   │   │   ├── archive/      ✅ Archived SOPs
│   │   │   ├── templates/    ✅ SOP templates
│   │   │   ├── view/[id]/    ✅ SOP viewer
│   │   │   └── [template]-template/  ✅ Template-specific pages
│   │   │
│   │   ├── risk-assessments/ # CHECKLY - Risk Assessments
│   │   │   ├── page.tsx      ✅ RA list
│   │   │   ├── archive/      ✅ Archived RAs
│   │   │   └── [type]-template/  ✅ RA templates
│   │   │
│   │   ├── stockly/          # STOCKLY - Inventory
│   │   │   ├── layout.tsx    ✅ Stockly layout
│   │   │   ├── page.tsx      ✅ Stockly dashboard
│   │   │   ├── stock-items/  ✅ Stock item management
│   │   │   ├── suppliers/    ✅ Supplier management
│   │   │   ├── deliveries/   ✅ Delivery/invoice entry
│   │   │   ├── stock-counts/ ✅ Stock counting
│   │   │   ├── storage-areas/  ✅ Storage area management
│   │   │   ├── recipes/      ✅ Recipe management
│   │   │   ├── waste/        ✅ Waste tracking
│   │   │   ├── orders/       ✅ Purchase orders
│   │   │   ├── credit-notes/ ✅ Credit notes
│   │   │   ├── sales/        ✅ Sales entry
│   │   │   ├── libraries/    ✅ Stockly libraries (different from Checkly)
│   │   │   ├── production/   ✅ Production/wholesale module
│   │   │   │   ├── dashboard/    ✅ Production dashboard
│   │   │   │   ├── order-book/   ✅ Order book
│   │   │   │   ├── customers/    ✅ Customer management
│   │   │   │   ├── products/     ✅ Product catalog
│   │   │   │   ├── pricing/      ✅ Customer pricing
│   │   │   │   ├── standing-orders/  ✅ Standing orders
│   │   │   │   ├── delivery-schedule/  ✅ Delivery scheduling
│   │   │   │   ├── delivery-notes/     ✅ Delivery notes
│   │   │   │   ├── monthly-sales/      ✅ Monthly sales
│   │   │   │   ├── tray-packing/       ✅ Tray packing
│   │   │   │   └── settings/           ✅ Production settings
│   │   │   ├── reports/      ✅ Reports
│   │   │   │   ├── stock-value/    ✅ Stock value
│   │   │   │   ├── supplier-spend/ ✅ Supplier spend
│   │   │   │   ├── gp/             ✅ Gross profit
│   │   │   │   ├── wastage/        ✅ Wastage
│   │   │   │   ├── variance/       ✅ Variance
│   │   │   │   ├── prices/         ✅ Price history
│   │   │   │   └── dead-stock/     ✅ Dead stock
│   │   │   └── settings/     ✅ Stockly settings
│   │   │
│   │   ├── people/           # TEAMLY - HR
│   │   │   ├── layout.tsx    ✅ People layout
│   │   │   ├── page.tsx      ✅ People dashboard
│   │   │   ├── directory/    ✅ Employee directory
│   │   │   ├── employees/    ✅ Employee management
│   │   │   ├── attendance/   ✅ Attendance/clock in-out
│   │   │   ├── schedule/     ✅ Rota/shift scheduling
│   │   │   ├── leave/        ✅ Leave management
│   │   │   ├── payroll/      ✅ Payroll
│   │   │   ├── recruitment/  ✅ Recruitment
│   │   │   ├── onboarding/   ✅ Onboarding
│   │   │   ├── reviews/      ✅ Performance reviews
│   │   │   ├── training/     ✅ Training
│   │   │   ├── [id]/         ✅ Employee profile
│   │   │   └── settings/     ✅ Teamly settings
│   │   │
│   │   ├── messaging/        # SHARED - Messaging
│   │   │   └── page.tsx      ✅ Messaging center
│   │   │
│   │   ├── notifications/    # SHARED - Notifications
│   │   │   └── page.tsx      ✅ Notification center
│   │   │
│   │   ├── sites/            # SHARED - Sites
│   │   │   ├── page.tsx      ✅ Site list
│   │   │   └── [id]/         ✅ Site detail
│   │   │
│   │   ├── organization/     # SHARED - Organization
│   │   │   ├── page.tsx      ✅ Organization overview
│   │   │   ├── sites/        ✅ Site management
│   │   │   ├── users/        ✅ User management
│   │   │   ├── onboarding/   ✅ Org onboarding
│   │   │   └── emergency-contacts/  ✅ Emergency contacts
│   │   │
│   │   ├── business/         # SHARED - Business Details
│   │   │   └── page.tsx      ✅ Business information
│   │   │
│   │   ├── billing/          # SHARED - Billing
│   │   │   └── page.tsx      ✅ Subscription/billing
│   │   │
│   │   ├── settings/         # SHARED - Settings
│   │   │   └── page.tsx      ✅ User/account settings
│   │   │
│   │   ├── reports/          # SHARED - Reports
│   │   │   ├── page.tsx      ✅ Reports overview
│   │   │   ├── incidents/    ✅ Incident reports
│   │   │   └── temperature/  ✅ Temperature reports
│   │   │
│   │   └── ... (other shared routes)
│   │
│   ├── api/                  # API Routes
│   │   ├── compliance/       ✅ Compliance APIs
│   │   ├── tasks/            ✅ Task APIs
│   │   ├── stockly/          ✅ Stockly APIs
│   │   ├── attendance/       ✅ Attendance APIs
│   │   ├── recruitment/      ✅ Recruitment APIs
│   │   ├── messaging/        ✅ Messaging APIs (if any)
│   │   ├── company/          ✅ Company APIs
│   │   ├── profile/          ✅ Profile APIs
│   │   └── ... (many more)
│   │
│   ├── customer/             # Customer Portal
│   │   ├── login/            ✅ Customer login
│   │   ├── dashboard/        ✅ Customer dashboard
│   │   ├── orders/           ✅ Customer orders
│   │   ├── standing-orders/  ✅ Standing orders
│   │   ├── waste/            ✅ Waste tracking
│   │   ├── messages/         ✅ Customer messages
│   │   └── reports/          ✅ Customer reports
│   │
│   └── ... (other routes)
```

### Route Protection

**Protected Routes:**

- All `/dashboard/*` routes require authentication
- Module-specific routes check `company_modules` for enabled modules
- Role-based access enforced via RLS policies and `PermissionGate` component

**Public Routes:**

- `/`, `/login`, `/signup`, `/pricing`, `/features`
- `/customer/login`, `/customer/dashboard` (separate auth)
- Marketing pages

---

## 6. AUTHENTICATION & AUTHORIZATION

### Authentication System

**Provider:** Supabase Auth

**Login Flow:**

1. User submits credentials on `/login`
2. `supabase.auth.signInWithPassword()` called
3. Session stored in cookies (via `@supabase/ssr`)
4. `AppContext` listens to auth state changes
5. Profile fetched from `profiles` table
6. Company context loaded
7. Redirect to `/dashboard`

**Auth State Management:**

- `AppContext` (`src/context/AppContext.tsx`) - Main auth context
- `AuthContext` (`src/contexts/AuthContext.tsx`) - Alternative/legacy context
- `SessionManager` (`src/lib/sessionManager.ts`) - Session utilities

**Session Handling:**

- Server-side: `createServerSupabaseClient()` in API routes and Server Components
- Client-side: Singleton `supabase` client from `@/lib/supabase`
- Cookie-based sessions via `@supabase/ssr` package

### Authorization System

**Role Hierarchy:**

- `owner`: Full company access
- `admin`: Full company access (except billing)
- `manager` / `General Manager`: Site/team management
- `supervisor`: Team oversight
- `staff`: Limited access (own tasks, clock in/out)

**Permission System:**

- **Database Level:** Row Level Security (RLS) policies on all tables
- **Application Level:** `PermissionGate` component wrapper
- **Role-Based:** `roles` and `permissions` tables with `role_permissions` mapping

**RLS Policy Patterns:**

1. **Company-Scoped:** `company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())`
2. **Site-Scoped:** `site_id IN (SELECT site_id FROM employee_site_assignments WHERE profile_id = auth.uid())`
3. **Own-Data:** `user_id = auth.uid()` or `created_by = auth.uid()`
4. **Manager-Override:** Role check via `app_role IN ('Manager', 'Admin', 'Owner')`

**Key RLS Helper Functions:**

- `stockly_company_access(p_company_id UUID)`: Stockly module access
- `is_conversation_participant(conv_id, user_uuid)`: Messaging access
- `check_user_company_match(user_uuid, comp_id)`: Company membership check

**Permission Checking:**

- `src/lib/accessControl.ts`: Permission utilities
- `src/components/auth/PermissionGate.tsx`: React component wrapper
- `src/lib/roles.ts`: Role management utilities

---

## 7. EXTERNAL INTEGRATIONS

### Supabase Services

**Database:**

- PostgreSQL database
- Real-time subscriptions
- Row Level Security (RLS)
- Database functions and triggers
- Views for complex queries

**Authentication:**

- Email/password authentication
- OAuth providers (if configured)
- Session management
- User metadata

**Storage:**

- File uploads (documents, images, CVs)
- Buckets: `messages`, `documents`, `cvs`, `attachments` (inferred)
- Signed URLs for secure access
- Storage policies for access control

**Edge Functions:**

- `check-task-notifications`: Cron-triggered task notifications
- Custom business logic (if any)

### Third-Party APIs

**Payment Processing:**

- Stripe (inferred from billing pages)
- Subscription management
- Addon purchases

**Email Services:**

- Supabase built-in email (or configured SMTP)
- Email templates for:
  - Invitations
  - Password resets
  - Notifications
  - Portal invitations

**SMS Services:**

- SMS sending capability (API route: `/api/send-sms`)
- Likely Twilio or similar

**Geocoding:**

- Address geocoding service (`src/lib/geocoding.ts`)
- UK postcode utilities (`src/lib/postcodeMap.ts`)

**PDF Generation:**

- jsPDF (`jspdf` package)
- jsPDF AutoTable (`jspdf-autotable` package)
- Used for: Reports, EHO exports, Payslips, Incident reports

**Excel Export:**

- SheetJS (`xlsx` package)
- Used for: Data exports, Reports

### AI/ML Services

**Anthropic Claude:**

- `@anthropic-ai/sdk` package
- AI Assistant widget (`src/components/assistant/AIAssistantWidget.tsx`)
- Likely used for: Chat assistance, content generation

**Invoice OCR:**

- AI invoice processing mentioned in delivery system
- Likely external OCR service or Supabase AI

---

## 8. FILE UPLOAD & STORAGE

### Supabase Storage Buckets

**Inferred Buckets:**

- `messages`: Message attachments (files, images)
- `documents`: Company documents, SOPs, policies
- `cvs`: Recruitment CVs
- `attachments`: General file attachments
- `profiles`: User profile pictures (if implemented)

**Storage Patterns:**

- Files uploaded via `supabase.storage.from(bucket).upload(path, file)`
- Signed URLs generated for secure access: `src/lib/storage/signedUrls.ts`
- File references stored in database as `text[]` or `text` columns

### File Upload Features

**Components:**

- `FileUpload`: Generic file upload component
- `LazyUploadGlobalDocModal`: Document upload modal
- Image upload in rich text editor (Tiptap)

**File Types Supported:**

- Documents (PDF, Word, Excel)
- Images (JPG, PNG)
- CVs (PDF, Word)

**File Reference Storage:**

- `documents`: `document_urls TEXT[]` in various tables
- `messages`: `file_url TEXT` in messages table
- `candidates`: `cv_url TEXT` in candidates table
- `incidents`: `photos TEXT[]`, `documents TEXT[]` in incidents table

---

## 9. CONFIGURATION & ENVIRONMENT

### Environment Variables

**Required (from code inspection):**

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side operations (if used)

**Likely Additional:**

- `ANTHROPIC_API_KEY`: Claude AI integration
- `STRIPE_SECRET_KEY`: Payment processing
- `STRIPE_PUBLISHABLE_KEY`: Payment processing
- `SMTP_*`: Email configuration (if not using Supabase email)
- `TWILIO_*`: SMS configuration (if using Twilio)

**Note:** No `.env.example` file found in search results - should be created

### Configuration Files

**TypeScript:**

- `tsconfig.json`: TypeScript configuration
- Path aliases: `@/*` → `src/*`

**Next.js:**

- `next.config.js` (not read, but inferred from package.json)
- App Router configuration

**Tailwind CSS:**

- `tailwind.config.js` (not read)
- Custom theme with magenta accent color (#EC4899)
- Emerald theme for Stockly (#10B981)

**ESLint:**

- `eslint.config.mjs`: ESLint configuration
- Next.js ESLint config
- TypeScript ESLint rules

---

## 10. DEPENDENCIES AUDIT

### Core Framework

- **Next.js:** `^16.1.1` (App Router)
- **React:** `^19.2.1`
- **React DOM:** `^19.2.1`
- **TypeScript:** `^5`

### Database & Backend

- **@supabase/supabase-js:** `^2.89.0` (Supabase client)
- **@supabase/ssr:** `^0.8.0` (Server-side rendering helpers)
- **@supabase/auth-helpers-nextjs:** `0.10.0` (Legacy, may be deprecated)

### UI & Styling

- **tailwindcss:** `^3.4.18` (Utility-first CSS)
- **lucide-react:** `^0.544.0` (Icons)
- **@headlessui/react:** `^2.2.9` (Unstyled UI components)
- **@heroicons/react:** `^2.2.0` (Icons, may be redundant with lucide)
- **framer-motion:** `^12.23.24` (Animations)
- **clsx:** `^2.1.1` (Conditional class names)
- **tailwind-merge:** `^3.3.1` (Merge Tailwind classes)

### Form Handling

- **react-hook-form:** `^7.65.0` (Form management)
- **@hookform/resolvers:** `^5.2.2` (Validation resolvers)
- **zod:** `^4.1.12` (Schema validation)

### Rich Text Editing

- **@tiptap/react:** `^3.8.0` (Rich text editor)
- **@tiptap/starter-kit:** `^3.8.0` (Tiptap extensions)
- **@tiptap/extension-\***: Various Tiptap extensions (tables, images, lists, etc.)

### Data Fetching & State

- **@tanstack/react-query:** `^5.90.5` (Server state management)
- **swr:** `^2.3.0` (Alternative data fetching, may be redundant)
- **zustand:** `^5.0.8` (Client state management)

### Date & Time

- **date-fns:** `^4.1.0` (Date utilities)
- **react-datepicker:** `^8.8.0` (Date picker component)

### PDF & Excel

- **jspdf:** `^3.0.4` (PDF generation)
- **jspdf-autotable:** `^5.0.7` (PDF tables)
- **xlsx:** Custom CDN URL (Excel export)

### Drag & Drop

- **@dnd-kit/core:** `^6.3.1` (Drag and drop)
- **@dnd-kit/sortable:** `^10.0.0` (Sortable lists)
- **@dnd-kit/utilities:** `^3.2.2` (DnD utilities)

### Notifications

- **sonner:** `^2.0.7` (Toast notifications)

### Utilities

- **lodash:** `^4.17.21` (Utility functions)
- **papaparse:** `^5.5.3` (CSV parsing)
- **cheerio:** `^1.1.2` (HTML parsing, server-side)
- **use-debounce:** `^10.0.6` (Debounced values)

### AI/ML

- **@anthropic-ai/sdk:** `^0.71.0` (Claude AI)

### Development

- **vitest:** `^3.2.4` (Testing framework)
- **@testing-library/react:** `^16.3.0` (React testing)
- **@testing-library/jest-dom:** `^6.9.1` (DOM matchers)
- **eslint:** `^9` (Linting)
- **prettier:** `^3.6.2` (Code formatting)
- **husky:** `^8.0.0` (Git hooks)
- **lint-staged:** `^15` (Pre-commit linting)
- **tsx:** `^4.19.2` (TypeScript execution)

### Notable Absences

- No dedicated state management library (using Context + Zustand)
- No routing library (using Next.js App Router)
- No dedicated testing utilities beyond Vitest
- No dedicated error tracking (Sentry, etc.) - may be needed

---

## 11. INCOMPLETE/TODO ITEMS

### TODO Comments Found

**Files with TODO/FIXME:**

- 42 files contain TODO, FIXME, or @ts-ignore comments
- Key areas:
  - Stockly customer features (partial implementation)
  - Task system improvements
  - Attendance log fixes (multiple iterations)
  - RLS policy refinements
  - Notification system enhancements

### Partial Features

**Checkly:**

- Task scheduling UI (backend exists)
- Template versioning UI
- Compliance trends/analytics
- Task bulk operations
- Template sharing

**Stockly:**

- Bulk import/export
- Barcode scanning
- Delivery scheduling calendar
- Cycle counting
- Stock forecasting
- ABC analysis
- Recipe nutritional info
- Waste forecasting
- Order automation rules
- Sales forecasting
- Production capacity planning
- Custom report builder
- Scheduled report delivery

**Teamly:**

- Attendance analytics
- Shift templates
- Shift optimization algorithms
- Leave forecasting
- Leave carryover rules
- Automated payroll processing
- Interview feedback UI
- Candidate scoring/ranking
- Onboarding checklists
- Training analytics
- Custom training courses
- Workflow builder
- 360-degree reviews

**Shared:**

- Message pinning UI
- Topics/channels UI
- Voice/video messages
- Notification grouping
- Advanced configuration
- Audit log UI
- Custom report builder

### Empty/Placeholder Features

**Likely Placeholders:**

- `/dashboard/quick/` (empty directory)
- `/dashboard/minimal/` (empty directory)
- `/dashboard/simple/` (empty directory)
- Some API routes may be stubs

### Type Safety Issues

**@ts-ignore / @ts-expect-error:**

- Found in 42 files
- Areas: Complex type assertions, Supabase type issues, React component types

**Missing Types:**

- Some database tables may not have complete TypeScript types
- Some API response types may be `any`
- Complex JSONB structures may lack types

---

## 12. CRITICAL FINDINGS

### 1. Database Schema Complexity

**Issue:** 100+ tables across multiple schemas with complex relationships

**Concerns:**

- Potential for orphaned records
- Complex RLS policies that may have edge cases
- Multiple naming conventions (some use `user_id`, others use `profile_id`)
- Views that require special handling (`attendance_logs` view with fetch interceptor)

**Recommendation:**

- Schema consolidation review
- Standardize FK naming (always use `profile_id`, never `user_id`)
- Document all views and their purposes
- RLS policy audit and testing

### 2. Attendance Logs Architecture

**Issue:** `attendance_logs` is a VIEW, but code attempts writes to it

**Current Solution:**

- Fetch interceptor in `src/lib/supabase.ts` redirects writes to `staff_attendance` table
- View provides `clock_in_date` column for PostgREST compatibility

**Concerns:**

- Fragile solution (client-side interceptor)
- Some queries may bypass interceptor
- Documentation required for all developers

**Recommendation:**

- Migrate all code to use `staff_attendance` directly
- Remove `attendance_logs` view or make it read-only with clear documentation
- Add database triggers if needed for backward compatibility

### 3. Module Separation

**Issue:** Modules share many tables, but boundaries are not always clear

**Concerns:**

- Stockly uses `stockly.*` schema, but Checkly/Teamly use `public.*`
- Some tables used by multiple modules but owned by one
- Potential for circular dependencies

**Recommendation:**

- Clear module ownership documentation
- Consider schema-per-module for better isolation
- Establish shared table governance

### 4. RLS Policy Complexity

**Issue:** Extensive RLS policies with helper functions may have performance implications

**Concerns:**

- Security definer functions bypass RLS (security risk if not careful)
- Complex policies may cause query performance issues
- Policy testing may be insufficient

**Recommendation:**

- Performance testing of RLS policies
- Security audit of security definer functions
- Consider policy simplification where possible

### 5. Type Safety

**Issue:** Some areas lack proper TypeScript types

**Concerns:**

- 42 files with `@ts-ignore` or `@ts-expect-error`
- JSONB columns may lack type definitions
- API response types may be incomplete

**Recommendation:**

- Generate complete types from database schema
- Type all JSONB structures
- Remove all `@ts-ignore` comments with proper types

### 6. Component Organization

**Issue:** 100+ components without clear organization

**Concerns:**

- Some components may be duplicated
- Unclear which components are module-specific vs shared
- Potential for inconsistent styling/patterns

**Recommendation:**

- Component audit and categorization
- Establish component library structure
- Document component usage patterns

### 7. API Route Documentation

**Issue:** 80+ API routes without documented contracts

**Concerns:**

- Unclear request/response formats
- Error handling may be inconsistent
- Authentication/authorization may vary

**Recommendation:**

- API documentation (OpenAPI/Swagger or similar)
- Standardized error responses
- Consistent auth middleware

### 8. Testing Coverage

**Issue:** Limited test infrastructure

**Concerns:**

- Only Vitest configured, no test files found in search
- No E2E testing framework
- Critical business logic may be untested

**Recommendation:**

- Establish testing strategy
- Add unit tests for critical functions
- Consider E2E testing for key workflows

### 9. Migration History

**Issue:** 100+ migration files, some may be redundant

**Concerns:**

- Migration files may have conflicting changes
- Some migrations may have been superseded
- Hard to track schema evolution

**Recommendation:**

- Migration audit and cleanup
- Consolidate redundant migrations
- Document migration dependencies

### 10. Performance Concerns

**Potential Issues:**

- Large database queries without pagination
- Real-time subscriptions may be excessive
- Image/file uploads may not be optimized
- Dashboard data loading may be inefficient

**Recommendation:**

- Query performance audit
- Implement pagination where needed
- Optimize dashboard data loading
- Image optimization (Next.js Image component)

---

## CONCLUSION

This codebase is a **comprehensive, production-ready multi-module platform** with extensive features across compliance, inventory, and HR management. The architecture is modern (Next.js 15, React 19, Supabase) with a complex but functional database schema.

**Strengths:**

- Extensive feature set
- Modern tech stack
- Multi-tenant architecture
- Real-time capabilities
- Comprehensive RLS security

**Areas for Improvement:**

- Schema consolidation
- Type safety completion
- Component organization
- Testing coverage
- Documentation
- Performance optimization

**Recommended Next Steps:**

1. **Schema Audit:** Review and consolidate database schema
2. **Type Safety:** Complete TypeScript types for all areas
3. **Component Library:** Organize and document components
4. **Testing Strategy:** Establish testing framework and coverage
5. **API Documentation:** Document all API endpoints
6. **Performance Audit:** Optimize queries and data loading
7. **Migration Cleanup:** Consolidate and document migrations

This analysis provides a solid foundation for planning the architectural refactor. The modular design allows for incremental improvements while maintaining system stability.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-21  
**Analysis Scope:** Complete codebase review  
**Files Analyzed:** 500+ files across migrations, routes, components, utilities
