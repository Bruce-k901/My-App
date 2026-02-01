# Compliance Templates Asset Dropdown Fix

## Issue

The asset dropdown feature was missing from:

- Fridge/Freezer Temperature Check template
- Hot Holding Temperature Verification template

## Root Cause

The asset dropdown feature requires **BOTH** `repeatable_field_name` AND `asset_type` to be set in the `task_templates` table. The original migrations created templates with `repeatable_field_name` but didn't set `asset_type`, so the feature detection logic disabled the asset dropdown.

## Solution

### 1. Updated Migration Files

Updated the original migration files to include `asset_type` in the initial INSERT:

- `supabase/migrations/20250202000002_add_fridge_freezer_temperature_template.sql`
- `supabase/migrations/20250204000001_add_hot_holding_temperature_template.sql`

### 2. Fix Script for Existing Templates

Created `supabase/sql/fix_compliance_templates_asset_type.sql` to update existing templates in the database.

## How to Apply the Fix

### Option 1: Run the Fix Script (Recommended for Existing Databases)

1. Open your Supabase SQL Editor
2. Run the script: `supabase/sql/fix_compliance_templates_asset_type.sql`
3. The script will:
   - Update Fridge/Freezer template: `asset_type = 'refrigeration_equipment'`
   - Update Hot Holding template: `asset_type = 'hot_holding_equipment'`
   - Check and fix any other temperature templates that need `asset_type`

### Option 2: Re-run Migrations (For Fresh Databases)

The updated migration files will now include `asset_type` automatically for new installations.

## Verification

After running the fix script, verify the templates have `asset_type` set:

```sql
SELECT slug, name, repeatable_field_name, asset_type
FROM public.task_templates
WHERE slug IN ('fridge-freezer-temperature-check', 'hot_holding_temperature_verification')
  AND company_id IS NULL;
```

Both templates should have non-null `asset_type` values.

## How Asset Selection Works

The feature detection logic in `src/lib/template-features.ts` checks:

```typescript
assetSelection: !!(template.repeatable_field_name && template.asset_type);
```

Both fields must be set for the asset dropdown to appear in `TaskFromTemplateModal`.

## Related Files

- `src/lib/template-features.ts` - Feature detection logic
- `src/components/templates/TaskFromTemplateModal.tsx` - Asset dropdown UI
- `supabase/migrations/20250221000004_add_asset_type_to_temperature_templates.sql` - Previous migration (may not have been applied)












