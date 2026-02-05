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

// Vibration patterns for different notification types (duration in ms)
const VIBRATION_PATTERNS = {
  task: [200, 100, 200],           // buzz-pause-buzz (standard reminder)
  message: [100, 50, 100],          // quick double-tap (new message)
  urgent: [300, 100, 300, 100, 500], // long urgent pattern (overdue/critical)
  default: [200, 100, 200]
};

// Push notification event - Enhanced with vibration and better actions
self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Opsly Notification';
  const notificationType = data.type || 'default'; // task, message, urgent, default

  // Select vibration pattern based on notification type
  const vibrationPattern = VIBRATION_PATTERNS[notificationType] || VIBRATION_PATTERNS.default;

  // Determine actions based on notification type
  let actions = [];
  if (notificationType === 'task') {
    actions = [
      { action: 'complete', title: 'Complete Now' },
      { action: 'snooze', title: 'Snooze 10min' }
    ];
  } else if (notificationType === 'message') {
    actions = [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (notificationType === 'urgent') {
    actions = [
      { action: 'view', title: 'View Now' },
      { action: 'acknowledge', title: 'Acknowledge' }
    ];
  } else if (data.url) {
    actions = [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Close' }
    ];
  }

  // Use custom actions if provided
  if (data.actions && Array.isArray(data.actions)) {
    actions = data.actions;
  }

  const options = {
    body: data.body || data.message || 'You have a new notification',
    icon: data.icon || '/opsly_new_hexstyle_favicon.PNG',
    badge: data.badge || '/opsly_new_hexstyle_favicon.PNG',
    tag: data.tag || data.id || 'default', // Prevents duplicate notifications
    renotify: true, // Vibrate even if same tag
    requireInteraction: data.urgent || notificationType === 'urgent' || false, // Stay until dismissed if urgent
    vibrate: vibrationPattern,
    data: {
      url: data.url || '/notifications',
      notificationId: data.id,
      type: notificationType
    },
    actions: actions
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - Enhanced with action handling
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked, action:', event.action);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/notifications';
  const notificationType = notificationData.type;

  // Handle dismiss/close actions - just close, don't navigate
  if (event.action === 'dismiss' || event.action === 'close') {
    return;
  }

  // Handle snooze action - reschedule notification
  if (event.action === 'snooze') {
    // Re-show notification after 10 minutes
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(event.notification.title + ' (Snoozed)', {
            body: event.notification.body,
            icon: event.notification.icon,
            badge: event.notification.badge,
            tag: event.notification.tag + '-snoozed',
            vibrate: VIBRATION_PATTERNS.task,
            data: notificationData,
            actions: [
              { action: 'complete', title: 'Complete Now' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          }).then(resolve);
        }, 10 * 60 * 1000); // 10 minutes
      })
    );
    return;
  }

  // Handle acknowledge action - just close and mark as seen
  if (event.action === 'acknowledge') {
    // Could send a message to the client to mark the notification as acknowledged
    // For now, just close the notification (already done above)
    return;
  }

  // All other actions navigate to the appropriate URL
  // - open, view, complete, reply all navigate to the url
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open on any window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            // App is open - focus it and navigate
            client.focus();
            if ('navigate' in client) {
              return client.navigate(url);
            }
            return;
          }
        }
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
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

