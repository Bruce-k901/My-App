# Recipe Data Integrity System

**Created:** January 30, 2026
**Status:** Ready for deployment

## Overview

This document describes the data integrity system for recipes in the Opsly platform. The system provides:

1. **Database constraints** to prevent invalid data from being saved
2. **Audit logging** with full data snapshots for recovery
3. **Optimistic locking** to prevent concurrent edit conflicts
4. **Monitoring functions** to detect and report issues
5. **API validation** for client-side and server-side checks
6. **Health check endpoint** for automated monitoring

---

## Quick Start

### 1. Run Investigation Queries First

Before applying the migration, run these queries in Supabase SQL Editor to understand current data state:

```sql
-- Check for recipes without ingredients
SELECT
    r.id,
    r.name,
    COUNT(ri.id) as ingredient_count
FROM stockly.recipes r
LEFT JOIN stockly.recipe_ingredients ri ON ri.recipe_id = r.id
WHERE r.is_active = true
GROUP BY r.id
HAVING COUNT(ri.id) = 0;

-- Check recent audit log
SELECT event_type, COUNT(*), MAX(changed_at)
FROM stockly.recipe_audit_log
GROUP BY event_type
ORDER BY MAX(changed_at) DESC;
```

### 2. Apply the Migration

```bash
# Apply via Supabase CLI
supabase db push

# Or run directly in SQL Editor
# File: supabase/migrations/20260130000000_recipe_data_integrity.sql
```

### 3. Verify Installation

```sql
-- Should return integrity check results
SELECT * FROM check_recipe_data_integrity('YOUR_COMPANY_ID');

-- Should return summary
SELECT * FROM get_recipe_integrity_summary('YOUR_COMPANY_ID');

-- Should show data health view
SELECT * FROM recipe_data_health;
```

---

## Database Schema Changes

### New Columns Added

| Table                      | Column          | Type    | Purpose              |
| -------------------------- | --------------- | ------- | -------------------- |
| `stockly.recipes`          | `data_version`  | INTEGER | Optimistic locking   |
| `public.recipes`           | `data_version`  | INTEGER | Optimistic locking   |
| `stockly.recipe_audit_log` | `full_snapshot` | JSONB   | Complete data backup |
| `stockly.recipe_audit_log` | `data_version`  | INTEGER | Version tracking     |

### New Functions

| Function                                                        | Purpose                      |
| --------------------------------------------------------------- | ---------------------------- |
| `check_recipe_data_integrity(company_id)`                       | Returns all integrity issues |
| `get_recipe_integrity_summary(company_id)`                      | Returns summary counts       |
| `update_recipe_with_version_check(recipe_id, version, updates)` | Safe concurrent update       |

### New Triggers

| Trigger                         | Table             | Purpose                |
| ------------------------------- | ----------------- | ---------------------- |
| `increment_recipe_data_version` | `stockly.recipes` | Auto-increment version |
| `log_recipe_snapshot_trigger`   | `stockly.recipes` | Capture full snapshots |

---

## API Endpoints

### Health Check

```typescript
// GET /api/health/data-integrity?company_id=xxx
const response = await fetch('/api/health/data-integrity?company_id=abc123');
const health = await response.json();

// Response:
{
  "status": "healthy" | "warning" | "critical",
  "timestamp": "2026-01-30T12:00:00Z",
  "summary": {
    "total_checks": 6,
    "passed": 5,
    "warnings": 1,
    "failed": 0
  },
  "checks": [
    {
      "name": "recipes_without_ingredients",
      "status": "warn",
      "count": 3,
      "details": [...]
    }
  ]
}
```

### Fix Issues

```typescript
// POST /api/health/data-integrity
const response = await fetch("/api/health/data-integrity", {
  method: "POST",
  body: JSON.stringify({
    company_id: "abc123",
    action: "cleanup", // or 'recalculate_costs' or 'fix_orphans'
  }),
});
```

---

## Client-Side Validation

### Import

```typescript
import {
  validateRecipeData,
  checkLoadedRecipeIntegrity,
  hasCriticalIntegrityIssues,
} from "@/lib/validation/recipeValidation";
```

### Validate Before Save

```typescript
const result = validateRecipeData(recipeData, isPublishing);

if (!result.valid) {
  // Show errors to user
  result.errors.forEach((error) => {
    toast.error(`${error.field}: ${error.message}`);
  });
  return;
}

// Show warnings but allow save
result.warnings.forEach((warning) => {
  toast.warning(`${warning.field}: ${warning.message}`);
});

// Proceed with save...
```

### Check Loaded Data

```typescript
const checks = checkLoadedRecipeIntegrity(loadedRecipe);

if (hasCriticalIntegrityIssues(checks)) {
  // Show critical error banner
  showDataIntegrityWarning(checks);
}
```

---

## Optimistic Locking Usage

### In API Route

