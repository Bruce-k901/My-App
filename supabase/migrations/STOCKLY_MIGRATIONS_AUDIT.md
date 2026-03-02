# Stockly Migrations Audit

## ✅ Migration Files That Exist

| Order | File                                 | Status    | Description                                               |
| ----- | ------------------------------------ | --------- | --------------------------------------------------------- |
| 1️⃣    | `01-stockly-foundation.sql`          | ✅ EXISTS | Public prerequisites + `stockly` schema + all core tables |
| 2️⃣    | `02-stockly-stock-counts.sql`        | ✅ EXISTS | Stock counting feature                                    |
| 3️⃣    | `03-stockly-pos-sales-gp.sql`        | ✅ EXISTS | POS sales + GP reporting views                            |
| 4️⃣    | `04-stockly-library-integration.sql` | ✅ EXISTS | **NOT IN DOCS** - Links Stockly to Checkly libraries      |
| 5️⃣    | `05-stockly-recipes.sql`             | ✅ EXISTS | Recipe builder + costing (docs say "04")                  |
| 6️⃣    | `06-stockly-public-views.sql`        | ✅ EXISTS | **NOT IN DOCS** - Public schema views for REST API access |

## ❌ Missing from Documentation

### Migration 04: Library Integration

**File:** `04-stockly-library-integration.sql`

- Adds `library_item_id` and `library_type` columns to `stockly.stock_items`
- Creates view `v_stock_items_with_library`
- Links Stockly items to Checkly library tables (ingredients_library, chemicals_library, etc.)

### Migration 06: Public Views

**File:** `06-stockly-public-views.sql`

- Creates public schema views for all stockly tables
- Required for Supabase REST API access (only exposes `public` schema)
- Includes views for: sales, deliveries, stock_counts, recipes, etc.

## ⚠️ Documentation Errors

### Error 1: Wrong Migration Number

- **Docs say:** `04-stockly-recipes.sql`
- **Actually:** `05-stockly-recipes.sql`
- **Fix:** Update docs to show correct order

### Error 2: Missing Migration 05

- **Docs mention:** `05-stockly-transfers.sql` with `stock_transfers` and `stock_transfer_items` tables
- **Reality:** No such migration exists
- **Note:** Transfers are handled via `stock_movements` table with movement types:
  - `'transfer_out'`
  - `'transfer_in'`
  - `'internal_sale'`
  - `'staff_sale'`

## 📋 Corrected Migration Order

| Order | Script                               | Description                                               |
| ----- | ------------------------------------ | --------------------------------------------------------- |
| 1️⃣    | `01-stockly-foundation.sql`          | Public prerequisites + `stockly` schema + all core tables |
| 2️⃣    | `02-stockly-stock-counts.sql`        | Stock counting feature                                    |
| 3️⃣    | `03-stockly-pos-sales-gp.sql`        | POS sales + GP reporting views                            |
| 4️⃣    | `04-stockly-library-integration.sql` | **Links Stockly items to Checkly libraries**              |
| 5️⃣    | `05-stockly-recipes.sql`             | Recipe builder + costing                                  |
| 6️⃣    | `06-stockly-public-views.sql`        | **Public schema views for REST API access**               |

## 🔍 What Each Script Creates (Updated)

### 01-stockly-foundation.sql

**Public Schema (Prerequisites):**

- `companies` - Business entities
- `sites` - Locations/branches
- `user_roles` - Links users to companies
- `uom` - Units of measure

**Stockly Schema (Core Tables):**

- `stockly.stock_categories`
- `stockly.suppliers`
- `stockly.storage_areas`
- `stockly.stock_items`
- `stockly.product_variants`
- `stockly.stock_levels`
- `stockly.stock_movements` (handles transfers via movement_type)
- `stockly.deliveries` + `stockly.delivery_items`
- `stockly.wastage`
- `stockly.price_history`

### 02-stockly-stock-counts.sql

- `stockly.stock_counts`
- `stockly.stock_count_items`
- Helper functions: `generate_count_number`, `populate_count_items`, `apply_count_adjustments`

### 03-stockly-pos-sales-gp.sql

- `stockly.sales`
- `stockly.sale_items`
- `stockly.daily_sales_summary`
- `stockly.sales_imports`
- Views: `v_gp_weekly`, `v_gp_monthly`, `v_gp_by_category`
- Function: `recalculate_daily_summary`

