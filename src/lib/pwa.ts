'use client';

/**
 * PWA Utility Functions
 * Handles service worker registration and install prompts
 */

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Register service worker for PWA functionality
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker installed while existing one controls the page
                  console.log('[PWA] New version available — prompting user');
                  window.dispatchEvent(new CustomEvent('pwa-update-available'));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });

    // When the new SW takes control, notify UI so it can reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service Worker controller changed — new version active');
      window.dispatchEvent(new CustomEvent('pwa-update-activated'));
    });
  } else {
    console.warn('[PWA] Service Workers not supported');
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
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', outcome);
    
    // Clear the deferred prompt
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
  
  // Check if running in standalone mode (iOS)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check if running in standalone mode (Android)
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Check if launched from home screen
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
}

/**
 * Setup install prompt listener
 * Call this in your component to listen for install prompts
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

  // Check if already installed
  if (isInstalled()) {
    onPromptAvailable(false);
  }

  // Return cleanup function
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

  return {
    isDuckDuckGo,
    isIOS,
    isAndroid,
    isChrome,
    isSafari,
    isFirefox,
  };
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

