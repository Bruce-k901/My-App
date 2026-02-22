# SALSA Phase 5 — Compliance Templates + Calibration + Audit Readiness + Polish

## Your Task

You are implementing Phase 5 of a 5-phase SALSA (Safe and Local Supplier Approval) food safety compliance build for the Opsly platform. This is the **final phase** — it adds SALSA-specific compliance templates, formal calibration certificate tracking, enhanced non-conformance management, a SALSA audit readiness dashboard, and polish across the entire SALSA feature set.

**Read `docs/salsa-progress.md` first** — it has the full context, file inventories for Phases 1–4, key decisions, and technical patterns. Also read `docs/salsa-compliance-analysis.md` for the full SALSA requirements analysis.

---

## What Already Exists (DO NOT rebuild these)

### Phase 1 — Batch Tracking Core (complete)

- `stockly.stock_batches` — raw material batch lifecycle tracking (status: active/depleted/expired/quarantined/recalled)
- `stockly.batch_movements` — audit trail for all batch quantity changes
- Batch APIs at `/api/stockly/batches/` — CRUD, consume, expiring, generate-code
- `BatchSelector`, `BatchDetailDrawer` components
- Expiry alert cron at `/api/cron/batch-expiry-alerts`

### Phase 2 — Supplier Approval + Specs + Allergens (complete)

- `stockly.suppliers` — approval_status, risk_rating, next_review_date
- `stockly.supplier_documents` — certificates, insurance, spec sheets per supplier
- `stockly.product_specifications` — structured spec per stock item with version history
- Allergen utility at `src/lib/stockly/allergens.ts`
- Supplier review reminder cron at `/api/cron/supplier-review-reminders`

### Phase 3 — Production Batch Records (complete)

- `stockly.production_batches` — production run records
- `stockly.production_batch_inputs` / `production_batch_outputs` — ingredient traceability
- `stockly.production_ccp_records` — CCP measurements during production
- Production batch pages at `/dashboard/planly/production-batches/`

### Phase 4 — Traceability Reports + Recall Workflow (complete)

- `stockly.recalls` — recall/withdrawal event records with 6-step workflow
- `stockly.recall_affected_batches` — junction with auto-quarantine
- `stockly.recall_notifications` — customer notification tracking
- `stockly.batch_dispatch_records` — finished product → customer link
- Traceability page at `/dashboard/stockly/traceability` with mock recall exercise
- Recall pages at `/dashboard/stockly/recalls/`
- Recall report PDF generation at `src/lib/recall-report-pdf.ts`

### Existing Compliance Template System

- `src/data/compliance-templates.ts` — 27 templates in `COMPLIANCE_MODULE_TEMPLATES_V2`
- Template builder: `buildComplianceTemplate()` factory function
- `WorkflowType` enum: `measurement`, `measurement_escalate`, `inspection`, `checklist_verify`, `document_track`, `simple_confirm`
- Template import API at `/api/checkly/import-templates`
- `task_templates` table with `template_fields` JSONB for custom form fields
- `checklist_tasks` table for generated task instances
- Probe calibration template already seeded via `20251113162000_seed_probe_calibration_template.sql`

### Existing Incident System

- `public.incidents` table with types: `slip_trip`, `cut`, `burn`, `fall`, `electrical`, `fire`, `food_poisoning`, `other`
- Fields: `root_cause`, `corrective_actions`, `investigation_notes` (all TEXT, nullable)
- Status: `open`, `investigating`, `resolved`, `closed`
- Follow-up tasks via `follow_up_tasks` JSONB → `checklist_tasks`
- PDF export via `src/lib/incident-report-pdf.ts`
- Components: `EmergencyIncidentModal`, `FoodPoisoningIncidentModal`, `CustomerComplaintModal`

### Existing Asset/PPM System

- `public.assets` table with `asset_type` (refrigeration_equipment, fire_alarms, temperature_probes, portable_appliances, extraction_systems, emergency_lights)
- `min_temp`, `max_temp` fields for working temperature ranges
- `ppm_groups` table — batch asset servicing (frequency, contractor, next service date)
- `ppm_service_events` table — service completion records with photos
- Probe calibration template fields: `ice_bath_reading`, `boiling_water_reading`, `variance`, `severity_level`

### Existing SOP System

