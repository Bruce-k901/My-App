// Service Worker for PWA - Offline Support & Push Notifications
// SW_VERSION is updated at build time by the prebuild script.
// Changing this value forces the browser to detect a new SW and trigger updates.
const SW_VERSION = '1772174765450';
const CACHE_NAME = 'opsly-v5';
const RUNTIME_CACHE = 'opsly-runtime-v5';

// Global error handler for unhandled promise rejections
self.addEventListener('error', (event) => {
  console.warn('[SW] Unhandled error (non-fatal):', event.message);
  event.preventDefault();
});

self.addEventListener('unhandledrejection', (event) => {
  console.warn('[SW] Unhandled promise rejection (non-fatal):', event.reason);
  event.preventDefault();
});

// Assets to cache on install (offline shell)
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// --- Install: cache shell assets, but do NOT skipWaiting ---
// The client controls when the new SW activates via SKIP_WAITING message.
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + SW_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Do NOT call self.skipWaiting() here — let the client decide when to activate
});

// --- Activate: clean up old caches, claim clients ---
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + SW_VERSION);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== RUNTIME_CACHE)
          .map((n) => {
            console.log('[SW] Deleting old cache:', n);
            return caches.delete(n);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// --- Message listener: client tells us when to activate ---
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] Client requested skipWaiting');
    self.skipWaiting();
  }
});

// ====================================================
// FETCH STRATEGIES
// ====================================================
// Navigation (HTML)    → Network-first, cache-fallback
// _next/static/*       → Cache-first (content-hashed, immutable)
// API / supabase       → Network-only (never cache)
// Everything else      → Network-first, cache-fallback
// ====================================================

// Rate limiting for failed fetches
const failedFetches = new Map();
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function shouldRetry(url) {
  const now = Date.now();
  const record = failedFetches.get(url);
  if (!record) return true;
  if (now - record.lastFailure < RETRY_DELAY) return record.retries < MAX_RETRIES;
  if (now - record.lastFailure > RETRY_DELAY * 2) { failedFetches.delete(url); return true; }
  return record.retries < MAX_RETRIES;
}

function recordFailure(url) {
  const record = failedFetches.get(url) || { retries: 0, lastFailure: 0 };
  record.retries += 1;
  record.lastFailure = Date.now();
  failedFetches.set(url, record);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip cross-origin
  if (!url.startsWith(self.location.origin)) return;

  // Skip webpack HMR / dev files
  if (url.includes('webpack.hot-update') || url.includes('_next/webpack-hmr') || url.includes('__webpack_hmr')) return;

  // Skip API routes — always go to network, never cache
  if (url.includes('/api/')) return;

  // Skip supabase / auth routes
  if (url.includes('/auth/')) return;

  // Favicon/icons — network with silent fallback
  if (url.includes('favicon') || url.includes('icon')) {
    event.respondWith(
      fetch(request).catch(() => new Response('', { status: 200, headers: { 'Content-Type': 'image/png' } }))
    );
    return;
  }

  // --- NAVIGATION REQUESTS (HTML pages) → Network-first ---
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // --- IMMUTABLE STATIC ASSETS (_next/static/*) → Cache-first ---
  if (url.includes('/_next/static/')) {
    event.respondWith(cacheFirstWithNetwork(request));
    return;
  }

  // --- EVERYTHING ELSE → Network-first ---
  event.respondWith(networkFirstWithCache(request));
});

// Network-first: try network, fall back to cache, then offline page
async function networkFirstWithCache(request) {
  try {
    const response = await fetchWithTimeout(request, 8000);
    if (response && response.ok) {
      // Cache the fresh response for offline fallback
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone).catch(() => {})).catch(() => {});
      failedFetches.delete(request.url);
    }
    return response;
  } catch (err) {
    recordFailure(request.url);
    // Try cache fallback
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, serve the cached root as an app shell fallback
    if (request.mode === 'navigate' || request.destination === 'document') {
      const shell = await caches.match('/');
      if (shell) return shell;
      return new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('', { status: 200 });
  }
}

// Cache-first: serve from cache, fall back to network (for immutable hashed assets)
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  if (!shouldRetry(request.url)) {
    return new Response('', { status: 200 });
  }

  try {
    const response = await fetchWithTimeout(request, 10000);
    if (response && response.ok && response.type === 'basic') {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone).catch(() => {})).catch(() => {});
      failedFetches.delete(request.url);
    }
    return response;
  } catch (err) {
    recordFailure(request.url);
    return new Response('', { status: 200 });
  }
}

// Fetch with timeout helper
function fetchWithTimeout(request, ms) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), ms))
  ]);
}

// ====================================================
// PUSH NOTIFICATIONS
// ====================================================

