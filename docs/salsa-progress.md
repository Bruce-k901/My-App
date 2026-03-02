# SALSA Compliance — Implementation Progress

**Last updated:** 2026-02-18
**Current phase:** Phase 5 — Compliance Templates + Calibration + Audit Readiness + Polish
**Status:** Code Complete — Pending Migration + Testing

---

## Overview

5-phase SALSA compliance build for Okja beta customer. See `docs/salsa-compliance-analysis.md` for full analysis.

| Phase   | Scope                                                    | Est. Days | Status            |
| ------- | -------------------------------------------------------- | --------- | ----------------- |
| Phase 1 | Batch Tracking Core + Enhanced Goods-In                  | 4–5       | **Code Complete** |
| Phase 2 | Supplier Approval + Product Specs + Allergen Enhancement | 3–4       | **Code Complete** |
| Phase 3 | Production Batch Records + Planly Integration            | 3–4       | **Code Complete** |
| Phase 4 | Traceability Reports + Recall Workflow                   | 5–7       | **Code Complete** |
| Phase 5 | Compliance Templates + Calibration + Polish              | 2–3       | **Code Complete** |

---

## Key Decisions

- **Marker system:** All SALSA code tagged with `// @salsa` (JS/TS) and `-- @salsa` (SQL). New files get header: `// @salsa - SALSA Compliance: <description>`
- **Navigation:** "Batches" as sidebar item under INVENTORY (after Stock Counts)
- **Expiry dates:** Two fields — `use_by_date` (safety-critical, mandatory discard) and `best_before_date` (quality, softer warning)
- **FIFO:** Warning only, not blocking
- **Waste log:** Batch selection required when active batches exist
- **Multi-tenancy:** All new tables have both `company_id` and `site_id`. RLS uses `stockly_company_access(company_id)`
- **Settings:** Stored in `company_modules.settings` JSONB where `module = 'stockly'`
- **Notifications:** Use existing `notifications` table with severity levels
- **Delivery flow:** Batch fields collapsible per line item. Batches auto-created on "Save & Confirm" (not draft)
- **Supplier detail page:** Card click navigates to dedicated `/dashboard/stockly/suppliers/[id]` (removed edit modal)
- **Supplier documents:** New `stockly.supplier_documents` table (not global_documents)
- **Product specs:** Structured data in `stockly.product_specifications` + linked supplier documents. Panel lives inside StockItemModal
- **Spec versioning:** Simple `version_number` + archive to `product_specification_history` (not SOP-style ref_code)
- **Allergen format:** Normalized to short keys (`gluten`, not `Cereals containing gluten`). Shared utility at `src/lib/stockly/allergens.ts`
- **Cross-contamination:** "May Contain" section on recipes (auto-displayed in ExpandableRecipeCard)
- **Approved Supplier List:** Print-friendly page + CSV export + PDF generation at `/dashboard/stockly/suppliers/approved-list`

---

## Phase 1 — File Inventory

### New Files Created

| File                                                               | Purpose                                                                            | Status |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------ |
| `docs/salsa-progress.md`                                           | This file                                                                          | Done   |
| `docs/salsa-compliance-analysis.md`                                | Full SALSA analysis document                                                       | Done   |
| `supabase/migrations/20260219000000_salsa_batch_tracking_core.sql` | DB schema (stock_batches, batch_movements, ALTER delivery_lines + waste_log_lines) | Done   |
| `src/lib/stockly/batch-codes.ts`                                   | Batch code generation utility (tokens: SITE, YYYY, MMDD, SEQ)                      | Done   |
| `src/app/api/stockly/batches/route.ts`                             | List + create batches API                                                          | Done   |
| `src/app/api/stockly/batches/[id]/route.ts`                        | Get + update batch API (status change, quantity adjust, recall)                    | Done   |
| `src/app/api/stockly/batches/[id]/consume/route.ts`                | Consumption API (waste, production)                                                | Done   |
| `src/app/api/stockly/batches/expiring/route.ts`                    | Expiring batches query (use_by + best_before thresholds)                           | Done   |
| `src/app/api/stockly/batches/generate-code/route.ts`               | Batch code generation API                                                          | Done   |
| `src/app/dashboard/stockly/batches/page.tsx`                       | Batch list page (filterable, responsive, expiry colour-coded)                      | Done   |
| `src/components/stockly/BatchDetailDrawer.tsx`                     | Batch detail view (movements timeline, quick actions)                              | Done   |
| `src/components/stockly/BatchSelector.tsx`                         | Reusable batch picker (FIFO-ordered, warning on non-FIFO selection)                | Done   |
| `src/components/dashboard/widgets-v2/ExpiryAlertWidget.tsx`        | Dashboard widget (expired/critical/warning counts)                                 | Done   |
| `src/app/api/cron/batch-expiry-alerts/route.ts`                    | Daily expiry cron (auto-expire + notifications)                                    | Done   |

