# Planly Module - Complete Documentation

**Version:** 3.2 - February 2026
**Status:** Production with Opsly Production Planning Extension
**Last Updated:** 2026-02-04 (DailyWorksheet with production timeline alignment)

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Architecture & Data Model](#2-architecture--data-model)
3. [Features by Category](#3-features-by-category)
4. [API Reference](#4-api-reference)
5. [Production Planning (Opsly)](#5-production-planning-opsly)
6. [Integration Points](#6-integration-points)
7. [Settings & Configuration](#7-settings--configuration)
8. [Setup Guide](#8-setup-guide)
9. [UI Components](#9-ui-components)
   - [9.1 Daily Worksheet (Production Plan)](#91-daily-worksheet-production-plan)
   - [9.2 Packing Plan Grid](#92-packing-plan-grid)
   - [9.3 Packing Plan Header](#93-packing-plan-header)
   - [9.4 Date Handling](#94-date-handling)

---

## 1. Module Overview

### Purpose

Planly is a **production planning and order management system** designed for food manufacturing businesses (bakeries, CPUs, sandwich makers, etc.). It manages the complete order-to-delivery workflow with intelligent production scheduling.

### Core Capabilities

| Capability              | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Order Management**    | Capture, track, and manage customer orders with multi-day entry                     |
| **Production Planning** | Calculate ingredient requirements, batch sizes, sheet counts, and equipment layouts |
| **Customer Management** | Maintain customer database with portal access and pricing                           |
| **Delivery Logistics**  | Generate delivery notes, schedules, and packing plans                               |
| **Reporting**           | Monthly sales reports with gross/net/credits breakdown                              |

### Module Routes

All Planly routes are under `/dashboard/planly/`:

| Route                | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `/`                  | Main dashboard (Production Plan daily worksheet)          |
| `/order-book`        | Packing Plan - Customer × product matrix by delivery date |
| `/orders/new`        | Quick entry grid for bulk order creation                  |
| `/tray-packing`      | Tray packing management                                   |
| `/delivery-notes`    | Print-ready delivery notes                                |
| `/delivery-schedule` | Weekly delivery drops calendar                            |
| `/monthly-sales`     | Sales reporting by customer                               |
| `/customers`         | Customer CRUD with portal management                      |
| `/products`          | Product configuration                                     |
| `/pricing`           | Customer-specific pricing grid                            |
| `/settings/*`        | Production configuration settings                         |
| `/setup`             | Assisted setup wizard                                     |

---

## 2. Architecture & Data Model

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLANLY DATA MODEL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐    │
│  │    Customer     │────▶│      Order      │────▶│    Order Line      │    │
│  └─────────────────┘     └─────────────────┘     └────────────────────┘    │
│        │                        │                        │                  │
│        ▼                        ▼                        ▼                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────────┐    │
│  │   Destination   │     │ Delivery Issue  │     │      Product       │    │
│  │     Group       │     └─────────────────┘     └────────────────────┘    │
│  └─────────────────┘            │                        │                  │
│                                 ▼                        │                  │
│                        ┌─────────────────┐               │                  │
│                        │  Credit Note    │               │                  │
│                        └─────────────────┘               │                  │
│                                                          │                  │
│  PRODUCTION PLANNING ────────────────────────────────────┼────────────────  │
│                                                          │                  │
│  ┌─────────────────┐     ┌─────────────────┐            │                  │
│  │   Processing    │◀────│     Product     │◀───────────┘                  │
│  │     Group       │     │  (production)   │                               │
│  └─────────────────┘     └─────────────────┘                               │
│        │                        │                                          │
│        ▼                        ▼                                          │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ Stockly Recipe  │     │   Bake Group    │                               │
│  │ (base prep)     │     └─────────────────┘                               │
│  └─────────────────┘            │                                          │
│        │                        ▼                                          │
│        │                 ┌─────────────────┐                               │
│        │                 │ Equipment Type  │                               │
│        │                 └─────────────────┘                               │
│        ▼                                                                   │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ Process Template│────▶│ Process Stage   │                               │
│  └─────────────────┘     └─────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Tables

#### Order Management

| Table                    | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `planly_customers`       | Customer master data with portal settings         |
| `planly_orders`          | Order headers with delivery date and status       |
| `planly_order_lines`     | Order line items with quantity and price snapshot |
| `planly_delivery_issues` | Issues reported against deliveries                |
| `planly_credit_notes`    | Credit notes for returns/issues                   |

#### Product Configuration

| Table                            | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `planly_products`                | Product config linking to Stockly, with production settings |
| `planly_product_list_prices`     | Default prices with effective dates                         |
| `planly_customer_product_prices` | Customer-specific price overrides                           |
| `planly_categories`              | Product categories for grouping                             |

#### Production Planning

| Table                              | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `planly_processing_groups`         | Groups products by base prep recipe and batch parameters |
| `planly_equipment_types`           | Physical equipment definitions (trays, racks)            |
| `planly_bake_groups`               | Products that bake together (same temp/time)             |
| `planly_destination_groups`        | Delivery groupings with deadlines                        |
| `planly_process_templates`         | Multi-day production workflows                           |
| `planly_process_stages`            | Individual stages within templates                       |
| `planly_production_plan_overrides` | Manual extra quantities (R&D, staff meals)               |

#### Settings & Configuration

| Table                    | Purpose                            |
| ------------------------ | ---------------------------------- |
| `planly_cutoff_settings` | Order cutoff rules per site        |
| `planly_site_settings`   | Site-specific Planly configuration |
| `planly_calendar_events` | Auto-generated calendar events     |
| `planly_notifications`   | System notifications               |

---

## 3. Features by Category

### 3.1 Order Management

#### Quick Entry Grid

- **Route:** `/dashboard/planly/orders/new`
- **Purpose:** Rapid bulk order entry for a week at a time
- **Features:**
  - 7-day grid (products as rows, days as columns)
  - Copy last week / copy down / copy across / clear all
  - Live row/column/grand totals
  - Bulk save entire week

#### Order Book

- **Route:** `/dashboard/planly/order-book`
- **Purpose:** View all orders for a delivery date, grouped by customer
- **Features:**
  - Filter by delivery date
  - View locked/confirmed status
  - Quick navigation to order details

### 3.2 Packing & Delivery

#### Packing Plan

- **Route:** `/dashboard/planly/order-book` (renamed from packing-plan)
- **Purpose:** Customer × Product matrix for packing teams
- **Features:**
  - **Fixed column widths** - Product column at 200px, customer columns at 80px each
  - **Day of week display** - Shows "Mon, 08/02/2026" format
  - **Date picker** - Click calendar icon to open native picker
  - Transposable grid (flip rows/columns)
  - Print-optimized layout (A4 landscape)
  - Bake group color coding with emoji icons
  - Products grouped by bake group with collapsible sections
  - Row/column totals with grand total

#### Delivery Notes

- **Route:** `/dashboard/planly/delivery-notes`
- **Purpose:** Print-ready delivery documentation
- **Features:**
  - Per-customer delivery notes
  - Print layout optimized for drivers

#### Delivery Schedule

- **Route:** `/dashboard/planly/delivery-schedule`
- **Purpose:** Weekly calendar view of all drops
- **Features:**
  - Customer drops by day of week
  - Frozen-only customer indicators

### 3.3 Customer Management

#### Customer List

- **Route:** `/dashboard/planly/customers`
- **Features:**
  - Full CRUD with search and filtering
  - Bulk CSV upload
  - Archive/restore functionality

#### Customer Portal

- **Features:**
  - Self-serve ordering for customers
  - Email invitation system
  - Multiple portal users per customer
  - Order history and placement

### 3.4 Product Management

#### Products

- **Route:** `/dashboard/planly/products`
- **Features:**
  - Link to Stockly products/ingredients
  - Production configuration (processing group, equipment, bake group)
  - **Prep method classification:** `laminated`, `frozen`, `fresh`, `par_baked`
  - Active/paused/archived status

#### Pricing

- **Route:** `/dashboard/planly/pricing`
- **Features:**
  - List prices (default for all customers)
  - Customer-specific overrides
  - Effective date ranges

### 3.5 Reporting

#### Monthly Sales

- **Route:** `/dashboard/planly/monthly-sales`
- **Features:**
  - Sales by customer for selected month
  - Gross total, credits, net total
  - Product-level breakdown

---

## 4. API Reference

### Order APIs

| Endpoint                  | Method             | Purpose                     |
| ------------------------- | ------------------ | --------------------------- |
| `/api/planly/orders`      | GET, POST          | List/create orders          |
| `/api/planly/orders/[id]` | GET, PATCH, DELETE | Single order operations     |
| `/api/planly/orders/book` | GET                | Order book by delivery date |

### Customer APIs

| Endpoint                                   | Method             | Purpose                    |
| ------------------------------------------ | ------------------ | -------------------------- |
| `/api/planly/customers`                    | GET, POST          | List/create customers      |
| `/api/planly/customers/[id]`               | GET, PATCH, DELETE | Single customer operations |
| `/api/planly/customers/[id]/prices`        | GET, POST          | Customer pricing           |
| `/api/planly/customers/[id]/portal-invite` | POST               | Send portal invitation     |

### Product APIs

| Endpoint                           | Method             | Purpose                   |
| ---------------------------------- | ------------------ | ------------------------- |
| `/api/planly/products`             | GET, POST          | List/create products      |
| `/api/planly/products/[id]`        | GET, PATCH, DELETE | Single product operations |
| `/api/planly/products/[id]/prices` | GET, POST          | Product list prices       |

### Production Planning APIs

| Endpoint                                       | Method             | Purpose                                              |
| ---------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `/api/planly/processing-groups`                | GET, POST          | List/create processing groups                        |
| `/api/planly/processing-groups/[id]`           | GET, PATCH, DELETE | Single group operations                              |
| `/api/planly/equipment-types`                  | GET, POST          | List/create equipment types                          |
| `/api/planly/equipment-types/[id]`             | GET, PATCH, DELETE | Single type operations                               |
| `/api/planly/production-plan/mix-sheet`        | GET                | Calculate ingredient requirements with sheet counts  |
| `/api/planly/production-plan/tray-layout`      | GET                | Calculate equipment layout with sequential numbering |
| `/api/planly/production-plan/batch-production` | GET                | Get batch production groups                          |
| `/api/planly/production-plan/overrides`        | GET, POST, DELETE  | Manage extra quantities                              |

### Settings APIs

| Endpoint                         | Method    | Purpose                            |
| -------------------------------- | --------- | ---------------------------------- |
| `/api/planly/process-templates`  | GET, POST | List/create process templates      |
| `/api/planly/bake-groups`        | GET, POST | List/create bake groups            |
| `/api/planly/destination-groups` | GET, POST | List/create destination groups     |
| `/api/planly/cutoff-rules`       | GET, POST | Manage cutoff settings             |
| `/api/planly/setup-status`       | GET       | Get setup wizard completion status |

### Reporting APIs

| Endpoint                        | Method | Purpose                  |
| ------------------------------- | ------ | ------------------------ |
| `/api/planly/packing-plan`      | GET    | Get packing plan data    |
| `/api/planly/delivery-notes`    | GET    | Get delivery notes data  |
| `/api/planly/delivery-schedule` | GET    | Get delivery schedule    |
| `/api/planly/monthly-sales`     | GET    | Get monthly sales report |

---

## 5. Production Planning (Opsly)

### 5.1 Calculation Model

The production planning system uses a **batch-based rounding model** that works for any CPU:

```
Orders → Processing Groups → Batch Rounding → Recipe Scaling → Ingredient List
                                    ↓
                              Sheet Count Calculation (for laminated doughs)
```

#### The Flow

1. **Count Units:** Sum all order quantities per processing group
2. **Calculate Batches:** Divide by `units_per_batch`
3. **Round Up:** Always round to whole batches (leftovers reused)
4. **Scale Recipe:** Multiply batch count by `batch_size_kg` to get total base prep weight
5. **Get Ingredients:** Scale the base prep recipe by total kg
6. **Calculate Sheets:** For laminated doughs: `sheets_needed = total_kg / sheet_yield_kg`

#### Worked Example

| Step | Action                      | Value       | Formula                   | Result      |
| ---- | --------------------------- | ----------- | ------------------------- | ----------- |
| 1    | Count Croissant group units | 44          | Sum all orders            | 44 units    |
| 2    | Calculate batches needed    | 44 ÷ 20     | units ÷ units_per_batch   | 2.2         |
| 3    | Round UP to whole batches   | ceil(2.2)   | Always round up           | 3 batches   |
| 4    | Total weight                | 3 × 2.0     | batches × batch_size_kg   | 6.0 kg      |
| 5    | Scale recipe                | 6.0 × ratio | Per-kg ingredients × 6.0  | Scaled list |
| 6    | Calculate sheets            | 6.0 ÷ 2.0   | total_kg ÷ sheet_yield_kg | 3 sheets    |

### 5.2 Processing Groups (Dough & Prep)

Processing groups are the core concept linking products to production:

```typescript
interface ProcessingGroup {
  id: string;
  name: string; // "Croissants", "Buns & Swirls"
  base_prep_recipe_id: string; // Stockly recipe for base dough/batter
  batch_size_kg: number; // Weight of one batch/sheet (e.g., 2.0)
  units_per_batch: number; // Products from one batch (e.g., 20)
  sheet_yield_kg?: number; // NEW: Weight per laminated sheet (for sheet count calc)
  lamination_method?: string; // NEW: "Single fold", "Double fold", etc.
  process_template_id?: string; // Multi-day workflow
  sop_id?: string; // Processing instructions
  leftover_handling?: "preferment" | "waste" | "staff_meals" | "next_batch";
}
```

**Key Distinction:**

- **Processing Groups (Dough & Prep):** What gets **mixed/prepared** together (same base prep + same batch parameters)
- **Bake Groups (Oven & Trays):** What gets **baked** together (same temperature and timing)

A product can be in "Croissants" processing group but "Pastries 180°C" bake group.

### 5.3 Prep Method Classification

Products can be classified by their preparation method:

```typescript
type PrepMethod = "laminated" | "frozen" | "fresh" | "par_baked";
```

| Prep Method | Description                                   | Example Products            |
| ----------- | --------------------------------------------- | --------------------------- |
| `laminated` | Laminated dough products (croissants, danish) | Croissant, Pain au Chocolat |
| `frozen`    | Made and frozen ahead                         | Cookie Dough Pucks          |
| `fresh`     | Made and baked same day                       | Fresh Bread Rolls           |
| `par_baked` | Partially baked, finished later               | Par-baked Baguettes         |

### 5.4 Mix Sheet API Response

```json
{
  "delivery_date": "2026-11-24",
  "mix_day": "2026-11-22",
  "order_summary": {
    "confirmed_orders": 12,
    "pending_orders": 3,
    "pending_note": "3 pending orders not included in calculations"
  },
  "mix_sheets": [
    {
      "recipe_name": "Viennoiserie Dough",
      "recipe_id": "uuid-abc",
      "total_kg": 28.0,
      "total_batches": 14,
      "total_sheets": 14,
      "yield_unit_warning": null,
      "processing_groups": [
        {
          "group_name": "Croissants",
          "total_units": 44,
          "batches_rounded": 3,
          "total_kg": 6.0,
          "sheets_needed": 3,
          "sheet_yield_kg": 2.0,
          "lamination_method": "Single fold",
          "leftover_units": 16,
          "leftover_note": "16 units worth of excess — use as preferment",
          "products": [{ "name": "Croissant", "quantity": 44, "grams_each": 100 }]
        }
      ],
      "base_prep_ingredients": [
        { "name": "Flour", "quantity": 14560, "unit": "g" },
        { "name": "Sugar", "quantity": 1750, "unit": "g" }
      ],
      "finishing_ingredients": [
        {
          "name": "Almond cream",
          "quantity": 360,
          "unit": "g",
          "for_products": "12 × Almond Croissant"
        }
      ],
      "division_instructions": "Divide into 14 × 2kg balls. 3 balls for Croissant lamination, 11 balls for Buns & Swirls lamination."
    }
  ],
  "sheet_summary": {
    "total_sheets": 14,
    "by_recipe": [
      {
        "recipe_name": "Viennoiserie Dough",
        "recipe_id": "uuid-abc",
        "total_sheets": 14,
        "total_kg": 28.0,
        "groups": [
          { "name": "Croissants", "sheets": 3, "kg": 6.0, "lamination": "Single fold" },
          { "name": "Buns & Swirls", "sheets": 11, "kg": 22.0, "lamination": "Double fold" }
        ]
      }
    ]
  }
}
```

### 5.5 Tray Layout Algorithm

The tray layout assigns products to equipment with **sequential numbering across destination groups**:

1. **Destination Group First:** Each destination group processes in order of dispatch time
2. **Sequential Numbering:** Tray numbers continue across all destination groups (Tray 1, 2, 3... not resetting per group)
3. **Bake Group Priority:** Within destination, process bake groups by priority
4. **Product Display Order:** Within bake group, fill products by display_order
5. **Equipment Filling:** Multiple products can share equipment within same bake group
6. **New Equipment on Group Change:** New bake group always starts on new equipment

```
Destination: Wholesale (dispatch 6:00)
├── Bake Group: Pastries 180°C (priority 1)
│   ├── Tray 1: Croissant ×18
│   ├── Tray 2: Croissant ×8, Pain au Choc ×10
│   └── Tray 3: Pain au Choc ×12
├── Bake Group: Cookies 170°C (priority 2)
│   ├── Tray 4: Triple Choc ×18
│   └── Tray 5: Almond Cookie ×12

Destination: Retail (dispatch 7:00)
├── Bake Group: Pastries 180°C (priority 1)
│   ├── Tray 6: Croissant ×12
│   └── Tray 7: Pain au Choc ×8
```

#### Tray Grid API Response

```json
{
  "delivery_date": "2026-02-08",
  "total_trays": 7,
  "destination_groups": [...],
  "tray_grid": {
    "all_tray_numbers": [1, 2, 3, 4, 5, 6, 7],
    "sections": [
      { "name": "Wholesale", "tray_start": 1, "tray_end": 5 },
      { "name": "Retail", "tray_start": 6, "tray_end": 7 }
    ],
    "products": [
      {
        "product_id": "uuid-1",
        "product_name": "Croissant",
        "prep_method": "laminated",
        "tray_quantities": { "1": 18, "2": 8, "6": 12 }
      }
    ]
  }
}
```

### 5.6 Process Templates (Production Timeline)

Multi-day production workflows using day offsets relative to delivery:

| Day Offset | Stage    | Example                                          |
| ---------- | -------- | ------------------------------------------------ |
| -2         | Mix      | Mix dough, divide into balls, proof overnight    |
| -1         | Laminate | Laminate balls, shape pastries, retard overnight |
| 0          | Bake     | Final proof, bake, pack, ship                    |

---

## 6. Integration Points

### 6.1 Stockly Integration

| Integration           | Direction        | Data                                                                    |
| --------------------- | ---------------- | ----------------------------------------------------------------------- |
| **Products**          | Planly → Stockly | `planly_products.stockly_product_id` links to `ingredients_library.id`  |
| **Base Prep Recipes** | Stockly → Planly | `processing_groups.base_prep_recipe_id` references `stockly.recipes.id` |
| **Product Recipes**   | Stockly → Planly | Via `ingredients_library.linked_recipe_id` for finishing ingredients    |
| **Ingredient Costs**  | Stockly → Planly | Recipe costing from Stockly ingredient prices                           |

#### Data Flow for Product Recipes

```
planly_products.stockly_product_id
  → ingredients_library.id (e.g., "Croissant")
       → .linked_recipe_id → stockly.recipes.id (the product's recipe)
            → recipe_ingredients:
                 - sub_recipe_id → stockly.recipes.id (base prep - SKIP in finishing)
                 - stock_item_id → stockly.stock_items.id (finishing ingredients)
```

### 6.2 Checkly Integration

| Integration            | Direction        | Data                                                   |
| ---------------------- | ---------------- | ------------------------------------------------------ |
| **SOPs**               | Checkly → Planly | `processing_groups.sop_id` references `sop_entries.id` |
| **Process Stage SOPs** | Checkly → Planly | `process_stages.sop_id` for stage instructions         |

### 6.3 Cross-Module Badges

Badges alert users when data in other modules is used by Planly:

| Module               | Badge Location     | Purpose                                       |
| -------------------- | ------------------ | --------------------------------------------- |
| **Stockly Recipes**  | Recipe list/detail | Shows which processing groups use this recipe |
| **Stockly Products** | Product detail     | Shows Planly link and configuration status    |
| **Checkly SOPs**     | SOP list/detail    | Shows which processing groups use this SOP    |

---

## 7. Settings & Configuration

### 7.1 Settings Pages (Production Plan Centric Naming)

Settings pages are named to match what they produce on the production plan:

| Route                          | Display Name            | Purpose                                         |
| ------------------------------ | ----------------------- | ----------------------------------------------- |
| `/settings/destination-groups` | **Packing & Delivery**  | Delivery group definitions with dispatch times  |
| `/settings/processing-groups`  | **Dough & Prep**        | Base prep + batch parameter groupings           |
| `/settings/oven-trays`         | **Oven & Trays**        | Combined bake groups and tray sizes (tabbed UI) |
| `/settings/process-templates`  | **Production Timeline** | Multi-day production workflow definitions       |
| `/settings/categories`         | **Product Categories**  | Product categories for grouping                 |
| `/settings/cutoff-rules`       | **Cutoff Rules**        | Order cutoff times and buffer days              |

**Note:** Legacy routes `/settings/bake-groups` and `/settings/equipment-types` redirect to `/settings/oven-trays`.

### 7.2 Sidebar Navigation Order

The settings sidebar follows the production plan flow:

1. **Packing & Delivery** - Where products go (destination groups)
2. **Dough & Prep** - How products are made (processing groups)
3. **Oven & Trays** - How products are baked (bake groups + tray sizes)
4. **Production Timeline** - Multi-day workflows (process templates)
5. **Product Categories** - Product organization
6. **Cutoff Rules** - Order deadlines

### 7.3 Oven & Trays (Combined Page)

The Oven & Trays page uses a tabbed interface:

**Tab 1: Tray Sizes (Equipment Types)**

- Define physical equipment (trays, racks, etc.)
- Set default capacity per equipment type
- Site-specific vs company-wide options

**Tab 2: Bake Groups (Oven Groups)**

- Group products that bake together
- Set baking temperature and time
- Define priority for baking order

### 7.4 Processing Groups (Dough & Prep) Configuration

Required fields:

- **Name:** Descriptive name (e.g., "Croissants", "Buns & Swirls")
- **Base Prep Recipe:** Stockly recipe for the base dough/batter (should yield in kg)
- **Batch Size (kg):** Weight of one production batch
- **Units Per Batch:** How many finished products from one batch

Optional fields:

- **Sheet Yield (kg):** Weight per laminated sheet (enables sheet count calculation)
- **Lamination Method:** Processing method description (e.g., "Single fold", "Book fold")
- **Process Template:** Multi-day workflow (links to Production Timeline)
- **Processing SOP:** Linked Checkly SOP for instructions
- **Leftover Handling:** What happens to excess from rounding

### 7.5 Destination Groups (Packing & Delivery) Configuration

Required fields:

- **Name:** Descriptive name (e.g., "Wholesale Morning", "Retail Afternoon")
- **Dispatch Time:** When deliveries leave for this group

Optional fields:

- **Bake Deadline:** Latest time products must be out of oven
- **Description:** Additional notes

---

## 8. Setup Guide

### 8.1 Prerequisites

Before using Planly production planning, ensure:

1. **Stockly recipes exist** for all base prep materials (doughs, batters, bases)
   - Recipes should yield in kg for accurate calculations
   - "Prep" type recipes are preferred

2. **Product recipes exist** linking products to their base prep
   - Each Planly product's linked ingredient should have a recipe
   - Recipe should include base prep ingredient + any finishing ingredients

### 8.2 Setup Wizard Steps

Access at `/dashboard/planly/setup`. The wizard follows the production plan order:

| Step | Name                | Purpose                           | Completion Check                           |
| ---- | ------------------- | --------------------------------- | ------------------------------------------ |
| 1    | Packing & Delivery  | Define where products go          | At least 1 destination group               |
| 2    | Dough & Prep        | Define how products are made      | At least 1 processing group                |
| 3    | Oven & Trays        | Define baking and equipment       | At least 1 bake group AND 1 equipment type |
| 4    | Production Timeline | Define multi-day workflows        | At least 1 process template                |
| 5    | Product Categories  | Organize products                 | At least 1 category                        |
| 6    | Products            | Configure products for production | At least 1 product with processing group   |
| 7    | Customers           | Add customers for ordering        | At least 1 active customer                 |

### 8.3 Setup Order Recommendation

1. **Packing & Delivery** (Destination Groups)
   - Create groups for each delivery route/timing
   - Set dispatch times and bake deadlines

2. **Dough & Prep** (Processing Groups)
   - Create groups for each distinct base prep
   - Link to Stockly recipes
   - Set batch parameters (kg and units)
   - Add sheet yield for laminated doughs

3. **Oven & Trays**
   - **Tray Sizes tab:** Define physical equipment
   - **Bake Groups tab:** Create groups for products that bake together

4. **Production Timeline** (Process Templates)
   - Create multi-day workflows if needed
   - Define stages with day offsets

5. **Product Categories**
   - Create categories for product organization
   - Used in packing plan groupings

6. **Products**
   - Assign each product to a processing group
   - Set base prep grams per unit
   - Assign equipment type and bake group
   - Set prep method (laminated, frozen, fresh, par_baked)

7. **Customers**
   - Add customers with delivery preferences
   - Assign to destination groups

---

## 9. UI Components

### 9.1 Daily Worksheet (Production Plan)

**Location:** `/src/components/planly/production-plan/DailyWorksheet.tsx`
**Route:** `/dashboard/planly/` (main Planly dashboard)

The Daily Worksheet is the central production planning view that consolidates all production data for a single day. It fetches data from multiple APIs in parallel and displays them in a unified, scrollable page.

#### Production Timeline Date Mapping

The worksheet aligns data with the bakery production timeline, where different sections pull data for different days relative to the selected date:

| Section          | Date Offset | API Endpoint                              | Purpose                                |
| ---------------- | ----------- | ----------------------------------------- | -------------------------------------- |
| **Packing Plan** | TODAY       | `/api/planly/production-plan`             | Orders to pack and deliver today       |
| **Dough Sheets** | TOMORROW    | `/api/planly/production-plan/mix-sheet`   | Sheets to laminate for tomorrow's bake |
| **Cookies**      | TOMORROW    | `/api/planly/production-plan`             | Cookie production tasks due today      |
| **Dough Mix**    | DAY AFTER   | `/api/planly/production-plan/mix-sheet`   | Dough to mix today for day-after bake  |
| **Tray Layout**  | TOMORROW    | `/api/planly/production-plan/tray-layout` | Tray setup for tomorrow's bake         |
| **Cross-Check**  | TOMORROW    | `/api/planly/production-plan/tray-layout` | Totals verification for tomorrow       |

#### API Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAILY WORKSHEET DATA FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  5 Parallel API Calls:                                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. /api/planly/production-plan?date=TODAY                           │   │
│  │    └─► Packing Plan (delivery_orders)                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 2. /api/planly/production-plan?date=TOMORROW                        │   │
│  │    └─► Cookies Section (production_tasks filtered by "cookie")      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 3. /api/planly/production-plan/tray-layout?date=TOMORROW            │   │
│  │    └─► Tray Layout + Cross-Check (tray_grid)                        │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 4. /api/planly/production-plan/mix-sheet?date=TOMORROW              │   │
│  │    └─► Dough Sheets Section (sheet_summary)                         │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 5. /api/planly/production-plan/mix-sheet?date=DAY_AFTER_TOMORROW    │   │
│  │    └─► Dough Mix Section (base_prep_ingredients)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header: Date Navigation + Print Button                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PACKING PLAN (TODAY)                                               │   │
│  │  Products × Customers matrix with bake group sections               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┬──────────────────┬──────────────────┐               │
│  │  DOUGH SHEETS    │    COOKIES       │    DOUGH MIX     │               │
│  │  (Tomorrow)      │   (Tomorrow)     │  (Day After)     │               │
│  │  Sheet counts    │   Tray to bake   │  Scaled recipe   │               │
│  │  by group        │   quantities     │  ingredients     │               │
│  └──────────────────┴──────────────────┴──────────────────┘               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRAY LAYOUT (TOMORROW)                                             │   │
│  │  Products × Tray Numbers matrix, chunked into 14-column groups      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CROSS-CHECK (TOMORROW)                                             │   │
│  │  Products × Bake Groups totals for verification                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Bake Group Ordering

Products are consistently ordered across all sections using a fixed bake group priority:

```typescript
const BAKE_GROUP_ORDER = ["Croissants", "Savory", "Swirls", "Cookies"];

function getBakeGroupPriority(name: string): number {
  const idx = BAKE_GROUP_ORDER.findIndex((bg) => bg.toLowerCase() === name?.toLowerCase());
  return idx >= 0 ? idx : 99;
}
```

#### Features

- **Parallel API fetching:** All 5 API calls execute simultaneously via `Promise.all`
- **Responsive grid:** 3-column layout for prep sections collapses on smaller screens
- **Print optimization:** Styled-jsx print styles hide navigation and optimize for paper
- **Light/dark theme:** Full support with Tailwind `dark:` variants
- **Tray chunking:** Tray layout splits into 14-column chunks for readability
- **Sticky columns:** First column stays visible when scrolling horizontally
- **Zebra striping:** Alternating row colors for easier reading
- **Gridlines:** Strong outer borders with subtle internal separators

### 9.2 Packing Plan Grid

**Location:** `/src/components/planly/packing-plan/PackingPlanGrid.tsx`

**Features:**

- Fixed column widths for consistent layout:
  - Product/Customer column: 200px
  - Data columns: 80px each
  - Total column: 80px
- Vertical text headers for space efficiency
- Sticky first column for horizontal scrolling
- Bake group section headers with emoji icons
- Alternating row colors for readability
- Print-optimized styles

### 9.3 Packing Plan Header

**Location:** `/src/components/planly/packing-plan/PackingPlanHeader.tsx`

**Features:**

- Day of week display: "Mon, 08/02/2026" format
- Calendar icon opens native date picker
- Previous/Next day navigation buttons
- Today button for quick navigation
- Refresh and Print buttons
- Transpose toggle (Products as Rows / Customers as Rows)
- Order count display

### 9.4 Date Handling

All date inputs use safe formatting helpers to prevent errors:

```typescript
// Safe date formatting
function safeFormatDate(dateString: string, formatStr: string): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, formatStr);
    }
    return dateString;
  } catch {
    return dateString;
  }
}

// Safe date navigation
function safeNavigateDate(dateString: string, days: number): string {
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(days > 0 ? addDays(date, days) : subDays(date, Math.abs(days)), "yyyy-MM-dd");
    }
    return format(new Date(), "yyyy-MM-dd");
  } catch {
    return format(new Date(), "yyyy-MM-dd");
  }
}
```

---

## Appendix: TypeScript Types

### Core Production Types

```typescript
// Prep Method Enum
type PrepMethod = "laminated" | "frozen" | "fresh" | "par_baked";

// Processing Group
interface ProcessingGroup {
  id: string;
  company_id: string;
  site_id?: string;
  name: string;
  base_prep_recipe_id: string;
  batch_size_kg: number;
  units_per_batch: number;
  sheet_yield_kg?: number; // NEW: For sheet count calculation
  lamination_method?: string; // NEW: Processing method description
  rounding_method: "up" | "nearest" | "exact";
  leftover_handling?: "preferment" | "waste" | "staff_meals" | "next_batch";
  process_template_id?: string;
  sop_id?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

// Equipment Type
interface EquipmentType {
  id: string;
  company_id: string;
  site_id?: string;
  name: string;
  default_capacity: number;
  description?: string;
  display_order: number;
  is_active: boolean;
}

// Extended Product Fields
interface PlanlyProduct {
  // ... existing fields ...
  processing_group_id?: string;
  base_prep_grams_per_unit?: number;
  equipment_type_id?: string;
  items_per_equipment?: number;
  prep_method?: PrepMethod; // NEW: Product classification
  display_order: number;
}
```

### Mix Sheet Response Types

```typescript
interface MixSheetProcessingGroup {
  group_id: string;
  group_name: string;
  total_units: number;
  batches_raw: number;
  batches_rounded: number;
  total_kg: number;
  sheets_needed: number | null; // NEW: For laminated doughs
  sheet_yield_kg: number | null; // NEW
  lamination_method: string | null; // NEW
  leftover_units: number;
  leftover_handling: string | null;
  leftover_note: string | null;
  sop_name: string | null;
  sop_id: string | null;
  products: { name: string; quantity: number; grams_each: number }[];
}

interface MixSheet {
  recipe_name: string;
  recipe_id: string;
  total_kg: number;
  total_batches: number;
  total_sheets: number | null; // NEW: Sum of sheets_needed
  yield_unit_warning: string | null;
  processing_groups: MixSheetProcessingGroup[];
  base_prep_ingredients: { name: string; quantity: number; unit: string }[];
  finishing_ingredients: { name: string; quantity: number; unit: string; for_products: string }[];
  division_instructions: string;
}

interface SheetSummary {
  total_sheets: number;
  by_recipe: {
    recipe_name: string;
    recipe_id: string;
    total_sheets: number;
    total_kg: number;
    groups: { name: string; sheets: number; kg: number; lamination: string | null }[];
  }[];
}
```

### API Response Types

See `/src/types/planly.ts` for complete type definitions including:

- `MixSheetResponse`
- `TrayLayoutResponse`
- `TrayGridResponse`
- `BatchProductionResponse`
- `ProductionPlanResponse`
- `SetupWizardStatus`
- `PlanlyBadgeData`

---

_Documentation updated 2026-02-04. For updates, see the source files in the repository._
