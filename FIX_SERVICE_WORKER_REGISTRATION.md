# Fix Service Worker Registration

## If You Unregistered the Wrong Service Worker

### What to Do

1. **Check Current State**:
   - Open DevTools → Application → Service Workers
   - See which service workers are currently registered

2. **Re-register the Main Service Worker**:
   - The main service worker (`sw.js`) should auto-register when you:
     - Navigate to any page (not `/admin`)
     - Or refresh the page
   - If it doesn't auto-register, you can manually trigger it:
     - Navigate to `/dashboard` or any non-admin route
     - The `PWAProvider` component will register it

3. **Unregister the Admin Service Worker** (if still present):
   - Find `admin-sw.js` in the Service Workers list
   - Click "Unregister"
   - This is the one with scope `/admin/`

4. **Clear All Service Workers** (if needed):
   - DevTools → Application → Storage → Clear site data
   - This will remove all service workers
   - Then refresh the page - only `sw.js` should register

## Expected State After Fix

**Should be registered:**

- ✅ `sw.js` (scope: `/`) - Main service worker

**Should NOT be registered:**

- ❌ `admin-sw.js` (scope: `/admin/`) - Old admin service worker

## Manual Registration (if needed)

If the service worker doesn't auto-register, you can manually register it in the browser console:

```javascript
navigator.serviceWorker
  .register("/sw.js")
  .then((reg) => console.log("Service Worker registered:", reg))
  .catch((err) => console.error("Registration failed:", err));
```

## Verify It's Working

1. Check DevTools → Application → Service Workers
2. You should see only `sw.js` registered
3. It should show "activated and is running" (green status)
4. Navigate to `/admin` routes - they should work fine (handled by the main SW)
