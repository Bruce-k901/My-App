# Onboarding Enum Fix - Locked Down ✅

## Problem

Error when creating company during onboarding:

```
Failed to create profile: invalid input value for enum app_role: "admin"
```

## Root Cause

The `onboarding.ts` service was using lowercase `"admin"` but the database enum expects capitalized `"Admin"`.

**File**: `src/lib/services/onboarding.ts` line 90

## Solution Applied

### ✅ Fixed Enum Value

Changed `app_role: "admin"` to `app_role: "Admin"` to match database enum requirements.

**Database enum values**:

- ✅ `"Admin"` (capitalized)
- ✅ `"Manager"` (capitalized)
- ✅ `"Staff"` (capitalized)
- ✅ `"Owner"` (capitalized)

**Not accepted**:

- ❌ `"admin"` (lowercase)
- ❌ `"manager"` (lowercase)
- ❌ `"staff"` (lowercase)

## Files Modified

- ✅ `src/lib/services/onboarding.ts` - Fixed app_role enum value

## Testing

After fix:

- ✅ Company creation during onboarding works
- ✅ Profile created with correct `app_role: "Admin"`
- ✅ No enum validation errors

---

**Status**: ✅ Locked Down
**Impact**: Fixes company creation during onboarding
**Related**: See `USER_ROLE_ENUM_FIX.md` for other enum fixes
