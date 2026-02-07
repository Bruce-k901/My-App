# Stockly Module: Complete Workflow & Data Model Documentation

> **Purpose:** Map the complete Stockly journey from client onboarding through to GP analysis.
> **Last Updated:** 2026-02-02
> **Status:** Living document - update as implementation evolves

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
│  │  price_history                                                           │   │
│  │  └── Tracks price changes per variant                                   │   │
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
│  │ CONFIRM DELIVERY                                                         │   │
│  │                                                                          │   │
│  │ On confirmation, system:                                                 │   │
│  │                                                                          │   │
│  │ ✅ Updates ingredients_library for each matched line:                    │   │
│  │    • unit_cost = line_price / pack_size_in_base_units                   │   │
│  │    • pack_cost = line_price                                              │   │
│  │    • pack_size = extracted from description                              │   │
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
│  │ ⚠️ GAPS EXIST HERE                                                       │   │
│  │                                                                          │   │
│  │ Current behavior:                                                         │   │
│  │ • Upload invoice (same as phone order flow)                              │   │
│  │ • AI extracts line items                                                 │   │
│  │ • Matches to product_variants                                            │   │
│  │                                                                          │   │
│  │ ❌ GAP: Invoice NOT auto-linked to PO                                    │   │
│  │ ❌ GAP: No "receive against PO" option                                   │   │
│  │ ❌ GAP: Expected quantities not shown                                    │   │
│  │ ❌ GAP: Discrepancies not flagged                                        │   │
│  └──────┬──────────────────────────────────────────────────────────────────┘   │
│         │                                                                       │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ IDEAL FUTURE STATE (Not Yet Implemented)                                 │   │
│  │                                                                          │   │
│  │ 1. User uploads invoice                                                  │   │
│  │ 2. System offers: "Match to open PO?"                                    │   │
│  │    - Shows list of open POs for this supplier                           │   │
│  │    - Or auto-matches if only one open PO                                 │   │
│  │ 3. Side-by-side comparison:                                              │   │
│  │    ┌────────────────────┬────────────────────┬──────────────────┐        │   │
│  │    │ Item               │ Ordered            │ Invoiced         │        │   │
│  │    ├────────────────────┼────────────────────┼──────────────────┤        │   │
│  │    │ Flour 25kg         │ 4                  │ 4 ✓              │        │   │
│  │    │ Butter 5kg         │ 2                  │ 1 ⚠️ SHORT       │        │   │
│  │    │ Eggs (case)        │ 3                  │ 3 ✓              │        │   │
│  │    │ Milk (NEW)         │ -                  │ 2 ➕ ADDED       │        │   │
│  │    └────────────────────┴────────────────────┴──────────────────┘        │   │
│  │ 4. Handle discrepancies:                                                 │   │
│  │    - Short delivery: Create backorder or adjust                          │   │
│  │    - Extra items: Add to delivery, question why                          │   │
│  │    - Price changes: Flag for review                                      │   │
│  │ 5. Confirm → Update PO status → Update stock                            │   │
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
│  TRIGGER: Invoice Confirmed                                                     │
│  ──────────────────────────                                                    │
│                                                                                 │
│  delivery_line                                                                  │
│  ├── unit_price: £18.50                                                        │
│  ├── description: "Flour 25kg"                                                 │
│  └── product_variant_id: var-001                                               │
│         │                                                                       │
│         │ (1) Update variant price                                              │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ product_variants                                                         │   │
│  │ WHERE id = 'var-001'                                                     │   │
│  │ SET current_price = 18.50                                                │   │
│  │ SET price_per_base = 18.50 / 25000 = 0.00074                            │   │
│  │ SET price_updated_at = NOW()                                             │   │
│  │                                                                          │   │
│  │ → INSERT INTO price_history (old_price, new_price, source='invoice')    │   │
│  └──────────────────────────────────┬──────────────────────────────────────┘   │
│                                     │                                           │
│         │ (2) Find linked ingredient                                            │
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
│         │ (3) Trigger: Recipe cost recalculation                                │
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
│         │ (4) If recipe is a prep item (is_ingredient=true)                     │
│         │     Propagate cost to parent recipes                                  │
│         ▼                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Parent recipes using this prep item                                      │   │
│  │                                                                          │   │
│  │ Recursive update until no more parents                                   │   │
│  │ Uses: update_recipe_costs_and_propagate(recipe_id)                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Price Update Sources

