# PWA Icon Generation Guide

## Quick Setup

You need two icon files:

- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

## Option 1: Use Online Tool (Easiest)

1. Go to https://realfavicongenerator.net/
2. Upload `public/assets/logo.png`
3. Configure settings:
   - Android Chrome: ✅ Enabled
   - Size: 192x192 and 512x512
4. Generate and download
5. Place files in `public/` folder:
   - `android-chrome-192x192.png` → rename to `icon-192x192.png`
   - `android-chrome-512x512.png` → rename to `icon-512x512.png`

## Option 2: Use Image Editor

1. Open `public/assets/logo.png` in any image editor
2. Create new image: 512x512 pixels
3. Center your logo (leave padding for small sizes)
4. Export as `icon-512x512.png`
5. Resize to 192x192 pixels
6. Export as `icon-192x192.png`
7. Place both in `public/` folder

## Option 3: Temporary Placeholder

If you need to test immediately, create simple colored squares:

1. Create 512x512px image with background color #10B981
2. Add white "C" text in center
3. Save as `icon-512x512.png`
4. Resize to 192x192px
5. Save as `icon-192x192.png`

## Icon Requirements

- ✅ PNG format
- ✅ Square (equal width/height)
- ✅ Exact sizes: 192x192 and 512x512
- ✅ High contrast (readable on dark backgrounds)
- ✅ Simple design (works at small sizes)

## Testing

After creating icons:

1. Restart dev server: `npm run dev`
2. Open http://localhost:3000
3. Check DevTools > Application > Manifest
4. Verify icons show correctly
