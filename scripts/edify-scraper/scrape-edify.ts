/**
 * Edify Data Scraper
 *
 * Interactive scraper — opens a headed browser, you log in,
 * then use keyboard shortcuts to trigger scraping of the current page.
 *
 * Usage: npx tsx scripts/edify-scraper/scrape-edify.ts
 *
 * Controls (type in terminal while browser is open):
 *   p  — Scrape products from current page (By Product view)
 *   c  — Scrape products by category from current page
 *   s  — Scrape stocktake from current page
 *   r  — Scrape recipes from current page
 *   a  — Auto-scroll to load all items, then scrape
 *   q  — Quit and save all data
 */

import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const OUTPUT_DIR = path.join(__dirname, 'extracted-data');

// ─── Types ─────────────────────────────────────────────────────────

interface Product {
  name: string;
  supplier?: string;
  storageLocation?: string;
  productClass?: string;
  category?: string;
  price?: string;
  uom?: string;
  packSize?: string;
  weight?: string;
}

interface StocktakeItem {
  name: string;
  supplier?: string;
  storageLocation?: string;
  productClass?: string;
  stockCount: { g: string; kg: string; units: string; unitType: string };
  totalCount?: string;
  totalValue?: string;
}

interface StocktakeSummary {
  site?: string;
  stocktakeDate?: string;
  previousDate?: string;
  submittedBy?: string;
  totalValue?: string;
  classes: Array<{
    name: string;
    stockValue: string;
    lastStockValue: string;
    movement: string;
  }>;
}

interface Recipe {
  name: string;
  [key: string]: unknown;
}

interface ScrapedData {
  products: Product[];
  productsByCategory: Record<string, Product[]>;
  stocktakeSummary: StocktakeSummary | null;
  stocktakeItems: StocktakeItem[];
  recipes: Recipe[];
  suppliers: string[];
  apiResponses: Array<{ url: string; file: string }>;
  scrapedAt: string;
}

// ─── Scraper Functions ─────────────────────────────────────────────

async function autoScroll(page: Page): Promise<void> {
  console.log('  ⏬ Auto-scrolling to load all items...');
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          // Wait a bit for lazy loading, then check again
          setTimeout(() => {
            if (document.body.scrollHeight === scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }
          }, 1000);
        }
      }, 200);
    });
  });
  console.log('  ✅ Scrolling complete');
}

async function scrapeProductsByProduct(page: Page): Promise<Product[]> {
  console.log('  📦 Scraping products (By Product view)...');

  // First, also intercept what we can from the DOM
  const products = await page.evaluate(() => {
    const items: Product[] = [];

    // Try table rows
    const rows = document.querySelectorAll('table tbody tr, [class*="row"], [class*="item"], [class*="product"]');
    rows.forEach((row) => {
      const text = row.textContent?.trim() || '';
      if (!text || text.length < 5) return;

      // Try to extract structured data from the row
      const cells = row.querySelectorAll('td, [class*="cell"], [class*="col"]');
      if (cells.length >= 3) {
        const item: Product = {
          name: cells[0]?.textContent?.trim() || text.substring(0, 50),
        };

        // Look for price pattern (£ X.XX)
        const priceMatch = text.match(/£\s*[\d,.]+/);
        if (priceMatch) item.price = priceMatch[0];

        // Look for weight pattern (X g, X kg, X ml, X l)
        const weightMatch = text.match(/[\d,]+\s*(?:g|kg|ml|l)\b/i);
        if (weightMatch) item.weight = weightMatch[0];

        // Look for UoM (Box, Bag, Pack, Bottle, Can, Case, Tub, Item, L, Kg)
        const uomMatch = text.match(/\b(Box|Bag|Pack|Bottle|Can|Case|Tub|Item|Carton|L|Kg)\b/i);
        if (uomMatch) item.uom = uomMatch[1];

        items.push(item);
      }
    });

    // Also try to find product info in a more specific Edify layout
    // Based on screenshots: Product Name | Price • UoM • Weight | Qty | UoM | Subtotal
    const productRows = document.querySelectorAll('[class*="product"], [class*="row"]');
    if (items.length === 0) {
      productRows.forEach((row) => {
        const nameEl = row.querySelector('[class*="name"], [class*="title"], h3, h4, strong, b');
        if (!nameEl) return;
        const name = nameEl.textContent?.trim();
        if (!name) return;

        const text = row.textContent || '';
        const item: Product = { name };

        const priceMatch = text.match(/£\s*[\d,.]+/);
        if (priceMatch) item.price = priceMatch[0];

        const weightMatch = text.match(/[\d,]+\s*(?:g|kg|ml|l)\b/i);
        if (weightMatch) item.weight = weightMatch[0];

        const uomMatch = text.match(/\b(Box|Bag|Pack|Bottle|Can|Case|Tub|Item|Carton|L|Kg)\b/i);
        if (uomMatch) item.uom = uomMatch[1];

        items.push(item);
      });
    }

    return items;
  });

  console.log(`  ✅ Found ${products.length} products`);
  return products;
}

