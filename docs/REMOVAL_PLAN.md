# Code Removal Plan: Streamlining Code Generations

**Created:** November 2025  
**Purpose:** Remove old code generations, keep only the latest implementations

## 🎯 Goal

Remove all duplicate/old code generations and keep only:

- **Latest route structure:** `/dashboard/*` (per ADR-001)
- **Latest sidebar:** `NewMainSidebar` (actually being used in dashboard layout)
- **Latest pages:** `/dashboard/*` implementations

## 📊 Current State Analysis

### Sidebar Systems

1. **`NewMainSidebar.tsx`** ✅ **KEEP** - Actually used in `dashboard/layout.tsx`
2. **`MainSidebar.tsx`** ⚠️ **CHECK** - Used in `HeaderLayout.tsx` (but HeaderLayout may not be used)
3. **`ContextualSidebar.tsx`** ⚠️ **CHECK** - Used in `HeaderLayout.tsx` (may not be used)
4. **`LeftSidebar.tsx`** ❌ **REMOVE** - Legacy, not actively used

### Route Structures

#### `/dashboard/*` ✅ **KEEP** - Primary structure (ADR-001)

- `/dashboard/sites` ✅ Keep
- `/dashboard/business` ✅ Keep
- `/dashboard/users` ✅ Keep
- `/dashboard/documents` ✅ Keep
- `/dashboard/assets/*` ✅ Keep
- All other `/dashboard/*` pages ✅ Keep

#### `/organization/*` ❌ **REMOVE** - Old structure

- `/organization/page.tsx` - Redirects to `/dashboard/business` ✅ Can remove (redirect handled)
- `/organization/business` - Empty directory ❌ Remove
- `/organization/business-details` - Empty directory ❌ Remove
- `/organization/sites` - Empty directory ❌ Remove
- `/organization/users` - Empty directory ❌ Remove
- `/organization/contractors` - Empty directory ❌ Remove
- `/organization/documents` - Empty directory ❌ Remove
- `/organization/assets` - Has page.tsx ⚠️ Check if used
- `/organization/layout.tsx` - May be used by redirect page ⚠️ Check

#### `/dashboard/organization/*` ❌ **REMOVE** - Hybrid structure

- `/dashboard/organization/business-details/page.tsx` ❌ Remove (duplicate of `/dashboard/business`)
- `/dashboard/organization/contractors/page.tsx` ❌ Remove (duplicate of `/dashboard/assets/contractors`)
- `/dashboard/organization/documents/page.tsx` ❌ Remove (duplicate of `/dashboard/documents`)
- `/dashboard/organization/users/page.tsx` ❌ Remove (duplicate of `/dashboard/users`)
- `/dashboard/organization/emergency-contacts/page.tsx` ⚠️ Check if unique
- `/dashboard/organization/sites` - Empty directory ❌ Remove
- `/dashboard/organization/layout.tsx` ⚠️ Check if used

#### Top-level routes

- `/sites/page.tsx` ⚠️ Check if used
- `/business-details` - Empty directory ❌ Remove

### Playground Pages ❌ **REMOVE ALL**

- `/dashboard/sops-playground` ❌ Remove
- `/button-playground` ❌ Remove
- `/card-playground` ❌ Remove
- `/header-playground` ❌ Remove
- `/design-system` ❌ Remove
- `/sop-playground` ❌ Remove

## ✅ Confirmed: What to Keep

### Sidebars

- ✅ **`NewMainSidebar.tsx`** - Used in dashboard layout
- ⚠️ **`MainSidebar.tsx`** - Check if HeaderLayout is used anywhere
- ⚠️ **`ContextualSidebar.tsx`** - Check if HeaderLayout is used anywhere

### Routes

- ✅ **All `/dashboard/*` pages** - Primary structure
- ✅ **`/organization/page.tsx`** - Keep redirect (temporary)
- ✅ **`/organization/layout.tsx`** - Keep for redirect page

## ❌ Confirmed: What to Remove

### Sidebars