### Existing Files Modified

| File                                             | Change                                                                                                                                 | Status |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/lib/types/stockly.ts`                       | Added: BatchStatus, BatchMovementType, StockBatch, BatchMovement, ExpiryAlert, FifoWarning, ConditionAssessment, BatchTrackingSettings | Done   |
| `src/components/stockly/ManualDeliveryModal.tsx` | Added: batch fields per line (supplier_batch_code, use_by, best_before, temp, condition), auto-create batches on confirm               | Done   |
| `src/components/stockly/sidebar-nav.tsx`         | Added: Batches nav item under INVENTORY with Layers icon                                                                               | Done   |
| `src/app/dashboard/stockly/waste/page.tsx`       | Added: BatchSelector per waste line, consume API call on save                                                                          | Done   |
| `src/app/dashboard/stockly/settings/page.tsx`    | Added: Batch Tracking settings section (code format, auto-generate, temp requirement, warning days)                                    | Done   |
| `src/config/widget-registry.ts`                  | Added: batch_expiry_alerts widget registration                                                                                         | Done   |

---

## Phase 2 — File Inventory

### New Files Created

| File                                                                             | Purpose                                                                                                    | Status |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| `supabase/migrations/20260220000000_salsa_supplier_approval_specs_allergens.sql` | DB schema (supplier_documents, product_specifications, spec_history, approval_log, allergen normalization) | Done   |
| `src/lib/stockly/allergens.ts`                                                   | Shared allergen utility: UK_ALLERGENS array, key↔label helpers, normalizeAllergens                         | Done   |
| `src/app/api/stockly/suppliers/[id]/route.ts`                                    | Supplier detail GET (with docs + log) + PATCH (update fields)                                              | Done   |
| `src/app/api/stockly/suppliers/[id]/approve/route.ts`                            | Supplier approval status change + audit log                                                                | Done   |
| `src/app/api/stockly/suppliers/[id]/documents/route.ts`                          | Supplier documents list + create API                                                                       | Done   |
| `src/app/api/stockly/specifications/route.ts`                                    | Product specifications list + create API                                                                   | Done   |
| `src/app/api/stockly/specifications/[id]/route.ts`                               | Spec detail GET + PATCH (with versioning) + DELETE                                                         | Done   |
| `src/app/api/cron/supplier-review-reminders/route.ts`                            | Daily cron: notify when supplier review date approaching/overdue                                           | Done   |
| `src/components/stockly/SupplierApprovalPanel.tsx`                               | Approval status panel + risk rating + review date picker + badges                                          | Done   |
| `src/components/stockly/SupplierApprovalHistory.tsx`                             | Timeline of approval log entries                                                                           | Done   |
| `src/components/stockly/SupplierDocumentUpload.tsx`                              | Upload modal (file → Supabase Storage → API)                                                               | Done   |
| `src/components/stockly/SupplierDocumentList.tsx`                                | Document list with download, archive, expiry warnings                                                      | Done   |
| `src/components/stockly/ProductSpecPanel.tsx`                                    | View/edit spec: allergens, storage, shelf-life, versioning                                                 | Done   |
| `src/app/dashboard/stockly/suppliers/[id]/page.tsx`                              | Tabbed supplier detail page: Overview, Documents, Approval                                                 | Done   |
| `src/app/dashboard/stockly/suppliers/approved-list/page.tsx`                     | Approved Supplier List report (print + CSV)                                                                | Done   |
| `src/components/dashboard/widgets-v2/SupplierApprovalWidget.tsx`                 | Dashboard widget: approved/pending/overdue counts                                                          | Done   |

### Existing Files Modified

| File                                                       | Change                                                                                                                                                      | Status |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/lib/types/stockly.ts`                                 | Added: SupplierApprovalStatus, RiskRating, SupplierDocument, ProductSpecification, ProductSpecificationHistory, SupplierApprovalLog, Supplier (centralized) | Done   |
| `src/app/dashboard/stockly/suppliers/page.tsx`             | Removed edit modal, card click → detail page, approval badges, status filter                                                                                | Done   |
| `src/app/dashboard/stockly/stock-items/StockItemModal.tsx` | Replaced inline UK_ALLERGENS with shared import, added ProductSpecPanel section                                                                             | Done   |
| `src/app/dashboard/stockly/libraries/ingredients/page.tsx` | Replaced full-name UK_ALLERGENS with shared utility, allergen labels in UI                                                                                  | Done   |
| `src/components/recipes/ExpandableRecipeCard.tsx`          | Added allergenKeyToLabel display, "May Contain" cross-contamination section                                                                                 | Done   |
| `src/components/stockly/BatchDetailDrawer.tsx`             | Added allergen badges section for batch-level allergens                                                                                                     | Done   |
| `src/components/stockly/sidebar-nav.tsx`                   | Changed Suppliers to parent nav with "Approved List" sub-link                                                                                               | Done   |
| `src/config/widget-registry.ts`                            | Added supplier_approval widget registration                                                                                                                 | Done   |

