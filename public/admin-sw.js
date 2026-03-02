// Admin Service Worker for PWA - Separate from main app
const CACHE_NAME = 'checkly-admin-v1';
const RUNTIME_CACHE = 'checkly-admin-runtime-v1';

// Global error handler for unhandled promise rejections
self.addEventListener('error', (event) => {
  console.warn('[Admin SW] Unhandled error (non-fatal):', event.message);
  event.preventDefault();
});

self.addEventListener('unhandledrejection', (event) => {
  console.warn('[Admin SW] Unhandled promise rejection (non-fatal):', event.reason);
  event.preventDefault();
});

// Admin-specific assets to cache on install
const STATIC_ASSETS = [
  '/admin/login',
  '/admin',
  '/admin/companies',
  '/admin/users',
  '/admin/tasks',
  '/admin/settings',
  '/admin-manifest.json',
  '/admin-icon-192x192.png',
  '/admin-icon-512x512.png',
  '/admin-apple-touch-icon.png',
  '/admin-favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Admin SW] Installing admin service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Admin SW] Caching admin static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Admin SW] Activating admin service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any non-admin caches or old admin caches
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            // Only delete if it's an admin cache or if it's not the main app cache
            if (cacheName.includes('admin') || (!cacheName.includes('checkly-v') && !cacheName.includes('checkly-runtime'))) {
              console.log('[Admin SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }
        })
      );
    })
      .then(() => self.clients.claim()) // Take control of all pages immediately
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle admin routes
  if (!url.pathname.startsWith('/admin') && url.pathname !== '/admin-manifest.json') {
    // Let non-admin requests pass through without caching
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('[Admin SW] Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache successful admin responses
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[Admin SW] Fetch failed:', error);
            // Return offline page for admin routes if available
            if (url.pathname.startsWith('/admin')) {
              return caches.match('/admin/login');
            }
            throw error;
          });
      })
  );
});

// Push notification event (if needed in future)
self.addEventListener('push', (event) => {
  console.log('[Admin SW] Push notification received');
  // Handle push notifications for admin if needed
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Admin SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/admin')
  );
});

