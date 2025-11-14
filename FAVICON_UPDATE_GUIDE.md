# Favicon Update Guide

## ✅ What's Been Done

1. ✅ Copied new favicon from `Logo/favicon-96x96.PNG` to:
   - `public/favicon-96x96.png`
   - `public/icon-192x192.png`
   - `public/icon-512x512.png`
   - `public/apple-touch-icon.png`
   - `src/app/favicon.ico` (Next.js auto-detection)

2. ✅ Cleared Next.js build cache (`.next` folder)

3. ✅ Updated `src/app/layout.tsx` metadata to reference favicon files

## 🔄 To See Changes

### Browser Cache

Favicons are heavily cached. You need to:

1. **Hard Refresh:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - Or: `Ctrl + F5`

2. **Clear Browser Cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images
   - Safari: Settings → Safari → Clear History and Website Data
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content

3. **Restart Dev Server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### iOS (iPhone/iPad)

iOS caches icons very aggressively:

1. **Delete app from home screen** (if already installed)
2. **Clear Safari cache:**
   - Settings → Safari → Clear History and Website Data
3. **Visit site in Safari**
4. **Re-add to home screen:**
   - Share → Add to Home Screen

### Android

1. **Clear Chrome cache:**
   - Settings → Apps → Chrome → Storage → Clear Cache
2. **Uninstall PWA** (if installed)
3. **Reinstall** from browser

## 📝 Note About Icon Sizes

Your `favicon-96x96.PNG` is being used for all sizes. For best results:

- **favicon.ico** - Should be multi-size ICO (16x16, 32x32, 48x48)
- **icon-192x192.png** - Should be exactly 192x192px
- **icon-512x512.png** - Should be exactly 512x512px
- **apple-touch-icon.png** - Should be exactly 180x180px (iOS requirement)

If icons look blurry, resize them to exact sizes using an image editor.

## 🧪 Testing

1. **Check browser tab:** Should show favicon
2. **Check PWA install:** Icon should appear correctly
3. **Check iOS home screen:** Should show your favicon
4. **Check Android home screen:** Should show your favicon

## 🔍 Troubleshooting

If favicon still doesn't show:

1. **Check file exists:**

   ```bash
   ls public/favicon.ico
   ls src/app/favicon.ico
   ```

2. **Check browser DevTools:**
   - Open DevTools → Network tab
   - Filter by "favicon"
   - Reload page
   - Check if favicon loads (should be 200 status)

3. **Check HTML:**
   - View page source
   - Look for `<link rel="icon">` tags
   - Verify paths are correct

4. **Try incognito/private mode:**
   - Bypasses cache
   - Good for testing

## 📱 Next Steps

After updating favicon, you may need to:

- Wait a few minutes for CDN cache to clear (if using Vercel)
- Hard refresh multiple times
- Clear browser cache completely
- Reinstall PWA on mobile devices
