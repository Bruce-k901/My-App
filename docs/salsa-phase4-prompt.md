# SALSA Phase 4 — Traceability Reports + Recall Workflow

## Your Task

You are implementing Phase 4 of a 5-phase SALSA (Safe and Local Supplier Approval) food safety compliance build for the Opsly platform. This phase adds **traceability reports** and a **recall/withdrawal workflow** — the auditor-facing features that prove the entire batch tracking chain works end-to-end. SALSA requires both forwards and backwards traceability, with the ability to run a mock recall exercise annually.

**Read `docs/salsa-progress.md` first** — it has the full context, file inventories for Phases 1–3, key decisions, and technical patterns. Also read `docs/salsa-compliance-analysis.md` for the full SALSA requirements analysis.

---

## What Already Exists (DO NOT rebuild these)

### Phase 1 — Batch Tracking Core (complete)

- `stockly.stock_batches` — raw material batch lifecycle tracking (status: active/depleted/expired/quarantined/recalled)
- `stockly.batch_movements` — audit trail for all batch quantity changes (type: received/consumed_production/consumed_waste/adjustment/transfer/recalled)
- Batch APIs at `/api/stockly/batches/` — CRUD, consume, expiring, generate-code
- `BatchSelector` component — FIFO-ordered batch picker
- `BatchDetailDrawer` component — batch detail with movement timeline
- Batch code generation utility at `src/lib/stockly/batch-codes.ts`

### Phase 2 — Supplier Approval + Specs + Allergens (complete)

- `stockly.suppliers` — approval_status, risk_rating, next_review_date fields
- `stockly.supplier_documents` — certificates, insurance, spec sheets per supplier
- `stockly.product_specifications` — structured spec per stock item with version history
- Allergen utility at `src/lib/stockly/allergens.ts` — `UK_ALLERGENS`, `allergenKeyToLabel()`

### Phase 3 — Production Batch Records (complete)

- `stockly.production_batches` — production run records (status: planned/in_progress/completed/cancelled)
- `stockly.production_batch_inputs` — which raw material stock_batches went into each production run
- `stockly.production_batch_outputs` — finished product stock_batches created from production (links back via `stock_batches.production_batch_id`)
- `stockly.production_ccp_records` — CCP measurements during production
- Production batch APIs at `/api/stockly/production-batches/` — CRUD, inputs, outputs, CCP, complete
- Production batch pages at `/dashboard/planly/production-batches/` — list, new, detail (with tabs)

### Existing Incidents System

- Incidents table at `public.incidents` with types: `accident`, `food_poisoning`, `customer_complaint`, `staff_sickness`
- Fields include: severity, status (open/investigating/resolved/closed), casualties, witnesses, RIDDOR, root_cause, corrective_actions, follow_up_tasks
- Incident modals: `EmergencyIncidentModal`, `FoodPoisoningIncidentModal`, `CustomerComplaintModal`
- PDF export via `src/lib/incident-report-pdf.ts` — generates HTML with inline CSS for browser print
- Follow-up task integration via `checklist_tasks` table

### Planly Orders/Delivery Chain

- `planly_orders` — customer orders with delivery_date
- `planly_order_lines` — order line items referencing `planly_products`
- `planly_customers` — customer records with address, contact info
- Delivery notes API at `/api/planly/delivery-notes/` — aggregates orders for a date+site, generates PDF via Puppeteer
- **NO explicit dispatch/fulfillment records yet** — orders go from confirmed → delivered implicitly

### Existing Report Patterns

- Approved Supplier List at `/dashboard/stockly/suppliers/approved-list/page.tsx` — print-friendly table + CSV export
- Stockly reports at `/dashboard/reports/stockly/` — wastage, GP analysis, variance, stock value, supplier spend, dead stock, prices
- Reports hub at `/dashboard/reports/page.tsx` — central landing with module-specific links
- PDF generation pattern: HTML template strings → browser print or Puppeteer rendering

### Notifications

- `public.notifications` table with: company_id, site_id, type, title, message, severity, priority, status, metadata (JSONB)
- Pattern from cron jobs: insert notification with `metadata: { salsa: true, ... }` for SALSA-related alerts

---

## What Phase 4 Needs to Build

### 1. Database Migration

