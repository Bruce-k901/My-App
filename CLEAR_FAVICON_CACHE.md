# Clear Favicon Cache - Instructions

The favicon is still showing an old version due to browser and service worker caching. Follow these steps:

## Step 1: Clear Browser Cache

### Chrome/Edge:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**
4. Or go to: Settings → Privacy → Clear browsing data → Cached images and files

### Firefox:

1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Click "Clear Now"
4. Hard refresh: `Ctrl + Shift + R`

### Safari:

1. Press `Cmd + Option + E` to clear cache
2. Hard refresh: `Cmd + Shift + R`

## Step 2: Unregister Service Worker

The service worker is caching the favicon. Unregister it:

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Service Workers** in the left sidebar
4. Click **Unregister** next to your service worker
5. Or go to **Cache Storage** and delete all caches

## Step 3: Clear Next.js Build Cache

I've already cleared the `.next` directory. Restart your dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Step 4: Hard Refresh

After clearing caches:

- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

## Step 5: Verify Favicon

1. Open: `http://localhost:3000/favicon.ico?v=3`
2. You should see the correct favicon
3. If you see the old one, the browser is still caching - try incognito mode

## What I Changed

1. ✅ Updated service worker cache version from `v1` to `v2` (forces cache refresh)
2. ✅ Added favicon exclusion in service worker (won't cache favicons anymore)
3. ✅ Updated favicon version from `?v=2` to `?v=3` in layout.tsx
4. ✅ Cleared Next.js build cache

## Still Not Working?

Try these additional steps:

1. **Close all browser tabs** for localhost:3000
2. **Clear browser data completely**:
   - Chrome: Settings → Privacy → Clear browsing data → All time
   - Select "Cached images and files"
3. **Restart browser**
4. **Open in incognito/private mode** to test without cache
5. **Check the actual file**: Visit `http://localhost:3000/favicon.ico` directly

The favicon should now load correctly!
