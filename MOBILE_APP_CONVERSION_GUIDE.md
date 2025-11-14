# Mobile App Conversion Guide

Converting your Next.js web app to a mobile app - **5 approaches** with pros/cons:

---

## Quick Answer: Best Options

1. **PWA (Progressive Web App)** ⭐ **RECOMMENDED**
   - Easiest, fastest, cheapest
   - Works on iOS/Android
   - Can install to home screen
   - **Time:** 1-2 days
   - **Cost:** $0

2. **Capacitor** ⭐ **SECOND BEST**
   - Wrap web app in native shell
   - Access to native features (camera, push notifications)
   - Publish to App Store/Play Store
   - **Time:** 3-5 days
   - **Cost:** $0 (App Store fees: $99/year iOS, $25 one-time Android)

3. **React Native**
   - True native app
   - Best performance
   - Requires code rewrite
   - **Time:** 2-4 weeks
   - **Cost:** $0 (App Store fees apply)

---

## 1. Progressive Web App (PWA) ⭐ RECOMMENDED

### What It Is

Your existing web app, enhanced to work like a native app. Users can "install" it to their home screen.

### Why It's Perfect for Your App

- ✅ **Zero code changes** - Works with your existing Next.js app
- ✅ **FREE** - No App Store fees
- ✅ **Fast to implement** - 1-2 days
- ✅ **Works everywhere** - iOS, Android, Desktop
- ✅ **Offline support** - Service Worker caching
- ✅ **Push notifications** - Already planning to implement
- ✅ **App-like experience** - Full screen, no browser UI
- ✅ **Easy updates** - No App Store review needed

### What Users See

```
1. Visit app in browser
2. See "Add to Home Screen" prompt
3. Click "Add"
4. App icon appears on home screen
5. Opens like native app (full screen, no browser UI)
```

### Implementation Steps

#### Step 1: Create Web App Manifest

Create `public/manifest.json`:

```json
{
  "name": "Checkly - Compliance Management",
  "short_name": "Checkly",
  "description": "Health & safety, food safety, and operational compliance for hospitality venues",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B0D13",
  "theme_color": "#10B981",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "screenshots": [
    {
      "src": "/screenshot-mobile.png",
      "sizes": "750x1334",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "New Task",
      "short_name": "Task",
      "description": "Create a new task",
      "url": "/tasks/new",
      "icons": [{ "src": "/icon-task.png", "sizes": "96x96" }]
    },
    {
      "name": "New Incident",
      "short_name": "Incident",
      "description": "Report an incident",
      "url": "/incidents/new",
      "icons": [{ "src": "/icon-incident.png", "sizes": "96x96" }]
    }
  ]
}
```

#### Step 2: Add Manifest to Layout

Update `src/app/layout.tsx`:

```typescript
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Checkly" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Step 3: Create Service Worker

Create `public/sw.js` (you'll need this for push notifications anyway):

```javascript
const CACHE_NAME = "checkly-v1";
const urlsToCache = ["/", "/dashboard", "/notifications", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request)),
  );
});
```

#### Step 4: Register Service Worker

Create `src/lib/pwa.ts`:

```typescript
"use client";

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered:", registration);
        })
        .catch((error) => {
          console.log("SW registration failed:", error);
        });
    });
  }
}

export function showInstallPrompt() {
  // This will be handled by browser's native prompt
  // You can also create custom install button
}
```

#### Step 5: Add Install Prompt Component

Create `src/components/pwa/InstallPrompt.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <Download className="h-5 w-5 text-green-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Install Checkly</h3>
          <p className="text-sm text-slate-400 mb-3">
            Add Checkly to your home screen for quick access and offline support.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleInstall} size="sm">Install</Button>
            <Button
              onClick={() => setShowPrompt(false)}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### Step 6: Create App Icons

You'll need these icon sizes:

- `public/icon-192x192.png` (192x192px)
- `public/icon-512x512.png` (512x512px)
- `public/apple-touch-icon.png` (180x180px for iOS)

**Use a tool like:**

- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

### PWA Features You Get