---

## Phase 3 — File Inventory

### New Files Created

| File                                                                    | Purpose                                                                                                                         | Status |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `supabase/migrations/20260221000000_salsa_production_batch_records.sql` | DB schema (production_batches, production_batch_inputs, production_batch_outputs, production_ccp_records) + FK on stock_batches | Done   |
| `src/app/api/stockly/production-batches/route.ts`                       | List + create production batches API                                                                                            | Done   |
| `src/app/api/stockly/production-batches/[id]/route.ts`                  | Get + update production batch API                                                                                               | Done   |
| `src/app/api/stockly/production-batches/[id]/inputs/route.ts`           | Add/remove input batch consumption (creates batch_movements)                                                                    | Done   |
| `src/app/api/stockly/production-batches/[id]/outputs/route.ts`          | Record finished product output (creates stock_batch with production_batch_id)                                                   | Done   |
| `src/app/api/stockly/production-batches/[id]/ccp/route.ts`              | Record CCP measurements                                                                                                         | Done   |
| `src/app/api/stockly/production-batches/[id]/complete/route.ts`         | Complete batch — aggregates allergens, calculates yield                                                                         | Done   |
| `src/app/dashboard/planly/production-batches/page.tsx`                  | Production batch list page (date/status filters)                                                                                | Done   |
| `src/app/dashboard/planly/production-batches/new/page.tsx`              | New production batch page                                                                                                       | Done   |
| `src/app/dashboard/planly/production-batches/[id]/page.tsx`             | Production batch detail page (Overview/Inputs/Outputs/CCP tabs)                                                                 | Done   |
| `src/components/planly/ProductionBatchForm.tsx`                         | Reusable create form (recipe, date, quantity)                                                                                   | Done   |
| `src/components/planly/ProductionBatchCard.tsx`                         | Card component for list view (status badge, recipe, yield)                                                                      | Done   |
| `src/components/planly/ProductionInputManager.tsx`                      | Manage input batches (uses BatchSelector, FIFO, quantity, allergens)                                                            | Done   |
| `src/components/planly/ProductionOutputRecorder.tsx`                    | Record finished product output (batch code, qty, dates)                                                                         | Done   |
| `src/components/planly/CCPRecordForm.tsx`                               | Record CCP measurements (type, target vs actual, pass/fail)                                                                     | Done   |

### Existing Files Modified

