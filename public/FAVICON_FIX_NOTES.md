# Favicon Fix Notes

## iOS Favicon Issue

If the favicon doesn't show on iPhone/iPad:

1. **Ensure apple-touch-icon.png is 180x180 pixels**
   - iOS requires exactly 180x180px
   - Current file: `public/apple-touch-icon.png`
   - If it's a different size, resize it to 180x180px

2. **Clear browser cache**
   - iOS Safari caches icons aggressively
   - Settings → Safari → Clear History and Website Data
   - Or use Private Browsing mode to test

3. **Reinstall the app**
   - Delete the app from home screen
   - Visit the website again
   - Re-add to home screen

## Verification

To check if icons are correct:

- Visit your site in Safari on iOS
- Tap Share → Add to Home Screen
- The icon should appear correctly

## File Requirements

- `apple-touch-icon.png` - Must be 180x180px for iOS
- `icon-192x192.png` - 192x192px for Android
- `icon-512x512.png` - 512x512px for Android
- `favicon.ico` - Standard favicon (16x16, 32x32, 48x48)

All files should be in the `public/` folder.
