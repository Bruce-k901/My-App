# Execution Plan: Remove Old Code Generations

**Status:** Ready to Execute  
**Risk Level:** Low (all items confirmed safe to remove)

## ✅ Confirmed Safe Removals

### Phase 1: Remove Playground Pages (Safest)

These are test pages with no dependencies:

- ✅ `src/app/dashboard/sops-playground/`
- ✅ `src/app/button-playground/`
- ✅ `src/app/card-playground/`
- ✅ `src/app/header-playground/`
- ✅ `src/app/design-system/`
- ✅ `src/app/sop-playground/`

### Phase 2: Remove Empty Directories

These are empty and safe to remove:

- ✅ `src/app/organization/business/`
- ✅ `src/app/organization/business-details/`
- ✅ `src/app/organization/sites/`
- ✅ `src/app/organization/users/`
- ✅ `src/app/organization/contractors/`
- ✅ `src/app/organization/documents/`
- ✅ `src/app/business-details/`
- ✅ `src/app/dashboard/organization/sites/`

### Phase 3: Remove Duplicate Pages

These have duplicates in `/dashboard/*`:

- ✅ `src/app/dashboard/organization/business-details/page.tsx` → `/dashboard/business`
- ✅ `src/app/dashboard/organization/contractors/page.tsx` → `/dashboard/assets/contractors`
- ✅ `src/app/dashboard/organization/documents/page.tsx` → `/dashboard/documents`
- ✅ `src/app/dashboard/organization/users/page.tsx` → `/dashboard/users`

### Phase 4: Fix Redirects

Update redirects before removing:

- ✅ `src/app/sites/page.tsx` - Update to redirect to `/dashboard/sites`

### Phase 5: Remove Legacy Sidebars

These are not used (HeaderLayout not used in app):

- ✅ `src/components/layout/LeftSidebar.tsx` - Not imported anywhere
- ✅ `src/components/layout/HeaderLayout.tsx` - Not used in app routes
- ✅ `src/components/layout/MainSidebar.tsx` - Only used by HeaderLayout (not used)
- ✅ `src/components/layout/ContextualSidebar.tsx` - Only used by HeaderLayout (not used)

## ⚠️ Keep (Unique or Active)

- ✅ `src/components/layouts/NewMainSidebar.tsx` - **ACTIVE** (used in dashboard layout)
- ✅ `src/app/organization/assets/page.tsx` - Has unique content
- ✅ `src/app/dashboard/organization/emergency-contacts/page.tsx` - Unique feature
- ✅ `src/app/organization/page.tsx` - Redirect page (keep for now)
- ✅ `src/app/organization/layout.tsx` - Used by redirect page

## 📋 Execution Steps

1. **Create backup branch** ✅
2. **Remove playground pages** ✅
3. **Remove empty directories** ✅
4. **Remove duplicate pages** ✅
5. **Fix redirects** ✅
6. **Remove legacy sidebars** ✅
7. **Test application** ⏳
8. **Commit changes** ⏳

## 🎯 Expected Outcome

- ~20 files/directories removed
- Single sidebar system (NewMainSidebar)
- Single route structure (/dashboard/\*)
- Cleaner, more maintainable codebase
