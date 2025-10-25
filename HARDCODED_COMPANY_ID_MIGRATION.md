# Hardcoded Company ID Migration Guide

## Problem
The application had hardcoded company IDs in `authHelpers.ts` which created security vulnerabilities and prevented proper multi-tenant functionality.

## Changes Made

### 1. Updated `src/lib/authHelpers.ts`
- ✅ Removed hardcoded fallback company ID
- ✅ Added validation to prevent usage of hardcoded ID
- ✅ Enhanced error messages with guidance

### 2. Created `src/lib/companyHelpers.ts`
- ✅ New helper functions to get current user's company ID
- ✅ Enhanced authHelpers that automatically get company ID
- ✅ Validation functions to prevent hardcoded IDs

## How to Use the New System

### Option 1: Use Enhanced AuthHelpers (Recommended)
```typescript
import { 
  fetchFromCurrentUser, 
  insertIntoCurrentUser, 
  updateInCurrentUser 
} from "@/lib/companyHelpers";

// These functions automatically get the current user's company ID
const { data } = await fetchFromCurrentUser("assets");
const { data } = await insertIntoCurrentUser("tasks", { name: "New Task" });
```

### Option 2: Get Company ID Manually
```typescript
import { getCurrentUserCompanyId } from "@/lib/companyHelpers";
import { fetchFrom } from "@/lib/authHelpers";

// Get the current user's company ID
const companyId = await getCurrentUserCompanyId();

// Use with existing authHelpers
const { data } = await fetchFrom("assets", {}, companyId);
```

### Option 3: Use App Context (For React Components)
```typescript
import { useAppContext } from "@/context/AppContext";

function MyComponent() {
  const { companyId } = useAppContext();
  
  // Use companyId from context
  const { data } = await fetchFrom("assets", {}, companyId);
}
```

## Files That Need Updates

### High Priority
- Any files using `authHelpers.ts` functions
- Any files with hardcoded company IDs

### Check These Files
- `src/app/dashboard/sites/page.tsx` - Uses `profile?.company_id`
- `src/context/AppContext.tsx` - Has company ID logic
- `src/components/setup/CompanySetupWizard.tsx` - Company creation logic

## Migration Steps

1. **Identify Usage**: Search for files using `fetchFrom`, `insertInto`, etc.
2. **Update Imports**: Add `companyHelpers` import
3. **Replace Function Calls**: Use the `*CurrentUser` versions
4. **Test**: Ensure company ID is properly retrieved from user profile

## Example Migration

### Before
```typescript
import { fetchFrom } from "@/lib/authHelpers";

// This would fail with hardcoded ID
const { data } = await fetchFrom("assets", {}, "f99510bc-b290-47c6-8f12-282bea67bd91");
```

### After
```typescript
import { fetchFromCurrentUser } from "@/lib/companyHelpers";

// This automatically gets the current user's company ID
const { data } = await fetchFromCurrentUser("assets");
```

## Security Benefits

1. **No Hardcoded IDs**: Prevents accidental data leakage
2. **User-Specific Data**: Each user only sees their company's data
3. **Proper Validation**: Company ID is validated against user profile
4. **Error Handling**: Clear error messages when company ID is missing

## Testing

1. **Login as different users** and verify they only see their company's data
2. **Check error handling** when company ID is missing
3. **Verify RLS policies** are working correctly
4. **Test edge cases** like users without company assignments

## Rollback Plan

If issues arise, you can temporarily revert by:
1. Commenting out the hardcoded ID validation in `authHelpers.ts`
2. Adding back the fallback logic (NOT RECOMMENDED for production)

## Next Steps

1. Update all files using the old pattern
2. Test thoroughly with multiple users
3. Remove any remaining hardcoded company IDs
4. Consider adding linting rules to prevent future hardcoded IDs