| Source                     | Updates                                      | Trigger                | Frequency           |
| -------------------------- | -------------------------------------------- | ---------------------- | ------------------- |
| **Invoice confirmation**   | `ingredients_library.unit_cost`, `pack_cost` | User clicks "Confirm"  | Per delivery        |
| **Manual ingredient edit** | `ingredients_library.unit_cost`              | User edits ingredient  | Ad-hoc              |
| **Product variant edit**   | `product_variants.current_price`             | User edits variant     | Ad-hoc              |
| **Price list import**      | `product_variants.current_price`             | Future feature         | Periodic            |
| **Recipe recalculation**   | `recipes.total_cost`, `cost_per_portion`     | Ingredient cost change | Automatic (trigger) |

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
│ • current_cost = weighted average of all stock on hand                         │
│ • Formula: (old_qty × old_cost + new_qty × new_cost) / (old_qty + new_qty)    │
│ • More accurate for volatile prices                                            │
│ • Requires stock tracking (currently not updating stock on delivery!)         │
│                                                                                 │
│ 'fifo' (First In, First Out)                                                   │
│ ─────────────────────────────                                                  │
│ • Track cost per batch                                                         │
│ • Use oldest stock cost first                                                  │
│ • Complex, rarely needed for hospitality                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

NOTE: Current implementation effectively uses 'last_price' regardless of setting,
      because stock levels aren't updated on delivery confirmation.