async function scrapeProductsByCategory(page: Page): Promise<Record<string, Product[]>> {
  console.log('  📂 Scraping products by category...');

  // First expand all collapsed categories
  const expandButtons = await page.$$('[class*="expand"], [class*="collapse"], [class*="toggle"], button:has([class*="minus"]), button:has([class*="chevron"])');
  for (const btn of expandButtons) {
    try { await btn.click(); } catch { /* already expanded */ }
  }
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const categories: Record<string, Product[]> = {};
    let currentCategory = '';

    // Walk through all visible rows
    const allRows = document.querySelectorAll('tr, [class*="row"], [role="row"]');
    allRows.forEach((row) => {
      const text = row.textContent?.trim() || '';
      if (!text) return;

      // Category header rows typically have just a name and dashes or no values
      const cells = row.querySelectorAll('td, [class*="cell"]');
      const isCategory = text.match(/^[A-Za-z\s]+\s*[-–]\s*[-–]\s*[-–]/);
      const hasMinus = row.querySelector('[class*="minus"], [class*="collapse"]');

      if (isCategory || (cells.length >= 2 && cells[1]?.textContent?.trim() === '-')) {
        currentCategory = cells[0]?.textContent?.trim() || text.split(/\s{2,}/)[0];
        if (currentCategory && !categories[currentCategory]) {
          categories[currentCategory] = [];
        }
        return;
      }

      // Product row
      if (currentCategory) {
        const priceMatch = text.match(/£\s*[\d,.]+/);
        const weightMatch = text.match(/[\d,]+\s*(?:g|kg|ml|l)\b/i);
        const uomMatch = text.match(/\b(Box|Bag|Pack|Bottle|Can|Case|Tub|Item|Carton|L|Kg)\b/i);

        const nameEl = row.querySelector('[class*="name"], [class*="title"], strong, b') || cells[0];
        const name = nameEl?.textContent?.trim();
        if (name && name.length > 2 && !name.match(/^(Qty|UoM|Subtotal|Product)/)) {
          categories[currentCategory].push({
            name,
            category: currentCategory,
            price: priceMatch?.[0],
            weight: weightMatch?.[0],
            uom: uomMatch?.[1],
          });
        }
      }
    });

    return categories;
  });

  const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`  ✅ Found ${Object.keys(data).length} categories with ${total} products`);
  return data;
}

