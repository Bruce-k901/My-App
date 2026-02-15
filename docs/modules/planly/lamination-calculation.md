# Laminated Dough Sheet Calculation

## Overview

This document explains how Planly calculates the number of laminated dough sheets needed for production, based on customer orders.

## The Goal

**Input:** Tomorrow's pastry orders (e.g., 24 croissants, 18 pain au chocolat, 12 swirls)

**Output:** Number of dough sheets to laminate today (e.g., "Croissant dough: 6 sheets, Swirl dough: 4 sheets")

---

## Data Model

### 1. Products (`planly_products`)

Individual pastry items that customers order.

| Field                 | Example                 | Purpose                             |
| --------------------- | ----------------------- | ----------------------------------- |
| `id`                  | uuid                    | Product identifier                  |
| `name`                | "Croissant"             | Display name                        |
| `processing_group_id` | uuid → processing group | **Links product to its dough type** |
| `bake_group_id`       | uuid                    | For tray/oven grouping              |

### 2. Processing Groups (`planly_processing_groups`)

Defines a type of dough and how it's processed.

| Field                 | Example                  | Purpose                                     |
| --------------------- | ------------------------ | ------------------------------------------- |
| `id`                  | uuid                     | Group identifier                            |
| `name`                | "Croissants"             | Display name (e.g., "Croissants", "Swirls") |
| `base_prep_recipe_id` | uuid → recipes           | The laminated dough recipe                  |
| `batch_size_kg`       | 2.0                      | Weight of one batch/mix (kg)                |
| `units_per_batch`     | 20                       | Products from one batch                     |
| `sheet_yield_kg`      | 0.5                      | **Weight of ONE dough sheet (kg)**          |
| `lamination_method`   | "book_fold"              | Folding technique                           |
| `process_template_id` | uuid → process templates | Multi-day timeline                          |

### 3. Customer Orders (`planly_customer_order_lines`)

What customers have ordered for delivery.

| Field           | Example         | Purpose          |
| --------------- | --------------- | ---------------- |
| `product_id`    | uuid → products | Which product    |
| `quantity`      | 24              | How many ordered |
| `delivery_date` | 2024-02-06      | When to deliver  |

### 4. Process Templates (`planly_process_templates` + `planly_process_stages`)

Multi-day production timeline.

| Stage Name    | Day Offset | Meaning                |
| ------------- | ---------- | ---------------------- |
| "Mix Dough"   | -3         | 3 days before delivery |
| "Laminate"    | -2         | 2 days before delivery |
| "Shape"       | -1         | 1 day before delivery  |
| "Bake & Pack" | 0          | Delivery day           |

---

## Calculation Flow

### Step 1: Aggregate Orders by Processing Group

```
Tomorrow's Orders:
├── Croissant: 24
├── Pain au Chocolat: 18
├── Almond Croissant: 12
└── Cinnamon Swirl: 15

Products → Processing Groups:
├── Croissant → "Croissants" group
├── Pain au Chocolat → "Croissants" group
├── Almond Croissant → "Croissants" group
└── Cinnamon Swirl → "Swirls" group

Totals by Group:
├── "Croissants": 24 + 18 + 12 = 54 units
└── "Swirls": 15 units
```

### Step 2: Calculate Batches Needed

```
"Croissants" group:
├── units_per_batch: 20
├── total_units: 54
├── batches_raw: 54 ÷ 20 = 2.7
├── batches_rounded: ceil(2.7) = 3 batches
└── total_kg: 3 × 2.0kg = 6.0 kg

"Swirls" group:
├── units_per_batch: 15
├── total_units: 15
├── batches_raw: 15 ÷ 15 = 1.0
├── batches_rounded: 1 batch
└── total_kg: 1 × 1.5kg = 1.5 kg
```

### Step 3: Calculate Sheets Needed

```
"Croissants" group:
├── total_kg: 6.0 kg
├── sheet_yield_kg: 0.5 kg per sheet
└── sheets_needed: 6.0 ÷ 0.5 = 12 sheets ✓

"Swirls" group:
├── total_kg: 1.5 kg
├── sheet_yield_kg: 0.375 kg per sheet
└── sheets_needed: 1.5 ÷ 0.375 = 4 sheets ✓
```

---

## API Endpoint

**`GET /api/planly/production-plan/mix-sheet?date=YYYY-MM-DD&siteId=xxx`**

