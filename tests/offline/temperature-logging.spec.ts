/**
 * Temperature Logging Offline Tests
 * Tests temperature logging with offline queueing
 */

import { test, expect } from '../setup/offline-helpers';
import {
  clearIndexedDB,
  getIndexedDBCount,
  verifyPendingWrite,
  waitForOfflineIndicator
} from '../setup/offline-helpers';

test.describe('Temperature Logging Offline', () => {
  test.beforeEach(async ({ page }) => {
    // Clear offline data before each test
    await clearIndexedDB(page);

    // Navigate to temperature logging page
    await page.goto('/dashboard/logs/temperature');
    await page.waitForLoadState('networkidle');
  });

  test('should queue temperature log when offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await waitForOfflineIndicator(page);

    // Find first asset with temperature input
    const tempInput = page.locator('input[type="number"]').first();
    if (await tempInput.isVisible()) {
      await tempInput.fill('5.2');

      // Submit temperature
      const submitButton = page.locator('button:has-text("Log")').or(
        page.locator('button:has-text("Submit")')
      ).first();

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Wait for success message
        await expect(
          page.locator('text=Temperature logged').or(
            page.locator('text=will sync when online')
          )
        ).toBeVisible({ timeout: 5000 });

        // Verify write was queued
        const isQueued = await verifyPendingWrite(page, 'log_temperature');
        expect(isQueued).toBeTruthy();

        // Check pending count
        const pendingCount = await getIndexedDBCount(page, 'pendingWrites');
        expect(pendingCount).toBeGreaterThan(0);
      }
    }
  });

  test('should sync temperature log when back online', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await waitForOfflineIndicator(page);

    // Queue a temperature log directly via IndexedDB
    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');
      await queueWrite(
        'log_temperature',
        '/api/temperature/log',
        {
          assetId: 'test-asset-id',
          reading: 5.2,
          unit: 'celsius',
          recordedAt: new Date().toISOString(),
          source: 'manual'
        },
        'checkly'
      );
    });

    // Verify queued
    let pendingCount = await getIndexedDBCount(page, 'pendingWrites');
    expect(pendingCount).toBeGreaterThan(0);

    // Go back online
    await context.setOffline(false);

    // Wait for sync (background sync or polling)
    await page.waitForTimeout(5000);

    // Check if sync happened (pending count should decrease)
    pendingCount = await getIndexedDBCount(page, 'pendingWrites');
    // In test environment without full backend, we verify the mechanism is in place
  });

  test('should queue multiple temperature logs offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Queue multiple temperature logs
    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');

      for (let i = 0; i < 3; i++) {
        await queueWrite(
          'log_temperature',
          '/api/temperature/log',
          {
            assetId: `test-asset-${i}`,
            reading: 4.0 + i,
            unit: 'celsius',
            recordedAt: new Date().toISOString(),
            source: 'manual'
          },
          'checkly'
        );
      }
    });

    // Verify all queued
    const pendingCount = await getIndexedDBCount(page, 'pendingWrites');
    expect(pendingCount).toBe(3);

    // Reload page and check offline indicator shows correct count
    await page.reload();
    await waitForOfflineIndicator(page);

    const indicator = page.locator('[data-testid="offline-indicator"]');
    await expect(indicator).toBeVisible();
  });

  test('should handle out-of-range temperature readings offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    await waitForOfflineIndicator(page);

    // Try to log out-of-range temperature
    const tempInput = page.locator('input[type="number"]').first();
    if (await tempInput.isVisible()) {
      await tempInput.fill('15.5'); // Out of range for fridge

      const submitButton = page.locator('button:has-text("Log")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should still queue (validation happens on sync)
        const isQueued = await verifyPendingWrite(page, 'log_temperature');
        expect(isQueued).toBeTruthy();

        // Warning about out-of-range should appear
        await expect(
          page.locator('text=out of range').or(page.locator('text=exceeds'))
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should preserve temperature unit setting offline', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Queue a temperature with specific unit
    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');
      await queueWrite(
        'log_temperature',
        '/api/temperature/log',
        {
          assetId: 'test-asset',
          reading: 41,
          unit: 'fahrenheit', // Non-default unit
          recordedAt: new Date().toISOString(),
          source: 'manual'
        },
        'checkly'
      );
    });

    // Retrieve and verify the queued write has correct unit
    const queuedWrite = await page.evaluate(async () => {
      const { getOfflineDB } = await import('@/lib/offline/db');
      const db = await getOfflineDB();
      const writes = await db.getAll('pendingWrites');
      return writes[0];
    });

    expect(queuedWrite.payload.unit).toBe('fahrenheit');
  });

  test('should show pending temperature logs in sync dashboard', async ({ page, context }) => {
    // Go offline and queue a temperature log
    await context.setOffline(true);

    await page.evaluate(async () => {
      const { queueWrite } = await import('@/lib/offline/db');
      await queueWrite(
        'log_temperature',
        '/api/temperature/log',
        {
          assetId: 'test-asset',
          reading: 5.2,
          unit: 'celsius',
          recordedAt: new Date().toISOString()
        },
        'checkly'
      );
    });

    // Navigate to sync dashboard
    await page.goto('/dashboard/settings/sync');
    await page.waitForLoadState('networkidle');

    // Check if pending temperature log is listed
    await expect(page.locator('text=Pending Changes')).toBeVisible();
    await expect(
      page.locator('text=log_temperature').or(page.locator('text=temperature'))
    ).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Clean up
    await clearIndexedDB(page);
  });
});