- `sop_entries` table — ref_code versioning, parent_id linking, status lifecycle (Draft/Published/Archived)
- Version functions: `get_latest_sop_version()`, `get_sop_versions()`
- 8 SOP categories: Food Prep, Service (FOH), Drinks, Hot/Cold Beverages, Cleaning, Opening, Closing

### Existing Notification System

- `public.notifications` table with JSONB `metadata` field
- Pattern from crons: `metadata: { salsa: true, ... }` for SALSA-related alerts

### Company Module Settings

- `company_modules` table with `settings` JSONB column
- Stockly settings example at `src/app/dashboard/stockly/settings/page.tsx` — shows read/write pattern
- Hook: `useEnabledModules()` at `src/hooks/dashboard/useEnabledModules.ts`

### Vercel Cron Jobs

- `vercel.json` currently has 4 crons: `health-check` (3am), `health-check-reminders` (3am), `generate-tasks` (4am), `daily-digest` (6am)
- Pattern: GET route with Bearer `CRON_SECRET` auth, returns JSON

---

## What Phase 5 Needs to Build

### 1. SALSA Compliance Templates

Add 7 new SALSA-specific compliance templates to `src/data/compliance-templates.ts`. These extend the existing `COMPLIANCE_MODULE_TEMPLATES_V2` array and use the same `buildComplianceTemplate()` factory.

#### Template 1: Annual SALSA Food Safety Review

```
slug: 'salsa_annual_food_safety_review'
name: 'Annual SALSA Food Safety Review'
module: 'checkly'
category: 'food_safety'
frequency: 'annually'
workflowType: 'checklist_verify'
description: 'Comprehensive annual review of all five SALSA standard sections — prerequisite controls, HACCP, management systems, GMP, and supplier approval.'
template_fields:
  - section_1_prerequisite_controls: boolean (premises, hygiene, temperature, cleaning, pest, allergen, labelling)
  - section_2_haccp: boolean (hazard analysis, CCPs, monitoring, corrective actions)
  - section_3_management_systems: boolean (training, traceability, recall, document control, specs)
  - section_4_gmp: boolean (process control, calibration, metal detection, quantity control)
  - section_5_supplier_approval: boolean (risk assessment, specs, goods-in, food fraud)
  - non_conformances_identified: text (list of any non-conformances found)
  - corrective_actions_required: text
  - reviewed_by: text
  - next_review_date: date
  - overall_compliance_rating: select ('compliant', 'minor_non_conformances', 'major_non_conformances')
workflowConfig:
  verificationRules: { requiresSignature: true }
```

#### Template 2: Mock Recall Exercise

```
slug: 'salsa_mock_recall_exercise'
name: 'Mock Recall Exercise'
module: 'checkly'
category: 'food_safety'
frequency: 'annually'
workflowType: 'checklist_verify'
description: 'Annual mock recall to demonstrate traceability capability within 4 hours. SALSA requires this as evidence of recall readiness.'
template_fields:
  - batch_code_tested: text (the batch code used for the exercise)
  - exercise_start_time: datetime
  - exercise_end_time: datetime
  - time_to_complete_minutes: number
  - forward_trace_completed: boolean
  - backward_trace_completed: boolean
  - all_customers_identified: boolean
  - customer_count: number (how many customers identified)
  - mass_balance_variance_percent: number
  - mass_balance_acceptable: boolean (within ±5%)
  - exercise_outcome: select ('pass', 'fail')
  - corrective_actions_if_fail: text
  - conducted_by: text
workflowConfig:
  verificationRules: { requiresSignature: true }
notes: 'Link to /dashboard/stockly/traceability for automated mock recall tool'
```

#### Template 3: Food Fraud Vulnerability Assessment

```
slug: 'salsa_food_fraud_assessment'
name: 'Food Fraud Vulnerability Assessment'
module: 'checkly'
category: 'food_safety'
frequency: 'annually'
workflowType: 'checklist_verify'
description: 'Annual assessment of food fraud risks per SALSA requirement. Covers authenticity, substitution, dilution, and supply chain vulnerabilities.'
template_fields:
  - raw_materials_assessed: text (list of raw materials reviewed)
  - high_risk_materials_identified: text (e.g., olive oil, honey, spices, fish)
  - substitution_risk: select ('low', 'medium', 'high')
  - dilution_risk: select ('low', 'medium', 'high')
  - supply_chain_complexity: select ('simple', 'moderate', 'complex')
  - mitigation_measures: text (what controls are in place)
  - supplier_assurance_checks: boolean (supplier specs reviewed for fraud)
  - changes_since_last_assessment: text
  - reviewed_by: text
```