```typescript
// When updating a recipe
const { data, error } = await supabase.rpc("update_recipe_with_version_check", {
  p_recipe_id: recipeId,
  p_expected_version: clientVersion,
  p_updates: {
    name: newName,
    description: newDescription,
  },
});

if (data.error === "version_conflict") {
  // Another user modified this recipe
  // Show conflict resolution UI
  return {
    conflict: true,
    currentData: data.current_data,
    currentVersion: data.current_version,
  };
}
```

### In React Component

```typescript
function RecipeEditor({ recipe }) {
  const [localVersion, setLocalVersion] = useState(recipe.data_version);

  async function handleSave() {
    const result = await saveRecipe({
      ...formData,
      expected_version: localVersion,
    });

    if (result.conflict) {
      // Show merge dialog
      setConflictData(result.currentData);
      setShowConflictModal(true);
    } else {
      // Update local version
      setLocalVersion(result.new_version);
    }
  }
}
```

---

## Monitoring & Alerts

### Supabase Dashboard Query

Add this to your monitoring dashboard:

```sql
-- Run daily to check system health
SELECT
  company_id,
  SUM(CASE WHEN status = 'error' THEN issue_count ELSE 0 END) as errors,
  SUM(CASE WHEN status = 'warning' THEN issue_count ELSE 0 END) as warnings
FROM (
  SELECT
    (details->>'company_id')::uuid as company_id,
    check_name,
    CASE
      WHEN check_name IN ('invalid_ingredient_quantities', 'orphan_ingredients') THEN 'error'
      ELSE 'warning'
    END as status,
    issue_count
  FROM check_recipe_data_integrity(NULL)
) sub
GROUP BY company_id
HAVING SUM(CASE WHEN status = 'error' THEN issue_count ELSE 0 END) > 0;
```

### Cron Job (Optional)

Add to edge function for automated checks:

```typescript
// supabase/functions/daily-integrity-check/index.ts
Deno.cron("Daily integrity check", "0 6 * * *", async () => {
  const { data: companies } = await supabase.from("companies").select("id");

  for (const company of companies) {
    const { data: summary } = await supabase.rpc("get_recipe_integrity_summary", {
      p_company_id: company.id,
    });

    if (summary.status === "critical") {
      // Send alert to Slack/email
      await sendAlert({
        severity: "critical",
        company_id: company.id,
        issues: summary,
      });
    }
  }
});
```

---

## Recovery Procedures

### Restore Recipe from Audit Log

```sql
-- Find the snapshot you want to restore
SELECT
  id,
  changed_at,
  event_type,
  full_snapshot->'recipe' as recipe_data,
  full_snapshot->'ingredients' as ingredients
FROM stockly.recipe_audit_log
WHERE recipe_id = 'YOUR_RECIPE_ID'
ORDER BY changed_at DESC
LIMIT 10;

-- Restore recipe data
UPDATE stockly.recipes
SET
  name = (snapshot->'recipe'->>'name'),
  description = (snapshot->'recipe'->>'description'),
  -- ... other fields
  updated_at = NOW()
FROM (
  SELECT full_snapshot as snapshot
  FROM stockly.recipe_audit_log
  WHERE id = 'AUDIT_LOG_ID'
) sub
WHERE recipes.id = 'YOUR_RECIPE_ID';

-- Restore ingredients (more complex - may need manual intervention)
```

### Mass Fix Empty Ingredients

```sql
-- Find recipes that should have ingredients but don't
WITH missing_ingredients AS (
  SELECT r.id, r.name
  FROM stockly.recipes r
  LEFT JOIN stockly.recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE r.is_active = true
  AND ri.id IS NULL
)
SELECT * FROM missing_ingredients;

-- Option 1: Mark as draft (need review)
UPDATE stockly.recipes
SET is_active = false, notes = COALESCE(notes, '') || ' [FLAGGED: Missing ingredients]'
WHERE id IN (SELECT id FROM missing_ingredients);

-- Option 2: Archive
UPDATE stockly.recipes
SET is_archived = true
WHERE id IN (SELECT id FROM missing_ingredients);
```

---

## Testing Checklist

Before deploying to production:

- [ ] Run investigation queries on production database
- [ ] Apply migration to staging environment first
- [ ] Verify `check_recipe_data_integrity()` returns expected results
- [ ] Test recipe save with validation errors
- [ ] Test concurrent edit conflict detection
- [ ] Verify audit snapshots are being captured
- [ ] Test health check endpoint
- [ ] Verify API validation rejects invalid data
- [ ] Test recovery from audit log

---

## Files Created

| File                                                           | Purpose                  |
| -------------------------------------------------------------- | ------------------------ |
| `supabase/migrations/20260130000000_recipe_data_integrity.sql` | Database migration       |
| `src/lib/validation/recipeValidation.ts`                       | Client/server validation |
| `src/app/api/health/data-integrity/route.ts`                   | Health check API         |
| `docs/RECIPE_DATA_INTEGRITY.md`                                | This documentation       |

---

## Support

If you encounter issues:

1. Check the audit log for recent changes
2. Run `check_recipe_data_integrity()` to identify issues
3. Use the health check API to get current status
4. Contact support with the health check output
