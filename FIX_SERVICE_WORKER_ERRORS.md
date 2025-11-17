# Fix Service Worker Errors

## Problem

You're seeing these errors:

```
sw.js:1 Uncaught (in promise) TypeError: Failed to convert value to 'Response'.
GET http://localhost:3000/_next/static/css/app/layout.css?v=1763326075489 net::ERR_FAILED
ERR_CONNECTION_REFUSED
```

## Root Cause

1. **Dev server not running** - `ERR_CONNECTION_REFUSED` means `localhost:3000` isn't running
2. **Service worker intercepting requests** - The service worker tries to fetch resources but fails when server is down
3. **Invalid response handling** - Service worker wasn't handling fetch failures gracefully

## Solutions

### ✅ Solution 1: Start Your Dev Server (Required)

```bash
npm run dev
```

The service worker errors will stop once the server is running.

### ✅ Solution 2: Unregister Service Worker (Temporary Fix)

If you want to disable the service worker temporarily:

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** next to your service worker
5. Refresh the page

### ✅ Solution 3: Fixed Service Worker (Already Done)

I've updated `public/sw.js` to handle errors gracefully:

- Returns valid empty responses when fetch fails
- Handles offline/connection errors properly
- Won't crash when dev server is down

## Quick Fix Steps

1. **Start dev server:**

   ```bash
   npm run dev
   ```

2. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Clear cached images and files
   - Or hard refresh: `Ctrl+Shift+R`

3. **Unregister old service worker:**
   - DevTools → Application → Service Workers → Unregister

4. **Refresh page**

## Why This Happens

The service worker is registered to provide:

- Offline support (PWA)
- Push notifications
- Caching for better performance

But when the dev server isn't running, it tries to intercept requests and fails.

## Prevention

The updated service worker now:

- ✅ Handles connection errors gracefully
- ✅ Returns valid responses even when server is down
- ✅ Won't crash the page

**Just make sure your dev server is running!** 🚀