### 04-stockly-library-integration.sql ⚠️ MISSING FROM DOCS

- Adds `library_item_id` and `library_type` columns to `stockly.stock_items`
- Creates indexes for library lookups
- Creates view `v_stock_items_with_library`
- Links Stockly to Checkly library tables

### 05-stockly-recipes.sql

- `stockly.recipes` - Master recipe records
- `stockly.recipe_ingredients` - Items in a recipe (stock or sub-recipe)
- `stockly.recipe_variants` - Variants for composite recipes
- `stockly.recipe_modifiers` - Add-ons/extras
- `stockly.recipe_portions` - S/M/L size variations
- `stockly.recipe_cost_history` - Cost tracking over time
- Functions: `calculate_recipe_cost`, `recalculate_all_recipes`, `get_recipe_cost_breakdown`

### 06-stockly-public-views.sql ⚠️ MISSING FROM DOCS

- Creates public schema views for all stockly tables
- Required for Supabase REST API access
- Views include: `daily_sales_summary`, `sales_imports`, `sales`, `sale_items`, `deliveries`, `delivery_items`, `stock_counts`, `stock_count_items`, `recipes`, `recipe_ingredients`, `recipe_variants`, `recipe_modifiers`, `recipe_portions`, `stock_items`, `product_variants`, `stock_levels`, `stock_movements`, `suppliers`, `storage_areas`, `stock_categories`, `wastage`, `price_history`
- Grants appropriate permissions

## 📝 Recommended Documentation Updates

### Update Migration Order Table

```markdown
| Order | Script                               | Description                                               |
| ----- | ------------------------------------ | --------------------------------------------------------- |
| 1️⃣    | `01-stockly-foundation.sql`          | Public prerequisites + `stockly` schema + all core tables |
| 2️⃣    | `02-stockly-stock-counts.sql`        | Stock counting feature                                    |
| 3️⃣    | `03-stockly-pos-sales-gp.sql`        | POS sales + GP reporting views                            |
| 4️⃣    | `04-stockly-library-integration.sql` | Links Stockly items to Checkly libraries                  |
| 5️⃣    | `05-stockly-recipes.sql`             | Recipe builder + costing                                  |
| 6️⃣    | `06-stockly-public-views.sql`        | Public schema views for REST API access                   |
```

### Remove Incorrect Transfer Migration Section

The documentation mentions `05-stockly-transfers.sql` which doesn't exist. Transfers are handled through:

- `stockly.stock_movements` table with movement types: `transfer_out`, `transfer_in`, `internal_sale`, `staff_sale`
- No separate transfer tables needed

### Add Missing Sections

#### Add to "What Each Script Creates":

**04-stockly-library-integration.sql**

- Adds `library_item_id` and `library_type` columns to `stockly.stock_items`
- Creates view `v_stock_items_with_library`
- Links Stockly items to Checkly library tables (ingredients_library, chemicals_library, etc.)

**06-stockly-public-views.sql**

- Creates public schema views for all stockly tables
- Required for Supabase REST API access (only exposes `public` schema)
- Grants appropriate permissions to authenticated users

## ✅ Verification Query (Updated)

```sql
-- Check stockly tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'stockly'
ORDER BY table_name;

-- Should show: daily_sales_summary, deliveries, delivery_items, price_history,
-- product_variants, recipes, recipe_cost_history, recipe_ingredients, recipe_modifiers,
-- recipe_portions, recipe_variants, sales, sale_items, sales_imports, stock_categories,
-- stock_count_items, stock_counts, stock_items, stock_levels,
-- stock_movements, storage_areas, suppliers, wastage

-- Check public views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('daily_sales_summary', 'sales', 'deliveries', 'stock_counts', 'recipes', 'stock_items')
ORDER BY table_name;
```

## 🎯 Summary

**Issues Found:**

1. ❌ Migration 04 (library integration) not documented
2. ❌ Migration 06 (public views) not documented
3. ❌ Wrong migration number for recipes (docs say 04, actually 05)
4. ❌ Documentation mentions non-existent transfers migration

**Action Required:**

- Update documentation to include all 6 migrations
- Fix migration numbering
- Remove references to `05-stockly-transfers.sql`
- Add sections for library integration and public views
