// Service Worker for PWA - Offline Support & Push Notifications
const CACHE_NAME = 'checkly-v2'; // Updated to clear old favicon cache
const RUNTIME_CACHE = 'checkly-runtime-v2';

// Global error handler for unhandled promise rejections
self.addEventListener('error', (event) => {
  console.warn('[SW] Unhandled error (non-fatal):', event.message);
  event.preventDefault(); // Prevent default error handling
});

self.addEventListener('unhandledrejection', (event) => {
  console.warn('[SW] Unhandled promise rejection (non-fatal):', event.reason);
  event.preventDefault(); // Prevent default error handling
});

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/admin',
  '/admin/companies',
  '/admin/users',
  '/admin/tasks',
  '/notifications',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/admin-icon-192x192.png',
  '/admin-icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim()) // Take control of all pages
  );
});

// Fetch event - serve from cache, fallback to network
// Rate limiting for failed fetches to prevent spam
const failedFetches = new Map();
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

function shouldRetry(url) {
  const now = Date.now();
  const record = failedFetches.get(url);
  
  if (!record) return true;
  
  // If last failure was recent, check retry count
  if (now - record.lastFailure < RETRY_DELAY) {
    return record.retries < MAX_RETRIES;
  }
  
  // Reset if enough time has passed
  if (now - record.lastFailure > RETRY_DELAY * 2) {
    failedFetches.delete(url);
    return true;
  }
  
  return record.retries < MAX_RETRIES;
}

function recordFailure(url) {
  const record = failedFetches.get(url) || { retries: 0, lastFailure: 0 };
  record.retries += 1;
  record.lastFailure = Date.now();
  failedFetches.set(url, record);
}

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const requestUrl = event.request.url;

  // Skip webpack HMR files and other development-only files
  // These are temporary and shouldn't be cached or intercepted
  if (
    requestUrl.includes('webpack.hot-update') ||
    requestUrl.includes('hot-update.json') ||
    requestUrl.includes('hot-update.js') ||
    requestUrl.includes('_next/webpack-hmr') ||
    requestUrl.includes('__webpack_hmr')
  ) {
    // Let these requests pass through without service worker interception
    return;
  }

  // Don't cache favicon - always fetch fresh (but handle errors gracefully)
  if (requestUrl.includes('favicon') || requestUrl.includes('icon')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        // Silently handle favicon errors - don't spam console
        return new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } });
      })
    );
    return;
  }

  // Check if we should retry this URL (rate limiting)
  if (!shouldRetry(requestUrl)) {
    // Too many failures, serve from cache or return empty response
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return empty response to prevent further fetch attempts
        return new Response('', { status: 200 });
      }).catch(() => {
        return new Response('', { status: 200 });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network with timeout
        const fetchPromise = fetch(event.request);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        );

        return Promise.race([fetchPromise, timeoutPromise])
          .then((response) => {
            // Reset failure count on success
            failedFetches.delete(requestUrl);
            
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (stream can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response (don't await - fire and forget)
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache).catch(() => {
                  // Silently fail cache operations
                });
              })
              .catch(() => {
                // Silently fail cache operations
              });

            return response;
          })
          .catch((error) => {
            // Record the failure
            recordFailure(requestUrl);
            
            // Only log in development or if it's a new failure
            const record = failedFetches.get(requestUrl);
            if (record && record.retries <= 1) {
              console.warn('[SW] Fetch failed (will retry):', requestUrl, error.message);
            }
            
            // If network fails and no cache, return offline page or empty response
            if (event.request.destination === 'document') {
              return caches.match('/').then((cachedPage) => {
                if (cachedPage) return cachedPage;
                // If even cache fails, return a valid empty HTML response
                return new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1></body></html>', {
                  headers: { 'Content-Type': 'text/html' }
                });
              }).catch(() => {
                return new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1></body></html>', {
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            // For non-document requests, return a valid empty response
            return new Response('', { status: 200 });
          });
      })
      .catch((error) => {
        // If cache match fails, try network or return empty response
        // Only log if it's not a network error (which we already handle above)
        if (error.name !== 'TypeError' || !error.message.includes('fetch')) {
          console.warn('[SW] Cache match failed:', error.message);
        }
        
        // Check rate limit before attempting fetch
        if (!shouldRetry(requestUrl)) {
          return new Response('', { status: 200 });
        }
        
        return fetch(event.request).catch(() => {
          recordFailure(requestUrl);
          return new Response('', { status: 200 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Opsly Notification';
  const options = {
    body: data.message || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.id || 'default',
    requireInteraction: data.urgent || false,
    data: {
      url: data.url || '/notifications',
      notificationId: data.id
    },
    actions: data.url ? [
      {
        action: 'open',
        title: 'View',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ] : []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/notifications';
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if app not open
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Background sync (for offline form submissions)
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-forms') {
    event.waitUntil(
      // Sync any pending form submissions
      syncPendingForms()
    );
  }
});

async function syncPendingForms() {
  // This would sync any forms saved in IndexedDB while offline
  // Implementation depends on your form submission logic
  console.log('[SW] Syncing pending forms...');
}

