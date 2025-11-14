# Favicon Not Showing? Clear Cache Instructions

## The Problem

Next.js and browsers cache favicons very aggressively. Even after updating files, you might still see the old favicon.

## Quick Fix

### 1. Hard Refresh Browser

- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`
- Do this **3-4 times** - sometimes it takes multiple refreshes

### 2. Clear Browser Cache Completely

**Chrome:**

1. Press `F12` to open DevTools
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Or:**

1. Settings → Privacy → Clear browsing data
2. Select "Cached images and files"
3. Click "Clear data"

**Safari (iOS):**

1. Settings → Safari → Clear History and Website Data
2. Visit site again
3. Re-add to home screen if PWA installed

### 3. Restart Dev Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### 4. Check Files Exist

```bash
# Should exist:
src/app/icon.png          # Next.js auto-detects this
src/app/favicon.ico       # Fallback
public/favicon.ico        # Public folder
public/icon-192x192.png   # PWA icon
public/icon-512x512.png    # PWA icon
```

### 5. Test in Incognito/Private Mode

- Bypasses all cache
- Best way to verify favicon is working

## For Production (Vercel)

- Vercel CDN caches favicons
- May take 5-10 minutes to update
- Or clear Vercel cache in dashboard

## Still Not Working?

1. Check browser DevTools → Network tab
2. Filter by "favicon" or "icon"
3. Reload page
4. Check if favicon loads (should be 200 status, not 404)
5. Check the actual file path in the response
