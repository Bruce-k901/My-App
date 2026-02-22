# Stockly Module: Complete Workflow & Data Model Documentation

> **Purpose:** Map the complete Stockly journey from client onboarding through to GP analysis.
> **Last Updated:** 2026-02-02 (Phase 4: PO Linking & Comparison)
> **Status:** Living document - update as implementation evolves

---

## Implementation Progress

### Completed Work (2026-02-02)

#### Phase 1: Purchase Order Fixes

- **PO Delete Functionality**: Fixed RLS policies and INSTEAD OF triggers for purchase order deletion
  - Created `20260202160000_add_po_lines_delete_trigger.sql` - DELETE triggers for views
  - Created `20260202170000_add_po_delete_policies.sql` - RLS DELETE policies with proper company scoping
  - Created `20260202180000_fix_po_delete_policies.sql` - Simplified DELETE policies

- **PO Viewing Fix**: Fixed viewing saved purchase orders
  - Issue: PostgREST couldn't detect FK relationships between `purchase_order_lines` view and `product_variants`
  - Solution: Separated nested queries - load lines first, then fetch variants separately and map them
  - Added dedicated "Ordered Items" section at top of PO detail page

#### Phase 2: Price Change Detection & Confirmation System

- **New Type**: `PriceChange` interface in `src/lib/types/stockly.ts`
- **New Component**: `PriceChangeReviewModal.tsx` for reviewing price changes before confirmation
  - Accept/reject individual price changes
  - Bulk accept/reject all
  - Significant change warnings (>10%)
  - Visual indicators for price increases (red) vs decreases (green)
  - Affected recipe previews

- **Updated Delivery Page**: `src/app/dashboard/stockly/deliveries/[id]/page.tsx`
  - `detectPriceChanges()` function comparing invoice prices to current ingredient costs
  - Modified `confirmDelivery()` to trigger price review modal when changes detected
  - `executeDeliveryConfirmation()` respects user's accept/reject decisions
  - Only accepted price changes update the ingredients library

- **New Migration**: `20260202190000_create_price_history_table.sql`
  - Creates `stockly.price_history` table for audit trail
  - Tracks old/new costs, change percentages, change sources
  - RLS policies using profiles table
  - Public view for API access

#### Delivery Review Page UI Fixes

- **Fixed "0" display bug**: Removed VAT breakdown display that was causing React to render `0` as text (JavaScript `0 && <Component>` returns `0`, which React renders)
- **Fixed "Unknown Item" display**: Added fallback chain that filters out "Unknown Item" strings and uses invoice description as final fallback
- **Added product_name to query**: Included `product_name` field in product_variants fetch for better display

#### Delivery View CRUD Triggers

- **`20260202200000_add_deliveries_update_trigger.sql`**: Added INSTEAD OF UPDATE/INSERT/DELETE triggers for `public.deliveries` view
- **`20260202200001_add_delivery_lines_triggers.sql`**: Added INSTEAD OF UPDATE/INSERT/DELETE triggers for `public.delivery_lines` view
- **`20260202200002_fix_deliveries_view.sql`**: Recreated deliveries view to ensure all columns exposed
- **`20260202200003_ensure_delivery_columns.sql`**: Added missing `delivery_note_number` column to stockly.deliveries table
- **`20260202200004_fix_price_history_schema.sql`**: Added columns needed by `update_stock_on_delivery_confirm` function

#### Phase 3: Purchase Order vs Delivery Comparison

- **New Feature**: PO comparison on delivery review page
  - When a delivery is linked to a PO via `purchase_order_id`, shows comparison analysis
  - Fetches PO lines alongside delivery data using `product_variant_id` matching

- **PO Banner**: Displays linked PO information
  - PO number, order date, expected delivery date
  - Count of items ordered

- **Variance Analysis Dashboard**: Shows delivery accuracy metrics
  - ✅ **Exact Match**: Items delivered in exact quantity ordered
  - 🔴 **Short Delivered**: Items where less was received than ordered
  - 🟠 **Over Delivered**: Items where more was received than ordered
  - 🟡 **Not on PO**: Items on invoice that weren't ordered (unexpected items)
  - 🟣 **Missing Items**: Items ordered but not on delivery (with names listed)

- **Table Columns** (when PO linked):
  - **PO Qty**: Quantity from purchase order (blue text)
  - **Delivered**: Quantity from invoice
  - **Variance**: Badge showing "short", "over", "exact", or "not on PO" with color coding

- **Graceful Fallback**: When no PO is linked (e.g., AI-scanned invoices), page works as before without comparison columns

- **Automatic PO Matching** (2026-02-02 Update):
  - When delivery loads, system automatically searches for matching POs based on:
    - Same supplier (required)
    - Expected delivery date proximity (±7 days = score boost)
    - Item overlap (product_variant_id matching)
  - **Match Scoring** (0-100 scale):
    - Date matching: up to 40 points (exact date = 40, within 1 day = 35, etc.)
    - Item overlap: up to 50 points (80%+ match = 50, 50%+ = 35, etc.)
    - Status bonus: 10 points for sent/confirmed POs
  - **UI at top of page**: Shows "Matching Purchase Orders Found" with:
    - Top 5 matches sorted by score
    - "Best Match" badge on highest scoring PO
    - Match reason explanation (date proximity, item overlap %)
    - One-click "Link This Order" button
  - User can dismiss suggestions or browse all orders manually

- **Manual PO Linking** (fallback):
  - "Not the right order? Browse all orders" link
  - Modal shows all active POs from supplier
  - "Unlink" button to remove association
  - State: `showPOLinkModal`, `availablePOs`, `suggestedPOs`, `autoMatchingPO`
  - Functions: `findMatchingPOs()`, `fetchAvailablePOs()`, `linkDeliveryToPO()`, `unlinkDeliveryFromPO()`

#### Stock Update Function Fixes

- **`20260202210000_add_all_delivery_columns.sql`**: Added missing columns to `stockly.deliveries`:
  - `ai_extraction`, `document_urls`, `tax`, `purchase_order_id`

- **`20260202220000_recreate_delivery_lines_view.sql`**: Recreated delivery_lines view after CASCADE drop

- **`20260202230000_fix_delivery_lines_schema.sql`**: Added missing columns to `stockly.delivery_lines`:
  - `stock_item_id`, `line_number`, `description`, `supplier_code`
  - `quantity_ordered`, `quantity_received`, `quantity_rejected`
  - `unit`, `match_status`, `match_confidence`
  - `rejection_reason`, `rejection_notes`, `rejection_photo_url`
  - `created_at`, `updated_at`, `suggested_stock_item`, `qty_base_units`

