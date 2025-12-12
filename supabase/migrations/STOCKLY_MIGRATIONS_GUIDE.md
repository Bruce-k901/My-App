# Stockly Database Migrations

## ⚠️ IMPORTANT: Schema Consistency

All Stockly tables use the `stockly` schema. These consolidated migrations replace any earlier migrations that may have created tables in the `public` schema.

---

## Migration Order (RUN IN THIS EXACT ORDER)

Run these scripts in **Supabase SQL Editor**, one at a time:

| Order | Script                               | Description                                               |
| ----- | ------------------------------------ | --------------------------------------------------------- |
| 1️⃣    | `01-stockly-foundation.sql`          | Public prerequisites + `stockly` schema + all core tables |
| 2️⃣    | `02-stockly-stock-counts.sql`        | Stock counting feature                                    |
| 3️⃣    | `03-stockly-pos-sales-gp.sql`        | POS sales + GP reporting views                            |
| 4️⃣    | `04-stockly-library-integration.sql` | Links Stockly items to Checkly libraries                  |
| 5️⃣    | `05-stockly-recipes.sql`             | Recipe builder + costing                                  |
| 6️⃣    | `06-stockly-public-views.sql`        | Public schema views for REST API access                   |
| 7️⃣    | `07-stockly-transfers.sql`           | Stock transfers & staff sales                             |

---

## Before Running: Clean Up Existing Tables

If you have existing Stockly tables in the **wrong schema** (public instead of stockly), run this first:

```sql
-- Check what exists
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('stock_items', 'suppliers', 'deliveries', 'stock_counts', 'sales')
ORDER BY table_schema, table_name;
```

If tables exist in `public` schema that should be in `stockly`:

```sql
-- DANGER: Only run if you want to start fresh
DROP TABLE IF EXISTS public.stock_count_items CASCADE;
DROP TABLE IF EXISTS public.stock_counts CASCADE;
DROP TABLE IF EXISTS public.delivery_items CASCADE;
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS public.stock_levels CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.stock_items CASCADE;
DROP TABLE IF EXISTS public.storage_areas CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.stock_categories CASCADE;
DROP SCHEMA IF EXISTS stockly CASCADE;
```

Then run the migrations in order.

---

## What Each Script Creates

### 01-stockly-foundation.sql

**Public Schema (Prerequisites):**

- `companies` - Business entities
- `sites` - Locations/branches
- `user_roles` - Links users to companies
- `uom` - Units of measure (global)

**Stockly Schema (Core Tables):**

- `stockly.stock_categories`
- `stockly.suppliers`
- `stockly.storage_areas`
- `stockly.stock_items`
- `stockly.product_variants`
- `stockly.stock_levels`
- `stockly.stock_movements` (handles transfers via movement_type: `transfer_out`, `transfer_in`, `internal_sale`, `staff_sale`)
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

### 04-stockly-library-integration.sql

- Adds `library_item_id` and `library_type` columns to `stockly.stock_items`
- Creates indexes for library lookups
- Creates view `v_stock_items_with_library`
- Links Stockly items to Checkly library tables:
  - `ingredients_library`
  - `chemicals_library`
  - `ppe_library`
  - `drinks_library`
  - `disposables_library`
  - `glassware_library`
  - `packaging_library`
  - `serving_equipment_library`

### 05-stockly-recipes.sql

- `stockly.recipes` - Master recipe records
- `stockly.recipe_ingredients` - Items in a recipe (stock or sub-recipe)
- `stockly.recipe_variants` - Variants for composite recipes
- `stockly.recipe_modifiers` - Add-ons/extras
- `stockly.recipe_portions` - S/M/L size variations
- `stockly.recipe_cost_history` - Cost tracking over time
- Functions: `calculate_recipe_cost`, `recalculate_all_recipes`, `get_recipe_cost_breakdown`

### 06-stockly-public-views.sql

- Creates public schema views for all stockly tables
- **Required for Supabase REST API access** (only exposes `public` schema)
- Views include:
  - `daily_sales_summary`
  - `sales_imports`
  - `sales`
  - `sale_items`
  - `deliveries`
  - `delivery_items`
  - `stock_counts`
  - `stock_count_items`
  - `recipes`
  - `recipe_ingredients`
  - `recipe_variants`
  - `recipe_modifiers`
  - `recipe_portions`
  - `stock_items`
  - `product_variants`
  - `stock_levels`
  - `stock_movements`
  - `suppliers`
  - `storage_areas`
  - `stock_categories`
  - `waste_logs`
  - `waste_log_lines`
  - `price_history`