| File                                           | Change                                                                                                                   | Status |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| `src/lib/types/stockly.ts`                     | Added: ProductionBatchStatus, CCPType, ProductionBatch, ProductionBatchInput, ProductionBatchOutput, ProductionCCPRecord | Done   |
| `src/components/planly/sidebar-nav.tsx`        | Added: "Production Batches" nav item with Layers icon                                                                    | Done   |
| `src/components/stockly/BatchDetailDrawer.tsx` | Added: production batch link when production_batch_id is set                                                             | Done   |

---

## Phase 4 — File Inventory

### New Files Created

| File                                                                | Purpose                                                                                                             | Status |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| `supabase/migrations/20260222000000_salsa_traceability_recalls.sql` | DB schema (recalls, recall_affected_batches, recall_notifications, batch_dispatch_records) + views + triggers + RLS | Done   |
| `src/app/api/stockly/traceability/forward/route.ts`                 | Forward trace API: raw material → production → finished goods → customers                                           | Done   |
| `src/app/api/stockly/traceability/backward/route.ts`                | Backward trace API: finished product → production → raw materials → suppliers                                       | Done   |
| `src/app/api/stockly/dispatch-records/route.ts`                     | Dispatch records list + create API                                                                                  | Done   |
| `src/app/api/stockly/recalls/route.ts`                              | Recalls list + create API                                                                                           | Done   |
| `src/app/api/stockly/recalls/[id]/route.ts`                         | Recall detail GET + PATCH (status, investigation, regulatory)                                                       | Done   |
| `src/app/api/stockly/recalls/[id]/batches/route.ts`                 | Add/remove affected batches with auto-quarantine                                                                    | Done   |
| `src/app/api/stockly/recalls/[id]/notify/route.ts`                  | Record customer notification                                                                                        | Done   |
| `src/app/api/stockly/recalls/[id]/trace/route.ts`                   | Auto-trace affected batches to find downstream customers                                                            | Done   |
| `src/app/api/stockly/recalls/[id]/report/route.ts`                  | Generate recall report data for PDF/print                                                                           | Done   |
| `src/app/dashboard/stockly/traceability/page.tsx`                   | Traceability report page with mock recall exercise                                                                  | Done   |
| `src/app/dashboard/stockly/recalls/page.tsx`                        | Recall list page with status filters                                                                                | Done   |
| `src/app/dashboard/stockly/recalls/new/page.tsx`                    | New recall creation page                                                                                            | Done   |
| `src/app/dashboard/stockly/recalls/[id]/page.tsx`                   | Recall detail page (Overview/Batches/Notifications/Trace/Report tabs)                                               | Done   |
| `src/components/stockly/TraceSearchBar.tsx`                         | Batch code search with autocomplete and direction toggle                                                            | Done   |
| `src/components/stockly/TraceabilityTree.tsx`                       | Visual trace tree with horizontal node cards and connecting lines                                                   | Done   |
| `src/components/stockly/MassBalanceCard.tsx`                        | Mass balance summary (input vs output vs variance)                                                                  | Done   |
| `src/components/stockly/RecallForm.tsx`                             | Reusable recall create/edit form                                                                                    | Done   |
| `src/components/stockly/RecallAffectedBatchesPanel.tsx`             | Manage affected batches with batch search and auto-quarantine                                                       | Done   |
| `src/components/stockly/RecallNotificationsPanel.tsx`               | Track customer notifications (method, response, dates)                                                              | Done   |
| `src/components/stockly/RecallReportView.tsx`                       | Print-friendly recall report with all sections                                                                      | Done   |
| `src/components/stockly/DispatchRecordForm.tsx`                     | Quick form to record batch dispatch to customer                                                                     | Done   |
| `src/lib/recall-report-pdf.ts`                                      | HTML recall report generation utility for browser print                                                             | Done   |

### Existing Files Modified