- **`20260202232000_ensure_stock_update_function.sql`**: Fixed RPC function:
  - Removed reference to non-existent `costing_method` column

- **`20260202234000_fix_stock_update_quantity_field.sql`**: Fixed RPC function:
  - Changed `v_line.quantity` to `v_line.quantity_received` / `v_line.quantity_ordered`
  - The `stockly.delivery_lines` table uses separate ordered/received columns

#### Debugging Findings

**Issue 1: Stock Update Failure**

- **Root Cause**: The `price_history` table was missing columns that the `update_stock_on_delivery_confirm` function expected:
  - `product_variant_id`
  - `old_price`, `new_price`
  - `old_price_per_base`, `new_price_per_base`
  - `source`, `source_ref`
  - `recorded_at`, `recorded_by`
- **Fix Applied**: Added all missing columns to support both ingredient-level and variant-level price tracking

**Issue 2: No Price Change Modal**

- **Root Cause**: For **first-time purchases**, ingredients don't have existing `unit_cost` values. The `detectPriceChanges()` function only shows the modal when there's an actual price CHANGE (old price vs new price)
- **This is correct behavior**:
  - Modal WILL appear: When purchasing the same ingredient again at a different price
  - Modal WON'T appear: First-time purchases (no existing price to compare), or prices exactly match current costs

**Issue 3: Stock Update RPC Errors**

- **Error 1**: `column si.costing_method does not exist`
  - Removed reference to non-existent column, defaulting to weighted average costing
- **Error 2**: `record "v_line" has no field "quantity"`
  - The `delivery_lines` table uses `quantity_ordered`/`quantity_received`, not `quantity`
  - Updated function to use correct column names

**Issue 4: QuickDeliveryPanel Bugs**

- Pre-existing bugs in `QuickDeliveryPanel.tsx` fixed:
  - `vat_amount` → `vat_total`
  - `total_amount` → `total`
  - `delivery_items` table → `delivery_lines` table
  - `total_price` → `line_total`
  - `reference_type`/`reference_id` → `ref_type`/`ref_id` for stock_movements
  - Added `to_site_id` for proper movement tracking

---

## Table of Contents

