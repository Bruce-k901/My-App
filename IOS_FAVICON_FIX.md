# iOS Favicon Fix - Important!

## The Problem

iOS Safari caches app icons **very aggressively**. Even after updating files, iOS will continue showing the old icon until you **delete and re-add the PWA**.

## Solution Steps (Must Do This!)

### 1. Delete the PWA from iOS Home Screen

1. Long-press the Checkly app icon on your home screen
2. Tap "Remove App" or the X button
3. Confirm deletion

### 2. Clear Safari Cache (Optional but Recommended)

1. Settings → Safari → Clear History and Website Data
2. This clears cached icons

### 3. Re-add the PWA

1. Open Safari and go to your Checkly app URL
2. Tap the Share button (square with arrow) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** to confirm

### 4. Verify

- The new favicon should now appear on your home screen
- If not, wait 30 seconds and check again (iOS sometimes takes a moment)

## Why This Happens

iOS Safari caches app icons in a special way that's separate from regular browser cache. The icon is stored in iOS's app database, not just browser cache. That's why:

- Hard refresh doesn't work
- Clearing browser cache doesn't work
- **You MUST delete and re-add the PWA**

## Files Updated

- ✅ `public/apple-touch-icon.png` - iOS home screen icon (180x180)
- ✅ `src/app/icon.png` - Next.js auto-detected icon
- ✅ `src/app/favicon.ico` - Fallback favicon
- ✅ `public/icon-192x192.png` - PWA icon
- ✅ `public/icon-512x512.png` - PWA icon

All icons now use your custom favicon from the Logo folder.
