# Site Filtering Pattern

## Overview

When "All Sites" is selected in the site selector, the `siteId` value becomes the string `"all"`, which is not a valid UUID. This causes 400 errors when trying to filter database queries by `site_id`.

## Solution

Always check if `siteId` is valid before applying site filters:

```typescript
// ❌ WRONG - Will cause 400 error when siteId is "all"
if (siteId) {
  query = query.eq("site_id", siteId);
}

// ✅ CORRECT - Only filters when siteId is a valid UUID
if (siteId && siteId !== "all") {
  query = query.eq("site_id", siteId);
}
```

## Utility Functions

We've created utility functions in `src/lib/supabaseHelpers.ts`:

### `isValidSiteIdForFilter(siteId)`

Checks if a siteId is valid for filtering (not null, undefined, empty, or "all")

```typescript
import { isValidSiteIdForFilter } from "@/lib/supabaseHelpers";

if (isValidSiteIdForFilter(siteId)) {
  query = query.eq("site_id", siteId);
}
```

### `applySiteFilter(query, siteId)`

Safely applies site_id filter to a Supabase query

```typescript
import { applySiteFilter } from "@/lib/supabaseHelpers";

let query = supabase.from("table").select("*").eq("company_id", companyId);
query = applySiteFilter(query, siteId);
```

## Files Updated

The following files have been updated to use the correct pattern:

### Task Pages

- `src/app/dashboard/tasks/page.tsx`
- `src/app/dashboard/tasks/completed/page.tsx`
- `src/app/dashboard/checklists/page.tsx`

### Stockly Reports

- `src/app/dashboard/stockly/reports/page.tsx`
- `src/app/dashboard/stockly/reports/variance/page.tsx`
- `src/app/dashboard/stockly/reports/supplier-spend/page.tsx`
- `src/app/dashboard/stockly/reports/dead-stock/page.tsx`
- `src/app/dashboard/stockly/reports/stock-value/page.tsx`
- `src/app/dashboard/stockly/reports/gp/page.tsx`
- `src/app/dashboard/stockly/reports/wastage/page.tsx`
- `src/app/dashboard/stockly/sales/page.tsx`

## For Future Development

When adding new pages that filter by `site_id`:

1. **Always check for "all"**: Use `if (siteId && siteId !== 'all')` before filtering
2. **Use utility functions**: Consider using `applySiteFilter()` or `isValidSiteIdForFilter()` for consistency
3. **Test with "All Sites"**: Always test your queries with "All Sites" selected to ensure no 400 errors

## Example Implementation

```typescript
async function loadData() {
  if (!companyId) return;

  let query = supabase.from("my_table").select("*").eq("company_id", companyId);

  // Only filter by site_id if it's a valid UUID (not "all")
  if (siteId && siteId !== "all") {
    query = query.eq("site_id", siteId);
  }

  const { data, error } = await query;
  // ... handle response
}
```