const VIBRATION_PATTERNS = {
  task: [200, 100, 200],
  message: [100, 50, 100],
  urgent: [300, 100, 300, 100, 500],
  default: [200, 100, 200]
};

self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Opsly Notification';
  const notificationType = data.type || 'default';
  const vibrationPattern = VIBRATION_PATTERNS[notificationType] || VIBRATION_PATTERNS.default;

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

  if (data.actions && Array.isArray(data.actions)) {
    actions = data.actions;
  }

  const options = {
    body: data.body || data.message || 'You have a new notification',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/android-chrome-192x192.png',
    tag: data.tag || data.id || 'default',
    renotify: true,
    requireInteraction: data.urgent || notificationType === 'urgent' || false,
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

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked, action:', event.action);
  event.notification.close();

  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/notifications';

  if (event.action === 'dismiss' || event.action === 'close') return;

  if (event.action === 'snooze') {
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
        }, 10 * 60 * 1000);
      })
    );
    return;
  }

  if (event.action === 'acknowledge') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.focus();
            if ('navigate' in client) return client.navigate(url);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ====================================================
// BACKGROUND SYNC (offline writes)
// ====================================================

self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-offline-writes' || event.tag === 'sync-forms') {
    event.waitUntil(syncPendingWrites());
  }
});

async function syncPendingWrites() {
  console.log('[SW] Syncing pending writes...');
  try {
    const db = await openDB('opsly-offline', 1);
    const tx = db.transaction('pendingWrites', 'readonly');
    const store = tx.objectStore('pendingWrites');
    const index = store.index('by_status');
    const pending = await index.getAll('pending');

    console.log(`[SW] Found ${pending.length} pending writes to sync`);

    for (const write of pending) {
      try {
        const updateTx = db.transaction('pendingWrites', 'readwrite');
        await updateTx.objectStore('pendingWrites').put({ ...write, status: 'syncing' });
        await updateTx.done;

        const filesTx = db.transaction('queuedFiles', 'readonly');
        const queuedFile = await filesTx.objectStore('queuedFiles').get(write.id);

        let body;
        let headers = {};

        if (queuedFile) {
          const formData = new FormData();
          formData.append('file', queuedFile.blob, queuedFile.filename);
          formData.append('data', JSON.stringify(write.payload));
          body = formData;
        } else {
          body = JSON.stringify(write.payload);
          headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch(write.endpoint, {
          method: 'POST',
          headers: headers,
          body: body,
          credentials: 'include'
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        console.log(`[SW] Successfully synced: ${write.operation}`);

        const deleteTx = db.transaction(['pendingWrites', 'queuedFiles'], 'readwrite');
        await deleteTx.objectStore('pendingWrites').delete(write.id);
        if (queuedFile) await deleteTx.objectStore('queuedFiles').delete(write.id);
        await deleteTx.done;

        await self.registration.showNotification('Synced', {
          body: `${write.operation.replace(/_/g, ' ')} completed`,
          badge: '/android-chrome-192x192.png',
          icon: '/android-chrome-192x192.png',
          tag: `sync-${write.id}`,
          requireInteraction: false,
          silent: true
        });
      } catch (error) {
        console.error(`[SW] Failed to sync ${write.operation}:`, error);
        const retries = write.retries + 1;
        const updateTx = db.transaction('pendingWrites', 'readwrite');

        if (retries >= 5) {
          await updateTx.objectStore('pendingWrites').put({
            ...write, status: 'failed', error: error.message, retries
          });
          await self.registration.showNotification('Sync Failed', {
            body: `${write.operation.replace(/_/g, ' ')} failed after ${retries} attempts`,
            badge: '/android-chrome-192x192.png',
            icon: '/android-chrome-192x192.png',
            tag: `sync-fail-${write.id}`,
            requireInteraction: true
          });
        } else {
          await updateTx.objectStore('pendingWrites').put({
            ...write, status: 'pending', retries
          });
        }
        await updateTx.done;
      }
    }
    console.log('[SW] Sync complete');
  } catch (error) {
    console.error('[SW] Sync process failed:', error);
  }
}

function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('cachedReads')) {
        const store = db.createObjectStore('cachedReads', { keyPath: 'key' });
        store.createIndex('by_timestamp', 'timestamp');
        store.createIndex('by_module', 'module');
      }
      if (!db.objectStoreNames.contains('pendingWrites')) {
        const store = db.createObjectStore('pendingWrites', { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp');
        store.createIndex('by_status', 'status');
      }
      if (!db.objectStoreNames.contains('queuedFiles')) {
        db.createObjectStore('queuedFiles', { keyPath: 'writeId' });
      }
    };
  });
}
