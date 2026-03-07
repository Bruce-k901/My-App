# Database Security Changes Log

**Date:** 2026-02-04
**Author:** Claude Code Security Audit
**Status:** ✅ APPLIED TO DATABASE

---

## Execution Log

```
Applied: 2026-02-04
Migrations applied successfully:
 ✅ 20260204300000_security_revoke_dangerous_anon_grants.sql
 ✅ 20260204300001_security_fix_definer_functions.sql
 ✅ 20260204300002_security_fix_view_triggers.sql
 ✅ 20260204300003_security_reenable_user_roles_rls.sql
 ✅ 20260204300004_security_implement_rbac.sql
 ✅ 20260204400000_security_fix_linter_issues.sql
 ✅ 20260204400001_security_add_missing_rls_policies.sql
 ✅ 20260204400002_security_set_function_search_paths.sql
 ✅ 20260204400003_security_set_all_function_search_paths.sql

Config Changes:
 ✅ supabase/config.toml - Rate limits updated to production-safe values
```

---

## Summary

This document tracks all security fixes applied to the Supabase database as part of the security remediation effort.

### Issues Fixed by Severity

| Severity           | Count | Status   |
| ------------------ | ----- | -------- |
| 🔴 CRITICAL        | 4     | ✅ Fixed |
| 🟠 HIGH            | 4     | ✅ Fixed |
| 🟡 MEDIUM (Linter) | 60+   | ✅ Fixed |

---

## All Migrations

| #   | Migration File                                              | Severity    | Description                                                 |
| --- | ----------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| 1   | `20260204300000_security_revoke_dangerous_anon_grants.sql`  | 🔴 CRITICAL | Revokes dangerous grants from anonymous role                |
| 2   | `20260204300001_security_fix_definer_functions.sql`         | 🟠 HIGH     | Adds company_id auth checks to SECURITY DEFINER functions   |
| 3   | `20260204300002_security_fix_view_triggers.sql`             | 🟠 HIGH     | Adds company_id auth checks to public view triggers         |
| 4   | `20260204300003_security_reenable_user_roles_rls.sql`       | 🟠 HIGH     | Re-enables RLS on user_roles with non-recursive policies    |
| 5   | `20260204300004_security_implement_rbac.sql`                | 🟠 HIGH     | Implements role-based access control functions              |
| 6   | `20260204400000_security_fix_linter_issues.sql`             | 🟡 MEDIUM   | Fixes 42 SECURITY DEFINER views, enables RLS on 17 tables   |
| 7   | `20260204400001_security_add_missing_rls_policies.sql`      | 🟡 MEDIUM   | Adds RLS policies to 10 tables that had RLS but no policies |
| 8   | `20260204400002_security_set_function_search_paths.sql`     | 🟡 MEDIUM   | Sets search_path on SECURITY DEFINER functions              |
| 9   | `20260204400003_security_set_all_function_search_paths.sql` | 🟡 MEDIUM   | Sets search_path on ALL functions (203 updated)             |

---

## Config Changes

### Rate Limits (`supabase/config.toml`)

| Setting               | Before | After  | Risk                       |
| --------------------- | ------ | ------ | -------------------------- |
| `sign_in_sign_ups`    | 10,000 | **30** | Brute force protection     |
| `token_verifications` | 10,000 | **30** | OTP brute force protection |
| `email_sent`          | 2      | **10** | Allow more password resets |

---

## Detailed Changes

### Migration 1: Revoke Dangerous Anon Grants

**Severity:** 🔴 CRITICAL

**Tables/Views with anon access revoked:**

| Object                             | Previous                       | Now                |
| ---------------------------------- | ------------------------------ | ------------------ |
| `stockly.deliveries`               | SELECT                         | REVOKED            |
| `stockly.delivery_lines`           | SELECT                         | REVOKED            |
| `stockly.product_variants`         | SELECT                         | REVOKED            |
| `stockly.stock_items`              | SELECT                         | REVOKED            |
| `stockly.suppliers`                | SELECT                         | REVOKED            |
| `stockly.ingredient_price_history` | SELECT                         | REVOKED            |
| `stockly.stock_movements`          | SELECT                         | REVOKED            |
| `public.attendance_logs`           | SELECT                         | REVOKED            |
| `public.todays_attendance_logs`    | SELECT                         | REVOKED            |
| `public.active_attendance_logs`    | SELECT                         | REVOKED            |
| `public.stock_levels`              | SELECT, INSERT, UPDATE, DELETE | authenticated only |

**Kept accessible to anon:** `public.jobs` (public job board)

---

### Migration 2: Fix SECURITY DEFINER Functions

**Severity:** 🟠 HIGH

**Functions with company_id checks added:**

- `stockly.calculate_recipe_cost(UUID)`
- `stockly.recalculate_all_recipes(UUID)`
- `stockly.get_recipe_cost_breakdown(UUID)`
- `public.insert_stock_levels()`
- `public.update_stock_levels()`

---

### Migration 3: Fix View Triggers

**Severity:** 🟠 HIGH

**Functions with company_id checks + company_id change prevention:**

- `public.insert_daily_sales_summary()` / `update_daily_sales_summary()`
- `public.insert_sales_imports()` / `update_sales_imports()`
- `public.insert_sales()` / `update_sales()`
- `public.insert_sale_items()`
- `public.insert_recipes()` / `update_recipes()`
- `public.insert_deliveries()` / `update_deliveries()`

---

### Migration 4: Re-enable user_roles RLS

**Severity:** 🟠 HIGH

- Re-enabled RLS on `public.user_roles`
- Created non-recursive policies using profiles table
- Policies: `user_roles_select`, `user_roles_insert`, `user_roles_update`, `user_roles_delete`

