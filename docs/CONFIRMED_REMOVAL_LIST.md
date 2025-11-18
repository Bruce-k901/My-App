# Confirmed Removal List

**Date:** November 2025  
**Status:** Ready to Execute

## ✅ Confirmed: Safe to Remove

### 1. Legacy Sidebar Components ❌

- **`src/components/layout/LeftSidebar.tsx`** - Not used anywhere
- **`src/components/layout/HeaderLayout.tsx`** - Not used (only DashboardLayout is used)
- **`src/components/layout/MainSidebar.tsx`** - Not used (NewMainSidebar is used instead)
- **`src/components/layout/ContextualSidebar.tsx`** - Only used by HeaderLayout (not used)

**Note:** Keep `NewMainSidebar.tsx` - this is the active sidebar.

### 2. Empty Organization Directories ❌

- `src/app/organization/business/` - Empty
- `src/app/organization/business-details/` - Empty
- `src/app/organization/sites/` - Empty
- `src/app/organization/users/` - Empty
- `src/app/organization/contractors/` - Empty
- `src/app/organization/documents/` - Empty
- `src/app/business-details/` - Empty
- `src/app/dashboard/organization/sites/` - Empty

### 3. Duplicate Pages ❌

- `src/app/dashboard/organization/business-details/page.tsx` - Duplicate of `/dashboard/business`
- `src/app/dashboard/organization/contractors/page.tsx` - Duplicate of `/dashboard/assets/contractors`
- `src/app/dashboard/organization/documents/page.tsx` - Duplicate of `/dashboard/documents`
- `src/app/dashboard/organization/users/page.tsx` - Duplicate of `/dashboard/users`

### 4. Redirect Pages (Can Remove After Adding Redirects) ⚠️

- `src/app/sites/page.tsx` - Just redirects to `/organization/sites` (which doesn't exist)
- `src/app/organization/page.tsx` - Redirects to `/dashboard/business` (keep redirect, remove if empty)

### 5. Playground Pages ❌

- `src/app/dashboard/sops-playground/` - Testing playground
- `src/app/button-playground/` - Testing playground
- `src/app/card-playground/` - Testing playground
- `src/app/header-playground/` - Testing playground
- `src/app/design-system/` - Testing playground
- `src/app/sop-playground/` - Testing playground

## ⚠️ Keep (Unique Functionality)

- **`src/app/organization/assets/page.tsx`** - Has unique content, keep for now
- **`src/app/dashboard/organization/emergency-contacts/page.tsx`** - Unique feature, keep
- **`src/app/organization/layout.tsx`** - Used by redirect page, keep
- **`src/app/dashboard/organization/layout.tsx`** - May be used, check first

## 📋 Removal Order

1. **Remove playground pages** (safest, no dependencies)
2. **Remove empty directories** (safe, no files)
3. **Remove duplicate pages** (safe, duplicates exist)
4. **Remove legacy sidebars** (safe, not used)
5. **Fix redirects** (add proper redirects before removing redirect pages)
6. **Remove redirect pages** (after redirects are in place)

## 🎯 Expected Result

After removal:

- ✅ Single sidebar: `NewMainSidebar.tsx`
- ✅ Single route structure: `/dashboard/*`
- ✅ No duplicate pages
- ✅ No playground pages
- ✅ Cleaner codebase (~15-20 files removed)
