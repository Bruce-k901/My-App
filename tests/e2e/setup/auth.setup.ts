import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Ensure test credentials are set
  const testEmail = process.env.TEST_USER_EMAIL;
  const testPassword = process.env.TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test');
  }

  // Go to login page
  await page.goto('/login');
  
  // Wait for form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // Fill in credentials
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard (with longer timeout)
  await page.waitForURL('/dashboard', { timeout: 15000 });
  
  // Verify logged in - wait for dashboard content
  await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  
  // Additional wait to ensure session is fully established
  await page.waitForTimeout(2000);
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup complete');
});

