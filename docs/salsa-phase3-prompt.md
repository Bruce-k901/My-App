# SALSA Phase 3 — Production Batch Records + Planly Integration

## Your Task

You are implementing Phase 3 of a 5-phase SALSA (Safe and Local Supplier Approval) food safety compliance build for the Opsly platform. This phase adds **production batch records** — the ability to track what raw material batches went into each production run and what finished product batches came out. This is the critical link in the traceability chain: raw materials → production → finished goods.

**Read `docs/salsa-progress.md` first** — it has the full context, file inventories for Phases 1–2, key decisions, and technical patterns. Also read `docs/salsa-compliance-analysis.md` for the full SALSA requirements analysis.

---

## What Already Exists (DO NOT rebuild these)

### Phase 1 — Batch Tracking Core (complete)

- `stockly.stock_batches` table — tracks raw material batches (status: active/depleted/expired/quarantined/recalled)
- `stockly.batch_movements` table — audit trail for quantity changes (type: received/consumed_production/consumed_waste/adjustment/transfer/recalled)
- `stock_batches.production_batch_id UUID` column — **placeholder for Phase 3 FK** (currently nullable, no constraint)
- Batch APIs at `/api/stockly/batches/` — CRUD, consume, expiring, generate-code
- `BatchSelector` component at `src/components/stockly/BatchSelector.tsx` — FIFO-ordered batch picker, reuse this for selecting input batches
- `generateBatchCode()` at `src/lib/stockly/batch-codes.ts` — batch code generation with configurable format tokens
- `consumed_production` movement type — defined in schema but **never used yet**. Phase 3 activates this.
- Batch consume API at `/api/stockly/batches/[id]/consume` — POST with `{ quantity, movement_type, reference_type?, reference_id?, notes? }`

### Phase 2 — Supplier Approval + Specs + Allergens (complete)

- Allergen utility at `src/lib/stockly/allergens.ts` — `UK_ALLERGENS`, `allergenKeyToLabel()`, shared across all code
- `stock_batches.allergens TEXT[]` — batch-level allergen tracking
- `recipes.may_contain_allergens TEXT[]` — cross-contamination tracking on recipes

### Existing Planly Production System

- **Production plan page** at `src/app/dashboard/planly/production-plan/page.tsx` — date-driven daily view with tabs: DailyBook, MixSheets, TrayLayout, ProductionTasks
- **Production plan API** at `/api/planly/production-plan/route.ts` — returns `{ delivery_orders, production_tasks, dough_ingredients, tray_setup, cookie_layout }` for a date. **`dough_ingredients` is a placeholder empty array** with comment: `// 5. Dough ingredients - placeholder for future Stockly integration`
- **Mix sheet API** at `/api/planly/production-plan/mix-sheet/route.ts` — calculates base doughs, lamination styles, scaled ingredients from recipes
- **DailyWorksheet** at `src/components/planly/production-plan/DailyWorksheet.tsx` — print-friendly production worksheet
- **Process templates** at `src/app/api/planly/process-templates/` — multi-stage production templates with `day_offset` scheduling
- **Recipe ↔ ingredient linkage** via `recipe_ingredients` view — maps recipes to stock items with quantities

---

## What Phase 3 Needs to Build

### 1. Database Migration

**File:** `supabase/migrations/20260221000000_salsa_production_batch_records.sql`

Create a new `stockly.production_batches` table (the central production run record):

```
stockly.production_batches:
  id UUID PK
  company_id UUID NOT NULL
  site_id UUID
  batch_code TEXT NOT NULL UNIQUE(company_id, batch_code)
  recipe_id UUID REFERENCES stockly.recipes(id)
  process_template_id UUID (nullable — references planly process template if used)
  production_date DATE NOT NULL
  status TEXT CHECK IN ('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned'
  planned_quantity DECIMAL(10,3)
  actual_quantity DECIMAL(10,3)
  unit TEXT
  started_at TIMESTAMPTZ
  completed_at TIMESTAMPTZ
  operator_id UUID (who ran the production)
  notes TEXT
  allergens TEXT[] (auto-aggregated from input batches)
  may_contain_allergens TEXT[] (inherited from recipe)
  created_at, updated_at, created_by (standard)
```

Create `stockly.production_batch_inputs` — links raw material batches consumed:

```
stockly.production_batch_inputs:
  id UUID PK
  company_id UUID NOT NULL
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE
  stock_batch_id UUID NOT NULL REFERENCES stockly.stock_batches(id)
  stock_item_id UUID NOT NULL REFERENCES stockly.stock_items(id)
  planned_quantity DECIMAL(10,3)
  actual_quantity DECIMAL(10,3)
  unit TEXT
  added_at TIMESTAMPTZ DEFAULT NOW()
  added_by UUID
```

Create `stockly.production_batch_outputs` — finished product batches created:

```
stockly.production_batch_outputs:
  id UUID PK
  company_id UUID NOT NULL
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE
  stock_item_id UUID NOT NULL (the finished product stock item)
  batch_code TEXT NOT NULL
  quantity DECIMAL(10,3)
  unit TEXT
  use_by_date DATE
  best_before_date DATE
  created_at TIMESTAMPTZ DEFAULT NOW()
```