async function scrapeStocktake(page: Page): Promise<{ summary: StocktakeSummary | null; items: StocktakeItem[] }> {
  console.log('  📊 Scraping stocktake...');

  const result = await page.evaluate(() => {
    const text = document.body.textContent || '';

    // Summary info
    const summary: StocktakeSummary = {
      classes: [],
    };

    // Extract header info
    const siteMatch = text.match(/Site:\s*(.+?)(?:\n|Stocktake)/);
    if (siteMatch) summary.site = siteMatch[1].trim();

    const dateMatch = text.match(/Stocktake Date:\s*(.+?)(?:\n|Previous)/);
    if (dateMatch) summary.stocktakeDate = dateMatch[1].trim();

    const prevMatch = text.match(/Previous Stocktake Date:\s*(.+?)(?:\n|Submitted)/);
    if (prevMatch) summary.previousDate = prevMatch[1].trim();

    const submittedMatch = text.match(/Submitted by:\s*(.+?)(?:\n|$)/);
    if (submittedMatch) summary.submittedBy = submittedMatch[1].trim();

    const totalMatch = text.match(/Total Stock Value:\s*£\s*([\d,.]+)/);
    if (totalMatch) summary.totalValue = `£${totalMatch[1]}`;

    // Extract items - look for product rows with stock counts
    const items: StocktakeItem[] = [];
    const rows = document.querySelectorAll('table tbody tr, [class*="row"]');
    rows.forEach((row) => {
      const rowText = row.textContent?.trim() || '';
      const nameEl = row.querySelector('strong, b, [class*="name"], [class*="title"]');
      if (!nameEl) return;
      const name = nameEl.textContent?.trim();
      if (!name || name.length < 2) return;

      // Look for input elements (stock count fields)
      const inputs = row.querySelectorAll('input');
      if (inputs.length >= 3) {
        const item: StocktakeItem = {
          name,
          stockCount: {
            g: (inputs[0] as HTMLInputElement)?.value || '0',
            kg: (inputs[1] as HTMLInputElement)?.value || '0',
            units: (inputs[2] as HTMLInputElement)?.value || '0',
            unitType: '',
          },
        };

        // Find the unit type label (Tub, Box, Pack, Bag, etc.)
        const unitLabels = row.querySelectorAll('[class*="unit"], [class*="label"], small, span');
        unitLabels.forEach((label) => {
          const lt = label.textContent?.trim();
          if (lt && /^(Tub|Box|Pack|Bag|Bottle|Can|Case|Item|Carton)$/i.test(lt)) {
            item.stockCount.unitType = lt;
          }
        });

        // Extract supplier and storage from sub-lines
        const subLines = row.querySelectorAll('[class*="sub"], [class*="meta"], [class*="detail"], small');
        subLines.forEach((sub) => {
          const st = sub.textContent?.trim();
          if (st && /storage/i.test(st)) item.storageLocation = st;
          else if (st && st.length > 1 && !st.match(/^\d/)) item.supplier = st;
        });

        // Product class
        const classMatch = rowText.match(/\b(Food|Other|Packaging|Cookie|Beverage|Croissant)\b/);
        if (classMatch) item.productClass = classMatch[1];

        // Total count and value
        const valueMatch = rowText.match(/£[\d,.]+/);
        if (valueMatch) item.totalValue = valueMatch[0];

        const countMatch = rowText.match(/[\d.]+\s+(Tub|Box|Pack|Bag|Bottle|Can|Case|Item|Carton)/i);
        if (countMatch) item.totalCount = countMatch[0];

        items.push(item);
      }
    });

    return { summary, items };
  });

  console.log(`  ✅ Found stocktake with ${result.items.length} items`);
  return result;
}

