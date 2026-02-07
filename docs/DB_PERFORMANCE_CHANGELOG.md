# Database Performance Migrations Changelog

**Date:** 2026-02-04
**Applied by:** Claude Code

---

## Summary

Applied 4 database performance migrations to optimize query performance and reduce RLS overhead.

---

## Migrations Applied

### 1. `20260205000000_add_critical_indexes.sql`

**Status:** ✅ Applied
**Purpose:** Add missing indexes for high-traffic queries

**Indexes Created:**
| Index Name | Table | Columns | Notes |
|------------|-------|---------|-------|
| `idx_planly_orders_delivery_status` | `planly_orders` | `(delivery_date, status)` | Already existed, skipped |
| `idx_planly_order_lines_order_product` | `planly_order_lines` | `(order_id, product_id)` | New |
| `idx_planly_products_site_bake_active` | `planly_products` | `(site_id, bake_group_id)` | Partial index, active only |
| `idx_planly_products_process_template` | `planly_products` | `(process_template_id)` | Partial index |
| `idx_planly_customers_needs_delivery` | `planly_customers` | `(site_id, needs_delivery)` | Partial index |
| `idx_order_book_customers_company` | `order_book_customers` | `(company_id)` | New |
| `idx_order_book_suppliers_company` | `order_book_suppliers` | `(company_id)` | Already existed |
| `idx_order_book_products_supplier` | `order_book_products` | `(supplier_id)` | Already existed |
| `idx_process_stages_template_offset` | `planly_process_stages` | `(template_id, day_offset)` | New |

---

### 2. `20260205000001_optimize_rls_policies.sql`

**Status:** ✅ Applied
**Purpose:** Optimize RLS policy performance with caching functions

**Functions Created:**

| Function                            | Schema    | Purpose                                                 |
| ----------------------------------- | --------- | ------------------------------------------------------- |
| `user_accessible_site_ids()`        | `public`  | Returns cached array of all site IDs user has access to |
| `has_planly_site_access_fast(UUID)` | `public`  | Fast site access check using cached array               |
| `user_company_id()`                 | `public`  | Returns cached user's company_id                        |
| `stockly_company_access(UUID)`      | `stockly` | Updated to use cached company_id                        |

**Indexes Created:**
| Index Name | Table | Columns |
|------------|-------|---------|
| `idx_user_site_access_auth_user` | `user_site_access` | `(auth_user_id)` |
| `idx_user_site_access_auth_site` | `user_site_access` | `(auth_user_id, site_id)` |
| `idx_profiles_auth_user_id` | `profiles` | `(auth_user_id)` partial |
| `idx_profiles_company_role` | `profiles` | `(company_id, app_role)` |

**Performance Impact:**

- RLS checks now cache site access per transaction instead of querying on every row
- `stockly_company_access()` no longer queries `information_schema.tables`
- Reduced profile table lookups from O(n) to O(1) per query

---

### 3. `20260205000002_add_fk_indexes.sql`

**Status:** ✅ Applied
**Purpose:** Add indexes on foreign key columns for efficient JOINs

**Indexes Created/Attempted:**

| Index Name                        | Table                        | Status                |
| --------------------------------- | ---------------------------- | --------------------- |
| `idx_stock_movements_ref`         | `stockly.stock_movements`    | Created (conditional) |
| `idx_stock_items_base_unit`       | `stockly.stock_items`        | Created (conditional) |
| `idx_stock_items_category`        | `stockly.stock_items`        | Already existed       |
| `idx_product_variants_stock_item` | `stockly.product_variants`   | Already existed       |
| `idx_deliveries_po`               | `stockly.deliveries`         | Created (conditional) |
| `idx_delivery_lines_delivery`     | `stockly.delivery_lines`     | Already existed       |
| `idx_recipe_ingredients_recipe`   | `stockly.recipe_ingredients` | Already existed       |
| `idx_product_ingredients_product` | `planly_product_ingredients` | Created (conditional) |
| `idx_process_stages_template`     | `planly_process_stages`      | Already existed       |
| `idx_profiles_company`            | `profiles`                   | Created               |
| `idx_sites_company`               | `sites`                      | Already existed       |
| `idx_user_roles_profile`          | `user_roles`                 | Already existed       |

---

### 4. `20260205000003_add_gin_indexes.sql`

**Status:** ✅ Applied
**Purpose:** Add specialized indexes for array and JSONB columns

**Extensions Enabled:**