#### Template 4: HACCP Plan Review

```
slug: 'salsa_haccp_plan_review'
name: 'HACCP Plan Review'
module: 'checkly'
category: 'food_safety'
frequency: 'annually'
workflowType: 'checklist_verify'
description: 'Annual review of the HACCP plan to verify it remains current and effective. SALSA requires documented evidence of regular HACCP review.'
template_fields:
  - process_flow_current: boolean (process flow diagram is up to date)
  - hazards_reviewed: boolean (all biological, chemical, physical hazards reviewed)
  - ccps_verified: boolean (CCPs still valid and monitored)
  - critical_limits_reviewed: boolean (critical limits still appropriate)
  - monitoring_procedures_effective: boolean
  - corrective_actions_adequate: boolean
  - verification_activities_complete: boolean
  - records_up_to_date: boolean
  - changes_since_last_review: text (new products, processes, suppliers, equipment)
  - reviewed_by: text
  - next_review_date: date
workflowConfig:
  verificationRules: { requiresSignature: true }
```

#### Template 5: Internal Food Safety Audit

```
slug: 'salsa_internal_audit'
name: 'Internal Food Safety Audit'
module: 'checkly'
category: 'food_safety'
frequency: 'quarterly'
workflowType: 'checklist_verify'
description: 'Quarterly internal audit of food safety practices. Covers hygiene, cleaning, temperature control, allergen handling, and documentation.'
template_fields:
  - personal_hygiene_compliant: boolean
  - handwashing_stations_adequate: boolean
  - cleaning_schedules_followed: boolean
  - temperature_records_complete: boolean
  - allergen_controls_effective: boolean
  - pest_control_records_current: boolean
  - stock_rotation_fifo_followed: boolean
  - traceability_records_complete: boolean
  - non_conformances_found: text
  - corrective_actions_raised: text
  - auditor_name: text
  - audit_score: number (percentage)
workflowConfig:
  verificationRules: { requiresPhoto: true, requiresSignature: true }
```

#### Template 6: Supplier Approval Review

```
slug: 'salsa_supplier_approval_review'
name: 'Supplier Approval Review'
module: 'stockly'
category: 'food_safety'
frequency: 'annually'
workflowType: 'document_track'
description: 'Annual review of supplier approval status. Verify certificates, specs, and risk ratings are current for all approved suppliers.'
template_fields:
  - total_suppliers_reviewed: number
  - suppliers_with_current_certificates: number
  - suppliers_with_expired_documents: text (list names)
  - risk_ratings_updated: boolean
  - new_suppliers_approved: number
  - suppliers_suspended: number
  - food_fraud_checks_completed: boolean
  - reviewed_by: text
workflowConfig:
  trackingRules: { expiryWarningDays: 30 }
notes: 'Link to /dashboard/stockly/suppliers/approved-list for current approved supplier list'
```

#### Template 7: Goods-In Inspection Verification

```
slug: 'salsa_goods_in_verification'
name: 'Goods-In Inspection Verification'
module: 'stockly'
category: 'food_safety'
frequency: 'weekly'
workflowType: 'checklist_verify'
description: 'Weekly verification that goods-in procedures are being followed correctly — temperature checks, batch codes captured, condition assessments completed.'
template_fields:
  - deliveries_checked_this_week: number
  - all_temperatures_recorded: boolean
  - all_batch_codes_captured: boolean
  - all_condition_assessments_completed: boolean
  - any_rejections_this_week: boolean
  - rejection_count: number
  - rejection_reasons: text
  - corrective_actions_if_needed: text
  - verified_by: text
```

**Implementation:** Add these 7 templates to the `COMPLIANCE_MODULE_TEMPLATES_V2` array in `src/data/compliance-templates.ts`. Use the existing `buildComplianceTemplate()` factory. Tag with `// @salsa` comment. Group them together under a `// --- SALSA Compliance Templates ---` section comment.

### 2. Database Migration

**File:** `supabase/migrations/20260223000000_salsa_calibration_nonconformance.sql`

#### Table: `stockly.asset_calibrations` — Formal calibration certificate records per asset

