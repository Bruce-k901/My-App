# Service Worker Crash Analysis & Fix

## What Happened

Your app crashed with repeated service worker errors:

```
sw.js:100 [SW] Fetch failed: TypeError: Failed to fetch
    at sw.js:80:16
```

This error was repeating multiple times, indicating the service worker was stuck in a retry loop.

## Root Cause

The service worker was attempting to fetch resources from the network, but:

1. **Server was down** - The Next.js dev server or API was unavailable
2. **Network issue** - Connection was lost or unstable
3. **No rate limiting** - Service worker kept retrying failed fetches indefinitely
4. **Error propagation** - Errors were logged but still propagated, causing crashes

### Why Service Worker Errors Are Different

Service workers run in a **separate thread** from your React app, so:

- ❌ React ErrorBoundary **cannot catch** service worker errors
- ❌ Regular try/catch in React components **cannot catch** service worker errors
- ✅ Service worker errors must be handled **within the service worker itself**

## Safeguards in Place

### 1. ✅ React ErrorBoundary (For React Errors)

**Location:** `src/components/ErrorBoundary.tsx`

- Catches JavaScript errors in React components
- Prevents "white screen of death"
- Shows user-friendly error UI
- **Limitation:** Cannot catch service worker errors (different thread)

### 2. ✅ Service Worker Error Handling (Now Improved)

**Location:** `public/sw.js`

**Before:**

- Basic error handling with `.catch()`
- Errors logged but still propagated
- No rate limiting for failed fetches
- Could retry indefinitely

**After (Fixed):**

- ✅ **Rate limiting** - Max 3 retries per URL with 5-second delay
- ✅ **Timeout protection** - 10-second timeout for fetch requests
- ✅ **Silent error handling** - Errors don't propagate to crash the app
- ✅ **Global error handlers** - Catch unhandled promise rejections
- ✅ **Graceful fallbacks** - Returns empty responses instead of crashing
- ✅ **Cache-first strategy** - Uses cached content when network fails

### 3. ✅ Network Error Handling in Components

**Location:** Various components (e.g., `DashboardProvider.tsx`)

- Timeout protection (5 seconds per query)
- `Promise.allSettled()` to handle partial failures
- Fallback to empty arrays on error
- Error logging for debugging

### 4. ✅ React Query Error Handling

**Location:** `src/providers/ReactQueryProvider.tsx`

- Automatic retry (1 attempt)
- Stale time management
- Cache management
- Error boundaries for query errors

## What Was Fixed

### Service Worker Improvements (`public/sw.js`)

1. **Rate Limiting System**

   ```javascript
   - Tracks failed fetches per URL
   - Max 3 retries with 5-second delay
   - Auto-resets after 10 seconds of no failures
   ```

2. **Timeout Protection**

   ```javascript
   - 10-second timeout for all fetch requests
   - Prevents hanging requests
   ```

3. **Global Error Handlers**

   ```javascript
   - Catches unhandled errors
   - Catches unhandled promise rejections
   - Prevents errors from crashing the service worker
   ```

4. **Improved Error Handling**
   ```javascript
   - Silent handling for non-critical errors (favicons)
   - Graceful fallbacks for all request types
   - Cache-first strategy when network fails
   ```

## How to Prevent This in the Future

### For Developers

1. **Check Server Status**
   - Ensure Next.js dev server is running (`npm run dev`)
   - Check API endpoints are accessible
   - Verify network connectivity

2. **Monitor Service Worker**
   - Open DevTools → Application → Service Workers
   - Check for errors in console
   - Unregister service worker if needed (DevTools → Application → Service Workers → Unregister)

3. **Clear Service Worker Cache**
   - DevTools → Application → Cache Storage → Delete all
   - DevTools → Application → Service Workers → Unregister
   - Hard refresh (Ctrl+Shift+R)

### For Production

1. **Error Monitoring**
   - Consider adding Sentry or similar for error tracking
   - Monitor service worker errors separately
   - Set up alerts for repeated failures

2. **Health Checks**
   - Implement API health check endpoints
   - Service worker can check health before fetching
   - Graceful degradation when services are down

3. **Offline Support**
   - Service worker now handles offline gracefully
   - Cached content serves when network fails
   - Empty responses prevent crashes

## Testing the Fix

1. **Simulate Network Failure**

   ```javascript
   // In browser console:
   // Stop dev server, then refresh page
   // Service worker should handle errors gracefully
   ```

2. **Check Error Logs**
   - Open DevTools → Console
   - Should see warnings (not errors) for failed fetches
   - Should NOT see repeated crash errors

3. **Verify Offline Behavior**
   - Go offline (DevTools → Network → Offline)
   - Refresh page
   - App should load cached content or show offline message
   - Should NOT crash

## Related Files

- `public/sw.js` - Service worker (fixed)
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/lib/pwa.ts` - Service worker registration
- `src/components/providers/DashboardProvider.tsx` - Network error handling example
- `src/providers/ReactQueryProvider.tsx` - Query error handling

## Summary

**Problem:** Service worker was crashing due to unhandled fetch failures when server was down.

**Solution:** Added comprehensive error handling, rate limiting, timeouts, and graceful fallbacks in the service worker.

**Result:** Service worker now handles network failures gracefully without crashing the app.

**Status:** ✅ **FIXED** - Service worker errors are now handled gracefully with proper safeguards in place.