| File                                           | Change                                                                                                               | Status |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| `src/lib/types/stockly.ts`                     | Added: Recall, RecallAffectedBatch, RecallNotification, BatchDispatchRecord, TraceNode, TraceLink, TraceResult types | Done   |
| `src/components/stockly/sidebar-nav.tsx`       | Added: COMPLIANCE section with "Traceability" and "Recalls" nav items, Shield icon import                            | Done   |
| `src/components/stockly/BatchDetailDrawer.tsx` | Added: dispatch action button (DispatchRecordForm), recall/quarantine status badge                                   | Done   |
| `src/app/dashboard/stockly/batches/page.tsx`   | Added: "recalled" status to filter tabs                                                                              | Done   |

---

## Remaining Before Go-Live

### Phase 1

1. **Run migration** — `supabase/migrations/20260219000000_salsa_batch_tracking_core.sql` needs to be applied
2. **Vercel cron config** — Add `batch-expiry-alerts` to `vercel.json` cron schedule
3. **Manual testing** — Create a delivery → verify batch auto-created → waste against batch → check expiry widget

### Phase 3

1. **Run migration** — `supabase/migrations/20260221000000_salsa_production_batch_records.sql`
2. **Build test** — `npm run build -- --webpack` to verify no compile errors
3. **Manual testing:**
   - Create production batch → select recipe → set date → verify batch code generated
   - Add input batches → verify stock_batch quantity_remaining decreases, batch_movements created with consumed_production
   - Record output → verify new stock_batch created with production_batch_id set, allergens inherited from inputs
   - Record CCP measurements → verify pass/fail display, corrective action field
   - Complete batch → verify allergens auto-aggregated, yield calculated from outputs
   - Production batch list → verify date/status filters work
   - Planly sidebar shows "Production Batches" link
   - BatchDetailDrawer shows production batch link when relevant

### Phase 4

1. **Run migration** — `supabase/migrations/20260222000000_salsa_traceability_recalls.sql`
2. **Build test** — `npm run build -- --webpack` to verify no compile errors
3. **Manual testing:**
   - Enter raw material batch code → forward trace shows production → finished goods → customers
   - Enter finished product batch code → backward trace shows raw materials → suppliers
   - Mass balance displays correct input vs output quantities
   - Create dispatch record from BatchDetailDrawer → appears in traceability forward trace
   - Create recall → add affected batches → verify auto-quarantine + batch_movement created
   - Run auto-trace on recall → identifies downstream customers from affected batches
   - Record customer notifications → track method, response, dates
   - Update root cause and corrective actions
   - Mark FSA/SALSA as notified
   - Recall report generates correctly with all sections, printable
   - Status workflow: draft → active → investigating → notified → resolved → closed
   - Mock recall exercise: starts timer, runs both traces, shows completion time
   - Stockly sidebar shows COMPLIANCE section with Traceability and Recalls links
   - BatchDetailDrawer shows recall badge for quarantined/recalled batches
   - BatchDetailDrawer shows dispatch action button
   - Batches page shows "Recalled" filter tab

### Phase 2

1. **Run migration** — `supabase/migrations/20260220000000_salsa_supplier_approval_specs_allergens.sql`
2. **Create storage bucket** — `supplier-docs` bucket (auto-created in migration, verify in Supabase dashboard)
3. **Vercel cron config** — Add `supplier-review-reminders` to `vercel.json` cron schedule
4. **Build test** — `npm run build -- --webpack` to verify no compile errors
5. **Manual testing:**
   - Create supplier → view detail page → upload document → set approval status → verify approval log
   - Create stock item → add spec → update spec → verify version history
   - Check ingredients library uses short keys → add ingredient to recipe → verify allergen display
   - Approved Supplier List shows correct data, is printable

---

## Technical Reference

### Existing Patterns Followed

- **API routes:** `createServerSupabaseClient()` from `@/lib/supabase-server`, return `{ success, data }` pattern
- **RLS:** `stockly_company_access(p_company_id UUID)` function
- **Settings:** `company_modules.settings` JSONB, module = 'stockly'
- **Site filtering:** `if (siteId && siteId !== 'all') query = query.eq('site_id', siteId)`
- **Notifications:** Insert into `notifications` table (type, severity, priority, title, message)
- **Widget pattern:** Lazy-loaded components registered in `src/config/widget-registry.ts`
- **Migration format:** `YYYYMMDDHHMMSS_description.sql`, `DO $$ BEGIN ... END $$` wrapper
- **Error handling:** 42P01 (table not found) handled gracefully in client components

