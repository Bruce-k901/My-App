// Service Worker for PWA - Offline Support & Push Notifications
const CACHE_NAME = 'checkly-v2'; // Updated to clear old favicon cache
const RUNTIME_CACHE = 'checkly-runtime-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/notifications',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
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
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Don't cache favicon - always fetch fresh (but handle errors gracefully)
  if (event.request.url.includes('favicon') || event.request.url.includes('icon')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If fetch fails (server down), return a valid empty response
        return new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } });
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

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (stream can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            // If network fails and no cache, return offline page or empty response
            console.error('[SW] Fetch failed:', error);
            if (event.request.destination === 'document') {
              return caches.match('/').catch(() => {
                // If even cache fails, return a valid empty HTML response
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
        console.error('[SW] Cache match failed:', error);
        return fetch(event.request).catch(() => {
          return new Response('', { status: 200 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Checkly Notification';
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