Returns:

```json
{
  "mix_sheets": [
    {
      "recipe_name": "Laminated Dough - Croissants",
      "total_kg": 6.0,
      "total_batches": 3,
      "processing_groups": [
        {
          "group_name": "Croissants",
          "total_units": 54,
          "batches_rounded": 3,
          "total_kg": 6.0,
          "sheets_needed": 12, // ← THE SHEET COUNT
          "sheet_yield_kg": 0.5,
          "lamination_method": "book_fold"
        }
      ]
    }
  ],
  "sheet_summary": {
    "total_sheets": 16,
    "by_recipe": [
      { "recipe_name": "Laminated Dough - Croissants", "total_sheets": 12, "total_kg": 6.0 },
      { "recipe_name": "Laminated Dough - Swirls", "total_sheets": 4, "total_kg": 1.5 }
    ]
  }
}
```

---

## Required Configuration Checklist

For sheet calculations to work, ALL of these must be configured:

### ✅ Products

- [ ] Each pastry product exists in `planly_products`
- [ ] Each product has `processing_group_id` set (links to its dough type)

### ✅ Processing Groups (Dough & Prep settings)

- [ ] Processing group exists (e.g., "Croissants", "Swirls")
- [ ] `base_prep_recipe_id` is set (the laminated dough recipe)
- [ ] `batch_size_kg` is set (weight per batch)
- [ ] `units_per_batch` is set (products per batch)
- [ ] **`sheet_yield_kg` is set** (weight per sheet - THIS IS CRITICAL)

### ✅ Orders

- [ ] Customer orders exist for the delivery date
- [ ] Orders are for products linked to processing groups

---

## Troubleshooting

### "Sheets not showing"

1. **Check sheet_yield_kg is configured:**

   ```sql
   SELECT name, sheet_yield_kg, batch_size_kg, units_per_batch
   FROM planly_processing_groups
   WHERE company_id = 'YOUR_COMPANY_ID';
   ```

   If `sheet_yield_kg` is NULL, no sheets will be calculated.

2. **Check products are linked to processing groups:**

   ```sql
   SELECT p.name, pg.name as processing_group
   FROM planly_products p
   LEFT JOIN planly_processing_groups pg ON p.processing_group_id = pg.id
   WHERE p.company_id = 'YOUR_COMPANY_ID';
   ```

   If `processing_group` is NULL, the product won't be included in calculations.

3. **Check orders exist:**

   ```sql
   SELECT col.product_id, p.name, col.quantity, co.delivery_date
   FROM planly_customer_order_lines col
   JOIN planly_customer_orders co ON col.order_id = co.id
   JOIN planly_products p ON col.product_id = p.id
   WHERE co.delivery_date = 'YYYY-MM-DD'
   AND co.site_id = 'YOUR_SITE_ID';
   ```

4. **Test the API directly:**
   ```
   GET /api/planly/production-plan/mix-sheet?date=2024-02-06&siteId=YOUR_SITE_ID
   ```
   Check if `sheet_summary` is populated in the response.

---

## Code Locations

| Component         | File                                                                   | Purpose                             |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| Sheet calculation | `src/app/api/planly/production-plan/mix-sheet/route.ts:196-199`        | Calculates `sheets_needed`          |
| Sheet summary     | `src/app/api/planly/production-plan/mix-sheet/route.ts:346-363`        | Aggregates by recipe                |
| Type definition   | `src/types/planly.ts:690-706`                                          | `MixSheetProcessingGroup` interface |
| UI display        | `src/app/dashboard/planly/production-plan/page.tsx:312-330`            | Shows in Dough Groups               |
| Settings form     | `src/app/dashboard/planly/settings/processing-groups/page.tsx:670-692` | Configure sheet_yield_kg            |

---

## Example Workflow

**Tuesday (today):** Laminate dough for Wednesday's pastries

1. Check tomorrow's orders → 54 croissants, 15 swirls
2. System calculates:
   - Croissants: 54 units ÷ 20/batch = 3 batches × 2kg = 6kg ÷ 0.5kg/sheet = **12 sheets**
   - Swirls: 15 units ÷ 15/batch = 1 batch × 1.5kg = 1.5kg ÷ 0.375kg/sheet = **4 sheets**
3. Production plan shows: "Laminate 12 croissant sheets, 4 swirl sheets"