- ✅ **Install to home screen** - Works on iOS/Android
- ✅ **Offline support** - Service Worker caching
- ✅ **Push notifications** - Native OS notifications
- ✅ **Full screen** - No browser UI
- ✅ **App-like feel** - Standalone display mode
- ✅ **Fast loading** - Cached assets
- ✅ **Splash screen** - Custom launch screen

### Limitations

- ⚠️ **iOS limitations** - Some PWA features limited on iOS
- ⚠️ **No App Store** - Can't publish to App Store/Play Store
- ⚠️ **Discovery** - Users must visit website first

### Cost

**FREE** - No App Store fees, no hosting changes

### Time to Implement

**1-2 days**

---

## 2. Capacitor ⭐ SECOND BEST

### What It Is

Wrap your Next.js app in a native shell. Publish to App Store/Play Store.

### Why It's Great

- ✅ **Keep your code** - Minimal changes to Next.js app
- ✅ **Native features** - Camera, push notifications, file system
- ✅ **App Store** - Can publish to iOS/Android stores
- ✅ **One codebase** - Same code for web + mobile
- ✅ **Native plugins** - Access device features

### How It Works

```
Next.js App → Build → Capacitor wraps it → Native iOS/Android app
```

### Implementation Steps

#### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/push-notifications
npm install @capacitor/camera
npm install @capacitor/filesystem
```

#### Step 2: Initialize Capacitor

```bash
npx cap init
# App name: Checkly
# App ID: com.checkly.app
# Web dir: out (or .next for static export)
```

#### Step 3: Update Next.js Config

Update `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "export", // Static export for Capacitor
  images: {
    unoptimized: true, // Required for static export
  },
  // ... rest of config
};
```

#### Step 4: Build and Sync

```bash
npm run build
npx cap sync
```

#### Step 5: Open in Native IDE

```bash
# iOS (requires Mac)
npx cap open ios

# Android
npx cap open android
```

#### Step 6: Add Native Features

```typescript
// Example: Camera access
import { Camera } from "@capacitor/camera";

