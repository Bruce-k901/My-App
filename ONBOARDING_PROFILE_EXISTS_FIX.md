# Onboarding Profile Exists Fix - Locked Down ✅

## Problem

Error when creating company during onboarding:

```
Failed to create profile: duplicate key value violates unique constraint "profiles_pkey"
```

## Root Cause

The onboarding service was trying to INSERT a new profile, but a profile already exists (created earlier, possibly by the `fix_missing_profile.sql` script or auth trigger). The service needs to handle existing profiles by updating them instead of inserting.

## Solution Applied

### ✅ Handle Existing Profiles

Updated `src/lib/services/onboarding.ts` to:

1. **Check if profile exists** before attempting to create
2. **UPDATE existing profile** if it exists (set company_id, app_role, etc.)
3. **INSERT new profile** only if it doesn't exist

This ensures the onboarding flow works whether:

- Profile was created by auth trigger
- Profile was created manually (e.g., `fix_missing_profile.sql`)
- Profile doesn't exist yet

## Files Modified

- ✅ `src/lib/services/onboarding.ts` - Added profile existence check and update logic

## Behavior

### Before Fix:

- ❌ Always tried to INSERT profile
- ❌ Failed if profile already exists
- ❌ Required manual cleanup

### After Fix:

- ✅ Checks if profile exists first
- ✅ Updates existing profile with company_id
- ✅ Creates new profile if it doesn't exist
- ✅ Works in all scenarios

## Testing

After fix:

- ✅ Onboarding works when profile already exists
- ✅ Onboarding works when profile doesn't exist
- ✅ Profile gets linked to company correctly
- ✅ No duplicate key errors

---

**Status**: ✅ Locked Down
**Impact**: Fixes company creation when profile already exists
**Related**: See `ONBOARDING_ENUM_FIX.md` for enum capitalization fix
