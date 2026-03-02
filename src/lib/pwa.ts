'use client';

/**
 * PWA Utility Functions
 * Handles service worker registration, update detection, and install prompts
 */

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Register service worker and set up update detection
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    const doRegister = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          swRegistration = registration;

          // Check if there's already a waiting worker (e.g. from a previous visit)
          if (registration.waiting) {
            console.log('[PWA] Update already waiting — prompting user');
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
          }

          // Listen for new workers being installed
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              // New SW is installed and waiting to activate
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version installed — prompting user');
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          });

          // Start periodic update checks
          startPeriodicUpdateChecks(registration);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    };

    // If the page has already loaded (common in PWA standalone mode where
    // React hydrates after load), register immediately. Otherwise wait for load.
    if (document.readyState === 'complete') {
      doRegister();
    } else {
      window.addEventListener('load', doRegister);
    }

    // When a new SW takes control, reload to use updated assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] New service worker activated — reloading');
      window.location.reload();
    });
  } else {
    console.warn('[PWA] Service Workers not supported');
  }
}

/**
 * Periodically check for SW updates (every 60s when visible)
 * Also checks immediately when the app returns to the foreground.
 */
function startPeriodicUpdateChecks(registration: ServiceWorkerRegistration): void {
  // Check every 60 seconds
  updateCheckInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  }, 60_000);

  // Check immediately when app comes back to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  });
}

/**
 * Tell the waiting service worker to activate (used by UpdateToast)
 */
export function activateWaitingWorker(): void {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage('SKIP_WAITING');
  }
}

/**
 * Check if PWA is installable
 */
export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

/**
 * Show install prompt
 * Returns true if prompt was shown, false otherwise
 */
export async function showInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return false;
  }
}

/**
 * Check if app is installed (running as PWA)
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window.navigator as any).standalone === true) return true;
  if (document.referrer.includes('android-app://')) return true;

  return false;
}

/**
 * Setup install prompt listener
 */
export function setupInstallPrompt(
  onPromptAvailable: (available: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onPromptAvailable(true);
  };

  window.addEventListener('beforeinstallprompt', handler);

  if (isInstalled()) {
    onPromptAvailable(false);
  }

  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
}

/**
 * Detect browser type
 */
export function detectBrowser(): {
  isDuckDuckGo: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isFirefox: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      isDuckDuckGo: false,
      isIOS: false,
      isAndroid: false,
      isChrome: false,
      isSafari: false,
      isFirefox: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isDuckDuckGo = ua.includes('duckduckgo') || ua.includes('ddg');
  const isChrome = /chrome/.test(ua) && !/edg|opr|brave/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isFirefox = /firefox/.test(ua);

  return { isDuckDuckGo, isIOS, isAndroid, isChrome, isSafari, isFirefox };
}

/**
 * Get PWA install status
 */
export function getPWAStatus(): {
  isInstalled: boolean;
  isInstallable: boolean;
  isSupported: boolean;
  browser: ReturnType<typeof detectBrowser>;
} {
  return {
    isInstalled: isInstalled(),
    isInstallable: isInstallable(),
    isSupported: 'serviceWorker' in navigator,
    browser: detectBrowser(),
  };
}
