# Migration Guide: Fix Hardcoded Company ID

## Overview
This guide helps you migrate from hardcoded company IDs to proper auth context-based company ID usage.

## Files to Update

### 1. Update AppContext.tsx
The AppContext already has `companyId` available. Make sure it's being set correctly:

```typescript
// In your auth state change handler
if (session?.user?.id) {
  await fetchProfileData(session.user.id);
  // companyId should be set from profile.company_id
}
```

### 2. Update Components Using Direct Supabase Calls

#### Before (❌ Bad):
```typescript
// Direct supabase calls without company_id
const { data } = await supabase.from("tasks").select("*");
const { data } = await supabase.from("assets").select("*").eq("site_id", siteId);
```

#### After (✅ Good):
```typescript
// Using the new helpers with companyId from context
import { useSupabaseWithAuth } from "@/lib/supabaseHelpers";
import { useAppContext } from "@/context/AppContext";

function MyComponent() {
  const { companyId } = useAppContext();
  const supabase = useSupabaseWithAuth(companyId);
  
  // Now all queries automatically include company_id
  const { data } = await supabase.fetchCompanyData("tasks");
  const { data } = await supabase.fetchSiteData("assets", siteId);
}
```

### 3. Common Patterns to Replace

#### Pattern 1: Basic Company Data Fetching
```typescript
// OLD
const { data } = await supabase.from("tasks").select("*").eq("company_id", companyId);

// NEW
const { data } = await supabase.fetchCompanyData("tasks");
```

#### Pattern 2: Site-Scoped Data
```typescript
// OLD
const { data } = await supabase.from("assets").select("*").eq("company_id", companyId).eq("site_id", siteId);

// NEW
const { data } = await supabase.fetchSiteData("assets", siteId);
```

#### Pattern 3: Inserting Data
```typescript
// OLD
const { data } = await supabase.from("tasks").insert({
  ...taskData,
  company_id: companyId
});

// NEW
const { data } = await supabase.insertCompanyData("tasks", taskData);
```

#### Pattern 4: Updating Data
```typescript
// OLD
const { data } = await supabase.from("tasks").update(taskData).eq("company_id", companyId).eq("id", taskId);

// NEW
const { data } = await supabase.updateCompanyData("tasks", taskData, { id: taskId });
```

### 4. Files That Need Updates

Based on the grep results, these files likely need updates:

1. `src/context/AppContext.tsx` - ✅ Already has companyId
2. `src/hooks/useDataPrefetcher.ts` - Update to use companyId
3. `src/components/dashboard/DashboardRouter.tsx` - Update preloadData function
4. `src/app/dashboard/assets/page.tsx` - Update asset queries
5. `src/components/contractors/ContractorForm.tsx` - Update contractor queries
6. `src/app/notifications/page.tsx` - Update notification queries
7. `src/app/incidents/page.tsx` - Update incident queries
8. `src/components/tasks/StaffTaskList.tsx` - Update task queries
9. `src/app/tasks/components/TaskList.tsx` - Update task queries
10. `src/app/reports/temperature/page.tsx` - Update temperature queries

### 5. Step-by-Step Migration Process

#### Step 1: Update useDataPrefetcher.ts
```typescript
// Add companyId parameter to prefetchData function
const prefetchData = useCallback(async (
  table: string,
  companyId: string, // Add this parameter
  select: string = '*',
  filters: Record<string, any> = {},
  options: PrefetchOptions = {}
) => {
  // Use fetchCompanyData instead of direct supabase calls
  const { data, error } = await fetchCompanyData(table, companyId, select, filters);
  // ... rest of function
});
```

#### Step 2: Update DashboardRouter.tsx
```typescript
// Update preloadData function to use companyId
async function preloadData(role: string, companyId: string, siteId?: string | null): Promise<Preload> {
  switch (role) {
    case "Staff": {
      const [{ data: tasks }, { data: incidents }, { data: temperature }] = await Promise.all([
        fetchSiteData("tasks", companyId, siteId ?? ""),
        fetchSiteData("incidents", companyId, siteId ?? ""),
        fetchSiteData("temperature_logs", companyId, siteId ?? ""),
      ]);
      return { tasks: tasks ?? [], incidents: incidents ?? [], temperature: temperature ?? [] };
    }
    // ... rest of cases
  }
}
```

#### Step 3: Update Individual Components
For each component that uses `supabase.from()`:

1. Import the new helpers:
```typescript
import { useSupabaseWithAuth } from "@/lib/supabaseHelpers";
import { useAppContext } from "@/context/AppContext";
```

2. Get companyId from context:
```typescript
const { companyId } = useAppContext();
const supabase = useSupabaseWithAuth(companyId);
```

3. Replace direct supabase calls with helper methods.

### 6. Testing the Migration

After updating each file:

1. **Test Authentication**: Ensure users can only see their company's data
2. **Test Data Isolation**: Verify that users from different companies can't access each other's data
3. **Test Performance**: Ensure queries are still performant with the new structure
4. **Test Error Handling**: Verify proper error messages when companyId is missing

### 7. Rollback Plan

If issues arise:

1. Keep the old `authHelpers.ts` as backup
2. Revert individual files one by one
3. Test each revert to ensure functionality

### 8. Benefits After Migration

- ✅ **Security**: No more hardcoded company IDs
- ✅ **Consistency**: All queries automatically include company_id
- ✅ **Maintainability**: Centralized data access patterns
- ✅ **Type Safety**: Better TypeScript support
- ✅ **Performance**: Optimized queries with proper filtering

## Next Steps

1. Start with `useDataPrefetcher.ts` and `DashboardRouter.tsx`
2. Update one component at a time
3. Test thoroughly after each change
4. Remove old `authHelpers.ts` once migration is complete