This fills the gap between the current task-based probe calibration (which creates checklist tasks) and the formal calibration certificate store that SALSA auditors expect.

```
stockly.asset_calibrations:
  id UUID PK
  company_id UUID NOT NULL
  site_id UUID
  asset_id UUID NOT NULL (references public.assets(id))
  calibration_date DATE NOT NULL
  next_calibration_due DATE
  calibrated_by TEXT NOT NULL (person or company name)
  certificate_reference TEXT (certificate number/ref)
  certificate_url TEXT (link to uploaded certificate in Supabase Storage)
  method TEXT (e.g., 'ice_bath_boiling_water', 'external_lab', 'manufacturer')
  readings JSONB (e.g., { "ice_bath": 0.2, "boiling_water": 99.8, "variance": 0.2 })
  result TEXT CHECK IN ('pass', 'fail', 'adjusted') DEFAULT 'pass'
  notes TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()
  created_by UUID
```

#### Table: `stockly.non_conformances` — Formal non-conformance register with corrective action closure tracking

The existing `incidents` table handles emergencies and accidents. This table tracks SALSA-style non-conformances — things that aren't safety incidents but represent deviations from the food safety system (e.g., temperature log missed, cleaning not done, supplier certificate expired). SALSA requires a register of these with corrective action closure evidence.

```
stockly.non_conformances:
  id UUID PK
  company_id UUID NOT NULL
  site_id UUID
  nc_code TEXT NOT NULL (auto-generated, e.g., NC-2026-001)
  title TEXT NOT NULL
  description TEXT
  category TEXT CHECK IN ('hygiene', 'temperature', 'cleaning', 'documentation', 'allergen', 'pest_control', 'supplier', 'traceability', 'calibration', 'labelling', 'other')
  severity TEXT CHECK IN ('minor', 'major', 'critical') DEFAULT 'minor'
  source TEXT CHECK IN ('internal_audit', 'external_audit', 'customer_complaint', 'staff_observation', 'monitoring', 'other') DEFAULT 'staff_observation'
  source_reference TEXT (e.g., audit report ref, incident ID, task ID)
  status TEXT CHECK IN ('open', 'investigating', 'corrective_action', 'verification', 'closed') DEFAULT 'open'
  root_cause TEXT
  corrective_action TEXT
  corrective_action_due DATE
  corrective_action_completed_at TIMESTAMPTZ
  corrective_action_verified_by UUID
  corrective_action_evidence TEXT (URL to photo/document)
  preventive_action TEXT (what will prevent recurrence)
  raised_by UUID
  raised_at TIMESTAMPTZ DEFAULT NOW()
  closed_at TIMESTAMPTZ
  closed_by UUID
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()
```

**Also in the migration:**

- Public views + INSTEAD OF triggers for both new tables (follow exact pattern from Phase 1–4 migrations)
- RLS using `stockly.stockly_company_access(company_id)` on both new tables
- Indexes on company_id, asset_id (calibrations), calibration_date, next_calibration_due, status (non-conformances), category
- Auto-update `updated_at` trigger on `stockly.non_conformances`
- `NOTIFY pgrst, 'reload schema'` at end

**CRITICAL — Schema pattern:** All tables in `stockly` schema. Create matching public views with `security_invoker = true`. Create INSTEAD OF INSERT/UPDATE/DELETE triggers. **FK references must point to `stockly.` tables for stockly tables, and `public.` tables for public tables (assets).** See Phase 1–4 migrations for the exact pattern.

