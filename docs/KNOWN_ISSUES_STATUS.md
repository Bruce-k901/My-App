# Known Issues Status Report

**Date:** February 2025  
**Purpose:** Status check on issues listed in CURRENT_ARCHITECTURE.md (lines 131-136)

---

## 📊 Issue Status Overview

| Issue                  | Status           | Priority | Notes                                  |
| ---------------------- | ---------------- | -------- | -------------------------------------- |
| AppContext Performance | ⚠️ **CONFIRMED** | High     | Needs optimization (see details below) |
| Duplicate Sites Pages  | ✅ **RESOLVED**  | High     | Only 1 main implementation exists      |
| Route Conflicts        | ✅ **RESOLVED**  | High     | All routes redirect to `/dashboard/*`  |

---

## 1. ✅ Duplicate Sites Pages - RESOLVED

### Status: **FIXED** ✅

### Current State:

- ✅ **Main Implementation:** `/dashboard/sites/page.tsx` (273 lines) - Active and working
- ✅ **Redirect:** `/organization/sites/page.tsx` → redirects to `/dashboard/sites`
- ✅ **Redirect:** `/sites/page.tsx` → redirects to `/dashboard/sites`
- ✅ **Setup Page:** `/setup/sites/page.tsx` - Different purpose (onboarding), OK to keep
- ✅ **Deleted:** `/dashboard/organization/sites/` - Empty directory (already removed)

### Conclusion:

**Only ONE main implementation exists.** The "3 implementations" issue mentioned in the architecture doc appears to be outdated. All old routes now redirect properly.

### Recommendation:

✅ **Mark as RESOLVED** - No action needed

---

## 2. ✅ Route Conflicts - RESOLVED

### Status: **FIXED** ✅

### Current State:

After recent stabilization fixes:

- ✅ All `/organization/*` routes redirect to `/dashboard/*`
- ✅ All `/dashboard/organization/*` routes redirect to `/dashboard/*`
- ✅ No conflicting route handlers
- ✅ Consistent route structure (`/dashboard/*`)

### Files Fixed:

- `OrgSubHeader.tsx` - Updated all links to `/dashboard/*`
- `QuickActions.tsx` - Fixed broken route
- `SiteToolbar.tsx` - Fixed back button route
- Created redirect pages for backward compatibility

### Conclusion:

**All route conflicts are resolved.** The route structure is now consistent and all navigation works correctly.

### Recommendation:

✅ **Mark as RESOLVED** - Already fixed in stabilization work

---

## 3. ⚠️ AppContext Performance - CONFIRMED

### Status: **NEEDS OPTIMIZATION** ⚠️

### Problem Identified:

#### Issue #1: Context Value Object Recreated on Every Render

```typescript
// Line 405-417 in AppContext.tsx
const value = {
  user,
  session,
  profile,
  companyId: profile?.company_id || user?.user_metadata?.company_id || null,
  company,
  siteId: profile?.site_id || user?.user_metadata?.site_id || null,
  role: profile?.app_role || user?.user_metadata?.app_role || 'Staff',
  userId: user?.id || null,
  loading,
  signOut,
  setCompany,
};

return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```

**Problem:** This object is recreated on every render, causing ALL consumers (148 files) to re-render even when values haven't changed.

#### Issue #2: High Consumer Count

- **148 files** use `useAppContext()`
- Every AppContext re-render triggers 148 component re-renders
- This is a performance bottleneck

#### Issue #3: Computed Values on Every Render

```typescript
companyId: profile?.company_id || user?.user_metadata?.company_id || null,
role: profile?.app_role || user?.user_metadata?.app_role || 'Staff',
```

These computed values are recalculated on every render, even if `profile` and `user` haven't changed.

### Impact:

- ⚠️ Unnecessary re-renders across 148 components
- ⚠️ Potential performance degradation on pages with many AppContext consumers
- ⚠️ React DevTools will show excessive re-renders

### Recommended Fixes:

#### Fix #1: Memoize Context Value

```typescript
import { useMemo } from "react";

// Inside AppProvider component
const value = useMemo(
  () => ({
    user,
    session,
    profile,
    companyId: profile?.company_id || user?.user_metadata?.company_id || null,
    company,
    siteId: profile?.site_id || user?.user_metadata?.site_id || null,
    role: profile?.app_role || user?.user_metadata?.app_role || "Staff",
    userId: user?.id || null,
    loading,
    signOut,
    setCompany,
  }),
  [user, session, profile, company, loading, signOut, setCompany],
);
```

#### Fix #2: Split Context (Optional, for advanced optimization)

If needed, split into multiple contexts:

- `AuthContext` (user, session, loading)
- `ProfileContext` (profile, company, role)
- `CompanyContext` (company, companyId)

This would allow components to subscribe only to what they need.

### Priority:

- **High** - Affects 148 components, but may not be causing noticeable performance issues yet
- **Fix before:** Large-scale feature additions that increase context consumers

### Recommendation:

⚠️ **Keep as KNOWN ISSUE** - Document the fix but don't rush to implement unless performance issues are observed

---

## 📝 Summary

### ✅ Resolved (2/3):

1. ✅ Duplicate Sites Pages - Only 1 implementation exists
2. ✅ Route Conflicts - All routes redirect correctly

### ⚠️ Confirmed (1/3):

3. ⚠️ AppContext Performance - Needs optimization but not critical yet

---

## 🎯 Recommendations

### Update CURRENT_ARCHITECTURE.md:

```markdown
## ⚠️ Known Issues & Technical Debt

### High Priority

1. **AppContext Performance** - Needs optimization (causing re-renders) ⚠️
   - Context value object recreated on every render
   - 148 components re-render on every AppContext change
   - **Fix:** Memoize context value with useMemo
   - **Priority:** High (but not blocking)

### Resolved ✅

2. ~~**Duplicate Sites Pages**~~ - ✅ RESOLVED (only 1 implementation exists)
3. ~~**Route Conflicts**~~ - ✅ RESOLVED (all routes redirect to `/dashboard/*`)
```

---

## 🚀 Next Steps

1. **Update CURRENT_ARCHITECTURE.md** - Reflect resolved issues
2. **Monitor AppContext Performance** - Watch for performance issues in production
3. **Plan AppContext Optimization** - Add to backlog for next optimization sprint

---

**Last Updated:** February 2025
