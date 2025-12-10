# Running Stockly Migrations via Supabase CLI

## Quick Start

Run this command in your terminal from the project root:

```bash
supabase db push
```

This will apply all pending migrations, including the 10 new Stockly migration files.

## Step-by-Step Instructions

### 1. Verify Migration Files

First, check that all migration files exist:

```powershell
# PowerShell
Get-ChildItem supabase\migrations\20250217*.sql

# Should show 10 files:
# - 20250217000001_create_company_modules.sql
# - 20250217000002_extend_sites_for_stockly.sql
# - 20250217000003_create_uom_table.sql
# - 20250217000004_create_stockly_core_tables.sql
# - 20250217000005_create_deliveries_purchasing.sql
# - 20250217000006_create_waste_counting_transfers.sql
# - 20250217000007_create_recipes_tables.sql
# - 20250217000008_create_pos_integration.sql
# - 20250217000009_create_stockly_rls_policies.sql
# - 20250217000010_create_whatsapp_order_function.sql
```

### 2. Check Project Link Status

Make sure your project is linked to Supabase:

```bash
supabase projects list
```

If not linked, link your project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in the Supabase dashboard URL or in your project settings.

### 3. Apply Migrations

Run the migration command:

```bash
supabase db push
```

This will:

- Show you which migrations will be applied
- Ask for confirmation (if not using `--yes` flag)
- Apply all pending migrations in order
- Show progress and any errors

### 4. Alternative: Apply with Confirmation

If you want to see what will happen first:

```bash
# Dry run (check what would be applied)
supabase db push --dry-run

# Then apply
supabase db push
```

### 5. Verify Migrations

After running migrations, verify everything was created:

```bash
# Run the verification script in Supabase SQL Editor
# File: supabase/sql/verify_stockly_migrations.sql
```

Or check manually:

```sql
-- Check tables exist
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('company_modules', 'suppliers', 'stock_items', 'uom');

-- Should return 4 (or more if other tables exist)
```

## Troubleshooting

### Error: "Project not linked"

```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Or check existing link
cat .supabase/config.toml
```

### Error: "Migration conflicts"

If you get migration conflicts:

1. Check which migrations have already been applied
2. The migration files use `IF NOT EXISTS` so they should be safe to re-run
3. If needed, you can manually run individual migration files in Supabase SQL Editor

### Error: "Permission denied"

Make sure you're authenticated:

```bash
supabase login
```

### Error: "Table already exists"

This is OK! The migrations use `CREATE TABLE IF NOT EXISTS`, so they're idempotent. The migration will skip creating tables that already exist.

## Manual Alternative

If the CLI isn't working, you can run migrations manually:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste each migration file content in order (00001 through 00010)
3. Run each one sequentially
4. Check for errors after each migration

## Migration Order

The migrations must be run in this order:

1. ✅ `20250217000001_create_company_modules.sql`
2. ✅ `20250217000002_extend_sites_for_stockly.sql`
3. ✅ `20250217000003_create_uom_table.sql`
4. ✅ `20250217000004_create_stockly_core_tables.sql`
5. ✅ `20250217000005_create_deliveries_purchasing.sql`
6. ✅ `20250217000006_create_waste_counting_transfers.sql`
7. ✅ `20250217000007_create_recipes_tables.sql`
8. ✅ `20250217000008_create_pos_integration.sql`
9. ✅ `20250217000009_create_stockly_rls_policies.sql`
10. ✅ `20250217000010_create_whatsapp_order_function.sql`

## After Migrations

1. **Verify**: Run `supabase/sql/verify_stockly_migrations.sql`
2. **Enable Stockly**: Update `company_modules` to enable Stockly for your company
3. **Check Documentation**: See `STOCKLY_INTEGRATION_MIGRATIONS.md` for details

## Need Help?

- Check Supabase CLI docs: https://supabase.com/docs/guides/cli
- Review migration files in `supabase/migrations/`
- See `STOCKLY_INTEGRATION_MIGRATIONS.md` for full details