**File:** `supabase/migrations/20260222000000_salsa_traceability_recalls.sql`

#### Table: `stockly.recalls` — Recall/withdrawal event records

```
stockly.recalls:
  id UUID PK
  company_id UUID NOT NULL
  site_id UUID
  recall_code TEXT NOT NULL UNIQUE(company_id, recall_code)
  title TEXT NOT NULL
  description TEXT
  recall_type TEXT CHECK IN ('recall', 'withdrawal') DEFAULT 'recall'
    -- recall = safety issue (consumer level), withdrawal = quality issue (trade level)
  severity TEXT CHECK IN ('class_1', 'class_2', 'class_3') DEFAULT 'class_2'
    -- class_1 = serious health risk, class_2 = may cause illness, class_3 = unlikely health risk
  status TEXT CHECK IN ('draft', 'active', 'investigating', 'notified', 'resolved', 'closed') DEFAULT 'draft'
  reason TEXT (why the recall was initiated)
  root_cause TEXT
  corrective_actions TEXT
  initiated_at TIMESTAMPTZ DEFAULT NOW()
  initiated_by UUID
  resolved_at TIMESTAMPTZ
  closed_at TIMESTAMPTZ
  fsa_notified BOOLEAN DEFAULT FALSE (Food Standards Agency notification)
  fsa_notified_at TIMESTAMPTZ
  fsa_reference TEXT
  salsa_notified BOOLEAN DEFAULT FALSE (SALSA body notification — required within 3 working days)
  salsa_notified_at TIMESTAMPTZ
  notes TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()
  updated_at TIMESTAMPTZ DEFAULT NOW()
  created_by UUID
```

#### Table: `stockly.recall_affected_batches` — Junction linking recalls to affected stock batches

```
stockly.recall_affected_batches:
  id UUID PK
  company_id UUID NOT NULL
  recall_id UUID NOT NULL REFERENCES stockly.recalls(id) ON DELETE CASCADE
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id)
  batch_type TEXT CHECK IN ('raw_material', 'finished_product') DEFAULT 'finished_product'
  quantity_affected DECIMAL(10,3)
  quantity_recovered DECIMAL(10,3)
  action_taken TEXT CHECK IN ('quarantined', 'destroyed', 'returned', 'released', 'pending')
  notes TEXT
  added_at TIMESTAMPTZ DEFAULT NOW()
```

#### Table: `stockly.recall_notifications` — Customer/stakeholder notification tracking

```
stockly.recall_notifications:
  id UUID PK
  company_id UUID NOT NULL
  recall_id UUID NOT NULL REFERENCES stockly.recalls(id) ON DELETE CASCADE
  customer_id UUID (references planly_customers if applicable)
  customer_name TEXT NOT NULL
  contact_email TEXT
  contact_phone TEXT
  notification_method TEXT CHECK IN ('phone', 'email', 'in_person', 'letter', 'other')
  notified_at TIMESTAMPTZ
  notified_by UUID
  response_received BOOLEAN DEFAULT FALSE
  response_notes TEXT
  stock_returned BOOLEAN DEFAULT FALSE
  stock_return_quantity DECIMAL(10,3)
  created_at TIMESTAMPTZ DEFAULT NOW()
```

#### Table: `stockly.batch_dispatch_records` — Links finished product batches to customer deliveries

This is the **missing link** in the traceability chain. Without this, we cannot trace finished products to specific customers.

```
stockly.batch_dispatch_records:
  id UUID PK
  company_id UUID NOT NULL
  site_id UUID
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id)
  order_id UUID (references planly_orders if from order system)
  customer_id UUID (references planly_customers)
  customer_name TEXT NOT NULL (denormalized for reporting)
  dispatch_date DATE NOT NULL
  quantity DECIMAL(10,3) NOT NULL
  unit TEXT
  delivery_note_reference TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()
  created_by UUID
```

**Also in the migration:**

- Public views + INSTEAD OF triggers for all 4 new tables (follow exact pattern from Phase 1–3 migrations)
- RLS using `stockly.stockly_company_access(company_id)` on all new tables
- Indexes on company_id, recall_id, stock_batch_id, customer_id, dispatch_date
- `NOTIFY pgrst, 'reload schema'` at end

