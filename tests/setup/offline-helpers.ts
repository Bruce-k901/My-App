/**
 * Playwright Test Helpers for Offline Testing
 * Utilities for simulating offline scenarios and verifying sync behavior
 */

import { test as base, Page, BrowserContext, expect } from '@playwright/test';

// Extend Playwright test with offline utilities
export const test = base.extend<{
  offlineMode: () => Promise<void>;
  onlineMode: () => Promise<void>;
  context: BrowserContext;
}>({
  // Fixture to easily toggle offline mode
  offlineMode: async ({ context }, use) => {
    await use(async () => {
      await context.setOffline(true);
      console.log('[Test] Network set to offline');
    });
  },

  onlineMode: async ({ context }, use) => {
    await use(async () => {
      await context.setOffline(false);
      console.log('[Test] Network set to online');
    });
  }
});

export { expect };

/**
 * Simulate network failure for a specific duration
 */
export async function simulateNetworkFailure(
  page: Page,
  durationMs: number
): Promise<void> {
  console.log(`[Test] Simulating network failure for ${durationMs}ms`);

  // Abort all network requests
  await page.route('**/*', (route) => route.abort());

  // Wait for the specified duration
  await new Promise((resolve) => setTimeout(resolve, durationMs));

  // Restore network
  await page.unroute('**/*');

  console.log('[Test] Network restored');
}

/**
 * Wait for service worker to be registered
 */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return navigator.serviceWorker.ready;
  }, { timeout: 10000 });

  console.log('[Test] Service worker ready');
}

/**
 * Get IndexedDB data from the browser
 */
export async function getIndexedDBData(
  page: Page,
  storeName: 'cachedReads' | 'pendingWrites' | 'queuedFiles'
): Promise<any[]> {
  return await page.evaluate(async (store) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('opsly-offline', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction(store, 'readonly');
    const objectStore = tx.objectStore(store);

    return await new Promise<any[]>((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, storeName);
}

/**
 * Get count of items in IndexedDB store
 */
export async function getIndexedDBCount(
  page: Page,
  storeName: 'cachedReads' | 'pendingWrites' | 'queuedFiles'
): Promise<number> {
  return await page.evaluate(async (store) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('opsly-offline', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction(store, 'readonly');
    const objectStore = tx.objectStore(store);

    return await new Promise<number>((resolve, reject) => {
      const request = objectStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, storeName);
}

/**
 * Clear all IndexedDB data
 */
export async function clearIndexedDB(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('opsly-offline', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const tx = db.transaction(['cachedReads', 'pendingWrites', 'queuedFiles'], 'readwrite');

    await Promise.all([
      new Promise<void>((resolve) => {
        const request = tx.objectStore('cachedReads').clear();
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = tx.objectStore('pendingWrites').clear();
        request.onsuccess = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = tx.objectStore('queuedFiles').clear();
        request.onsuccess = () => resolve();
      })
    ]);
  });

  console.log('[Test] IndexedDB cleared');
}

/**
 * Simulate iOS Safari (for quota testing)
 */
export async function simulateIOSSafari(page: Page): Promise<void> {
  await page.evaluateOnNewDocument(() => {
    // Override user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      writable: false
    });

    // Simulate 50MB quota (iOS Safari limit)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const originalEstimate = navigator.storage.estimate.bind(navigator.storage);

      Object.defineProperty(navigator.storage, 'estimate', {
        value: async function () {
          const estimate = await originalEstimate();
          return {
            usage: estimate.usage || 0,
            quota: 50 * 1024 * 1024 // 50MB
          };
        }
      });
    }

    // Remove Background Sync API (not supported on iOS Safari)
    if ('serviceWorker' in navigator) {
      const originalReady = Object.getOwnPropertyDescriptor(
        navigator.serviceWorker,
        'ready'
      );

      if (originalReady) {
        Object.defineProperty(navigator.serviceWorker, 'ready', {
          get: function () {
            const promise = originalReady.get!.call(this);
            return promise.then((registration: any) => {
              // Remove sync from registration
              delete registration.sync;
              return registration;
            });
          }
        });
      }
    }
  });

  console.log('[Test] Simulating iOS Safari environment');
}

/**
 * Wait for offline indicator to appear
 */
export async function waitForOfflineIndicator(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="offline-indicator"]', {
    state: 'visible',
    timeout: 5000
  });
}

/**
 * Wait for sync success notification
 */
export async function waitForSyncSuccess(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="sync-success-toast"]', {
    state: 'visible',
    timeout: 10000
  });
}

/**
 * Verify pending write was queued
 */
export async function verifyPendingWrite(
  page: Page,
  operation: string
): Promise<boolean> {
  const pending = await getIndexedDBData(page, 'pendingWrites');
  return pending.some((write: any) => write.operation === operation);
}

/**
 * Verify cached read exists
 */
export async function verifyCachedRead(
  page: Page,
  key: string
): Promise<boolean> {
  const cached = await getIndexedDBData(page, 'cachedReads');
  return cached.some((read: any) => read.key === key);
}

/**
 * Mock Supabase response for testing
 */
export async function mockSupabaseResponse(
  page: Page,
  pattern: string,
  response: any
): Promise<void> {
  await page.route(pattern, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Login test user (helper for authenticated tests)
 */
export async function loginTestUser(
  page: Page,
  email: string = 'test@opsly.com',
  password: string = 'test123'
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  console.log('[Test] User logged in');
}
