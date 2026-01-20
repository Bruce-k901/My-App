# User Creation Flow Fix

## Problem

When creating a new user via the Add User Modal, the user card doesn't appear after saving. This is due to two issues:

1. **RLS Policy Restriction**: The profiles RLS policy only allows users to see their own profile (`id = auth.uid()`). Newly created users have random UUIDs (not auth.uid()), so they're not visible to company admins.

2. **Refresh Timing**: The modal was closing before the refresh completed, potentially causing race conditions.

## Solution

### 1. Updated RLS Policies (`supabase/sql/rls_policies_authoritative.sql`)

**Before:**

```sql
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());
```

**After:**

```sql
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    id = auth.uid()
    -- OR user can see profiles in their company (for team management)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = profiles.company_id
    )
  );
```

This allows:

- Users to see their own profile
- Users to see all profiles in their company (for team management)

Similar updates were made to `profiles_insert_own` and `profiles_update_own` to allow admins/managers to create and update profiles for their company.

### 2. Improved Refresh Flow (`src/components/users/AddUserModal.tsx`)

**Before:**

```typescript
onClose();
if (onRefresh) await onRefresh();
setSaving(false);
```

**After:**

```typescript
// Refresh the user list BEFORE closing the modal to ensure the new user appears
if (onRefresh) {
  try {
    await onRefresh();
  } catch (refreshError) {
    console.error("Failed to refresh user list:", refreshError);
    // Don't block the success flow if refresh fails
  }
}

// Close modal and reset form after successful creation and refresh
onClose();
// Reset form to initial state
setForm({
  /* ... reset all fields ... */
});
setSaving(false);
```

This ensures:

- Refresh happens before modal closes
- Form is reset after successful creation
- Better error handling for refresh failures

## Next Steps

1. **Apply RLS Policy Update**: Run the updated `rls_policies_authoritative.sql` script in Supabase to update the profiles RLS policies.

2. **Test User Creation**:
   - Create a new user via the Add User Modal
   - Verify the user card appears immediately after creation
   - Verify the user can be edited and managed

3. **Verify RLS Security**: Ensure the updated policies still maintain proper security:
   - Users can only see profiles in their own company
   - Users cannot see profiles from other companies
   - Only admins/managers can create/update profiles for their company

## Files Changed

1. `supabase/sql/rls_policies_authoritative.sql` - Updated profiles RLS policies
2. `src/components/users/AddUserModal.tsx` - Improved refresh flow and form reset