**CRITICAL — Schema pattern:** All tables in `stockly` schema. Create matching public views with `security_invoker = true`. Create INSTEAD OF INSERT/UPDATE/DELETE triggers. **FK references must point to `stockly.` tables, NOT `public.` views.** See Phase 1–3 migrations for the exact pattern.

### 2. TypeScript Types

Add to `src/lib/types/stockly.ts`:

```typescript
// @salsa - SALSA Compliance: Phase 4 types
export type RecallType = "recall" | "withdrawal";
export type RecallSeverity = "class_1" | "class_2" | "class_3";
export type RecallStatus =
  | "draft"
  | "active"
  | "investigating"
  | "notified"
  | "resolved"
  | "closed";
export type RecallBatchAction = "quarantined" | "destroyed" | "returned" | "released" | "pending";

export interface Recall {
  id: string;
  company_id: string;
  site_id: string | null;
  recall_code: string;
  title: string;
  description: string | null;
  recall_type: RecallType;
  severity: RecallSeverity;
  status: RecallStatus;
  reason: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  initiated_at: string;
  initiated_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  fsa_notified: boolean;
  fsa_notified_at: string | null;
  fsa_reference: string | null;
  salsa_notified: boolean;
  salsa_notified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  affected_batches?: RecallAffectedBatch[];
  notifications?: RecallNotification[];
}

export interface RecallAffectedBatch {
  id: string;
  company_id: string;
  recall_id: string;
  stock_batch_id: string;
  batch_type: "raw_material" | "finished_product";
  quantity_affected: number | null;
  quantity_recovered: number | null;
  action_taken: RecallBatchAction;
  notes: string | null;
  added_at: string;
  // Joined
  stock_batch?: StockBatch | null;
}

export interface RecallNotification {
  id: string;
  company_id: string;
  recall_id: string;
  customer_id: string | null;
  customer_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  notification_method: string | null;
  notified_at: string | null;
  notified_by: string | null;
  response_received: boolean;
  response_notes: string | null;
  stock_returned: boolean;
  stock_return_quantity: number | null;
  created_at: string;
}

export interface BatchDispatchRecord {
  id: string;
  company_id: string;
  site_id: string | null;
  stock_batch_id: string;
  order_id: string | null;
  customer_id: string | null;
  customer_name: string;
  dispatch_date: string;
  quantity: number;
  unit: string | null;
  delivery_note_reference: string | null;
  created_at: string;
  created_by: string | null;
  // Joined
  stock_batch?: StockBatch | null;
}

// Traceability report types
export interface TraceNode {
  type:
    | "supplier"
    | "raw_material_batch"
    | "production_batch"
    | "finished_product_batch"
    | "customer";
  id: string;
  label: string;
  sublabel?: string;
  date?: string;
  quantity?: number;
  unit?: string;
  allergens?: string[];
  status?: string;
}

export interface TraceLink {
  from: string; // node id
  to: string; // node id
  label?: string;
  quantity?: number;
}

export interface TraceResult {
  nodes: TraceNode[];
  links: TraceLink[];
  batch: StockBatch;
  direction: "forward" | "backward";
  mass_balance?: {
    total_input: number;
    total_output: number;
    variance: number;
    variance_percent: number;
    unit: string;
  };
}
```

### 3. API Routes

| Route                                | Methods      | Purpose                                                                                |
| ------------------------------------ | ------------ | -------------------------------------------------------------------------------------- |
| `/api/stockly/traceability/forward`  | GET          | Forward trace: raw material batch → production → finished goods → customers            |
| `/api/stockly/traceability/backward` | GET          | Backward trace: finished product batch → production → raw materials → suppliers        |
| `/api/stockly/dispatch-records`      | GET, POST    | List/create batch dispatch records (link batches to customer deliveries)               |
| `/api/stockly/recalls`               | GET, POST    | List/create recalls                                                                    |
| `/api/stockly/recalls/[id]`          | GET, PATCH   | Get recall detail (with affected batches + notifications), update status/fields        |
| `/api/stockly/recalls/[id]/batches`  | POST, DELETE | Add/remove affected batches — auto-quarantine stock_batches on add                     |
| `/api/stockly/recalls/[id]/notify`   | POST         | Add customer notification record                                                       |
| `/api/stockly/recalls/[id]/trace`    | GET          | Run traceability from recall's affected batches — auto-identify all affected customers |
| `/api/stockly/recalls/[id]/report`   | GET          | Generate recall report data (for PDF/print)                                            |