### Database Tables (Phase 1)

- `stock_batches` — batch lifecycle tracking (status: active/depleted/expired/quarantined/recalled)
- `batch_movements` — audit trail for quantity changes (type: received/consumed_production/consumed_waste/adjustment/transfer/recalled)
- `delivery_lines` — added: temperature_reading, supplier_batch_code, condition_assessment (JSONB), batch_id
- `waste_log_lines` — added: batch_id

### Database Tables (Phase 2)

- `suppliers` — added: approval_status, risk_rating, next_review_date, approved_at, approved_by
- `stock_batches` — added: allergens TEXT[]
- `recipes` — added: may_contain_allergens TEXT[]
- `supplier_documents` — certificates, insurance, spec sheets per supplier
- `product_specifications` — structured spec per stock item (allergens, storage, shelf-life)
- `product_specification_history` — version archive for specs
- `supplier_approval_log` — audit trail for approval actions
- `ingredients_library.allergens` — normalized from full names to short keys

### Database Tables (Phase 3)

- `production_batches` — production run records (status: planned/in_progress/completed/cancelled)
- `production_batch_inputs` — links raw material batches consumed during production
- `production_batch_outputs` — finished product batches created from production
- `production_ccp_records` — CCP measurements (cooking_temp/cooling_temp/cooling_time/metal_detection/ph_level/other)
- `stock_batches.production_batch_id` — FK added (was nullable placeholder from Phase 1)

### Database Tables (Phase 4)

- `recalls` — recall/withdrawal event records (status: draft/active/investigating/notified/resolved/closed)
- `recall_affected_batches` — junction linking recalls to affected stock batches with action tracking
- `recall_notifications` — customer notification tracking (method, response, dates)
- `batch_dispatch_records` — links finished product batches to customer deliveries (the traceability missing link)

### Key Code Paths

- **Batch creation:** ManualDeliveryModal → POST `/api/stockly/batches` → inserts stock_batches + batch_movements
- **Batch consumption (waste):** Waste page → POST `/api/stockly/batches/[id]/consume` → movement + quantity update
- **Expiry alerts:** Cron → queries stock_batches by date → inserts notifications + auto-expires past use_by
- **FIFO warning:** BatchSelector component → orders by use_by ASC → warns if non-oldest selected
- **Production batch creation:** New batch page → POST `/api/stockly/production-batches` → inserts production_batches
- **Input consumption:** ProductionInputManager → POST `.../inputs` → batch_movements (consumed_production) + quantity update
- **Output recording:** ProductionOutputRecorder → POST `.../outputs` → creates stock_batch with production_batch_id + batch_movements (received)
- **Batch completion:** Complete button → POST `.../complete` → aggregates allergens from inputs, calculates yield from outputs
- **Forward trace:** Traceability page → GET `/api/stockly/traceability/forward?batchId=` → supplier → raw material → production → finished goods → customers
- **Backward trace:** Traceability page → GET `/api/stockly/traceability/backward?batchId=` → customers ← finished goods ← production ← raw materials ← suppliers
- **Dispatch recording:** BatchDetailDrawer → POST `/api/stockly/dispatch-records` → links stock_batch to customer
- **Recall creation:** New recall page → POST `/api/stockly/recalls` → creates recall in draft status
- **Recall quarantine:** Add affected batch → POST `.../batches` → auto-quarantines stock_batch + creates batch_movement
- **Recall trace:** Trace tab → GET `.../trace` → identifies all downstream customers from affected batches
- **Mock recall exercise:** Traceability page → starts timer → runs both forward + backward traces → records completion time

---

## Phase 5 — File Inventory

### New Files Created

