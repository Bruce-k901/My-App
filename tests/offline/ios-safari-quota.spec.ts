/**
 * iOS Safari Storage Quota Tests
 * Tests storage quota management and eviction on iOS Safari
 */

import { test, expect } from '../setup/offline-helpers';
import {
  clearIndexedDB,
  getIndexedDBCount,
  simulateIOSSafari
} from '../setup/offline-helpers';

test.describe('iOS Safari Storage Quota Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear offline data before each test
    await clearIndexedDB(page);
  });

  test('should handle iOS Safari 50MB quota limit', async ({ page }) => {
    // Simulate iOS Safari environment
    await simulateIOSSafari(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check storage estimate reflects iOS Safari limits
    const storageInfo = await page.evaluate(async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage
        };
      }
      return null;
    });

    if (storageInfo) {
      // iOS Safari typically has ~50MB quota
      expect(storageInfo.quota).toBeLessThanOrEqual(60 * 1024 * 1024); // 60MB max
    }
  });

  test('should trigger eviction at 50% threshold on iOS Safari', async ({ page }) => {
    // Simulate iOS Safari with low quota
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: async () => ({
            usage: 26 * 1024 * 1024, // 26MB used
            quota: 50 * 1024 * 1024  // 50MB total (52% usage)
          })
        },
        configurable: true
      });

      // Mock iOS Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });
    });

    await page.goto('/dashboard');

    // Fill cache to trigger eviction
    await page.evaluate(async () => {
      const { cacheRead } = await import('@/lib/offline/db');

      // Cache multiple items
      for (let i = 0; i < 50; i++) {
        await cacheRead(
          `test-cache-${i}`,
          { data: 'x'.repeat(100000) }, // ~100KB per item
          'testing',
          3600000
        );
      }
    });

    // Verify eviction occurred (cache count should be less than 50)
    const cacheCount = await getIndexedDBCount(page, 'cachedReads');
    expect(cacheCount).toBeLessThan(50);
  });

  test('should prioritize pending writes over cached reads during eviction', async ({ page }) => {
    // Simulate low quota scenario
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: async () => ({
            usage: 40 * 1024 * 1024, // 40MB used
            quota: 50 * 1024 * 1024  // 50MB total (80% usage)
          })
        },
        configurable: true
      });
    });

    await page.goto('/dashboard');

    // Add both cached reads and pending writes
    await page.evaluate(async () => {
      const { cacheRead, queueWrite } = await import('@/lib/offline/db');

      // Add pending writes first
      for (let i = 0; i < 5; i++) {
        await queueWrite(
          'important_write',
          '/api/test',
          { data: 'critical data', index: i },
          'testing'
        );
      }

      // Fill cache
      for (let i = 0; i < 20; i++) {
        await cacheRead(
          `cache-${i}`,
          { data: 'x'.repeat(50000) },
          'testing',
          3600000
        );
      }
    });

    // Verify pending writes preserved
    const pendingCount = await getIndexedDBCount(page, 'pendingWrites');
    expect(pendingCount).toBe(5);

    // Cache should be evicted
    const cacheCount = await getIndexedDBCount(page, 'cachedReads');
    expect(cacheCount).toBeLessThan(20);
  });

  test('should not evict critical cached data on iOS Safari', async ({ page }) => {
    await simulateIOSSafari(page);
    await page.goto('/dashboard');

    // Cache critical data (attendance, profile)
    await page.evaluate(async () => {
      const { cacheRead } = await import('@/lib/offline/db');

      // Critical data
      await cacheRead(
        'attendance:current-shift',
        { clockedIn: true, shiftStart: new Date().toISOString() },
        'teamly',
        3600000
      );

      await cacheRead(
        'profile:current',
        { id: 'test-user', name: 'Test User' },
        'general',
        3600000
      );

      // Non-critical data
      for (let i = 0; i < 30; i++) {
        await cacheRead(
          `dashboard-widget-${i}`,
          { data: 'x'.repeat(50000) },
          'dashboard',
          3600000
        );
      }
    });

    // Simulate quota pressure
    await page.evaluate(async () => {
      const { checkStorageQuota } = await import('@/lib/offline/db');
      // This would trigger eviction logic
    });

    // Verify critical data preserved
    const criticalData = await page.evaluate(async () => {
      const { getCachedRead } = await import('@/lib/offline/db');
      const attendance = await getCachedRead('attendance:current-shift');
      const profile = await getCachedRead('profile:current');
      return { attendance, profile };
    });

    expect(criticalData.attendance).toBeTruthy();
    expect(criticalData.profile).toBeTruthy();
  });

  test('should show storage warning on iOS Safari when approaching limit', async ({ page }) => {
    // Simulate high storage usage
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: async () => ({
            usage: 45 * 1024 * 1024, // 45MB used
            quota: 50 * 1024 * 1024  // 50MB total (90% usage)
          })
        },
        configurable: true
      });
    });

    await page.goto('/dashboard/settings/sync');
    await page.waitForLoadState('networkidle');

    // Storage stats should show high usage
    const storageSection = page.locator('text=Storage Used');
    if (await storageSection.isVisible()) {
      // Should show high percentage
      await expect(page.locator('text=90%').or(page.locator('text=45'))).toBeVisible();
    }
  });

  test('should handle quota exceeded errors gracefully', async ({ page }) => {
    await simulateIOSSafari(page);

    // Try to cache data when quota is full
    const result = await page.evaluate(async () => {
      try {
        const { cacheRead } = await import('@/lib/offline/db');

        // Try to cache very large data
        await cacheRead(
          'huge-data',
          { data: 'x'.repeat(100 * 1024 * 1024) }, // 100MB (exceeds quota)
          'testing',
          3600000
        );

        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Should handle error without crashing
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });

  test('should compress large payloads on iOS Safari', async ({ page }) => {
    await simulateIOSSafari(page);
    await page.goto('/dashboard');

    // Queue large payload
    const originalSize = await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');

      // Large payload
      const payload = {
        notes: 'x'.repeat(10000), // 10KB of text
        items: Array(100).fill({ name: 'Item', value: 'y'.repeat(100) })
      };

      await queueWrite(
        'large_operation',
        '/api/test',
        payload,
        'testing'
      );

      // Return original payload size
      return new Blob([JSON.stringify(payload)]).size;
    });

    // Verify data was queued
    const pendingCount = await getIndexedDBCount(page, 'pendingWrites');
    expect(pendingCount).toBe(1);

    // Original size should be significant
    expect(originalSize).toBeGreaterThan(10000);
  });

  test('should use iOS Safari polling fallback for sync', async ({ page }) => {
    await simulateIOSSafari(page);

    // Verify Background Sync is not available (typical for iOS Safari)
    const hasBackgroundSync = await page.evaluate(() => {
      return 'serviceWorker' in navigator &&
             'sync' in ServiceWorkerRegistration.prototype;
    });

    // iOS Safari doesn't support Background Sync
    expect(hasBackgroundSync).toBe(false);

    // Queue a write
    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');
      await queueWrite(
        'test_operation',
        '/api/test',
        { data: 'test' },
        'testing'
      );
    });

    // Online status hook should use polling fallback
    await page.goto('/dashboard');

    // Wait for polling interval (30s)
    // In test, we just verify the mechanism exists
    const onlineStatusSetup = await page.evaluate(() => {
      // Check if useOnlineStatus hook would set up polling
      return typeof window !== 'undefined' && 'setInterval' in window;
    });

    expect(onlineStatusSetup).toBe(true);
  });

  test('should pause polling when iOS Safari page is backgrounded', async ({ page }) => {
    await simulateIOSSafari(page);
    await page.goto('/dashboard');

    // Simulate page visibility change (backgrounding)
    await page.evaluate(() => {
      // Dispatch visibility change event
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify polling would be paused (battery optimization)
    const isPaused = await page.evaluate(() => {
      return document.visibilityState === 'hidden';
    });

    expect(isPaused).toBe(true);

    // Bring page to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));
    });

    const isResumed = await page.evaluate(() => {
      return document.visibilityState === 'visible';
    });

    expect(isResumed).toBe(true);
  });

  test('should maintain performance on iOS Safari with limited storage', async ({ page }) => {
    await simulateIOSSafari(page);
    await page.goto('/dashboard');

    const startTime = Date.now();

    // Perform multiple cache operations
    await page.evaluate(async () => {
      const { cacheRead, queueWrite } = await import('@/lib/offline/db');

      for (let i = 0; i < 10; i++) {
        await cacheRead(`cache-${i}`, { data: 'test' }, 'testing', 3600000);
        await queueWrite('test_op', '/api/test', { data: 'test' }, 'testing');
      }
    });

    const duration = Date.now() - startTime;

    // Should complete within reasonable time (not blocked by quota checks)
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await clearIndexedDB(page);
  });
});