---

### Migration 5: Implement RBAC

**Severity:** 🟠 HIGH

**Functions created:**

| Function                                               | Purpose                    |
| ------------------------------------------------------ | -------------------------- |
| `stockly.get_user_role(UUID, UUID)`                    | Get user's role in company |
| `stockly.role_has_permission(TEXT, TEXT)`              | Check role hierarchy       |
| `stockly.stockly_company_access_with_role(UUID, TEXT)` | Main RBAC function         |
| `stockly.is_manager_or_above(UUID)`                    | Manager+ check             |
| `stockly.is_admin_or_above(UUID)`                      | Admin+ check               |
| `stockly.is_owner(UUID)`                               | Owner-only check           |

**Role Hierarchy:** `owner > admin > manager > supervisor > staff`

---

### Migration 6: Fix Linter Issues (Views & RLS)

**Severity:** 🟡 MEDIUM

**42 views changed from SECURITY DEFINER to SECURITY INVOKER:**

- Attendance: `attendance_logs`, `weekly_attendance_review`, `todays_attendance`, `active_shifts`
- Leave: `leave_calendar_view`, `leave_balances_view`, `leave_requests_view`
- Recipes: `recipes`, `recipe_ingredients`, `recipe_modifiers`, `recipe_data_health`
- Stock: `stock_counts`, `stock_movements`, `stock_count_items`, `stock_on_hand_by_site`
- Order Book: `order_book_product_rating_summary`, `order_book_daily_waste_summary`, etc.
- Compliance: `training_stats_view`, `site_compliance_score_latest`, `compliance_matrix_view`
- And 20+ more...

**17 tables with RLS enabled + policies created:**

- `ppm_service_events`, `site_equipment_positions`, `service_reports`
- `order_book_message_threads`, `order_book_messages`, `order_book_issues`
- `order_book_issue_comments`, `order_book_product_ratings`, `order_book_credit_requests`
- `credit_note_requests`, `credit_note_lines`
- `course_assignments`, `calendar_reminders`
- `conversations_backup`, `messages_backup`, `task_templates_archive`, `site_checklists_archive`

---

### Migration 7: Add Missing RLS Policies

**Severity:** 🟡 MEDIUM

**10 tables with RLS enabled but no policies (now fixed):**

| Table                           | Policy Type              |
| ------------------------------- | ------------------------ |
| `public.daily_sales`            | company_id/site_id based |
| `public.fire_tests`             | company_id/site_id based |
| `public.rota_sections`          | company/site/rota based  |
| `public.rota_template_shifts`   | template based           |
| `public.rota_templates`         | company_id/site_id based |
| `public.staff_skills`           | user/company based       |
| `public.staff_working_patterns` | user/company based       |
| `public.stock_count_lines`      | stock_count based        |
| `public.temp_readings`          | company_id/site_id based |
| `stockly.stock_transfers`       | company_id based         |

---

### Migrations 8 & 9: Set Function search_path

**Severity:** 🟡 MEDIUM

**Purpose:** Prevent search path injection attacks

- Migration 8: Set search_path on SECURITY DEFINER functions
- Migration 9: Set search_path on ALL functions in public/stockly schemas
- **203 functions updated** with `SET search_path = public, stockly`
- 50 system/extension functions skipped (owned by PostgreSQL)

---

## Files Created/Modified

### New Migration Files

```
supabase/migrations/
├── 20260204300000_security_revoke_dangerous_anon_grants.sql
├── 20260204300001_security_fix_definer_functions.sql
├── 20260204300002_security_fix_view_triggers.sql
├── 20260204300003_security_reenable_user_roles_rls.sql
├── 20260204300004_security_implement_rbac.sql
├── 20260204400000_security_fix_linter_issues.sql
├── 20260204400001_security_add_missing_rls_policies.sql
├── 20260204400002_security_set_function_search_paths.sql
└── 20260204400003_security_set_all_function_search_paths.sql
```

### Config Files Modified

```
supabase/config.toml (rate limits)
```

### Documentation

```
docs/
├── DB_SECURITY_CHANGES_LOG.md (this file)
└── DB_SECURITY_REMEDIATION_PLAN.md (full remediation plan)
```

---

## Remaining Items

### Cannot Fix (System-Owned)

- Extension functions (`http_*`, `pg_trgm` functions) - owned by PostgreSQL
- System functions in `realtime`, `vault`, `pgbouncer` schemas - owned by Supabase

### Still Recommended

- ⚠️ **Rotate credentials** in `.env.local` (Supabase, Stripe, AWS, Anthropic, Resend keys)
- Consider enabling CAPTCHA for auth endpoints
- Review and strengthen password requirements (currently 8 chars, no symbols)

---

## Testing Checklist

- [ ] Authenticated users CAN access their company's data
- [ ] Authenticated users CANNOT access other companies' data
- [ ] Anonymous users CANNOT access stockly tables
- [ ] Anonymous users CANNOT access attendance data
- [ ] Anonymous users CANNOT modify stock levels
- [ ] SECURITY DEFINER functions reject cross-company IDs
- [ ] Public view triggers reject cross-company INSERTs
- [ ] Public view triggers prevent company_id modification
- [ ] User roles are only visible to same-company users
- [ ] RBAC functions correctly identify user roles
- [ ] Rate limits are enforced (30 attempts per 5 min)

---

## Rollback Instructions

If issues arise, migrations can be rolled back by:

1. Creating a new migration that reverses the changes
2. Or restoring from database backup

**Note:** Some rollbacks (like re-granting anon access) are NOT RECOMMENDED for security reasons.