| File                                                                      | Purpose                                                                   | Status |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| `supabase/migrations/20260223000000_salsa_calibration_nonconformance.sql` | DB schema (asset_calibrations, non_conformances) + views + triggers + RLS | Done   |
| `src/app/api/stockly/calibrations/route.ts`                               | Calibration records list + create API                                     | Done   |
| `src/app/api/stockly/calibrations/[id]/route.ts`                          | Calibration detail GET + PATCH + DELETE                                   | Done   |
| `src/app/api/stockly/calibrations/overdue/route.ts`                       | Overdue/due-soon calibrations + never-calibrated probes                   | Done   |
| `src/app/api/stockly/non-conformances/route.ts`                           | Non-conformance list + create (auto NC code) API                          | Done   |
| `src/app/api/stockly/non-conformances/[id]/route.ts`                      | NC detail GET + PATCH with auto status transitions                        | Done   |
| `src/app/api/stockly/non-conformances/generate-code/route.ts`             | NC code generation: NC-{YYYY}-{SEQ}                                       | Done   |
| `src/app/api/stockly/salsa/audit-summary/route.ts`                        | SALSA audit readiness aggregate data (7 sections)                         | Done   |
| `src/app/api/cron/salsa-compliance-check/route.ts`                        | Daily cron: overdue calibrations, NCs, recall delays, expiring docs       | Done   |
| `src/app/dashboard/stockly/salsa/page.tsx`                                | SALSA audit readiness dashboard (7 summary cards, print)                  | Done   |
| `src/app/dashboard/stockly/non-conformances/page.tsx`                     | NC register list (status tabs, filters, severity badges)                  | Done   |
| `src/app/dashboard/stockly/non-conformances/[id]/page.tsx`                | NC detail (5-step workflow, corrective action, closure)                   | Done   |
| `src/components/stockly/NonConformanceStatusBadge.tsx`                    | Colour-coded NC status badge                                              | Done   |
| `src/components/stockly/NonConformanceForm.tsx`                           | NC create/edit form                                                       | Done   |
| `src/components/stockly/CalibrationForm.tsx`                              | Calibration record create form                                            | Done   |
| `src/components/stockly/CalibrationPanel.tsx`                             | Embeddable calibration panel for asset detail pages                       | Done   |
| `src/components/stockly/SALSAAuditSummary.tsx`                            | 7-section summary component for SALSA dashboard                           | Done   |

### Existing Files Modified

| File                                     | Change                                                                                                    | Status |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| `src/lib/types/stockly.ts`               | Added: AssetCalibration, NonConformance, NonConformanceCategory/Severity/Source/Status types              | Done   |
| `src/data/compliance-templates.ts`       | Added: 7 SALSA compliance templates to COMPLIANCE_MODULE_TEMPLATES_V2                                     | Done   |
| `src/components/stockly/sidebar-nav.tsx` | Added: Non-Conformances + SALSA Dashboard nav items under COMPLIANCE, AlertTriangle + ShieldCheck imports | Done   |
| `src/components/assets/AssetCard.tsx`    | Added: CalibrationPanel section for temperature_probes and refrigeration_equipment                        | Done   |
| `vercel.json`                            | Added: 3 cron jobs (batch-expiry-alerts, supplier-review-reminders, salsa-compliance-check)               | Done   |
| `docs/salsa-progress.md`                 | Added: Phase 5 file inventory, updated status                                                             | Done   |

### Database Tables (Phase 5)

- `asset_calibrations` — formal calibration certificate records per asset (FK to public.assets)
- `non_conformances` — non-conformance register with 5-step corrective action workflow (NC-{YYYY}-{SEQ} codes)

### Key Code Paths (Phase 5)

- **Calibration recording:** CalibrationPanel → POST `/api/stockly/calibrations` → inserts asset_calibrations
- **Overdue calibrations:** Cron / CalibrationPanel → GET `.../overdue` → assets where next_calibration_due < today
- **NC creation:** NC list page → POST `/api/stockly/non-conformances` → auto-generates NC code, inserts record
- **NC workflow:** NC detail page → PATCH `.../[id]` → auto status transitions (root_cause → investigating, corrective_action → corrective_action, completed → verification, closed → closed)
- **SALSA dashboard:** SALSA page → GET `/api/stockly/salsa/audit-summary` → aggregate stats across 7 SALSA areas
- **Compliance check cron:** Daily 5am UTC → checks calibrations, NCs, recalls, supplier docs → creates notifications