- Grants appropriate permissions to authenticated users

### 07-stockly-transfers.sql

- `stockly.stock_transfers` - Transfer records (staff purchases, internal use, site transfers)
- `stockly.stock_transfer_items` - Line items per transfer
- View: `v_staff_purchases` - Staff purchase summary
- Function: `generate_transfer_number` - Auto-generates transfer numbers (SP-YY-####, etc.)
- Transfer types: `staff_purchase`, `internal_use`, `sample`, `event`, `adjustment`, `transfer`
- Payment methods: `cash`, `payroll`, `free`
- RLS policies for company-scoped access

---

## After Running Migrations

### Create Test User Access

```sql
-- Get your auth user ID
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Create a company
INSERT INTO public.companies (id, name, slug)
VALUES (gen_random_uuid(), 'Demo Restaurant', 'demo-restaurant')
RETURNING id;

-- Link yourself as owner
INSERT INTO public.user_roles (user_id, company_id, role)
VALUES ('your-auth-user-id', 'your-company-id', 'owner');
```

### Verify Setup

```sql
-- Check stockly tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'stockly'
ORDER BY table_name;

-- Should show: daily_sales_summary, deliveries, delivery_items, price_history,
-- product_variants, recipes, recipe_cost_history, recipe_ingredients, recipe_modifiers,
-- recipe_portions, recipe_variants, sales, sale_items, sales_imports, stock_categories,
-- stock_count_items, stock_counts, stock_items, stock_levels,
-- stock_movements, stock_transfers, stock_transfer_items, storage_areas, suppliers,
-- waste_logs, waste_log_lines

-- Check public views exist (for REST API access)
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('daily_sales_summary', 'sales', 'deliveries', 'stock_counts', 'recipes', 'stock_items')
ORDER BY table_name;
```

---

## Important Notes

### Transfers

- **No separate transfer tables** - transfers are handled through `stockly.stock_movements` table
- Movement types: `transfer_out`, `transfer_in`, `internal_sale`, `staff_sale`
- This is intentional - all stock movements are tracked in one unified audit trail

### Public Views

- Migration 06 creates public schema views for REST API access
- Supabase REST API only exposes `public` and `graphql_public` schemas
- These views are required for frontend API calls to work
- Views are read-only by default (permissions granted separately)

### Library Integration

- Migration 04 links Stockly items to Checkly library items
- Allows Stockly to reference existing library data
- Enables unified item management across both systems

---

## Troubleshooting

| Error                                             | Solution                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `relation "public.user_roles" does not exist`     | Run `01-stockly-foundation.sql` first                               |
| `relation "stockly.stock_items" does not exist`   | Run `01-stockly-foundation.sql` first                               |
| `relation "stockly.storage_areas" does not exist` | Run `01-stockly-foundation.sql` first                               |
| Foreign key errors on stock_counts                | Ensure foundation ran successfully                                  |
| Policy already exists                             | Safe to ignore - scripts use DROP IF EXISTS                         |
| `relation "public.sales" does not exist`          | Run `06-stockly-public-views.sql` - views are required for REST API |
| Views not accessible via REST API                 | Ensure `06-stockly-public-views.sql` ran successfully               |

---

## Migration Checklist

- [ ] Backup database before running migrations
- [ ] Run `01-stockly-foundation.sql` first
- [ ] Run `02-stockly-stock-counts.sql`
- [ ] Run `03-stockly-pos-sales-gp.sql`
- [ ] Run `04-stockly-library-integration.sql`
- [ ] Run `05-stockly-recipes.sql`
- [ ] Run `06-stockly-public-views.sql` (required for REST API)
- [ ] Run `07-stockly-transfers.sql` (for staff purchases & transfers)
- [ ] Verify tables exist in `stockly` schema
- [ ] Verify public views exist for REST API access
- [ ] Test RLS policies with test user
- [ ] Enable Stockly module for your company

---

## Related Documentation

- See `STOCKLY_MIGRATIONS_AUDIT.md` for detailed audit of migration files
- Check `STOCKLY_INTEGRATION_MIGRATIONS.md` for integration details
- Review `RUN_STOCKLY_MIGRATIONS.md` for CLI deployment instructions