Create `stockly.production_ccp_records` — critical control point measurements:

```
stockly.production_ccp_records:
  id UUID PK
  company_id UUID NOT NULL
  production_batch_id UUID NOT NULL REFERENCES stockly.production_batches(id) ON DELETE CASCADE
  ccp_type TEXT CHECK IN ('cooking_temp', 'cooling_temp', 'cooling_time', 'metal_detection', 'ph_level', 'other')
  target_value TEXT
  actual_value TEXT
  unit TEXT
  is_within_spec BOOLEAN
  corrective_action TEXT (filled if out of spec)
  recorded_at TIMESTAMPTZ DEFAULT NOW()
  recorded_by UUID
```

**Also in the migration:**

- Add FK constraint: `ALTER TABLE stockly.stock_batches ADD CONSTRAINT fk_stock_batches_production_batch FOREIGN KEY (production_batch_id) REFERENCES stockly.production_batches(id) ON DELETE SET NULL`
- Public views + INSTEAD OF triggers for all new tables (follow exact pattern from Phase 1/2 migrations)
- RLS using `stockly.stockly_company_access(company_id)` on all new tables
- Indexes on company_id, production_date, recipe_id, status
- `NOTIFY pgrst, 'reload schema'` at end

**CRITICAL — Schema pattern:** All tables in `stockly` schema. Create matching public views with `security_invoker = true`. Create INSTEAD OF INSERT/UPDATE/DELETE triggers. **FK references must point to `stockly.` tables, NOT `public.` views** (views can't have FK constraints). See `20260220000000_salsa_supplier_approval_specs_allergens.sql` for the exact pattern.

### 2. TypeScript Types

Add to `src/lib/types/stockly.ts`:

```typescript
export type ProductionBatchStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type CCPType = 'cooking_temp' | 'cooling_temp' | 'cooling_time' | 'metal_detection' | 'ph_level' | 'other';

export interface ProductionBatch {
  id: string;
  company_id: string;
  site_id: string | null;
  batch_code: string;
  recipe_id: string | null;
  process_template_id: string | null;
  production_date: string;
  status: ProductionBatchStatus;
  planned_quantity: number | null;
  actual_quantity: number | null;
  unit: string | null;
  started_at: string | null;
  completed_at: string | null;
  operator_id: string | null;
  notes: string | null;
  allergens: string[] | null;
  may_contain_allergens: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  recipe?: { id: string; name: string; allergens?: string[] | null };
  inputs?: ProductionBatchInput[];
  outputs?: ProductionBatchOutput[];
  ccp_records?: ProductionCCPRecord[];
}

export interface ProductionBatchInput { ... }
export interface ProductionBatchOutput { ... }
export interface ProductionCCPRecord { ... }
```

### 3. API Routes

| Route                                           | Methods      | Purpose                                                                                    |
| ----------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `/api/stockly/production-batches`               | GET, POST    | List production batches (filter by date/status/recipe), create new                         |
| `/api/stockly/production-batches/[id]`          | GET, PATCH   | Get full detail (with inputs/outputs/CCPs), update status/quantities                       |
| `/api/stockly/production-batches/[id]/inputs`   | POST, DELETE | Add/remove input batch consumption (calls batch consume API internally)                    |
| `/api/stockly/production-batches/[id]/outputs`  | POST         | Record finished product output (creates stock_batch with production_batch_id)              |
| `/api/stockly/production-batches/[id]/ccp`      | POST         | Record a CCP measurement                                                                   |
| `/api/stockly/production-batches/[id]/complete` | POST         | Mark complete — validates all inputs recorded, calculates yield, auto-aggregates allergens |

**When creating input records:** Call the existing batch consume endpoint or directly create `batch_movements` with `movement_type = 'consumed_production'`, `reference_type = 'production_batch'`, `reference_id = production_batch.id`. Update `quantity_remaining` on the stock batch.

**When creating output records:** Create a new `stock_batches` record for the finished product with `production_batch_id` set. Generate batch code using `generateBatchCode()`. Auto-inherit allergens from all input batches (union of all input batch allergens).

### 4. UI Components

| Component                                                   | Purpose                                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/app/dashboard/planly/production-batches/page.tsx`      | Production batch list page — date picker, status filter, click to detail                       |
| `src/app/dashboard/planly/production-batches/[id]/page.tsx` | Production batch detail page — overview, inputs tab, outputs tab, CCP tab                      |
| `src/app/dashboard/planly/production-batches/new/page.tsx`  | New production batch form — select recipe, date, planned quantity, auto-suggest input batches  |
| `src/components/planly/ProductionBatchForm.tsx`             | Reusable form for create/edit                                                                  |
| `src/components/planly/ProductionInputManager.tsx`          | Manage input batches — uses `BatchSelector` from Stockly, shows FIFO warnings, quantity inputs |
| `src/components/planly/ProductionOutputRecorder.tsx`        | Record finished product output — batch code, quantity, dates                                   |
| `src/components/planly/CCPRecordForm.tsx`                   | Record CCP measurements — type, target vs actual, pass/fail                                    |
| `src/components/planly/ProductionBatchCard.tsx`             | Card component for list view — status badge, recipe, date, yield                               |

### 5. Planly Integration Points

1. **Planly sidebar nav** (`src/components/planly/sidebar-nav.tsx`): Add "Production Batches" link under an appropriate section. Use `Layers` icon (same as Stockly batches). The route is `/dashboard/planly/production-batches`.

2. **Production plan page** — Add a "Start Batch" button on the daily production plan that pre-fills a new production batch with the recipe and planned quantities from that day's production tasks.

3. **Mix sheet integration** — When viewing a mix sheet for a date, show which raw material batches are available (FIFO ordered) for each ingredient. This is the `dough_ingredients` placeholder in `/api/planly/production-plan/route.ts`.

4. **Daily worksheet** — After a production batch is completed, show the batch code on the printed daily worksheet next to the relevant production task.

### 6. Navigation

Add to `src/components/planly/sidebar-nav.tsx`:

- "Production Batches" as a link item under the production-related section
- Route: `/dashboard/planly/production-batches`

### 7. Existing Files to Modify

| File                                                       | Change                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/lib/types/stockly.ts`                                 | Add ProductionBatch, ProductionBatchInput, ProductionBatchOutput, ProductionCCPRecord types |
| `src/components/planly/sidebar-nav.tsx`                    | Add "Production Batches" nav item                                                           |
| `/api/planly/production-plan/route.ts`                     | Replace `dough_ingredients` placeholder with batch availability data                        |
| `src/components/planly/production-plan/DailyWorksheet.tsx` | Show batch codes on completed production items                                              |
| `src/components/stockly/BatchDetailDrawer.tsx`             | Add link to production batch if `production_batch_id` is set                                |

---

## Coding Standards

- **All SALSA code tagged with `// @salsa`** (JS/TS) and `-- @salsa` (SQL). New files get header: `// @salsa - SALSA Compliance: <description>`
- **API routes:** Use `createServerSupabaseClient()` from `@/lib/supabase-server`. Return `{ success: true, data }` or `{ success: false, error }` pattern. In Next.js 16, `params` is a Promise: `const { id } = await params;`
- **RLS:** All new `stockly.` tables use `stockly.stockly_company_access(company_id)`
- **Multi-tenancy:** All tables have `company_id` and `site_id`
- **Site filtering:** `if (siteId && siteId !== 'all') query = query.eq('site_id', siteId)`
- **Migration pattern:** `DO $$ BEGIN ... END $$` for idempotent blocks. FK references to `stockly.` tables (NOT `public.` views). Public views with `security_invoker = true` + INSTEAD OF triggers.
- **Icons:** Import from `@/components/ui/icons` — check what's available before using (e.g. `ShieldCheck`, `Shield`, `ShieldAlert` exist but `ShieldX`, `ShieldQuestion` do NOT)
- **Allergens:** Use `allergenKeyToLabel()` from `@/lib/stockly/allergens.ts` for display. Store short keys internally (`gluten`, not `Cereals containing gluten`)
- **Build:** Must pass `npm run build -- --webpack` with 0 errors (warnings OK but fix if easy)
- **Module colours:** Planly module colour classes are `text-planly-dark dark:text-planly` (light theme uses dark variant, dark theme uses light variant)
- **Error handling:** Handle `42P01` (table not found) gracefully in client components — the tables may not exist yet for non-SALSA users

---

## Migration Gotchas (IMPORTANT)

1. **`public.suppliers`, `public.stock_batches`, `public.recipes` etc. are VIEWS, not tables.** Never `ALTER TABLE public.X` or `REFERENCES public.X(id)`. Always target `stockly.X`.
2. After creating tables + views, run `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new views.
3. When a view is recreated with `DROP VIEW ... CASCADE`, any dependent views/triggers are also dropped and must be recreated. Check for cascading dependencies.
4. Run migration with: `npx supabase db push --include-all`

---

## Verification Checklist

1. Migration applies cleanly: `npx supabase db push --include-all`
2. Build passes: `npm run build -- --webpack`
3. Can create a production batch from the UI, select a recipe, set a date
4. Can add input batches (raw materials consumed) — stock batch `quantity_remaining` decreases, `batch_movements` logged with `consumed_production`
5. Can record output (finished product) — new `stock_batches` record created with `production_batch_id` set
6. Can record CCP measurements
7. Can complete a production batch — allergens auto-aggregated from inputs
8. Production batch list page works with date/status filters
9. Planly sidebar shows "Production Batches" link
10. `BatchDetailDrawer` shows production batch link when relevant
11. Update `docs/salsa-progress.md` with Phase 3 file inventory and status

---

## Estimated Scope

- 1 migration file
- ~8 new files (API routes + components + page)
- ~5 modified files
- Est. 3–4 days