#### Traceability API Logic

**Forward trace** (`/api/stockly/traceability/forward?batchId=<stock_batch_id>`):

1. Start with the stock_batch (raw material)
2. Find supplier via `delivery_line_id` → `delivery_lines` → `deliveries` → `suppliers`
3. Find production_batch_inputs where `stock_batch_id` matches → get `production_batch_id`
4. For each production_batch, find production_batch_outputs → get output stock_batch_ids
5. For each output stock_batch, find batch_dispatch_records → get customers
6. Return nodes + links for visualization, plus mass balance (total input qty vs total output qty)

**Backward trace** (`/api/stockly/traceability/backward?batchId=<stock_batch_id>`):

1. Start with the stock_batch (finished product)
2. Find production_batch via `production_batch_id` on the stock_batch
3. Find production_batch_inputs → get all input stock_batch_ids
4. For each input stock_batch, find supplier via delivery chain
5. Find batch_dispatch_records for the finished product → get customers who received it
6. Return nodes + links for visualization

#### Recall Trace Logic

`/api/stockly/recalls/[id]/trace`:

1. Get all affected batches from `recall_affected_batches`
2. For each affected batch, run forward trace to find all downstream customers
3. Deduplicate customers across all affected batches
4. Return: list of potentially affected customers (with quantities, dates, batch codes)
5. This auto-populates the "notify" list — the user then confirms and records notifications

#### Dispatch Records

The dispatch record is the missing link between finished product batches and customers. When the daily production plan is executed and products are dispatched:

- A dispatch record is created linking `stock_batch_id` → `customer_id` + `order_id`
- This can be done manually from the batch detail page, or in bulk from the delivery notes workflow
- Each record captures: batch, customer, date, quantity dispatched

### 4. UI Components

| Component                                               | Purpose                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/app/dashboard/stockly/traceability/page.tsx`       | Traceability report page — enter batch code, choose direction, visualize chain               |
| `src/components/stockly/TraceabilityTree.tsx`           | Visual trace tree — nodes (supplier/batch/production/customer) with connecting lines         |
| `src/components/stockly/TraceSearchBar.tsx`             | Batch code search with autocomplete, direction toggle (forward/backward)                     |
| `src/components/stockly/MassBalanceCard.tsx`            | Mass balance summary — input qty vs output qty vs variance                                   |
| `src/app/dashboard/stockly/recalls/page.tsx`            | Recall list page — status filter, severity badges, date range                                |
| `src/app/dashboard/stockly/recalls/new/page.tsx`        | New recall form — title, type, severity, affected batches selection                          |
| `src/app/dashboard/stockly/recalls/[id]/page.tsx`       | Recall detail page — tabs: Overview, Affected Batches, Customer Notifications, Trace, Report |
| `src/components/stockly/RecallForm.tsx`                 | Reusable recall create/edit form                                                             |
| `src/components/stockly/RecallAffectedBatchesPanel.tsx` | Manage affected batches — batch selector, action taken, quantity tracking                    |
| `src/components/stockly/RecallNotificationsPanel.tsx`   | Track customer notifications — who was notified, method, response received                   |
| `src/components/stockly/RecallReportView.tsx`           | Print-friendly recall report — all details in one printable view                             |
| `src/components/stockly/DispatchRecordForm.tsx`         | Quick form to record batch dispatch to a customer                                            |

### 5. Traceability Tree Visualization

The `TraceabilityTree` component should render a **horizontal flow chart** showing the trace chain:

```
Forward trace example:
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Supplier    │───▶│ Raw Material │───▶│  Production     │───▶│ Finished     │───▶│  Customer   │
│  ABC Foods   │    │ Batch FL-001 │    │  Batch PB-001   │    │ Batch FP-001 │    │  Cafe XYZ   │
│              │    │ 50kg flour   │    │  Plain Croiss.  │    │ 200 units    │    │  120 units  │
│              │    │ UB: 15/03/26 │    │  Date: 18/02/26 │    │              │    │  18/02/26   │
└─────────────┘    └──────────────┘    └─────────────────┘    └──────────────┘    ├─────────────┤
                                                                                   │  Customer   │
                                                                                   │  Deli 123   │
                                                                                   │  80 units   │
                                                                                   │  18/02/26   │
                                                                                   └─────────────┘