- `pg_trgm` - For trigram-based text search

**Indexes Created (conditional on column existence):**

| Index Name                       | Table                    | Type                 | Purpose                   |
| -------------------------------- | ------------------------ | -------------------- | ------------------------- |
| `idx_stock_items_allergens`      | `stockly.stock_items`    | GIN                  | Allergen array searches   |
| `idx_supplier_areas_postcodes`   | `stockly.supplier_areas` | GIN                  | Postcode pattern matching |
| `idx_customers_delivery_days`    | `planly_customers`       | GIN                  | Delivery day filtering    |
| `idx_stock_items_metadata`       | `stockly.stock_items`    | GIN (jsonb_path_ops) | JSONB queries             |
| `idx_planly_customers_name_trgm` | `planly_customers`       | GIN (gin_trgm_ops)   | Fuzzy name search         |
| `idx_stock_items_name_trgm`      | `stockly.stock_items`    | GIN (gin_trgm_ops)   | Fuzzy name search         |

---

## Files Created/Modified

### New Migration Files:

- `supabase/migrations/20260205000000_add_critical_indexes.sql`
- `supabase/migrations/20260205000001_optimize_rls_policies.sql`
- `supabase/migrations/20260205000002_add_fk_indexes.sql`
- `supabase/migrations/20260205000003_add_gin_indexes.sql`

### Documentation:

- `docs/DB_PERFORMANCE_REMEDIATION_PLAN.md` - Full remediation plan
- `docs/DB_PERFORMANCE_CHANGELOG.md` - This file

---

## Expected Performance Improvements

| Area                | Before               | After           | Improvement       |
| ------------------- | -------------------- | --------------- | ----------------- |
| RLS policy overhead | O(n) profile lookups | O(1) cached     | ~80-90% reduction |
| Order queries       | Full table scans     | Index scans     | 3-5x faster       |
| Delivery notes      | 5 sequential queries | Optimized JOINs | 2-4x faster       |
| Text searches       | LIKE '%term%'        | Trigram index   | 10x+ faster       |

---

## Verification Commands

```sql
-- Check new indexes are being used
SELECT
    schemaname, tablename, indexname,
    idx_scan as times_used,
    idx_tup_read as rows_read
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Check for sequential scans on large tables
SELECT
    schemaname, relname,
    seq_scan, seq_tup_read,
    idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_tup_read DESC;

-- Test cached functions
SELECT public.user_company_id();
SELECT public.user_accessible_site_ids();
```

---

## Rollback Instructions

If issues arise, these migrations can be rolled back by:

1. Dropping the new indexes:

```sql
DROP INDEX IF EXISTS idx_planly_order_lines_order_product;
DROP INDEX IF EXISTS idx_planly_products_site_bake_active;
-- ... etc
```

2. Dropping the new functions:

```sql
DROP FUNCTION IF EXISTS public.user_accessible_site_ids();
DROP FUNCTION IF EXISTS public.has_planly_site_access_fast(UUID);
DROP FUNCTION IF EXISTS public.user_company_id();
```

3. Restoring the original `stockly_company_access` function if needed.

---

---

## Additional Optimizations (2026-02-04)

### 5. `20260205100000_optimize_auto_clock_out.sql`

**Status:** ✅ Applied
**Purpose:** Optimize slow cron job function (204ms → ~20ms expected)

**Changes:**

- Rewrote `auto_clock_out_after_closing()` from row-by-row FOR LOOP to set-based CTE operations
- Single bulk UPDATE instead of individual updates per user
- Expected **10x performance improvement**

### 6. `20260205100001_add_attendance_indexes.sql`

**Status:** ✅ Applied
**Purpose:** Add indexes for staff_attendance queries

**Indexes Created:**
| Index Name | Columns | Type |
|------------|---------|------|
| `idx_staff_attendance_active_shifts` | `(profile_id, clock_in_time)` | Partial (active shifts only) |
| `idx_staff_attendance_clock_in` | `(clock_in_time DESC)` | Full |
| `idx_staff_attendance_profile_date` | `(profile_id, clock_in_time DESC)` | Full |
| `idx_staff_attendance_site_date` | `(site_id, clock_in_time DESC)` | Partial |

---

## Supabase Query Performance Analysis

### Not Actionable (Internal Supabase Queries - 93% of time)

- `realtime.list_changes` - WAL processing for Realtime subscriptions
- `pg_proc` / `pg_class` - Schema introspection for Dashboard/PostgREST
- `pg_timezone_names` - Auth service timezone lookups