**Note on asset FK:** The `assets` table is in the `public` schema (it's an actual table, not a view). Use `REFERENCES public.assets(id)` for the FK on `asset_calibrations.asset_id`.

### 3. TypeScript Types

Add to `src/lib/types/stockly.ts`:

```typescript
// @salsa - SALSA Compliance: Phase 5 types
export interface AssetCalibration {
  id: string;
  company_id: string;
  site_id: string | null;
  asset_id: string;
  calibration_date: string;
  next_calibration_due: string | null;
  calibrated_by: string;
  certificate_reference: string | null;
  certificate_url: string | null;
  method: string | null;
  readings: Record<string, number> | null;
  result: "pass" | "fail" | "adjusted";
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type NonConformanceCategory =
  | "hygiene"
  | "temperature"
  | "cleaning"
  | "documentation"
  | "allergen"
  | "pest_control"
  | "supplier"
  | "traceability"
  | "calibration"
  | "labelling"
  | "other";
export type NonConformanceSeverity = "minor" | "major" | "critical";
export type NonConformanceSource =
  | "internal_audit"
  | "external_audit"
  | "customer_complaint"
  | "staff_observation"
  | "monitoring"
  | "other";
export type NonConformanceStatus =
  | "open"
  | "investigating"
  | "corrective_action"
  | "verification"
  | "closed";

export interface NonConformance {
  id: string;
  company_id: string;
  site_id: string | null;
  nc_code: string;
  title: string;
  description: string | null;
  category: NonConformanceCategory;
  severity: NonConformanceSeverity;
  source: NonConformanceSource;
  source_reference: string | null;
  status: NonConformanceStatus;
  root_cause: string | null;
  corrective_action: string | null;
  corrective_action_due: string | null;
  corrective_action_completed_at: string | null;
  corrective_action_verified_by: string | null;
  corrective_action_evidence: string | null;
  preventive_action: string | null;
  raised_by: string | null;
  raised_at: string;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### 4. API Routes

| Route                                         | Methods            | Purpose                                                                                                         |
| --------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `/api/stockly/calibrations`                   | GET, POST          | List/create calibration records. GET supports `?assetId=` filter                                                |
| `/api/stockly/calibrations/[id]`              | GET, PATCH, DELETE | Get/update/delete calibration record                                                                            |
| `/api/stockly/calibrations/overdue`           | GET                | List assets with overdue or upcoming calibrations                                                               |
| `/api/stockly/non-conformances`               | GET, POST          | List/create non-conformances. GET supports `?status=`, `?category=`, `?severity=` filters                       |
| `/api/stockly/non-conformances/[id]`          | GET, PATCH         | Get/update non-conformance (status transitions, corrective actions, closure)                                    |
| `/api/stockly/non-conformances/generate-code` | GET                | Auto-generate next NC code (e.g., NC-2026-003)                                                                  |
| `/api/stockly/salsa/audit-summary`            | GET                | Aggregate SALSA readiness data: supplier stats, batch stats, calibration status, NC status, template completion |
| `/api/cron/salsa-compliance-check`            | GET                | Daily cron: check calibrations overdue, NCs past corrective action due date, raise notifications                |

#### Calibration API Logic

**POST `/api/stockly/calibrations`:**

1. Create calibration record
2. If `next_calibration_due` is provided, optionally update the related asset's metadata
3. Return created record

**GET `/api/stockly/calibrations/overdue`:**

1. Query `asset_calibrations` where `next_calibration_due <= today + 14 days` (due within 2 weeks or already overdue)
2. Also find assets of type `temperature_probes` that have NO calibration records at all
3. Return list with asset details joined

#### Non-Conformance API Logic

**POST `/api/stockly/non-conformances`:**

1. Auto-generate `nc_code` using the pattern: `NC-{YYYY}-{SEQ}` (sequential per company per year)
2. Create non-conformance record
3. If severity is `critical`, auto-create notification with `metadata: { salsa: true }`

**PATCH `/api/stockly/non-conformances/[id]`:**

1. Allow updating all fields
2. Auto-set timestamps on status transitions:
   - When `corrective_action` is set → set `status = 'corrective_action'`
   - When `corrective_action_completed_at` is set → set `status = 'verification'`
   - When `closed_at` is set → set `status = 'closed'`, require `closed_by`
3. If corrective_action_due is past and status is not `closed` or `verification`, flag as overdue

#### Audit Summary API Logic

**GET `/api/stockly/salsa/audit-summary`:**
Returns a comprehensive object for the SALSA audit readiness dashboard:

```typescript
{
  suppliers: {
    total: number;
    approved: number;
    conditional: number;
    overdue_review: number;
    expired_documents: number;
  }
  batches: {
    active: number;
    expiring_soon: number; // within 7 days
    expired: number;
    quarantined: number;
  }
  calibrations: {
    total_probes: number;
    calibrated_current: number;
    overdue: number;
    due_soon: number; // within 14 days
  }
  non_conformances: {
    open: number;
    investigating: number;
    awaiting_closure: number; // corrective_action + verification
    closed_this_month: number;
    overdue_corrective_actions: number;
  }
  recalls: {
    active: number;
    total: number;
    last_mock_exercise: string | null; // date of most recent mock recall
  }
  traceability: {
    dispatch_records_this_month: number;
    production_batches_this_month: number;
  }
  compliance_templates: {
    total_salsa_templates: number;
    completed_this_period: number;
    overdue: number;
  }
}
```

Query each section from respective tables. Join with `task_templates` where `slug LIKE 'salsa_%'` for compliance template completion tracking.

#### Cron: SALSA Compliance Check

**File:** `/api/cron/salsa-compliance-check/route.ts`

Daily cron (schedule: `0 5 * * *` — 5am UTC) that:

1. Queries all companies with stockly module enabled
2. For each company:
   a. Check `asset_calibrations` for assets where `next_calibration_due < today` → create notification: "Calibration overdue for {asset_name}"
   b. Check `non_conformances` where `corrective_action_due < today AND status NOT IN ('closed', 'verification')` → create notification: "Corrective action overdue for NC {nc_code}"
   c. Check `recalls` where `status = 'active' AND salsa_notified = false AND initiated_at < now() - 3 working days` → create notification: "SALSA notification overdue for recall {recall_code} — must notify within 3 working days"
   d. Check `supplier_documents` where expiry date is within 30 days → create notification: "Supplier document expiring soon: {document_name} for {supplier_name}"
3. All notifications use `metadata: { salsa: true }` and priority `'high'`

### 5. UI Components

| Component                                                  | Purpose                                                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/app/dashboard/stockly/salsa/page.tsx`                 | SALSA audit readiness dashboard — summary cards + status indicators                                                    |
| `src/app/dashboard/stockly/non-conformances/page.tsx`      | Non-conformance register list page — status tabs, category filter, severity badges                                     |
| `src/app/dashboard/stockly/non-conformances/[id]/page.tsx` | Non-conformance detail page — status workflow, corrective action form, closure verification                            |
| `src/components/stockly/NonConformanceForm.tsx`            | Reusable NC create/edit form (title, category, severity, source, description)                                          |
| `src/components/stockly/CalibrationPanel.tsx`              | Calibration records panel — shown on asset detail pages. Lists calibration history, add new record form, overdue badge |
| `src/components/stockly/CalibrationForm.tsx`               | Add/edit calibration record form (date, calibrated_by, method, readings, result, certificate upload)                   |
| `src/components/stockly/SALSAAuditSummary.tsx`             | Summary component for the SALSA dashboard — 7 sections matching the audit summary API                                  |
| `src/components/stockly/NonConformanceStatusBadge.tsx`     | Reusable status badge component for NC status (colour-coded)                                                           |

### 6. SALSA Audit Readiness Dashboard

**Page:** `src/app/dashboard/stockly/salsa/page.tsx`

This is the **central SALSA compliance view** — the page a manager opens before an audit to check everything is in order.

Layout (cards in a responsive grid):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SALSA Audit Readiness                                     [Print]     │
│  Last updated: 18 Feb 2026 14:30                                       │
├───────────────────────┬────────────────────────┬────────────────────────┤
│ Supplier Approval     │ Batch Status           │ Calibration            │
│ ✅ 12 approved        │ 📦 45 active           │ ✅ 5/6 current         │
│ ⚠️ 2 overdue review   │ ⚠️ 3 expiring soon     │ ⚠️ 1 overdue           │
│ ❌ 1 expired doc      │ ❌ 1 expired           │                        │
├───────────────────────┼────────────────────────┼────────────────────────┤
│ Non-Conformances      │ Recalls                │ Traceability           │
│ 🔴 2 open             │ ✅ No active recalls   │ 📋 15 dispatches       │
│ ⚠️ 1 overdue action   │ Last mock: 15 Jan 2026 │ 🏭 8 production runs   │
│ ✅ 5 closed this month│                        │     this month         │
├───────────────────────┴────────────────────────┴────────────────────────┤
│ Compliance Templates                                                    │
│ ✅ Annual Food Safety Review: completed 10 Jan 2026                     │
│ ✅ Mock Recall Exercise: completed 15 Jan 2026 (12 min)                │
│ ⚠️ Food Fraud Assessment: due in 30 days                               │
│ ✅ Internal Audit Q1: completed 5 Feb 2026                             │
│ ✅ HACCP Plan Review: completed 10 Jan 2026                            │
└─────────────────────────────────────────────────────────────────────────┘
```

Each card should:

- Show green/amber/red indicator based on status
- Be clickable to navigate to the relevant page (e.g., click "Supplier Approval" → `/dashboard/stockly/suppliers`)
- Use Stockly module colours (`text-stockly-dark dark:text-stockly`)

The compliance templates section queries `checklist_tasks` where the parent `task_template.slug` starts with `salsa_` to find completion status.

**Print mode:** Include `@media print` styles for a clean audit evidence printout.

### 7. Non-Conformance Register

**List page:** `src/app/dashboard/stockly/non-conformances/page.tsx`

- Status tabs: All, Open, Investigating, Corrective Action, Verification, Closed
- Filters: category dropdown, severity dropdown, date range
- Table columns: NC Code, Title, Category, Severity, Status, Raised Date, Due Date, Days Open
- Severity badges: minor (yellow), major (amber), critical (red)
- Overdue corrective actions highlighted with red badge
- "New Non-Conformance" button → opens form

**Detail page:** `src/app/dashboard/stockly/non-conformances/[id]/page.tsx`

Three sections:

1. **Details** — title, description, category, severity, source, raised by/date
2. **Investigation & Corrective Action** — root cause (text area), corrective action (text area), due date, preventive action (text area), evidence upload
3. **Closure** — verification checkbox, verified by, closed date/by

Status workflow visualization (similar to recall workflow):

```
Open → Investigating → Corrective Action → Verification → Closed
```

Status transitions:

- **Open → Investigating**: When `root_cause` is set
- **Investigating → Corrective Action**: When `corrective_action` is set
- **Corrective Action → Verification**: When `corrective_action_completed_at` is set
- **Verification → Closed**: When manually closed with `closed_by`

### 8. Calibration Panel

**Component:** `src/components/stockly/CalibrationPanel.tsx`

This component is designed to be embedded in the asset detail page. It shows:

1. **Current calibration status** — badge showing "Current" (green), "Due Soon" (amber), "Overdue" (red), or "Never Calibrated" (grey)
2. **Calibration history** — table with date, calibrated_by, method, result, certificate link
3. **Add calibration** — inline form with:
   - Calibration date (default today)
   - Next calibration due (default: calibration date + asset's calibration frequency if set, otherwise +12 months)
   - Calibrated by (text)
   - Method (select: ice_bath_boiling_water, external_lab, manufacturer)
   - Readings (JSON fields — for probes: ice_bath_reading, boiling_water_reading, variance)
   - Result (pass/fail/adjusted)
   - Certificate reference (text)
   - Certificate upload (file → Supabase Storage → URL)
   - Notes (text)

**Integration point:** The asset detail page needs to be modified to show this panel. Look at the existing asset detail page structure and add the panel as a new section/tab. The exact location depends on the existing page layout — explore `src/app/dashboard/assetly/` to find the right page.

### 9. Navigation

Add to `src/components/stockly/sidebar-nav.tsx`:

- Under the existing **COMPLIANCE** section (added in Phase 4):
  - Keep "Traceability" (already there)
  - Keep "Recalls" (already there)
  - Add "Non-Conformances" — route: `/dashboard/stockly/non-conformances`, icon: `ClipboardList` or `AlertTriangle`
  - Add "SALSA Dashboard" — route: `/dashboard/stockly/salsa`, icon: `ShieldCheck` or `CheckCircle`

### 10. Existing Files to Modify

| File                                           | Change                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/types/stockly.ts`                     | Add AssetCalibration, NonConformance types and related union types      |
| `src/data/compliance-templates.ts`             | Add 7 SALSA compliance templates to COMPLIANCE_MODULE_TEMPLATES_V2      |
| `src/components/stockly/sidebar-nav.tsx`       | Add "Non-Conformances" and "SALSA Dashboard" nav items under COMPLIANCE |
| `vercel.json`                                  | Add `salsa-compliance-check` cron job (`0 5 * * *`)                     |
| Asset detail page (explore to find exact file) | Add CalibrationPanel component                                          |

### 11. Cron Configuration

Add to `vercel.json`:

```json
{ "path": "/api/cron/salsa-compliance-check", "schedule": "0 5 * * *" }
```

This runs at 5am UTC daily, after the existing generate-tasks (4am) and before daily-digest (6am) — so SALSA alerts appear in the digest.

Also verify the Phase 1 and Phase 2 crons are in `vercel.json`:

- `/api/cron/batch-expiry-alerts` — should run daily (e.g., `0 4 * * *` alongside generate-tasks, or `30 4 * * *`)
- `/api/cron/supplier-review-reminders` — should run daily (e.g., `30 4 * * *`)

If these are not yet in `vercel.json`, add them.

---

## Coding Standards

- **All SALSA code tagged with `// @salsa`** (JS/TS) and `-- @salsa` (SQL). New files get header: `// @salsa - SALSA Compliance: <description>`
- **API routes:** Use `createServerSupabaseClient()` from `@/lib/supabase-server`. Return `{ success: true, data }` or `{ success: false, error }` pattern. In Next.js 16, `params` is a Promise: `const { id } = await params;`
- **Client-side Supabase:** Import `{ supabase }` from `@/lib/supabase` (named export, NOT `createClient()`)
- **RLS:** All new `stockly.` tables use `stockly.stockly_company_access(company_id)`
- **Multi-tenancy:** All tables have `company_id` and `site_id`
- **Site filtering:** `if (siteId && siteId !== 'all') query = query.eq('site_id', siteId)`
- **Migration pattern:** `DO $$ BEGIN ... END $$` for idempotent blocks. FK references to `stockly.` tables for stockly tables, `public.` for public tables. Public views with `security_invoker = true` + INSTEAD OF triggers.
- **Icons:** Import from `@/components/ui/icons` — check what's available before using
- **Build:** Must pass `npm run build -- --webpack` with 0 errors
- **Module colours:** Stockly module colour classes are `text-stockly-dark dark:text-stockly` (light theme uses dark variant, dark theme uses light variant)
- **Error handling:** Handle `42P01` (table not found) gracefully in client components
- **Print styles:** Force light theme on print. Use `@media print` CSS to hide non-essential UI
- **NC code pattern:** `NC-{YYYY}-{SEQ}` — 3-digit sequential, zero-padded (NC-2026-001, NC-2026-002...)
- **Compliance templates:** Follow existing `buildComplianceTemplate()` pattern in `compliance-templates.ts`

---

## Migration Gotchas (IMPORTANT)

1. **`public.suppliers`, `public.stock_batches`, etc. are VIEWS, not tables.** Never `ALTER TABLE public.X` or `REFERENCES public.X(id)`. Always target `stockly.X`.
2. **`public.assets` IS an actual table** — FK references to assets use `REFERENCES public.assets(id)`.
3. **`planly_customers` and `planly_orders` are in the `public` schema** — actual tables, not views.
4. After creating tables + views, run `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new views.
5. When a view is recreated with `DROP VIEW ... CASCADE`, any dependent views/triggers are also dropped and must be recreated. Check for cascading dependencies.
6. Run migration with: `npx supabase db push --include-all`

---

## Verification Checklist

1. Migration applies cleanly: `npx supabase db push --include-all`
2. Build passes: `npm run build -- --webpack`
3. **Compliance templates:**
   - 7 SALSA templates visible in compliance-templates.ts
   - Templates can be imported via the existing import-templates flow
4. **Calibrations:**
   - Can create a calibration record for a temperature probe asset
   - Calibration history shows on asset detail page
   - Overdue calibrations flagged with red badge
   - Certificate upload works
5. **Non-conformances:**
   - Can create a non-conformance with auto-generated NC code
   - Status workflow: open → investigating → corrective_action → verification → closed
   - Corrective action due date tracked, overdue flagged
   - Evidence upload works
   - List page filters by status, category, severity
6. **SALSA Dashboard:**
   - Shows aggregate data across all SALSA systems
   - All 7 summary cards populated with real data
   - Compliance template completion status shown
   - Print-friendly output
   - Cards link to relevant detail pages
7. **Cron:**
   - `salsa-compliance-check` cron runs without errors
   - Creates notifications for overdue calibrations, overdue NCs, recall notification delays
   - All SALSA crons present in `vercel.json`
8. **Navigation:**
   - Stockly sidebar COMPLIANCE section shows: Traceability, Recalls, Non-Conformances, SALSA Dashboard
9. Update `docs/salsa-progress.md` with Phase 5 file inventory and status

---

## Estimated Scope

- 1 migration file (2 tables)
- 7 SALSA compliance templates (added to existing file)
- ~8 new files (API routes + components + pages + cron)
- ~5 modified files
- Est. 2–3 days
