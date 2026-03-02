# Admin PWA Setup - Separate Installation

The admin dashboard is now a **separate PWA** from the main Checkly app. This allows you to install them independently on your phone.

## How It Works

### Separate Service Workers

- **Main App**: Uses `/sw.js` (scoped to `/`)
- **Admin Dashboard**: Uses `/admin-sw.js` (scoped to `/admin/`)

### Separate Manifests

- **Main App**: `/manifest.json`
- **Admin Dashboard**: `/admin-manifest.json`

### Separate Icons

- **Main App**: Green favicon (`icon-*.png`)
- **Admin Dashboard**: Magenta favicon (`admin-icon-*.png`)

## Installing the Admin PWA

### On Android (Chrome)

1. Navigate to `/admin/login` in Chrome
2. Tap the menu (3 dots) → **"Install app"** or **"Add to Home Screen"**
3. The admin dashboard will install as a separate app with the magenta icon

### On iOS (Safari)

1. Navigate to `/admin/login` in Safari
2. Tap the **Share** button
3. Select **"Add to Home Screen"**
4. The admin dashboard will install as a separate app

### On Desktop (Chrome/Edge)

1. Navigate to `/admin/login` in Chrome/Edge
2. Click the install icon in the address bar (or go to Menu → Install)
3. The admin dashboard will install as a separate desktop app

## What Gets Cached

The admin service worker (`admin-sw.js`) caches:

- `/admin/login` - Login page
- `/admin` - Dashboard
- `/admin/companies` - Companies list
- `/admin/users` - Users list
- `/admin/tasks` - Task analytics
- `/admin/settings` - Settings
- Admin icons and manifest

## Key Differences

| Feature        | Main App          | Admin Dashboard        |
| -------------- | ----------------- | ---------------------- |
| Start URL      | `/`               | `/admin/login`         |
| Theme Color    | Green (`#10B981`) | Magenta (`#EC4899`)    |
| Icon           | Green favicon     | Magenta favicon        |
| Scope          | `/`               | `/admin/`              |
| Service Worker | `/sw.js`          | `/admin-sw.js`         |
| Manifest       | `/manifest.json`  | `/admin-manifest.json` |

## Troubleshooting

### Both apps install but show same content

- Clear browser cache and reinstall
- Make sure you're installing from the correct URL (`/admin/login` for admin)

### Admin PWA doesn't install

- Check that you're on `/admin/login` (not `/admin`)
- Verify `admin-sw.js` is accessible at `/admin-sw.js`
- Check browser console for service worker registration errors

### Icons not showing correctly

- Hard refresh the page (Ctrl+Shift+R)
- Clear browser cache
- Verify admin icon files exist in `/public/`:
  - `admin-icon-192x192.png`
  - `admin-icon-512x512.png`
  - `admin-apple-touch-icon.png`
  - `admin-favicon.ico`

## Development Notes

- Admin routes automatically use `AdminPWAProvider` (via `admin/layout.tsx`)
- Main app routes use `PWAProvider` (via root `layout.tsx`)
- The main `PWAProvider` skips registration on admin routes to avoid conflicts
- Both service workers can coexist - they're scoped differently