- ❌ **`LeftSidebar.tsx`** - Legacy, not used

### Routes

- ❌ **`/organization/business`** - Empty directory
- ❌ **`/organization/business-details`** - Empty directory
- ❌ **`/organization/sites`** - Empty directory
- ❌ **`/organization/users`** - Empty directory
- ❌ **`/organization/contractors`** - Empty directory
- ❌ **`/organization/documents`** - Empty directory
- ❌ **`/dashboard/organization/business-details`** - Duplicate
- ❌ **`/dashboard/organization/contractors`** - Duplicate
- ❌ **`/dashboard/organization/documents`** - Duplicate
- ❌ **`/dashboard/organization/users`** - Duplicate
- ❌ **`/dashboard/organization/sites`** - Empty directory
- ❌ **`/business-details`** - Empty directory

### Playground Pages

- ❌ **All playground pages** (6 total)

## ⚠️ Need to Check Before Removing

1. **`HeaderLayout.tsx`** - Is it used anywhere?
   - Uses `MainSidebar` and `ContextualSidebar`
   - If not used, can remove all 3 components

2. **`/organization/assets/page.tsx`** - Is it unique or duplicate?

3. **`/dashboard/organization/emergency-contacts/page.tsx`** - Is it unique?

4. **`/sites/page.tsx`** - Is it used or can redirect?

5. **`/dashboard/organization/layout.tsx`** - Is it used?

## 📋 Removal Steps

### Phase 1: Check Dependencies (30 min)

```bash
# Check if HeaderLayout is used
grep -r "HeaderLayout" src/app/

# Check if LeftSidebar is used
grep -r "LeftSidebar" src/

# Check if organization routes are linked anywhere
grep -r "/organization/" src/ --exclude-dir=node_modules

# Check if dashboard/organization routes are linked
grep -r "/dashboard/organization/" src/ --exclude-dir=node_modules
```

### Phase 2: Remove Empty Directories (5 min)

```bash
# Remove empty organization subdirectories
rm -rf src/app/organization/business
rm -rf src/app/organization/business-details
rm -rf src/app/organization/sites
rm -rf src/app/organization/users
rm -rf src/app/organization/contractors
rm -rf src/app/organization/documents
rm -rf src/app/business-details
rm -rf src/app/dashboard/organization/sites
```

### Phase 3: Remove Duplicate Pages (10 min)

```bash
# Remove duplicate dashboard/organization pages
rm -rf src/app/dashboard/organization/business-details
rm -rf src/app/dashboard/organization/contractors
rm -rf src/app/dashboard/organization/documents
rm -rf src/app/dashboard/organization/users
```

### Phase 4: Remove Playground Pages (5 min)

```bash
rm -rf src/app/dashboard/sops-playground
rm -rf src/app/button-playground
rm -rf src/app/card-playground
rm -rf src/app/header-playground
rm -rf src/app/design-system
rm -rf src/app/sop-playground
```

### Phase 5: Remove Legacy Sidebar (5 min)

```bash
# After confirming LeftSidebar is not used
rm -rf src/components/layout/LeftSidebar.tsx
```

### Phase 6: Add Redirects (10 min)

Add redirects for any removed routes that might be bookmarked:

```typescript
// src/app/dashboard/organization/page.tsx (if doesn't exist)
import { redirect } from "next/navigation";
export default function Page() {
  redirect("/dashboard/business");
}
```

### Phase 7: Test Everything (15 min)

```bash
npm run dev
# Test all routes
npm run test tests/critical-paths.test.ts
```

## 🎯 Expected Outcome

After removal:

- ✅ Single sidebar system (`NewMainSidebar`)
- ✅ Single route structure (`/dashboard/*`)
- ✅ No duplicate pages
- ✅ No playground pages
- ✅ Cleaner codebase
- ✅ Easier maintenance

## 📝 Notes

- Keep redirects temporarily for backward compatibility
- Remove redirects after 2-4 weeks (monitor usage)
- Update documentation after removal
- Test thoroughly before committing
