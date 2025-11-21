/**
 * Critical User Journey Tests
 * 
 * These tests verify that essential user flows still work after refactoring.
 * Run these before and after major changes to catch regressions early.
 * 
 * Usage:
 *   npm run test tests/critical-paths.test.ts
 */

import { describe, test, expect, beforeAll } from 'vitest';

/**
 * Test configuration
 * Update BASE_URL if running against different environment
 */
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Skip these tests in CI/build environments (they require a running server)
// These are integration tests that should only run manually with TEST_BASE_URL set
const shouldSkip = process.env.CI === 'true' || process.env.VERCEL === '1' || (!process.env.TEST_BASE_URL && process.env.NODE_ENV === 'production');

/**
 * Helper to check if a route is accessible
 */
async function checkRoute(route: string): Promise<{ ok: boolean; status: number }> {
  try {
    const response = await fetch(`${BASE_URL}${route}`, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects automatically
    });
    return { ok: response.ok || response.status === 307 || response.status === 308, status: response.status };
  } catch (error) {
    console.error(`Error checking route ${route}:`, error);
    return { ok: false, status: 0 };
  }
}

describe.skipIf(shouldSkip)('Critical User Journeys', () => {
  /**
   * Test 1: User can view all sites
   * This is a core feature - if this breaks, the app is unusable
   */
  describe('Sites Management', () => {
    test('Sites page is accessible', async () => {
      const { ok, status } = await checkRoute('/dashboard/sites');
      expect(ok, `Sites page returned status ${status}`).toBe(true);
    });

    test('Organization sites redirect works', async () => {
      // Old route should redirect to new route
      const response = await fetch(`${BASE_URL}/organization/sites`, {
        redirect: 'manual',
      });
      expect([200, 307, 308]).toContain(response.status);
    });
  });

  /**
   * Test 2: User can access business details
   */
  describe('Business Details', () => {
    test('Business page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/business');
      expect(ok).toBe(true);
    });

    test('Old business-details route redirects', async () => {
      const response = await fetch(`${BASE_URL}/business-details`, {
        redirect: 'manual',
      });
      expect([200, 307, 308]).toContain(response.status);
    });
  });

  /**
   * Test 3: User can access tasks
   */
  describe('Task Management', () => {
    test('My Tasks page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/my_tasks');
      expect(ok).toBe(true);
    });

    test('My Templates page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/my_templates');
      expect(ok).toBe(true);
    });

    test('Today\'s Tasks page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/todays_tasks');
      expect(ok).toBe(true);
    });

    test('Compliance templates page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/tasks/compliance');
      expect(ok).toBe(true);
    });
  });

  /**
   * Test 4: User can access assets
   */
  describe('Asset Management', () => {
    test('Assets page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/assets');
      expect(ok).toBe(true);
    });

    test('Contractors page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/assets/contractors');
      expect(ok).toBe(true);
    });
  });

  /**
   * Test 5: User can access documents
   */
  describe('Document Management', () => {
    test('Documents page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/documents');
      expect(ok).toBe(true);
    });
  });

  /**
   * Test 6: User can access users management
   */
  describe('User Management', () => {
    test('Users page is accessible', async () => {
      const { ok } = await checkRoute('/dashboard/users');
      expect(ok).toBe(true);
    });
  });

  /**
   * Test 7: Main dashboard is accessible
   */
  describe('Dashboard', () => {
    test('Main dashboard is accessible', async () => {
      const { ok } = await checkRoute('/dashboard');
      expect(ok).toBe(true);
    });
  });

  /**
   * Test 8: No circular redirects
   * This catches the debugging loop problem
   */
  describe('Redirect Chains', () => {
    test('No circular redirects on organization routes', async () => {
      const routes = [
        '/organization/business',
        '/organization/sites',
        '/dashboard/organization',
      ];

      for (const route of routes) {
        const response = await fetch(`${BASE_URL}${route}`, {
          redirect: 'manual',
        });
        // Should either be 200 (direct access) or redirect (307/308)
        // Should NOT be 404 or 500
        expect([200, 307, 308]).toContain(response.status);
      }
    });
  });

  /**
   * Test 9: Debug pages are removed
   * These should return 404 if properly cleaned up
   */
  describe('Debug Pages Cleanup', () => {
    const debugRoutes = [
      '/dashboard/quick',
      '/dashboard/simple',
      '/dashboard/minimal',
      '/test-session',
      '/test-search',
      '/test-asset-modal',
      '/debug',
      '/debug-env',
    ];

    test.each(debugRoutes)('Debug route %s should not exist', async (route) => {
      const { ok, status } = await checkRoute(route);
      // Should be 404 (not found) or redirect away
      expect([404, 307, 308]).toContain(status);
    });
  });
});

/**
 * Integration test helper
 * Use this to test complete user flows
 */
export async function testUserFlow(steps: Array<{ route: string; expectedStatus?: number }>) {
  for (const step of steps) {
    const { ok, status } = await checkRoute(step.route);
    const expectedStatus = step.expectedStatus || 200;
    expect(ok || status === expectedStatus, `Route ${step.route} failed`).toBe(true);
  }
}