1. [Data Model Overview](#1-data-model-overview)
2. [Entity Relationships Deep Dive](#2-entity-relationships-deep-dive)
3. [Onboarding Workflows](#3-onboarding-workflows)
4. [Operational Workflows](#4-operational-workflows)
5. [Price Cascade Rules](#5-price-cascade-rules)
6. [Decision Trees](#6-decision-trees)
7. [Gap Analysis & Recommendations](#7-gap-analysis--recommendations)
8. [Implementation Priorities](#8-implementation-priorities)

---

## 1. Data Model Overview

### Core Entity Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           STOCKLY DATA MODEL                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 1: MASTER DATA (Checkly Integration)                              │   │
│  │                                                                          │   │
│  │  ingredients_library (public schema)                                     │   │
│  │  ├── Canonical ingredient definitions                                    │   │
│  │  ├── Allergen data, yield percentages                                    │   │
│  │  ├── unit_cost, pack_cost, pack_size ← Updated by invoices              │   │
│  │  └── Used by: Recipes, Compliance checks                                 │   │
│  │                                                                          │   │
│  │  Other libraries: chemicals, ppe, drinks, disposables, packaging...     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ library_item_id + library_type                   │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 2: INVENTORY MANAGEMENT (Stockly Schema)                          │   │
│  │                                                                          │   │
│  │  stock_items                                                             │   │
│  │  ├── Inventory tracking entity                                           │   │
│  │  ├── current_cost, costing_method (weighted_avg|fifo|last_price)        │   │
│  │  ├── par_level, reorder_qty, track_stock                                │   │
│  │  └── Links to library via library_item_id                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ stock_item_id (1:N)                              │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 3: SUPPLIER PRODUCTS (Stockly Schema)                             │   │
│  │                                                                          │   │
│  │  product_variants                                                        │   │
│  │  ├── Supplier-specific product definition                               │   │
│  │  ├── supplier_code, product_name, pack_size                             │   │
│  │  ├── current_price ← Purchase price from supplier                       │   │
│  │  ├── conversion_factor ← How many base units per pack                   │   │
│  │  └── is_preferred, min_order_qty                                        │   │
│  │                                                                          │   │
│  │  price_history ✅ NEW                                                    │   │
│  │  └── Tracks price changes per ingredient with audit trail              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ supplier_id                                      │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ LAYER 4: SUPPLIERS (Stockly Schema)                                     │   │
│  │                                                                          │   │
│  │  suppliers                                                               │   │
│  │  ├── Supplier master data                                                │   │
│  │  ├── ordering_method (app|whatsapp|email|phone|portal)                  │   │
│  │  ├── delivery_days[], lead_time_days                                    │   │
│  │  └── payment_terms, minimum_order_value                                 │   │
│  │                                                                          │   │
│  │  supplier_delivery_areas                                                 │   │
│  │  └── Per-area delivery schedules and reliability                        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Relationship Cardinality Summary

| From                  | To                   | Cardinality    | Description                                          |
| --------------------- | -------------------- | -------------- | ---------------------------------------------------- |
| `ingredients_library` | `stock_items`        | 1:1 (optional) | One library item can have one stock tracking record  |
| `stock_items`         | `product_variants`   | 1:N            | One item can be sourced from multiple suppliers      |
| `suppliers`           | `product_variants`   | 1:N            | One supplier provides many products                  |
| `product_variants`    | `price_history`      | 1:N            | Track all price changes per variant                  |
| `stock_items`         | `stock_levels`       | 1:N            | One item tracked across multiple sites/storage areas |
| `recipes`             | `recipe_ingredients` | 1:N            | One recipe has many ingredients                      |
| `recipe_ingredients`  | `stock_items`        | N:1            | Many recipe ingredients reference one stock item     |

---

## 2. Entity Relationships Deep Dive

### 2.1 The Ingredient → Stock Item → Variant Chain

```
QUESTION: "I buy flour from Shipton's. How is this represented?"

ANSWER:

┌──────────────────────────────────────────────────────────────────────────────┐
│ ingredients_library                                                          │
│ id: "ing-001"                                                                │
│ ingredient_name: "Strong Bread Flour"                                        │
│ supplier: "Shipton Mill" (legacy text field - informational only)           │
│ unit_cost: 0.00074 (£ per gram) ← Updated from latest invoice               │
│ pack_cost: 18.50 (£ per pack)                                               │
│ pack_size: 25000 (grams)                                                    │
│ allergens: ["gluten"]                                                       │
│ yield_percent: 100                                                          │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           │ stock_items.library_item_id = "ing-001"
                           │ stock_items.library_type = "ingredients_library"
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ stock_items                                                                  │
│ id: "stk-001"                                                                │
│ name: "Strong Bread Flour"                                                   │
│ library_item_id: "ing-001"                                                   │
│ library_type: "ingredients_library"                                          │
│ current_cost: 0.00074 (mirrors ingredients_library.unit_cost)               │
│ track_stock: true                                                           │
│ par_level: 100000 (grams = 4 bags)                                          │
│ reorder_qty: 50000 (grams = 2 bags)                                         │
│ costing_method: "last_price"                                                │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           │ product_variants.stock_item_id = "stk-001"
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ product_variants (Shipton's offering)                                        │
│ id: "var-001"                                                                │
│ stock_item_id: "stk-001"                                                     │
│ supplier_id: "sup-shipton"                                                   │
│ supplier_code: "ORG-WHT-25K"                                                 │
│ product_name: "Organic Strong White Flour 25kg"                              │
│ pack_size: 25                                                                │
│ pack_unit_id: "kg"                                                           │
│ conversion_factor: 25000 (25kg = 25000g base units)                         │
│ current_price: 18.50                                                         │
│ price_per_base: 0.00074 (18.50 / 25000)                                     │
│ is_preferred: true                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ product_variants (Alternative - Matthews)                                    │
│ id: "var-002"                                                                │
│ stock_item_id: "stk-001" ← SAME stock item!                                 │
│ supplier_id: "sup-matthews"                                                  │
│ supplier_code: "FLR-STR-16"                                                  │
│ product_name: "Strong Bread Flour 16kg"                                      │
│ pack_size: 16                                                                │
│ pack_unit_id: "kg"                                                           │
│ conversion_factor: 16000                                                     │
│ current_price: 14.00                                                         │
│ price_per_base: 0.000875 (more expensive per unit!)                         │
│ is_preferred: false                                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Who Owns What?

| Data Point                    | Owner Table                      | Updated By                          | Used By                          |
| ----------------------------- | -------------------------------- | ----------------------------------- | -------------------------------- |
| **Supplier's price per pack** | `product_variants.current_price` | Invoice confirmation, manual edit   | Purchase orders, cost comparison |
| **Cost per base unit**        | `ingredients_library.unit_cost`  | Invoice confirmation (calculated)   | Recipe costing, GP analysis      |
| **Pack cost**                 | `ingredients_library.pack_cost`  | Invoice confirmation                | Display, ordering suggestions    |
| **Pack size**                 | `ingredients_library.pack_size`  | Invoice confirmation, manual        | Unit cost calculation            |
| **Recipe cost**               | `recipes.total_cost`             | Trigger on ingredient cost change   | Menu pricing, GP analysis        |
| **Menu price**                | `recipes.sell_price`             | Manual entry                        | GP calculation                   |
| **Stock quantity**            | `stock_levels.quantity`          | Stock counts, (NOT deliveries yet!) | Reorder alerts, valuation        |
| **Stock value**               | `stock_levels.value`             | Calculated (qty × avg_cost)         | Financial reporting              |

---

## 3. Onboarding Workflows

### 3.1 Scenario A: Migration from Existing Stock System

**Profile:** Client has stock management (e.g., MarketMan, Procure Wizard, spreadsheets) and wants to migrate.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO A: MIGRATION FROM EXISTING SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 1: DATA EXTRACTION (Client-side / Us)                                   │
│  ──────────────────────────────────────────                                    │
│  1. Export from old system:                                                    │
│     • Ingredients/stock items (name, SKU, unit, category)                      │
│     • Suppliers (name, contact, payment terms)                                 │
│     • Product catalog per supplier (codes, prices, pack sizes)                 │
│     • Current stock levels (optional but valuable)                             │
│     • Recipe data (if available)                                               │
│                                                                                 │
│  2. Format: CSV/Excel with standard column mapping                             │
│                                                                                 │
│  PHASE 2: DATA IMPORT (Gap - needs implementation)                             │
│  ──────────────────────────────────────────────                                │
│  Current State: ❌ NO BULK IMPORT UI EXISTS                                    │
│                                                                                 │
│  Required:                                                                      │
│  • Supplier import wizard                                                       │
│  • Ingredients import with validation                                           │
│  • Product variant import with supplier mapping                                 │
│  • Stock level initialization                                                   │
│                                                                                 │
│  PHASE 3: VALIDATION & RECONCILIATION                                          │
│  ──────────────────────────────────────────                                    │
│  1. Review imported data in Stockly UI                                         │
│  2. Fix duplicates, merge similar items                                        │
│  3. Verify supplier linkages                                                   │
│  4. Test ordering flow                                                         │
│                                                                                 │
│  PHASE 4: GO-LIVE                                                              │
│  ─────────────────                                                             │
│  1. Set stock count date                                                       │
│  2. Perform opening stock count                                                │
│  3. Begin invoice uploads                                                      │
│  4. Parallel run (optional): use both systems for 1 week                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

CURRENT GAPS FOR SCENARIO A:
┌────────────────────────────────────────────────────────────────────────────────┐
│ Gap                              │ Priority │ Workaround                       │
├──────────────────────────────────┼──────────┼──────────────────────────────────┤
│ No supplier bulk import          │ HIGH     │ Manual entry or DB scripts       │
│ No ingredient bulk import        │ HIGH     │ Manual entry or DB scripts       │
│ No product variant import        │ HIGH     │ Build via invoice uploads        │
│ No stock level initialization    │ MEDIUM   │ Stock count after setup          │
│ No recipe import                 │ LOW      │ Manual recipe entry              │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Scenario B: No Existing System (Excel User)

**Profile:** Client uses spreadsheets/paper. This is the current "happy path."

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO B: NO EXISTING SYSTEM (EXCEL USER)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  WEEK 1: SUPPLIER SETUP                                                        │
│  ─────────────────────────                                                     │
│  ✅ SUPPORTED                                                                   │
│                                                                                 │
│  1. Navigate to: Stockly → Suppliers → Add Supplier                            │
│  2. For each supplier, enter:                                                   │
│     • Name, contact details                                                     │
│     • Ordering method (phone, WhatsApp, email, portal)                         │
│     • Delivery days (Mon-Fri checkboxes)                                       │
│     • Lead time, minimum order value                                           │
│  3. Repeat for all suppliers (typically 5-15)                                  │
│                                                                                 │
│  WEEK 1-2: BUILD INGREDIENT LIBRARY                                            │
│  ───────────────────────────────────                                           │
│  ✅ SUPPORTED (but can be built via invoices)                                  │
│                                                                                 │
│  Option A: Pre-populate ingredients                                             │
│  1. Navigate to: Stockly → Libraries → Ingredients                             │
│  2. Add core ingredients with:                                                  │
│     • Name, category, allergens                                                 │
│     • Preferred supplier (text field)                                          │
│     • Pack size, unit cost (estimates OK)                                      │
│                                                                                 │
│  Option B: Build via invoices (recommended)                                     │
│  1. Skip manual ingredient entry                                                │
│  2. Upload first invoices → AI extracts items                                  │
│  3. Create ingredients from unmatched lines                                    │
│  4. Library builds organically with accurate prices                            │
│                                                                                 │
│  WEEK 2-3: FIRST INVOICE UPLOADS                                               │
│  ───────────────────────────────                                               │
│  ✅ SUPPORTED                                                                   │
│                                                                                 │
│  1. Collect last week's invoices from all suppliers                            │
│  2. For each invoice:                                                           │
│     a. Stockly → Deliveries → Upload Invoice                                   │
│     b. Select supplier                                                          │
│     c. Upload PDF/image                                                         │
│     d. AI extracts line items                                                   │
│     e. Match unrecognized items (creates product_variants)                     │
│     f. Confirm delivery                                                         │
│  3. Prices now populated in ingredients_library                                │
│                                                                                 │
│  WEEK 3+: ONGOING OPERATIONS                                                   │
│  ───────────────────────────                                                   │
│  1. Daily invoice uploads → prices stay current                                 │
│  2. Build recipes with costed ingredients                                       │
│  3. GP analysis available                                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

EFFORT ESTIMATE:
┌────────────────────────────────────────────────────────────────────────────────┐
│ Task                             │ Manual Effort      │ Notes                  │
├──────────────────────────────────┼────────────────────┼────────────────────────┤
│ Add 10 suppliers                 │ ~30 mins           │ One-time               │
│ Upload 20 invoices (first batch) │ ~60-90 mins        │ AI does heavy lifting  │
│ Match 100 line items             │ ~60 mins           │ Gets faster over time  │
│ Weekly maintenance               │ ~15-30 mins/week   │ Just invoice uploads   │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Scenario C: Brand New Business

**Profile:** New restaurant/kitchen, no existing suppliers, building from scratch.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ SCENARIO C: BRAND NEW BUSINESS                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PRE-LAUNCH: INITIAL SETUP                                                     │
│  ──────────────────────────                                                    │
│                                                                                 │
│  1. Add anticipated suppliers (even before first order)                        │
│     ✅ SUPPORTED                                                                │
│                                                                                 │
│  2. Create initial ingredient library from menu planning                        │
│     ✅ SUPPORTED                                                                │
│     - Can estimate pack sizes/costs                                            │
│     - Will be corrected by first invoices                                      │
│                                                                                 │
│  3. Build recipes with estimated costs                                          │
│     ✅ SUPPORTED                                                                │
│     - GP will be provisional until real costs flow in                          │
│                                                                                 │
│  LAUNCH: FIRST ORDERS & DELIVERIES                                             │
│  ──────────────────────────────────                                            │
│                                                                                 │
│  Ordering Flow (typically phone/WhatsApp initially):                            │
│  1. Call supplier, place order verbally                                         │
│  2. Receive delivery with invoice                                               │
│  3. Upload invoice to Stockly                                                   │
│  4. Match items (first time = create new product_variants)                     │
│  5. Confirm → prices update                                                     │
│                                                                                 │
│  After 2-3 weeks:                                                               │
│  - Most items matched automatically                                             │
│  - Prices accurate                                                              │
│  - Can start using Stockly for ordering (if desired)                           │
│                                                                                 │
│  GROWTH: TRANSITION TO STOCKLY ORDERING                                        │
│  ──────────────────────────────────────                                        │
│  ⚠️ PARTIALLY SUPPORTED                                                        │
│                                                                                 │
│  1. Create POs in Stockly ✅                                                    │
│  2. Send to supplier (email/WhatsApp) ✅                                        │
│  3. Receive delivery → Upload invoice ✅                                        │
│  4. ⚠️ GAP: No PO ↔ Invoice matching                                           │
│  5. ⚠️ GAP: No expected vs received comparison                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Operational Workflows

### 4.1 Workflow: Order via Phone → Invoice Upload

**Context:** Client orders via phone/WhatsApp (no PO in system), then uploads invoice.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: PHONE ORDER → INVOICE UPLOAD                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐                                                                │
│  │ PHONE CALL  │ Customer calls supplier, places order verbally                │
│  │ (Outside    │ "Hi, I need 4 bags of flour, 2 cases of butter..."            │
│  │  Stockly)   │                                                                │
│  └──────┬──────┘                                                                │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────┐                                                                │
│  │ DELIVERY    │ Supplier delivers goods with invoice/delivery note            │
│  │ ARRIVES     │ Kitchen staff receives, checks goods                          │
│  └──────┬──────┘                                                                │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ INVOICE UPLOAD                                                          │   │
│  │ Path: Stockly → Deliveries → Upload Invoice                             │   │
│  │                                                                          │   │
│  │ 1. Select supplier from dropdown                                         │   │
│  │ 2. Upload invoice image/PDF                                              │   │
│  │ 3. AI extracts: invoice #, date, line items, totals                     │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ AUTO-MATCHING                                                            │   │
│  │                                                                          │   │
│  │ For each line item, system attempts:                                     │   │
│  │                                                                          │   │
│  │ 1. Exact supplier_code match in product_variants                        │   │
│  │    → Found: confidence = 1.0, status = 'auto_matched'                   │   │
│  │                                                                          │   │
│  │ 2. Fuzzy product_name match                                              │   │
│  │    → 1 match: confidence = 0.8, status = 'auto_matched'                 │   │
│  │    → Multiple: confidence = 0.6, status = 'auto_matched' (review flag)  │   │
│  │                                                                          │   │
│  │ 3. No match found                                                        │   │
│  │    → status = 'unmatched', requires manual intervention                 │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ DELIVERY REVIEW PAGE                                                     │   │
│  │ Path: Stockly → Deliveries → [Click delivery]                           │   │
│  │                                                                          │   │
│  │ User actions per line:                                                   │   │
│  │ ┌──────────────────┬───────────────────────────────────────────────────┐│   │
│  │ │ Line Status      │ User Action                                       ││   │
│  │ ├──────────────────┼───────────────────────────────────────────────────┤│   │
│  │ │ auto_matched     │ Review, accept or change match                    ││   │
│  │ │ (high conf)      │                                                   ││   │
│  │ ├──────────────────┼───────────────────────────────────────────────────┤│   │
│  │ │ auto_matched     │ Verify match is correct (may need correction)     ││   │
│  │ │ (low conf)       │                                                   ││   │
│  │ ├──────────────────┼───────────────────────────────────────────────────┤│   │
│  │ │ unmatched        │ Option A: Search & select existing ingredient     ││   │
│  │ │                  │ Option B: Create new stock item + variant         ││   │
│  │ └──────────────────┴───────────────────────────────────────────────────┘│   │
│  │                                                                          │   │
│  │ Acceptance per line:                                                     │   │
│  │ • Accept All: qty_received = qty, qty_rejected = 0                      │   │
│  │ • Partial: split with rejection reason                                   │   │
│  │ • Reject All: qty_received = 0, qty_rejected = qty                      │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ PRICE CHANGE REVIEW ✅ NEW (Phase 2)                                     │   │
│  │                                                                          │   │
│  │ Before final confirmation, system detects price changes:                 │   │
│  │                                                                          │   │
│  │ ┌────────────────────────────────────────────────────────────────────┐  │   │
│  │ │ Price Changes Detected                                             │  │   │
│  │ │                                                                    │  │   │
│  │ │ ☑ Strong Bread Flour 25kg                                         │  │   │
│  │ │   Current: £0.00074/g (£18.50/pack)                               │  │   │
│  │ │   Invoice: £0.00076/g (£19.00/pack)  ↑ +2.7%                      │  │   │
│  │ │                                                                    │  │   │
│  │ │ ⚠ Butter Unsalted 5kg                 >10% CHANGE                 │  │   │
│  │ │   Current: £0.0032/g (£16.00/pack)                                │  │   │
│  │ │   Invoice: £0.0036/g (£18.00/pack)   ↑ +12.5%                     │  │   │
│  │ │                                                                    │  │   │
│  │ │ [Accept All]  [Reject All]  [Confirm Delivery]                    │  │   │
│  │ └────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                          │   │
│  │ User can:                                                                │   │
│  │ • Toggle individual price changes (accept/reject)                       │   │
│  │ • Bulk accept/reject all                                                │   │
│  │ • See significant change warnings (>10%)                                │   │
│  │ • View affected recipes (future enhancement)                            │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ CONFIRM DELIVERY                                                         │   │
│  │                                                                          │   │
│  │ On confirmation, system:                                                 │   │
│  │                                                                          │   │
│  │ ✅ For ACCEPTED price changes only:                                      │   │
│  │    • Updates ingredients_library.unit_cost                              │   │
│  │    • Updates ingredients_library.pack_cost                              │   │
│  │    • Updates ingredients_library.pack_size                              │   │
│  │    • Logs to price_history with change_reason='user_approved'           │   │
│  │                                                                          │   │
│  │ ✅ For REJECTED price changes:                                           │   │
│  │    • Keeps existing price in ingredients_library                        │   │
│  │    • Logs to price_history with change_reason='user_rejected'           │   │
│  │                                                                          │   │
│  │ ✅ Creates credit_note_requests for rejected items                       │   │
│  │                                                                          │   │
│  │ ❌ Does NOT update stock_levels (GAP!)                                   │   │
│  │ ❌ Does NOT create stock_movements (GAP!)                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Workflow: Stockly Order → Invoice Upload

**Context:** Client creates PO in Stockly, sends to supplier, then uploads invoice.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: STOCKLY ORDER → INVOICE UPLOAD                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: CREATE PURCHASE ORDER                                            │   │
│  │ Path: Stockly → Orders → New Order                                       │   │
│  │                                                                          │   │
│  │ ✅ FULLY SUPPORTED                                                        │   │
│  │                                                                          │   │
│  │ • Select supplier                                                         │   │
│  │ • System calculates expected delivery date based on:                     │   │
│  │   - Current day/time vs order cutoff                                     │   │
│  │   - Supplier's delivery days                                             │   │
│  │   - Lead time                                                            │   │
│  │ • Add items from supplier's product_variants                             │   │
│  │ • Set quantities                                                          │   │
│  │ • System shows min order warning if below threshold                      │   │
│  │ • Save as draft or send immediately                                      │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: SEND ORDER TO SUPPLIER                                           │   │
│  │                                                                          │   │
│  │ ✅ SUPPORTED                                                              │   │
│  │                                                                          │   │
│  │ Methods:                                                                  │   │
│  │ • Email: Generate PDF, send via email                                    │   │
│  │ • WhatsApp: Format as message, open WhatsApp                             │   │
│  │ • Manual: Print/screenshot, call supplier                                │   │
│  │                                                                          │   │
│  │ PO status changes: draft → sent                                          │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: RECEIVE DELIVERY + UPLOAD INVOICE                                │   │
│  │                                                                          │   │
│  │ ✅ IMPLEMENTED (Phase 4 - Automatic PO Matching)                         │   │
│  │                                                                          │   │
│  │ Current behavior:                                                         │   │
│  │ • Upload invoice (same as phone order flow)                              │   │
│  │ • AI extracts line items                                                 │   │
│  │ • Matches to product_variants                                            │   │
│  │ • System AUTOMATICALLY finds matching POs based on:                      │   │
│  │   - Same supplier                                                        │   │
│  │   - Delivery date vs expected delivery date                              │   │
│  │   - Item overlap (product_variant_id matching)                          │   │
│  │ • Shows "Matching Purchase Orders Found" with best matches              │   │
│  │ • User clicks "Link This Order" to associate                            │   │
│  │ • Once linked, PO Qty and Variance columns appear                       │   │
│  │ • Variance analysis dashboard shows exact/short/over/missing counts     │   │
│  │                                                                          │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ IMPLEMENTED (Phase 4 - Automatic PO Matching & Comparison)            │   │
│  │                                                                          │   │
│  │ 1. User uploads invoice                                                  │   │
│  │ 2. System AUTOMATICALLY searches for matching POs based on:             │   │
│  │    - Same supplier                                                       │   │
│  │    - Expected delivery date proximity                                    │   │
│  │    - Item overlap (product_variant_id matching)                         │   │
│  │ 3. Shows "Matching Purchase Orders Found" banner with top matches:      │   │
│  │    ┌────────────────────────────────────────────────────────────────┐   │   │
│  │    │ PO-2026-0045  [Best Match]  Score: 85                          │   │   │
│  │    │ Ordered: 30 Jan • Expected: 02 Feb • 8 items • £245.50         │   │   │
│  │    │ Exact date match • 6/8 items match (75%)    [Link This Order]  │   │   │
│  │    └────────────────────────────────────────────────────────────────┘   │   │
│  │ 4. User clicks "Link This Order" to associate                          │   │
│  │ 5. After linking, shows "Order vs Delivery Comparison" dashboard:      │   │
│  │    ┌────────────────────┬────────────────────┬──────────────────┐        │   │
│  │    │ Item               │ PO Qty             │ Delivered        │        │   │
│  │    ├────────────────────┼────────────────────┼──────────────────┤        │   │
│  │    │ Flour 25kg         │ 4                  │ 4 ✓ exact        │        │   │
│  │    │ Butter 5kg         │ 2                  │ 1 🔴 -1 short    │        │   │
│  │    │ Eggs (case)        │ 3                  │ 3 ✓ exact        │        │   │
│  │    │ Milk (NEW)         │ —                  │ 2 (not on PO)    │        │   │
│  │    └────────────────────┴────────────────────┴──────────────────┘        │   │
│  │ 6. Variance summary shows: Exact/Short/Over/Not on PO/Missing counts   │   │
│  │ 7. Price changes flagged for review (Phase 2)                           │   │
│  │ 8. Can dismiss suggestions or browse all orders manually               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Workflow: Stock Count → Adjustment

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: STOCK COUNT                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ⚠️ CURRENT STATE: BASIC IMPLEMENTATION                                        │
│                                                                                 │
│  What exists:                                                                   │
│  • stock_levels table with quantity per site/storage area                      │
│  • stock_movements table for audit trail                                        │
│  • Manual adjustment capability (via direct edit)                              │
│                                                                                 │
│  What's missing:                                                                │
│  • Dedicated stock count UI                                                     │
│  • Count sheet generation                                                       │
│  • Variance reporting                                                           │
│  • Cycle count scheduling                                                       │
│                                                                                 │
│  IDEAL FUTURE FLOW:                                                             │
│  ─────────────────────                                                         │
│  1. Generate count sheet for storage area                                       │
│  2. Staff counts physical stock                                                 │
│  3. Enter counts in app (mobile-friendly)                                       │
│  4. System calculates variances:                                                │
│     • Expected (from last count + movements)                                    │
│     • Actual (from count)                                                       │
│     • Variance (with value impact)                                              │
│  5. Review & approve variances                                                  │
│  6. Post adjustments to stock_movements                                         │
│  7. Update stock_levels                                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Price Cascade Rules

### 5.1 Price Update Trigger Points

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PRICE CASCADE FLOWCHART                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TRIGGER: Invoice Confirmed (with user-approved price changes)                  │
│  ──────────────────────────                                                    │
│                                                                                 │
│  delivery_line                                                                  │
│  ├── unit_price: £18.50                                                        │
│  ├── description: "Flour 25kg"                                                 │
│  └── product_variant_id: var-001                                               │
│         │                                                                       │
│         │ (1) Check if price change was accepted by user                        │
│         │     (Phase 2 implementation)                                          │
│         │                                                                       │
│         │ If ACCEPTED:                                                          │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ price_history ✅ NEW                                                     │   │
│  │ INSERT record with:                                                      │   │
│  │   old_unit_cost, new_unit_cost                                          │   │
│  │   old_pack_cost, new_pack_cost                                          │   │
│  │   change_percent                                                         │   │
│  │   change_source = 'invoice'                                             │   │
│  │   change_reason = 'user_approved'                                       │   │
│  │   reference_type = 'delivery'                                           │   │
│  │   reference_id = delivery.id                                            │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│         │ (2) Update variant price                                              │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ product_variants                                                         │   │
│  │ WHERE id = 'var-001'                                                     │   │
│  │ SET current_price = 18.50                                                │   │
│  │ SET price_per_base = 18.50 / 25000 = 0.00074                            │   │
│  │ SET price_updated_at = NOW()                                             │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│         │ (3) Find linked ingredient                                            │
│         │     Via: variant → stock_item → library_item_id                       │
│         │     OR:  Fuzzy match on description → ingredients_library            │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ingredients_library                                                      │   │
│  │ WHERE id = 'ing-001' (found via chain or fuzzy match)                   │   │
│  │                                                                          │   │
│  │ SET unit_cost = 18.50 / 25000 = 0.00074 £/gram                          │   │
│  │ SET pack_cost = 18.50                                                    │   │
│  │ SET pack_size = 25000 (extracted from "25kg")                           │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│         │ (4) Trigger: Recipe cost recalculation                                │
│         │     (Via database trigger or scheduled job)                           │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ recipes (any recipe using this ingredient)                               │   │
│  │                                                                          │   │
│  │ For recipe "Croissant" using 500g flour:                                 │   │
│  │                                                                          │   │
│  │ recipe_ingredients:                                                      │   │
│  │   ingredient: flour, qty: 500g, yield_factor: 1.0                       │   │
│  │   line_cost = 500 × 0.00074 = £0.37                                     │   │
│  │                                                                          │   │
│  │ Recipe totals (sum all ingredients):                                     │   │
│  │   total_cost = £0.37 + £0.25 + ... = £1.50                              │   │
│  │   cost_per_portion = £1.50 / 12 = £0.125                                │   │
│  │                                                                          │   │
│  │ GP calculation (if sell_price set):                                      │   │
│  │   sell_price = £2.50                                                     │   │
│  │   actual_gp_percent = (2.50 - 0.125) / 2.50 = 95%                       │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│         │ (5) If recipe is a prep item (is_ingredient=true)                     │
│         │     Propagate cost to parent recipes                                  │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Parent recipes using this prep item                                      │   │
│  │                                                                          │   │
│  │ Recursive update until no more parents                                   │   │
│  │ Uses: update_recipe_costs_and_propagate(recipe_id)                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  If REJECTED by user:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ price_history                                                            │   │
│  │ INSERT record with:                                                      │   │
│  │   change_reason = 'user_rejected'                                       │   │
│  │   (old and new costs logged but NOT applied)                            │   │
│  │                                                                          │   │
│  │ ingredients_library → NO CHANGE                                          │   │
│  │ product_variants → NO CHANGE                                             │   │
│  │ recipes → NO CHANGE                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Price Update Sources

| Source                     | Updates                                      | Trigger                                | Frequency           |
| -------------------------- | -------------------------------------------- | -------------------------------------- | ------------------- |
| **Invoice confirmation**   | `ingredients_library.unit_cost`, `pack_cost` | User clicks "Confirm" + accepts change | Per delivery        |
| **Manual ingredient edit** | `ingredients_library.unit_cost`              | User edits ingredient                  | Ad-hoc              |
| **Product variant edit**   | `product_variants.current_price`             | User edits variant                     | Ad-hoc              |
| **Price list import**      | `product_variants.current_price`             | Future feature                         | Periodic            |
| **Recipe recalculation**   | `recipes.total_cost`, `cost_per_portion`     | Ingredient cost change                 | Automatic (trigger) |

### 5.3 Costing Methods

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ stock_items.costing_method options:                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 'last_price' (DEFAULT)                                                         │
│ ───────────────────────                                                        │
│ • current_cost = most recent purchase price                                    │
│ • Simplest, most common for hospitality                                        │
│ • Invoice £18.50 → cost = £18.50/pack                                          │
│                                                                                 │
│ 'weighted_avg'                                                                 │
│ ─────────────────                                                              │
│ • current_cost = weighted average of all stock                                 │
│ • More accurate for high-value, slow-moving items                              │
│ • Requires stock level tracking (GAP: not fully implemented)                  │
│ • Formula: (existing_value + new_value) / (existing_qty + new_qty)            │
│                                                                                 │
│ 'fifo' (First In, First Out)                                                   │
│ ─────────────────────────────                                                  │
│ • Cost based on oldest stock first                                             │
│ • Complex to implement, rarely used in hospitality                             │
│ • Requires batch/lot tracking (NOT implemented)                                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Decision Trees

### 6.1 Decision Tree: Unmatched Invoice Line

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ DECISION TREE: UNMATCHED INVOICE LINE                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Invoice line extracted: "ORGANIC FLOUR 25KG - £18.50"                         │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Does supplier_code exist in product_variants for this supplier?          │  │
│  └───────────┬────────────────────────────────────────────┬─────────────────┘  │
│              │ YES                                        │ NO                  │
│              ▼                                            ▼                     │
│     ┌────────────────────┐               ┌────────────────────────────────────┐│
│     │ Auto-match to      │               │ Fuzzy search product_variants      ││
│     │ existing variant   │               │ by product_name                     ││
│     │ confidence = 1.0   │               └───────────┬──────────┬─────────────┘│
│     └────────────────────┘                           │ FOUND    │ NOT FOUND    │
│                                                      ▼          ▼              │
│                                           ┌──────────────┐  ┌─────────────────┐│
│                                           │ Suggest match│  │ Search          ││
│                                           │ for user     │  │ ingredients_    ││
│                                           │ confirmation │  │ library by name ││
│                                           │ conf = 0.6-  │  └────┬────────────┘│
│                                           │ 0.9          │       │             │
│                                           └──────────────┘       ▼             │
│                                                       ┌──────────────────────┐ │
│                                                       │ Found similar        │ │
│                                                       │ ingredient?          │ │
│                                                       └──────┬───────┬───────┘ │
│                                                              │ YES   │ NO      │
│                                                              ▼       ▼         │
│                                               ┌──────────────────┐ ┌─────────┐ │
│                                               │ "Link to existing│ │ "Create │ │
│                                               │  ingredient?"    │ │  new    │ │
│                                               │                  │ │  item?" │ │
│                                               │ • Creates stock_ │ │         │ │
│                                               │   item if needed │ │ Creates:│ │
│                                               │ • Creates product│ │ • ingred│ │
│                                               │   _variant       │ │ • stock │ │
│                                               └──────────────────┘ │ • varian│ │
│                                                                    └─────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Decision Tree: Price Change Detected

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ DECISION TREE: PRICE CHANGE DETECTED ✅ IMPLEMENTED (Phase 2)                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Invoice price for flour: £19.00                                                │
│  Current library price:   £18.50                                                │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Calculate change percentage                                               │  │
│  │ (£19.00 - £18.50) / £18.50 = +2.7%                                       │  │
│  └───────────┬──────────────────────────────────────────────────────────────┘  │
│              │                                                                  │
│              ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Is change > 10%?                                                          │  │
│  └───────────┬────────────────────────────────────────────┬─────────────────┘  │
│              │ NO                                         │ YES                 │
│              ▼                                            ▼                     │
│     ┌────────────────────┐               ┌────────────────────────────────────┐│
│     │ Regular price      │               │ SIGNIFICANT CHANGE WARNING         ││
│     │ change indicator   │               │                                    ││
│     │ (green/red arrow)  │               │ • Amber warning banner             ││
│     │                    │               │ • ">10%" badge on item             ││
│     │ Default: accepted  │               │ • Suggestion to verify invoice     ││
│     └────────────────────┘               │                                    ││
│                                          │ Default: still accepted            ││
│                                          └────────────────────────────────────┘│
│              │                                            │                     │
│              └─────────────────┬──────────────────────────┘                     │
│                                ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Show in PriceChangeReviewModal                                            │  │
│  │                                                                           │  │
│  │ User options per item:                                                    │  │
│  │ • ☑ Accept (default) → Update ingredient_library on confirm              │  │
│  │ • ☐ Reject → Keep old price, log rejection to price_history              │  │
│  │                                                                           │  │
│  │ Bulk options:                                                             │  │
│  │ • [Accept All] - Accept all price changes                                 │  │
│  │ • [Reject All] - Reject all price changes                                 │  │
│  └───────────┬──────────────────────────────────────────────────────────────┘  │
│              │                                                                  │
│              ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ On Confirm Delivery:                                                      │  │
│  │                                                                           │  │
│  │ For each ACCEPTED change:                                                 │  │
│  │   • Update ingredients_library.unit_cost                                  │  │
│  │   • Update ingredients_library.pack_cost                                  │  │
│  │   • Insert price_history (change_reason='user_approved')                  │  │
│  │   • Trigger recipe cost recalculation                                     │  │
│  │                                                                           │  │
│  │ For each REJECTED change:                                                 │  │
│  │   • Keep old price in ingredients_library                                 │  │
│  │   • Insert price_history (change_reason='user_rejected')                  │  │
│  │   • No recipe recalculation                                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Gap Analysis & Recommendations

### 7.1 Current State Summary

| Feature Area              | Status      | Notes                                      |
| ------------------------- | ----------- | ------------------------------------------ |
| **Supplier management**   | ✅ Complete | CRUD, delivery schedules, ordering methods |
| **Ingredient library**    | ✅ Complete | With allergens, yield factors, pricing     |
| **Product variants**      | ✅ Complete | Multi-supplier support, preferred flags    |
| **Invoice upload & OCR**  | ✅ Complete | AI extraction, line item parsing           |
| **Auto-matching**         | ✅ Partial  | Works but fuzzy matching could improve     |
| **Price cascade**         | ✅ Complete | Ingredient → Recipe propagation working    |
| **Price change review**   | ✅ Complete | Phase 2 implementation done                |
| **Price history audit**   | ✅ Complete | New table with full audit trail            |
| **Purchase orders**       | ✅ Complete | Create, view, delete working               |
| **PO ↔ Invoice matching** | ✅ Complete | Manual linking + variance analysis         |
| **Stock level tracking**  | ⚠️ Basic    | Table exists, no automated updates         |
| **Stock counts**          | ❌ Gap      | No dedicated UI                            |
| **Recipe costing**        | ✅ Complete | Full multi-level support                   |
| **GP analysis**           | ✅ Complete | Dashboard exists                           |
| **Bulk import**           | ❌ Gap      | No UI for mass data import                 |

### 7.2 Priority Gaps

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRIORITY GAPS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PRIORITY 1: MUST HAVE FOR PRODUCTION                                          │
│  ─────────────────────────────────────                                         │
│                                                                                 │
│  1. ✅ Price Change Confirmation (DONE - Phase 2)                               │
│     • User reviews price changes before confirmation                            │
│     • Can accept/reject individual changes                                      │
│     • Audit trail in price_history table                                        │
│                                                                                 │
│  2. Stock Level Updates from Deliveries                                         │
│     Problem: Confirming delivery doesn't update stock                          │
│     Impact: Stock levels always stale                                          │
│     Solution: On confirm, add movement type='delivery_receipt'                 │
│                                                                                 │
│  3. Credit Note Workflow                                                        │
│     Problem: Can mark items rejected, no follow-through                        │
│     Impact: Money leakage, no visibility on outstanding credits                │
│     Solution: Credit note dashboard, status tracking, alerts                   │
│                                                                                 │
│  PRIORITY 2: HIGH VALUE FOR USER EXPERIENCE                                    │
│  ─────────────────────────────────────────                                     │
│                                                                                 │
│  4. ✅ PO to Invoice Matching (DONE - Phase 4)                                  │
│     • Manual linking of invoices to POs via modal                              │
│     • Variance analysis dashboard (exact/short/over/missing)                   │
│     • PO Qty and Variance columns in delivery review                           │
│                                                                                 │
│  5. Stock Count UI                                                              │
│     Problem: No way to perform stock counts in app                             │
│     Impact: Counts done externally, no variance tracking                       │
│     Solution: Mobile-friendly count entry, variance reports                    │
│                                                                                 │
│  6. Improved Auto-Matching                                                      │
│     Problem: Fuzzy matching misses common variations                           │
│     Impact: Manual matching burden on users                                    │
│     Solution: ML-based matching, learning from corrections                     │
│                                                                                 │
│  PRIORITY 3: NICE TO HAVE                                                       │
│  ─────────────────────────                                                     │
│                                                                                 │
│  7. Bulk Import Wizards                                                         │
│     For: Large-scale onboarding                                                │
│                                                                                 │
│  8. Price List Import                                                           │
│     For: Annual supplier price updates                                         │
│                                                                                 │
│  9. Wastage Tracking                                                            │
│     For: Complete cost picture                                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Priorities

### Phase 1: PO Fixes ✅ COMPLETE

- [x] Fix PO delete functionality (RLS policies, triggers)
- [x] Fix PO viewing (ordered items display)

### Phase 2: Price Change Review ✅ COMPLETE

- [x] Detect price changes on delivery confirmation
- [x] PriceChangeReviewModal component
- [x] Accept/reject individual changes
- [x] Significant change warnings (>10%)
- [x] price_history audit table
- [x] Only update prices for accepted changes

### Phase 3: Stock Level Integration (Next)

- [ ] Update stock_levels on delivery confirmation
- [ ] Create stock_movements records
- [ ] Stock valuation reports

### Phase 4: PO ↔ Invoice Matching ✅ COMPLETE

- [x] **Automatic PO matching** based on supplier + date + items
- [x] Match scoring system (date proximity, item overlap, status)
- [x] "Matching Purchase Orders Found" UI with best matches
- [x] Link invoices to open POs (manual linking fallback)
- [x] Expected vs received comparison (variance analysis dashboard)
- [x] Variance handling (short/over/exact/not-on-PO indicators)
- [x] Missing items detection (PO items not in delivery)

### Phase 5: Stock Count UI

- [ ] Count sheet generation
- [ ] Mobile-friendly count entry
- [ ] Variance reporting
- [ ] Adjustment posting

---

## Appendix: Key Tables Reference

### price_history (New - Phase 2)

```sql
CREATE TABLE stockly.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL,

  -- Price values
  old_unit_cost NUMERIC,
  new_unit_cost NUMERIC,
  old_pack_cost NUMERIC,
  new_pack_cost NUMERIC,

  -- Change metadata
  change_percent NUMERIC(10,2),
  change_source TEXT NOT NULL CHECK (change_source IN ('invoice', 'manual', 'import')),
  change_reason TEXT CHECK (change_reason IN ('user_approved', 'user_rejected', 'auto_update')),

  -- Reference to source document
  reference_type TEXT CHECK (reference_type IN ('delivery', 'manual_edit', 'import')),
  reference_id UUID,

  -- Audit fields
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW(),

  notes TEXT
);
```

### PriceChange Interface (TypeScript)

```typescript
export interface PriceChange {
  deliveryLineId: string;
  ingredientId: string;
  ingredientName: string;

  // Current state
  currentUnitCost: number;
  currentPackCost: number;
  currentPackSize: number;

  // Invoice state
  invoiceUnitPrice: number;
  invoicePackSize: number;
  invoiceUnitCost: number;

  // Change metrics
  unitCostChange: number;
  unitCostChangePercent: number;
  packCostChange: number;

  // Flags
  isSignificantChange: boolean; // > 10%
  isPriceIncrease: boolean;

  // User decision
  accepted: boolean;

  // Optional impact preview
  affectedRecipes?: {
    recipeId: string;
    recipeName: string;
    currentCost: number;
    newCost: number;
  }[];
}
```

---

_Document maintained as part of Stockly development. Update as implementation evolves._