async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: "base64",
  });

  // Use image.data (base64)
}
```

### Capacitor Features

- ✅ **App Store publishing** - Can publish to stores
- ✅ **Native plugins** - Camera, push, file system, etc.
- ✅ **One codebase** - Same code for web + mobile
- ✅ **Native performance** - Wrapped in native shell

### Limitations

- ⚠️ **Static export required** - Can't use SSR features
- ⚠️ **App Store fees** - $99/year iOS, $25 one-time Android
- ⚠️ **Review process** - App Store review takes time
- ⚠️ **More complex** - Requires native development setup

### Cost

- **Development:** FREE
- **iOS App Store:** $99/year
- **Android Play Store:** $25 one-time

### Time to Implement

**3-5 days** (plus App Store review: 1-2 weeks)

---

## 3. React Native

### What It Is

Build a true native app using React Native. Separate codebase from web app.

### Why Consider It

- ✅ **True native** - Best performance
- ✅ **Native UI** - Platform-specific design
- ✅ **Full device access** - All native features
- ✅ **App Store** - Can publish to stores

### Why It's Challenging

- ❌ **Code rewrite** - Need to rebuild UI in React Native
- ❌ **Separate codebase** - Different from web app
- ❌ **More time** - 2-4 weeks minimum
- ❌ **Maintenance** - Two codebases to maintain

### When to Use

- ✅ Need maximum performance
- ✅ Want platform-specific UI
- ✅ Have budget for separate mobile app
- ❌ Don't use if: Want to reuse existing code

### Cost

- **Development:** FREE (but time-consuming)
- **App Store fees:** Same as Capacitor

### Time to Implement

**2-4 weeks** (full rewrite)

---

## 4. Expo (React Native Framework)

### What It Is

Easier way to build React Native apps. Still requires code rewrite.

### Why Consider It

- ✅ **Easier setup** - Simpler than raw React Native
- ✅ **Over-the-air updates** - Update without App Store
- ✅ **Managed workflow** - Less native code needed

### Why It's Still Challenging

- ❌ **Code rewrite** - Still need to rebuild UI
- ❌ **Separate codebase** - Different from web app

### When to Use

- ✅ Want React Native but easier setup
- ✅ Need over-the-air updates
- ❌ Don't use if: Want to reuse existing code

### Cost

- **Development:** FREE
- **App Store fees:** Same as Capacitor
- **Expo EAS:** $29/month (optional, for builds)

### Time to Implement

**2-3 weeks** (easier than raw React Native)

---

## 5. Native iOS/Android (Swift/Kotlin)

### What It Is

Build native apps in Swift (iOS) and Kotlin (Android).

### Why Consider It

- ✅ **Maximum performance** - Fastest possible
- ✅ **Platform-specific** - Best UX per platform
- ✅ **Full control** - Access to all native features

### Why It's Not Recommended

- ❌ **Two codebases** - iOS + Android separate
- ❌ **Most time** - 4-8 weeks minimum
- ❌ **Most expensive** - Need native developers
- ❌ **No code reuse** - Can't reuse Next.js code

### When to Use

- ✅ Need maximum performance
- ✅ Have native developers
- ✅ Budget for separate apps
- ❌ Don't use if: Want to reuse existing code

### Cost

- **Development:** $$$ (native developers)
- **App Store fees:** Same as Capacitor

### Time to Implement

**4-8 weeks** (full native development)

---

## Comparison Table

| Approach         | Time      | Cost         | Code Reuse | App Store | Native Features |
| ---------------- | --------- | ------------ | ---------- | --------- | --------------- |
| **PWA** ⭐       | 1-2 days  | $0           | 100%       | ❌        | Limited         |
| **Capacitor** ⭐ | 3-5 days  | $99-124/year | 95%        | ✅        | Full            |
| **React Native** | 2-4 weeks | $99-124/year | 30%        | ✅        | Full            |
| **Expo**         | 2-3 weeks | $99-124/year | 30%        | ✅        | Full            |
| **Native**       | 4-8 weeks | $$$          | 0%         | ✅        | Full            |

---

## Recommended Approach: PWA First, Then Capacitor

### Phase 1: PWA (Week 1)

**Why:** Fastest, cheapest, works immediately
**Result:** Users can install app to home screen, offline support, push notifications

### Phase 2: Capacitor (Week 2-3)

**Why:** If users want App Store version
**Result:** Can publish to App Store/Play Store, access to native features

---

## Implementation Roadmap

### Week 1: PWA Setup

1. ✅ Create `manifest.json`
2. ✅ Add Service Worker
3. ✅ Create app icons
4. ✅ Add install prompt
5. ✅ Test on iOS/Android

### Week 2-3: Capacitor (If Needed)

1. ✅ Install Capacitor
2. ✅ Configure Next.js for static export
3. ✅ Add native plugins (camera, push)
4. ✅ Build iOS/Android apps
5. ✅ Submit to App Stores

---

## Code Example: PWA Setup

```typescript
// src/app/layout.tsx
import { registerServiceWorker } from '@/lib/pwa';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export default function RootLayout({ children }: { children: ReactNode }) {
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10B981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
```

---

## Testing Checklist

### PWA Testing

- [ ] Manifest loads correctly
- [ ] Icons display properly
- [ ] Install prompt appears
- [ ] App installs to home screen
- [ ] Opens in standalone mode (no browser UI)
- [ ] Offline mode works
- [ ] Push notifications work

### Capacitor Testing

- [ ] App builds successfully
- [ ] Native plugins work (camera, push)
- [ ] App runs on iOS simulator
- [ ] App runs on Android emulator
- [ ] App Store submission ready

---

## Resources

- **PWA Builder**: https://www.pwabuilder.com/
- **Capacitor Docs**: https://capacitorjs.com/docs
- **React Native**: https://reactnative.dev/
- **Expo**: https://expo.dev/
- **PWA Checklist**: https://web.dev/pwa-checklist/

---

## Bottom Line

**Start with PWA** - It's free, fast, and gives you 80% of native app benefits. If users want App Store version later, add Capacitor. This approach maximizes code reuse and minimizes development time.

**PWA = 1-2 days, $0, works everywhere**
**Capacitor = 3-5 days, $99-124/year, App Store ready**

Both approaches let you reuse your existing Next.js code!