### Recommendations for Realtime

To reduce Realtime overhead:

1. Only subscribe to tables that truly need real-time updates
2. Use filtered subscriptions instead of entire tables
3. Consider using polling for less-critical data

---

## Next Steps (Not Yet Applied)

From the remediation plan, the following items remain for future implementation:

1. **API Code Changes** - Refactor N+1 queries in:
   - `src/app/api/planly/production-plan/route.ts`
   - `src/app/api/planly/delivery-notes/route.ts`
   - `src/app/api/planly/customers/[id]/order-history/route.ts`

2. **Pagination** - Add to list endpoints

3. **Database Functions** - Create aggregation functions for production tasks

4. **Materialized Views** - For reporting dashboards

5. **Query Monitoring** - Set up `pg_stat_statements` for ongoing analysis

---

## RLS Security Optimizations (2026-02-04)

### 7. `20260205200000_fix_rls_per_row_evaluation.sql`

**Status:** ✅ Applied
**Purpose:** Fix RLS policies with per-row re-evaluation of auth functions

**Problem:** Supabase detected that `auth.uid()` and `current_setting()` calls in RLS policies were being unnecessarily re-evaluated for every row, causing significant performance overhead.

**Solution:** Created optimized `user_company_id()` function with session caching and replaced problematic policies.

**Tables Fixed (policies using cached function):**
| Table | Schema | Policy Created |
|-------|--------|----------------|
| `stock_transfers` | `stockly` | `stock_transfers_company` |
| `departments` | `public` | `departments_company` |
| `regions` | `public` | `regions_company` |
| `areas` | `public` | `areas_company` |
| `approval_workflows` | `public` | `approval_workflows_company` |
| `daily_sales` | `public` | `daily_sales_company` |
| `rota_sections` | `public` | `rota_sections_company` |
| `rota_templates` | `public` | `rota_templates_company` |
| `staff_skills` | `public` | `staff_skills_company` |
| `staff_working_patterns` | `public` | `staff_working_patterns_company` |
| `ppm_service_events` | `public` | `ppm_service_events_company` |
| `service_reports` | `public` | `service_reports_company` |
| `order_book_message_threads` | `public` | `order_book_message_threads_company` |
| `order_book_issues` | `public` | `order_book_issues_company` |
| `order_book_product_ratings` | `public` | `order_book_product_ratings_company` |
| `order_book_credit_requests` | `public` | `order_book_credit_requests_company` |
| `credit_note_requests` | `public` | `credit_note_requests_company` |
| `course_assignments` | `public` | `course_assignments_company` |
| `calendar_reminders` | `public` | `calendar_reminders_company` |
| `staff_attendance` | `public` | `staff_attendance_company` + `staff_attendance_own` |

**Performance Impact:**

- RLS checks now use cached `user_company_id()` instead of per-row queries
- Expected **80-90% reduction** in RLS overhead for company-scoped tables

---

### 8. `20260205300000_fix_overly_permissive_rls.sql`

**Status:** ✅ Applied
**Purpose:** Fix overly permissive `USING(true)` policies for DELETE/INSERT/UPDATE operations

**Problem:** Several tables had policies using `USING(true)` or `WITH CHECK(true)` which allowed any authenticated user to delete/modify any record, regardless of company ownership.

**Tables Fixed:**
| Table | Operation | Before | After |
|-------|-----------|--------|-------|
| `purchase_orders` | DELETE | `USING(true)` | `company_id = user_company_id()` |
| `purchase_order_lines` | DELETE | `USING(true)` | EXISTS check via purchase_orders.company_id |
| `employee_review_summary` | INSERT | `WITH CHECK(true)` | `company_id = user_company_id()` |
| `employee_review_summary` | UPDATE | `USING(true)` | `company_id = user_company_id()` |
| `employee_review_summaries` | INSERT/UPDATE | Same fixes | Same fixes |

**Security Impact:**

- **Critical fix**: Users can now only delete POs belonging to their company
- **Critical fix**: Users can only modify review summaries for their company
- Properly scoped access control for sensitive operations

**Policies Retained (Acceptable):**
The following `USING(true)` policies were reviewed and deemed acceptable:

- `uom_global_read`: SELECT-only on global reference data (units of measure)
- `knowledge_base` for `service_role`: Trusted internal operations only
- `standard_departments` SELECT: Global reference data
- System notification INSERT policies: Creates records, doesn't modify