async function scrapeRecipes(page: Page): Promise<Recipe[]> {
  console.log('  🍳 Scraping recipes...');

  const recipes = await page.evaluate(() => {
    const items: Recipe[] = [];

    // Look for recipe cards/rows
    const rows = document.querySelectorAll('[class*="recipe"], [class*="card"], table tbody tr, [class*="row"], [class*="item"]');
    rows.forEach((row) => {
      const nameEl = row.querySelector('h2, h3, h4, strong, b, [class*="name"], [class*="title"]');
      if (!nameEl) return;
      const name = nameEl.textContent?.trim();
      if (!name || name.length < 2) return;

      const recipe: Recipe = { name };
      const text = row.textContent || '';

      // Try to extract any available fields
      const costMatch = text.match(/(?:cost|price).*?£\s*([\d,.]+)/i);
      if (costMatch) recipe.cost = `£${costMatch[1]}`;

      const yieldMatch = text.match(/(?:yield|portion|serves?).*?(\d+)/i);
      if (yieldMatch) recipe.yield = yieldMatch[1];

      items.push(recipe);
    });

    return items;
  });

  console.log(`  ✅ Found ${recipes.length} recipes`);
  return recipes;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const data: ScrapedData = {
    products: [],
    productsByCategory: {},
    stocktakeSummary: null,
    stocktakeItems: [],
    recipes: [],
    suppliers: [],
    apiResponses: [],
    scrapedAt: new Date().toISOString(),
  };

  let apiResponseCounter = 0;

  console.log('🚀 Edify Data Scraper');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📋 Instructions:');
  console.log('   1. Log in to Edify when the browser opens');
  console.log('   2. Navigate to the page you want to scrape');
  console.log('   3. Type a command in this terminal:');
  console.log('');
  console.log('   p  — Scrape products (By Product view)');
  console.log('   c  — Scrape products by category');
  console.log('   s  — Scrape stocktake data');
  console.log('   r  — Scrape recipes');
  console.log('   a  — Auto-scroll page first, then prompt for scrape type');
  console.log('   q  — Save all data and quit');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });

  const page = await context.newPage();

  // Intercept API responses in the background
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    if (!contentType.includes('json')) return;
    if (url.match(/\.(js|css)(\?|$)/)) return;
    if (url.includes('intercom') || url.includes('sentry') || url.includes('analytics')) return;

    try {
      const body = await response.json();
      apiResponseCounter++;
      const filename = `api_${String(apiResponseCounter).padStart(4, '0')}.json`;
      const filepath = path.join(OUTPUT_DIR, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        url,
        method: response.request().method(),
        status: response.status(),
        timestamp: new Date().toISOString(),
        data: body,
      }, null, 2));

      data.apiResponses.push({ url, file: filename });

      const shortUrl = url.replace(/https?:\/\/[^/]+/, '');
      console.log(`  🌐 API: ${shortUrl} → ${filename}`);

      // Auto-extract supplier names from API responses
      if (Array.isArray(body)) {
        body.forEach((item: Record<string, unknown>) => {
          if (item.supplier_name && !data.suppliers.includes(item.supplier_name as string)) {
            data.suppliers.push(item.supplier_name as string);
          }
          if (item.name && typeof item.name === 'string' && url.includes('supplier')) {
            if (!data.suppliers.includes(item.name)) {
              data.suppliers.push(item.name);
            }
          }
        });
      }
    } catch {
      // Not parseable JSON, skip
    }
  });

  await page.goto('https://app.edifysystems.io');

  console.log('\n⏳ Waiting for login...\n');

  // Set up terminal input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('\n> Command (p/c/s/r/a/q): ', async (answer) => {
      const cmd = answer.trim().toLowerCase();

      try {
        switch (cmd) {
          case 'p':
            data.products.push(...await scrapeProductsByProduct(page));
            break;
          case 'c':
            const catData = await scrapeProductsByCategory(page);
            Object.entries(catData).forEach(([cat, prods]) => {
              data.productsByCategory[cat] = [
                ...(data.productsByCategory[cat] || []),
                ...prods,
              ];
            });
            break;
          case 's':
            const stockData = await scrapeStocktake(page);
            if (stockData.summary) data.stocktakeSummary = stockData.summary;
            data.stocktakeItems.push(...stockData.items);
            break;
          case 'r':
            data.recipes.push(...await scrapeRecipes(page));
            break;
          case 'a':
            await autoScroll(page);
            prompt();
            return;
          case 'q':
            // Save all data
            const outputPath = path.join(OUTPUT_DIR, 'edify-data.json');
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

            // Also save a flattened products CSV
            if (data.products.length > 0) {
              const csvHeader = 'Name,Supplier,Category,Product Class,Price,UoM,Pack Size,Weight,Storage Location';
              const csvRows = data.products.map((p) =>
                [p.name, p.supplier, p.category, p.productClass, p.price, p.uom, p.packSize, p.weight, p.storageLocation]
                  .map((v) => `"${(v || '').replace(/"/g, '""')}"`)
                  .join(',')
              );
              fs.writeFileSync(
                path.join(OUTPUT_DIR, 'products.csv'),
                [csvHeader, ...csvRows].join('\n')
              );
            }

            // Save suppliers
            if (data.suppliers.length > 0) {
              fs.writeFileSync(
                path.join(OUTPUT_DIR, 'suppliers.json'),
                JSON.stringify(data.suppliers, null, 2)
              );
            }

            console.log('\n✅ All data saved to:');
            console.log(`   📁 ${OUTPUT_DIR}`);
            console.log(`   📦 ${data.products.length} products`);
            console.log(`   📂 ${Object.keys(data.productsByCategory).length} categories`);
            console.log(`   📊 ${data.stocktakeItems.length} stocktake items`);
            console.log(`   🍳 ${data.recipes.length} recipes`);
            console.log(`   🏢 ${data.suppliers.length} suppliers`);
            console.log(`   🌐 ${data.apiResponses.length} API responses captured`);

            rl.close();
            await browser.close();
            return;

          default:
            console.log('  Unknown command. Use p/c/s/r/a/q');
        }
      } catch (err) {
        console.error('  ❌ Error:', (err as Error).message);
      }

      prompt();
    });
  };

  // Wait a moment for the page to load, then start prompting
  await page.waitForTimeout(2000);
  prompt();
}

main().catch(console.error);
