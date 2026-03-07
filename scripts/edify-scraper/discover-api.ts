/**
 * Edify API Discovery Script
 *
 * Phase 1: Opens Edify in a headed browser, lets you log in,
 * then captures ALL API responses as you navigate.
 *
 * Usage: npx playwright test scripts/edify-scraper/discover-api.ts --headed
 * Or:    npx tsx scripts/edify-scraper/discover-api.ts
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'captured-data');
const API_LOG_FILE = path.join(OUTPUT_DIR, 'api-calls.json');

interface CapturedResponse {
  url: string;
  method: string;
  status: number;
  timestamp: string;
  bodyFile?: string;
  bodyPreview?: string;
}

async function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const capturedResponses: CapturedResponse[] = [];
  let responseCounter = 0;

  console.log('🚀 Launching browser...');
  console.log('📋 Instructions:');
  console.log('   1. Log in to Edify when the browser opens');
  console.log('   2. Navigate through: Products, Suppliers, Stocktakes, Recipes');
  console.log('   3. Make sure to scroll through full lists (triggers lazy loading)');
  console.log('   4. Close the browser when done — data will be saved automatically');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  // Intercept ALL responses
  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();

    // Skip static assets, images, fonts, etc.
    if (
      url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?|$)/) ||
      url.includes('googleapis.com/') ||
      url.includes('google-analytics') ||
      url.includes('intercom') ||
      url.includes('sentry') ||
      url.includes('hotjar') ||
      url.includes('segment') ||
      url.includes('mixpanel') ||
      url.includes('amplitude')
    ) {
      return;
    }

    const entry: CapturedResponse = {
      url,
      method,
      status,
      timestamp: new Date().toISOString(),
    };

    try {
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('application/json') || contentType.includes('text/json')) {
        const body = await response.json();
        responseCounter++;

        // Save the full response body
        const bodyFileName = `response_${String(responseCounter).padStart(4, '0')}.json`;
        const bodyFilePath = path.join(OUTPUT_DIR, bodyFileName);
        fs.writeFileSync(bodyFilePath, JSON.stringify(body, null, 2));

        entry.bodyFile = bodyFileName;
        entry.bodyPreview = JSON.stringify(body).substring(0, 200);

        // Log interesting API calls
        const shortUrl = url.replace('https://app.edifysystems.io', '');
        console.log(`  📦 [${method}] ${shortUrl} → ${bodyFileName} (${status})`);
      }
    } catch {
      // Response body not available or not JSON — skip
    }

    capturedResponses.push(entry);
  });

  // Also capture request URLs for discovery
  page.on('request', (request) => {
    const url = request.url();
    if (
      url.includes('edifysystems') &&
      !url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)(\?|$)/)
    ) {
      const method = request.method();
      if (method !== 'GET' || url.includes('/api/') || url.includes('/graphql')) {
        console.log(`  🔍 [${method}] ${url.replace('https://app.edifysystems.io', '')}`);
      }
    }
  });

  // Navigate to Edify
  await page.goto('https://app.edifysystems.io');

  console.log('\n⏳ Waiting for you to log in and navigate...');
  console.log('   (Close the browser when done)\n');

  // Wait for the browser to close
  await new Promise<void>((resolve) => {
    browser.on('disconnected', () => resolve());
  });

  // Save the API call log
  fs.writeFileSync(API_LOG_FILE, JSON.stringify(capturedResponses, null, 2));

  console.log('\n✅ Done! Captured data saved to:');
  console.log(`   📁 ${OUTPUT_DIR}`);
  console.log(`   📄 ${capturedResponses.length} total responses`);
  console.log(`   📦 ${responseCounter} JSON responses saved`);
  console.log(`   📋 API call log: ${API_LOG_FILE}`);
}

main().catch(console.error);
