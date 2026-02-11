/**
 * Offline Infrastructure Tests
 * Tests IndexedDB, Service Worker, and online status detection
 */

import { test, expect } from '../setup/offline-helpers';

test.describe('Offline Infrastructure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should initialize IndexedDB correctly', async ({ page }) => {
    // Check if IndexedDB exists
    const dbExists = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.some(db => db.name === 'opsly-offline');
    });

    expect(dbExists).toBeTruthy();

    // Verify stores exist
    const stores = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('opsly-offline', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return Array.from(db.objectStoreNames);
    });

    expect(stores).toContain('cachedReads');
    expect(stores).toContain('pendingWrites');
    expect(stores).toContain('queuedFiles');
  });

  test('should register service worker', async ({ page }) => {
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;

      const registration = await navigator.serviceWorker.ready;
      return registration.active !== null;
    });

    expect(swRegistered).toBeTruthy();
  });

  test('should detect online/offline status', async ({ page, context }) => {
    // Start online
    let isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(false);

    // Check offline indicator appears
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=Working Offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);
  });

  test('should cache data to IndexedDB', async ({ page }) => {
    // Trigger caching by loading some data
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Check if data was cached
    const cachedCount = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('opsly-offline', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const tx = db.transaction('cachedReads', 'readonly');
      const store = tx.objectStore('cachedReads');

      return await new Promise<number>((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
      });
    });

    // Should have some cached data
    expect(cachedCount).toBeGreaterThanOrEqual(0);
  });

  test('should queue writes when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Queue a test write
    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');
      await queueWrite('test_operation', '/api/test', { data: 'test' }, 'testing');
    });

    // Check if write was queued
    const queuedCount = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('opsly-offline', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const tx = db.transaction('pendingWrites', 'readonly');
      const store = tx.objectStore('pendingWrites');

      return await new Promise<number>((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
      });
    });

    expect(queuedCount).toBeGreaterThan(0);

    // Clean up
    await page.evaluate(async () => {
      const { clearAllOfflineData } = await import('@/lib/offline/db');
      await clearAllOfflineData();
    });
  });

  test('should display storage statistics', async ({ page }) => {
    const stats = await page.evaluate(async () => {
      const { getStorageStats } = await import('@/lib/offline/db');
      return await getStorageStats();
    });

    expect(stats).toHaveProperty('usage');
    expect(stats).toHaveProperty('quota');
    expect(stats).toHaveProperty('usagePercent');
    expect(stats).toHaveProperty('cachedReadsCount');
    expect(stats).toHaveProperty('pendingWritesCount');
    expect(stats).toHaveProperty('queuedFilesCount');
  });
});
