# BusinessDetailsForm Syntax Error - Fixed ✅

## Issue

TypeScript compilation error in `src/components/organisation/BusinessDetailsForm.tsx`:

- Missing catch/finally block structure
- Extra closing brace causing syntax error

## Fix Applied

**File:** `src/components/organisation/BusinessDetailsForm.tsx` (lines 32-41)

**Before (broken):**

```typescript
try {
  const response = await fetch(`/api/company/get?id=${companyId}`);
    if (response.ok) {
      data = await response.json();
      error = null;
    }
  } catch (apiError) {
    console.error('API route error:', apiError);
  }
}  // Extra closing brace
```

**After (fixed):**

```typescript
try {
  const response = await fetch(`/api/company/get?id=${companyId}`);
  if (response.ok) {
    data = await response.json();
    error = null;
  } else {
    error = new Error(`Failed to fetch company: ${response.status}`);
  }
} catch (apiError) {
  console.error("API route error:", apiError);
  error = apiError;
}
```

## Changes

1. ✅ Removed extra closing brace
2. ✅ Fixed indentation
3. ✅ Added proper error handling for non-OK responses
4. ✅ Ensured error is set in catch block

## Status

✅ **FIXED** - TypeScript compilation should now pass