```

Use Tailwind CSS for the visualization — no need for a charting library. Nodes as cards, links as CSS borders/lines with `flex` or `grid` layout. Keep it simple and print-friendly.

Each node should show:

- **Supplier**: name, approval status badge
- **Raw material batch**: batch code, item name, quantity, use-by date, allergens
- **Production batch**: batch code, recipe name, date, status badge
- **Finished product batch**: batch code, item name, quantity, use-by date
- **Customer**: name, quantity dispatched, dispatch date

### 6. Recall Workflow

The recall workflow follows this process:

1. **Initiate** — User creates recall with title, type (recall/withdrawal), severity, reason
2. **Add affected batches** — Select stock batches involved. On add, auto-quarantine each batch (set `status = 'quarantined'`, create batch_movement with `movement_type = 'recalled'`)
3. **Auto-trace** — Run trace from affected batches to find all downstream customers who received the product
4. **Notify** — Record customer notifications with method, timestamp, response tracking
5. **Investigate** — Record root cause, corrective actions
6. **Resolve** — Mark recall as resolved, record FSA/SALSA notification status
7. **Close** — Final close with all actions completed

**Key SALSA requirements for recalls:**

- Must notify SALSA body within **3 working days** of a recall event
- Must maintain communication log showing who was contacted and when
- Must demonstrate ability to identify all affected customers within **4 hours** (mock recall test)
- Corrective actions must be documented and tracked to closure

### 7. Navigation

Add to `src/components/stockly/sidebar-nav.tsx`:

- "Traceability" as a link under the REPORTS section or as its own section
- "Recalls" as a link — could be under a new "COMPLIANCE" section
- Routes: `/dashboard/stockly/traceability` and `/dashboard/stockly/recalls`

### 8. Existing Files to Modify

| File                                           | Change                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/stockly.ts`                     | Add Recall, RecallAffectedBatch, RecallNotification, BatchDispatchRecord, TraceNode, TraceLink, TraceResult types |
| `src/components/stockly/sidebar-nav.tsx`       | Add "Traceability" and "Recalls" nav items                                                                        |
| `src/components/stockly/BatchDetailDrawer.tsx` | Add "Dispatch" quick action button (opens dispatch form) + recall status badge if batch is quarantined/recalled   |
| `src/app/dashboard/stockly/batches/page.tsx`   | Add "recalled" filter to status tabs, show recall badge on quarantined/recalled batches                           |

### 9. Mock Recall Exercise

The recall report page should support a **mock recall exercise** mode:

1. User enters a batch code (typically a random finished product batch)
2. System runs backward trace to find all raw materials → suppliers
3. System runs forward trace to find all customers who received the batch
4. Report shows: time to complete trace, all identified parties, mass balance
5. Export as PDF for SALSA auditor review
6. The entire exercise should demonstrate the ability to trace within **4 hours** (the report timestamps the exercise start → completion)

Add a "Mock Recall Exercise" button on the traceability page that:

- Prompts for a batch code
- Starts a timer
- Runs both forward and backward traces
- Generates a comprehensive report
- Records the exercise completion time
- Allows PDF export for audit evidence

### 10. Recall Report Format

The recall report (for printing/PDF) should include:

1. **Header**: Company name, recall code, date initiated, severity class
2. **Recall Details**: Title, description, type, reason, status
3. **Affected Batches**: Table with batch code, product, quantity affected, quantity recovered, action taken
4. **Traceability Chain**: Simplified forward/backward trace for each affected batch
5. **Allergen Summary**: Union of all allergens from affected batches
6. **Customer Notifications**: Table with customer name, contact, method, date notified, response received
7. **Investigation**: Root cause, corrective actions
8. **Regulatory Notifications**: FSA notified (yes/no + date), SALSA notified (yes/no + date)
9. **Mass Balance**: Total product produced vs recovered vs unaccounted for
10. **Timeline**: Key dates (initiated, investigated, notified, resolved, closed)
11. **Footer**: Generated date, generated by

