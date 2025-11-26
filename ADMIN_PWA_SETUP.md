# Admin PWA Setup Guide

## Overview

The admin dashboard has been configured as a Progressive Web App (PWA) with enhanced features for platform administrators.

## Inverted Favicon Setup

✅ **Setup Complete!** The admin icon files have been created from your favicon in `public/logo`.

### Current Setup

The following admin icon files have been created in `/public`:

- `admin-icon-192x192.png` (192x192 pixels)
- `admin-icon-512x512.png` (512x512 pixels)
- `admin-apple-touch-icon.png` (180x180 pixels)

### To Update Icons

If you want to use a different favicon or update the icons:

1. **Place your inverted favicon in `/public/logo/`** with one of these names:
   - `favicon.png`
   - `icon.png`
   - `admin-icon.png`
   - `inverted-favicon.png`
   - Or any image file (`.png`, `.ico`, `.svg`, `.jpg`)

2. **Run the setup script:**

   ```powershell
   powershell -ExecutionPolicy Bypass -File "scripts/setup-admin-icons.ps1"
   ```

3. **For proper sizing**, install ImageMagick and the script will automatically resize icons:
   - Download: https://imagemagick.org/script/download.php
   - Or manually resize your icons to the correct dimensions

## PWA Features Enabled

### 1. **Admin Shortcuts**

The manifest includes quick access shortcuts for:

- Admin Dashboard (`/admin`)
- Admin Companies (`/admin/companies`)
- Admin Users (`/admin/users`)

### 2. **Service Worker Caching**

Admin routes are now cached for offline access:

- `/admin`
- `/admin/companies`
- `/admin/users`
- `/admin/tasks`

### 3. **Install Prompt**

Users can install the admin dashboard as a standalone app on their device.

## Testing the PWA

1. **Chrome/Edge:**
   - Open DevTools → Application → Manifest
   - Check "Add to homescreen" option
   - Test install prompt

2. **Mobile:**
   - Open admin dashboard in mobile browser
   - Look for "Add to Home Screen" prompt
   - Install and test offline functionality

## Icon Requirements

- **192x192**: Minimum size for Android
- **512x512**: Recommended for high-DPI displays
- **180x180**: Apple touch icon (optional but recommended)
- **Format**: PNG with transparency
- **Design**: Should be inverted/light version suitable for dark admin theme

## Next Steps

1. ✅ Admin icons are set up and ready
2. Test the install prompt on different devices
3. Verify offline functionality works correctly
4. Customize manifest.json if needed (name, description, etc.)

### Note on Icon Sizing

The current icons are copies of your source file. For optimal PWA performance:

- Install ImageMagick and re-run `scripts/setup-admin-icons.ps1` to auto-resize
- Or manually resize your source favicon to 192x192, 512x512, and 180x180 pixels
