# Service Worker Consolidation Plan

## Current Situation

**Two Service Workers:**

1. `sw.js` - Main app (scope: `/`)
2. `admin-sw.js` - Admin section (scope: `/admin/`)

## Problems with Two Service Workers

1. **Conflicts**: Both try to control overlapping routes
2. **Confusion**: Hard to debug which SW is handling which request
3. **Maintenance**: Two files to update and maintain
4. **Errors**: The screenshot shows an error indicator on `sw.js`
5. **Cache Conflicts**: Both create separate caches that can conflict

## Solution: Consolidate to One Service Worker

The main `sw.js` already handles admin routes (it caches `/admin/*` paths). We can:

1. Remove `admin-sw.js`
2. Remove `AdminPWAProvider` component
3. Update `PWAProvider` to register on all routes (including admin)
4. Update `sw.js` to handle both main app and admin routes properly

## Benefits

- ✅ Single source of truth
- ✅ No conflicts
- ✅ Easier debugging
- ✅ Less maintenance
- ✅ Better performance (one SW to load)

## Implementation

1. Remove `public/admin-sw.js`
2. Remove `src/components/admin/AdminPWAProvider.tsx`
3. Update `src/components/pwa/PWAProvider.tsx` to register on all routes
4. Remove `AdminPWAProvider` from `src/app/admin/layout.tsx` and `src/app/admin/login/page.tsx`
5. Update `sw.js` to ensure it properly handles admin routes