```

---

## 6. Decision Trees

### 6.1 Invoice Line Processing Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               INVOICE LINE PROCESSING DECISION TREE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Invoice line extracted by AI                                                   │
│  e.g., "Flour T55 25kg" @ £18.50                                               │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Does line have supplier_code?                        │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     ▼                                     │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Search product_variants WHERE                        │                       │
│  │ supplier_id = X AND supplier_code = Y                │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ FOUND               │ NOT FOUND                           │
│                     ▼                     ▼                                     │
│            ┌────────────────┐   ┌─────────────────────────────────┐             │
│            │ AUTO_MATCHED   │   │ Fuzzy search product_variants   │             │
│            │ confidence=1.0 │   │ WHERE product_name ILIKE '%..%' │             │
│            └────────────────┘   └──────────┬──────────────────────┘             │
│                                            │                                    │
│                     ┌──────────────────────┼──────────────────────┐             │
│                     │ 1 MATCH              │ >1 MATCHES           │ 0 MATCHES   │
│                     ▼                      ▼                      ▼             │
│            ┌────────────────┐   ┌────────────────┐   ┌──────────────────┐       │
│            │ AUTO_MATCHED   │   │ AUTO_MATCHED   │   │ UNMATCHED        │       │
│            │ confidence=0.8 │   │ confidence=0.6 │   │ requires manual  │       │
│            │                │   │ requires review│   │ intervention     │       │
│            └────────────────┘   └────────────────┘   └────────┬─────────┘       │
│                                                               │                 │
│                                                               ▼                 │
│                                          ┌──────────────────────────────────┐   │
│                                          │ USER MANUAL MATCHING OPTIONS:    │   │
│                                          │                                   │   │
│                                          │ A) Search ingredients_library    │   │
│                                          │    → Link to existing ingredient │   │
│                                          │                                   │   │
│                                          │ B) Search stock_items            │   │
│                                          │    → Link to existing item       │   │
│                                          │    → Create product_variant      │   │
│                                          │                                   │   │
│                                          │ C) Create new                    │   │
│                                          │    → stock_item                  │   │
│                                          │    → product_variant             │   │
│                                          │    → (optionally) ingredient     │   │
│                                          └──────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 New Item Creation Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               NEW ITEM CREATION DECISION TREE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  User wants to create item from unmatched invoice line                          │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Is this a food ingredient used in recipes?           │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     ▼                                     │
│  ┌────────────────────────────┐   ┌────────────────────────────────────────┐   │
│  │ CREATE IN CHECKLY:         │   │ What type of item is it?               │   │
│  │                            │   │                                         │   │
│  │ 1. ingredients_library     │   │ • Cleaning chemical → chemicals_library│   │
│  │    - name, allergens       │   │ • Disposable → disposables_library     │   │
│  │    - unit_cost, pack_size  │   │ • Packaging → packaging_library        │   │
│  │                            │   │ • Equipment → separate system          │   │
│  └──────────┬─────────────────┘   └──────────┬─────────────────────────────┘   │
│             │                                 │                                 │
│             ▼                                 ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐      │
│  │ Do you want to track stock levels for this item?                     │      │
│  └──────────────────────┬─────────────────────┬─────────────────────────┘      │
│                         │ YES                 │ NO                              │
│                         ▼                     ▼                                 │
│  ┌────────────────────────────────┐   ┌────────────────────────────────┐       │
│  │ CREATE IN STOCKLY:             │   │ Library item only              │       │
│  │                                │   │ - No stock tracking            │       │
│  │ 2. stock_items                 │   │ - Costs still flow to recipes  │       │
│  │    - library_item_id → (1)     │   │ - Invoice updates unit_cost    │       │
│  │    - track_stock = true        │   │                                │       │
│  │    - par_level, reorder_qty    │   └────────────────────────────────┘       │
│  └──────────┬─────────────────────┘                                            │
│             │                                                                   │
│             ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐      │
│  │ CREATE SUPPLIER LINK:                                                 │      │
│  │                                                                       │      │
│  │ 3. product_variants                                                   │      │
│  │    - stock_item_id → (2)                                              │      │
│  │    - supplier_id → from delivery                                      │      │
│  │    - supplier_code → from invoice line                                │      │
│  │    - product_name → from invoice description                          │      │
│  │    - pack_size, conversion_factor                                     │      │
│  │    - current_price → from invoice unit_price                          │      │
│  │    - is_preferred = true (first variant)                              │      │
│  └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
│  RESULT: Full chain created                                                     │
│  ingredients_library ← stock_items ← product_variants ← delivery_line          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Delivery Confirmation Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               DELIVERY CONFIRMATION DECISION TREE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  User clicks "Confirm Delivery"                                                 │
│         │                                                                       │
│         ▼                                                                       │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Are all lines matched? (no 'unmatched' status)       │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     ▼                                     │
│             Continue              ┌────────────────────────────┐                │
│                │                  │ BLOCK CONFIRMATION         │                │
│                │                  │ "Please match all items    │                │
│                │                  │  before confirming"        │                │
│                │                  └────────────────────────────┘                │
│                ▼                                                                │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ FOR EACH LINE:                                       │                       │
│  │ Process acceptance (received/rejected quantities)    │                       │
│  └──────────────────┬───────────────────────────────────┘                       │
│                     │                                                           │
│                     ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Does line have a unit_price?                         │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     │                                     │
│  ┌────────────────────────────────────────┤                                     │
│  │ FIND INGREDIENT:                       │                                     │
│  │                                        │                                     │
│  │ Chain: product_variant                 │                                     │
│  │        → stock_item                    │                                     │
│  │        → library_item_id               │                                     │
│  │                                        │                                     │
│  │ OR Fuzzy: description                  │                                     │
│  │           → ingredients_library        │                                     │
│  └──────────────────┬─────────────────────┘                                     │
│                     │                                                           │
│                     ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Ingredient found?                                    │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     │                                     │
│  ┌────────────────────────────────────────┤                                     │
│  │ EXTRACT PACK SIZE:                     │                                     │
│  │                                        │                                     │
│  │ Regex: /(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/ │                                     │
│  │ OR: use ingredient's existing pack_size│                                     │
│  └──────────────────┬─────────────────────┘                                     │
│                     │                                                           │
│                     ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Pack size > 0?                                       │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     │                                     │
│  ┌────────────────────────────────────────┴─────────────┐                       │
│  │ UPDATE INGREDIENT COSTS:                             │                       │
│  │                                                      │ (Skip update)         │
│  │ unit_cost = unit_price / pack_size_base_units       │                       │
│  │ pack_cost = unit_price                               │                       │
│  │ pack_size = extracted pack size                      │                       │
│  └──────────────────┬───────────────────────────────────┘                       │
│                     │                                                           │
│                     ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ Any rejected quantities?                             │                       │
│  └──────────────────┬─────────────────────┬─────────────┘                       │
│                     │ YES                 │ NO                                  │
│                     ▼                     │                                     │
│  ┌────────────────────────────────────────┤                                     │
│  │ CREATE CREDIT NOTE REQUEST             │                                     │
│  │                                        │                                     │
│  │ - rejected items list                  │                                     │
│  │ - rejection reasons                    │                                     │
│  │ - amounts to claim                     │                                     │
│  └────────────────────────────────────────┤                                     │
│                     │                     │                                     │
│                     └──────────┬──────────┘                                     │
│                                ▼                                                │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ UPDATE DELIVERY STATUS:                              │                       │
│  │ status = 'confirmed'                                 │                       │
│  │ confirmed_by = current_user                          │                       │
│  │ confirmed_at = NOW()                                 │                       │
│  └──────────────────────────────────────────────────────┘                       │
│                                │                                                │
│                                ▼                                                │
│  ┌──────────────────────────────────────────────────────┐                       │
│  │ ❌ GAP: STOCK LEVELS NOT UPDATED!                    │                       │
│  │                                                      │                       │
│  │ Should do (but doesn't):                             │                       │
│  │ - stock_levels.quantity += qty_received              │                       │
│  │ - INSERT stock_movement (type: 'purchase')           │                       │
│  └──────────────────────────────────────────────────────┘                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Gap Analysis & Recommendations

### 7.1 Critical Gaps (Blocking Core Functionality)

| #   | Gap                                      | Impact                                                             | Current Workaround             | Recommendation                                                        |
| --- | ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------- |
| 1   | **Stock levels not updated on delivery** | Inventory never increases from purchases; stock tracking is broken | Manual stock adjustments       | **HIGH PRIORITY:** Add stock movement creation to `confirmDelivery()` |
| 2   | **No PO ↔ Invoice linking**              | Can't track what was ordered vs received                           | Treat all deliveries as ad-hoc | Add "Receive against PO" option in delivery review                    |
| 3   | **No expected vs received comparison**   | Short deliveries go unnoticed                                      | Manual checking                | Show side-by-side comparison when PO is linked                        |
| 4   | **No bulk import for migration**         | Migration clients require manual data entry                        | Direct database scripts        | Build import wizards for suppliers, ingredients, variants             |

### 7.2 Important Gaps (Degraded Experience)

| #   | Gap                                                | Impact                             | Current Workaround          | Recommendation                              |
| --- | -------------------------------------------------- | ---------------------------------- | --------------------------- | ------------------------------------------- |
| 5   | **No price_history population**                    | Can't track price trends           | Prices overwritten in-place | Insert into `price_history` on each update  |
| 6   | **No stock count UI**                              | Can't do inventory counts properly | Direct database edits       | Build dedicated stock count page            |
| 7   | **Ingredient matching uses rejection_notes field** | Hacky, data integrity risk         | Works but messy             | Create proper `matched_ingredient_id` field |
| 8   | **No discrepancy alerts**                          | Quality issues go unreported       | Manual review               | Add warnings for short/over deliveries      |

### 7.3 Nice-to-Have Gaps (Future Enhancements)

| #   | Gap                                  | Impact                            | Recommendation                             |
| --- | ------------------------------------ | --------------------------------- | ------------------------------------------ |
| 9   | Automatic PO status updates          | PO status stays as 'sent' forever | Update PO status based on delivery receipt |
| 10  | Return authorization workflow        | Rejections not formally tracked   | Add credit note tracking & resolution      |
| 11  | Supplier performance metrics         | No visibility on reliability      | Track on-time %, damage rates              |
| 12  | GRN (Goods Received Note) generation | No formal receipt documentation   | Generate printable GRN                     |
| 13  | Mobile-optimized delivery receipt    | Desktop-only currently            | Responsive design for warehouse            |
| 14  | Barcode scanning                     | Manual item entry                 | Integrate barcode scanner for receipt      |

### 7.4 Data Model Issues

| Issue                             | Current State                                              | Problem                         | Fix                                         |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| **Dual delivery tables**          | `stockly.deliveries` + `public.deliveries`                 | Confusion, potential data split | Consolidate to one (public seems active)    |
| **library_type hardcoded**        | Various places check `= 'ingredients_library'`             | Fragile if library types change | Use constants/enums                         |
| **No delivery ↔ PO line linkage** | `deliveries.purchase_order_id` exists but no line-level FK | Can't match individual items    | Add `delivery_lines.purchase_order_line_id` |

---

## 8. Implementation Priorities

### Phase 1: Fix Core Stock Flow (Highest Priority) ✅ IMPLEMENTED

**Implementation Date:** 2026-02-02

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: CORE STOCK FLOW ✅ COMPLETE                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Goal: Make stock levels accurate                                                │
│                                                                                 │
│ Tasks:                                                                          │
│ ✅ 1.1 Update confirmDelivery() to create stock_movements                       │
│       - movement_type: 'purchase'                                               │
│       - quantity: qty_received                                                  │
│       - unit_cost: line unit_price / conversion                                │
│                                                                                 │
│ ✅ 1.2 Update confirmDelivery() to update stock_levels                          │
│       - Upsert stock_levels for each received item                             │
│       - Handle site/storage area correctly                                      │
│                                                                                 │
│ ✅ 1.3 Handle weighted average costing                                           │
│       - If costing_method = 'weighted_avg'                                      │
│       - Calculate new avg cost on receipt                                       │
│                                                                                 │
│ ✅ 1.4 Add price_history insertions                                              │
│       - When product_variant.current_price changes                              │
│       - Track old/new price, source, date                                       │
│                                                                                 │
│ Validation:                                                                     │
│ ✓ Upload invoice → Confirm → Stock level increases                             │
│ ✓ stock_movements table has audit trail                                         │
│ ✓ price_history shows price changes                                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Implementation Details:**

- Created `update_stock_on_delivery_confirm()` PostgreSQL function
- Added RPC call in `confirmDelivery()` after delivery status update
- Function inserts directly into `stockly.stock_movements` and `stockly.stock_levels`
- Supports weighted average costing calculation
- Populates `stockly.price_history` when variant prices change
- Added INSTEAD OF triggers for public views (backward compatibility)

**Files Changed:**

- `supabase/migrations/20260202000000_add_stock_update_on_delivery_confirm.sql`
- `src/app/dashboard/stockly/deliveries/[id]/page.tsx`

### Phase 2: PO Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: PO INTEGRATION                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Goal: Connect orders to deliveries                                              │
│                                                                                 │
│ Tasks:                                                                          │
│ □ 2.1 Add "Receive against PO" option in delivery upload                       │
│       - Show open POs for selected supplier                                     │
│       - Pre-populate expected items from PO                                     │
│                                                                                 │
│ □ 2.2 Add delivery_lines.purchase_order_line_id                                │
│       - Link individual invoice lines to PO lines                              │
│                                                                                 │
│ □ 2.3 Build comparison UI                                                       │
│       - Side-by-side: Ordered vs Invoiced                                      │
│       - Highlight discrepancies (short, over, substituted)                     │
│                                                                                 │
│ □ 2.4 Auto-update PO status                                                     │
│       - partial_received: some lines fulfilled                                  │
│       - received: all lines fulfilled                                           │
│                                                                                 │
│ Validation:                                                                     │
│ ✓ Create PO → Upload invoice → See comparison                                  │
│ ✓ PO status updates automatically                                               │
│ ✓ Short deliveries highlighted                                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Migration Tools

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: MIGRATION TOOLS                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Goal: Enable easy client migration                                              │
│                                                                                 │
│ Tasks:                                                                          │
│ □ 3.1 Supplier import wizard                                                    │
│       - CSV upload with column mapping                                          │
│       - Validation & duplicate detection                                        │
│                                                                                 │
│ □ 3.2 Ingredient import wizard                                                  │
│       - CSV with name, category, allergens, units                              │
│       - Optional: cost, pack size                                               │
│                                                                                 │
│ □ 3.3 Product variant import                                                    │
│       - Link to suppliers and ingredients                                       │
│       - Import supplier codes, prices                                           │
│                                                                                 │
│ □ 3.4 Opening stock import                                                      │
│       - Quantities per item                                                     │
│       - As-of date for audit trail                                              │
│                                                                                 │
│ Validation:                                                                     │
│ ✓ Export from MarketMan → Import to Stockly                                    │
│ ✓ All data transfers correctly                                                  │
│ ✓ Stock levels initialized                                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Stock Count & Adjustments

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: STOCK COUNT                                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Goal: Accurate perpetual inventory                                              │
│                                                                                 │
│ Tasks:                                                                          │
│ □ 4.1 Stock count page                                                          │
│       - Select storage area                                                     │
│       - List items with expected quantities                                     │
│       - Enter actual counts                                                     │
│                                                                                 │
│ □ 4.2 Variance calculation                                                      │
│       - Expected (from movements)                                               │
│       - Actual (from count)                                                     │
│       - Variance value (qty × cost)                                            │
│                                                                                 │
│ □ 4.3 Adjustment posting                                                        │
│       - Create stock_movement (type: 'count_adjustment')                       │
│       - Update stock_levels                                                     │
│       - Audit trail                                                             │
│                                                                                 │
│ □ 4.4 Mobile-friendly count sheet                                               │
│       - Responsive design                                                       │
│       - Offline capability (optional)                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Key File Locations

| Component                 | File Path                                                  |
| ------------------------- | ---------------------------------------------------------- |
| Invoice upload modal      | `src/components/stockly/InvoiceUploadModal.tsx`            |
| Invoice AI processing     | `src/app/api/stockly/process-invoice/route.ts`             |
| Delivery review page      | `src/app/dashboard/stockly/deliveries/[id]/page.tsx`       |
| Deliveries list           | `src/app/dashboard/stockly/deliveries/page.tsx`            |
| Orders page               | `src/app/dashboard/stockly/orders/page.tsx`                |
| Ingredients library       | `src/app/dashboard/stockly/libraries/ingredients/page.tsx` |
| Suppliers page            | `src/app/dashboard/stockly/suppliers/page.tsx`             |
| Database types            | `src/lib/types/`                                           |
| Stockly schema migrations | `supabase/migrations/*stockly*`                            |

---

## Appendix B: Database Trigger Functions

| Function                            | Purpose                                                          | Location                    |
| ----------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| `calculate_recipe_total_cost`       | Sum ingredient costs for recipe                                  | Recipe triggers             |
| `update_recipe_costs_and_propagate` | Update recipe + propagate to parents                             | Recipe triggers             |
| `propagate_cost_to_parent_recipes`  | Find and update parent recipes                                   | Recipe triggers             |
| `update_usage_stats`                | Calculate avg daily usage                                        | Scheduled job               |
| `trg_ingredients_low_stock`         | Set low_stock_alert flag                                         | ingredients_library trigger |
| `update_stock_on_delivery_confirm`  | Create stock movements & update stock levels on delivery confirm | RPC function                |

---

## Appendix C: Phase 1 Implementation Summary

### What Was Implemented (2026-02-02)

**Problem Solved:**
When a delivery was confirmed, stock levels never increased. The system only updated ingredient costs but didn't create stock movements or update inventory quantities.

**Solution:**
Created a PostgreSQL function `update_stock_on_delivery_confirm()` that:

1. **Creates stock_movements records** for each delivery line
   - Records quantity received (in base units)
   - Records unit cost at time of purchase
   - Links to delivery line for audit trail
   - Uses movement_type = 'purchase'

2. **Updates stock_levels** with upsert logic
   - Increases quantity by amount received
   - Calculates weighted average cost (if costing_method = 'weighted_avg')
   - Updates total_value = quantity × avg_cost
   - Records last_movement_at timestamp

3. **Populates price_history** when prices change
   - Compares current_price to invoice price
   - Creates history record with old/new prices
   - Calculates change percentage
   - Updates product_variant.current_price

**How to Test:**

```sql
-- After confirming a delivery, check stock movements
SELECT * FROM stockly.stock_movements
WHERE ref_type = 'delivery_line'
ORDER BY recorded_at DESC
LIMIT 10;

-- Check stock levels
SELECT si.name, sl.quantity, sl.avg_cost, sl.total_value
FROM stockly.stock_levels sl
JOIN stockly.stock_items si ON sl.stock_item_id = si.id
WHERE sl.last_movement_at > NOW() - INTERVAL '1 day';

-- Check price history
SELECT * FROM stockly.price_history
ORDER BY recorded_at DESC
LIMIT 10;
```

---

_Document created: 2026-02-02_
_Phase 1 implemented: 2026-02-02_
_Next: Phase 2 - PO Integration_