Use the same HTML → print pattern as `src/lib/incident-report-pdf.ts`. Create a `src/lib/recall-report-pdf.ts` utility.

---

## Coding Standards

- **All SALSA code tagged with `// @salsa`** (JS/TS) and `-- @salsa` (SQL). New files get header: `// @salsa - SALSA Compliance: <description>`
- **API routes:** Use `createServerSupabaseClient()` from `@/lib/supabase-server`. Return `{ success: true, data }` or `{ success: false, error }` pattern. In Next.js 16, `params` is a Promise: `const { id } = await params;`
- **Client-side Supabase:** Import `{ supabase }` from `@/lib/supabase` (named export, NOT `createClient()`)
- **RLS:** All new `stockly.` tables use `stockly.stockly_company_access(company_id)`
- **Multi-tenancy:** All tables have `company_id` and `site_id`
- **Site filtering:** `if (siteId && siteId !== 'all') query = query.eq('site_id', siteId)`
- **Migration pattern:** `DO $$ BEGIN ... END $$` for idempotent blocks. FK references to `stockly.` tables (NOT `public.` views). Public views with `security_invoker = true` + INSTEAD OF triggers.
- **Icons:** Import from `@/components/ui/icons` — check what's available before using
- **Allergens:** Use `allergenKeyToLabel()` from `@/lib/stockly/allergens.ts` for display
- **Build:** Must pass `npm run build -- --webpack` with 0 errors
- **Module colours:** Stockly module colour classes are `text-stockly-dark dark:text-stockly` (light theme uses dark variant, dark theme uses light variant)
- **Error handling:** Handle `42P01` (table not found) gracefully in client components
- **Print styles:** Force light theme on print (dark text unreadable). Use `@media print` CSS to hide non-essential UI elements

---

## Migration Gotchas (IMPORTANT)

1. **`public.suppliers`, `public.stock_batches`, `public.recipes` etc. are VIEWS, not tables.** Never `ALTER TABLE public.X` or `REFERENCES public.X(id)`. Always target `stockly.X`.
2. **`planly_customers` and `planly_orders` are in the `public` schema** — these are actual tables, not views. FK references to these use `public.planly_customers(id)` etc. But since cross-schema FKs can be complex, use nullable columns without FK constraints for planly references (like we did with `process_template_id` in Phase 3).
3. After creating tables + views, run `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new views.
4. When a view is recreated with `DROP VIEW ... CASCADE`, any dependent views/triggers are also dropped and must be recreated. Check for cascading dependencies.
5. Run migration with: `npx supabase db push --include-all`

---

## Verification Checklist

1. Migration applies cleanly: `npx supabase db push --include-all`
2. Build passes: `npm run build -- --webpack`
3. **Traceability:**
   - Can enter a raw material batch code → forward trace shows production batches → finished goods → customers
   - Can enter a finished product batch code → backward trace shows raw materials → suppliers
   - Mass balance shows correct input vs output quantities
   - Trace tree visualization renders correctly with nodes and links
4. **Dispatch records:**
   - Can create dispatch records linking stock batches to customers
   - Dispatch records appear in traceability forward trace
5. **Recalls:**
   - Can create a recall with title, type, severity
   - Can add affected batches → stock batches auto-quarantined (status change + batch_movement)
   - Auto-trace identifies all downstream customers from affected batches
   - Can record customer notifications with method, response tracking
   - Can update root cause, corrective actions, FSA/SALSA notification status
   - Recall report generates correctly (printable, includes all sections)
   - Recall status workflow: draft → active → investigating → notified → resolved → closed
6. **Mock recall exercise:**
   - Can start a mock recall from traceability page
   - Exercise generates timed report suitable for auditor review
7. **Navigation:**
   - Stockly sidebar shows "Traceability" and "Recalls" links
   - BatchDetailDrawer shows dispatch action and recall badge when relevant
8. Update `docs/salsa-progress.md` with Phase 4 file inventory and status

---

## Estimated Scope

- 1 migration file
- ~12 new files (API routes + components + pages + report utility)
- ~4 modified files
- Est. 5–7 days
