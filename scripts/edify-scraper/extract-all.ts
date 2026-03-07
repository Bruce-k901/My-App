/**
 * Edify Full Data Extraction
 *
 * Opens a browser for login, captures the auth token,
 * then systematically pulls ALL data via direct API calls.
 *
 * Usage: npx tsx scripts/edify-scraper/extract-all.ts
 *
 * Extracts:
 *   - All sites
 *   - All suppliers (with product counts)
 *   - ALL products across ALL suppliers
 *   - Product categories & classes
 *   - Storage areas
 *   - Stock take data & stock items
 *   - All recipes (with full ingredients)
 *   - Recipe categories
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, 'extracted-data');
const API_BASE = 'https://production-api.edifysystems.io/v1';
const COMPANY_ID = 'c87184ab-e6c3-4cdb-ab10-37c995fdf55b';

// ─── Types ─────────────────────────────────────────────────────────

interface EdifyProduct {
  id: string;
  name: string;
  status: string;
  productClass: string | null;
  productCategory: string | null;
  packQuantity: string;
  packCost: string;
  packType: string;
  singleUnitType: string;
  singleItemVolumeOrWeight: string | null;
  unitOfMeasure: string | null;
  supplierProductCode: string | null;
  supplier: { id: string; name: string; status: string };
  containsAllergens: string[];
  tracesOfAllergens: string[];
  nutritionalInformation: Record<string, number>;
  allowSplitPack: boolean;
  taxRate: string | null;
  variants: unknown[];
  alternative1UnitType: string | null;
  alternative1NumberOfUnits: string | null;
  alternative2UnitType: string | null;
  alternative2NumberOfUnits: string | null;
}

interface EdifySupplier {
  id: string;
  name: string;
  status: string;
  categories: string[];
  sitesCount: number;
  sites: string[];
  productsCount: number;
}

interface EdifySite {
  id: string;
  name: string;
  status: string;
  isCPU: boolean;
  timezone: string;
}

interface EdifyRecipeSummary {
  id: string;
  name: string;
  recipeYield: string;
  recipeYieldType: string;
  isSubRecipe: boolean;
  status: string;
  productClass: string | null;
  ingredientsCost: string;
  recipeCategory: string | null;
  sitesCount: number;
  sites: string[];
}

interface EdifyRecipeDetail {
  id: string;
  name: string;
  status: string;
  productClass: string | null;
  recipeYield: string;
  recipeYieldType: string;
  isSubRecipe: boolean;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: string;
    unitOfMeasure: string;
    product?: EdifyProduct;
    recipe?: { id: string; name: string };
  }>;
  allergens: string[];
  instructions: string | null;
  dineInSrp: string | null;
  takeAwaySrp: string | null;
  deliverySrp: string | null;
  vatPercent: string | null;
  marginPercent: string | null;
  recipeCategory: string | null;
  preparationTime: string | null;
  shelfLife: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

function saveJSON(filename: string, data: unknown) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log('💾', `Saved ${filepath}`);
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  return [
    headers.join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n');
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('');
  console.log('🚀 Edify Full Data Extraction');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('📋 Step 1: Log in to Edify in the browser');
  console.log('   The script will capture your auth token automatically.');
  console.log('   Once logged in, just wait — extraction is fully automatic.');
  console.log('');

  let authToken: string | null = null;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });

  const page = await context.newPage();

  // Capture auth token from API calls
  page.on('request', (request) => {
    const authHeader = request.headers()['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ') && request.url().includes('production-api.edifysystems.io')) {
      authToken = authHeader.replace('Bearer ', '');
    }
  });

  await page.goto('https://app.edifysystems.io');

  // Wait for auth token to be captured
  log('⏳', 'Waiting for login and auth token...');
  while (!authToken) {
    await delay(1000);
  }
  log('✅', 'Auth token captured!');

  // Wait a moment for the page to fully load
  await delay(2000);

  // Now make direct API calls using the captured token
  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  async function apiGet<T>(endpoint: string, throwOnError = true): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const msg = `API ${response.status}: ${endpoint} — ${body.substring(0, 200)}`;
      if (throwOnError) throw new Error(msg);
      log('⚠️', msg);
      return null as T;
    }
    return response.json() as Promise<T>;
  }

  // ─── 1. Sites ──────────────────────────────────────────────────

  console.log('\n📍 Extracting sites...');
  const sites = await apiGet<EdifySite[]>(`/companies/${COMPANY_ID}/sites/slim`);
  const cpuSites = await apiGet<EdifySite[]>(`/companies/${COMPANY_ID}/cpu-sites/slim`);
  log('✅', `${sites.length} sites (${cpuSites.length} CPU sites)`);
  saveJSON('sites.json', { sites, cpuSites });

  // ─── 2. Product Categories & Classes ───────────────────────────

  console.log('\n📂 Extracting product categories & classes...');
  const categories = await apiGet<{ categories: Array<{ id: string; name: string }> }>(
    `/products/${COMPANY_ID}/categories`
  );
  const classes = await apiGet<{ classes: Array<{ id: string; name: string }> }>(
    `/products/${COMPANY_ID}/classes`
  );
  log('✅', `${categories.categories.length} categories, ${classes.classes.length} classes`);
  saveJSON('product-categories.json', categories);
  saveJSON('product-classes.json', classes);

  // ─── 3. Suppliers ──────────────────────────────────────────────

  console.log('\n🏢 Extracting suppliers...');
  // Get suppliers per site with pagination (API max page size ~50)
  const allSupplierMap = new Map<string, EdifySupplier>();
  for (const site of sites) {
    let pg = 1;
    while (true) {
      const resp = await apiGet<{ data: EdifySupplier[]; totalCount: number }>(
        `/companies/${COMPANY_ID}/suppliers?orderBy=name&orderDirection=ASC&page=${pg}&size=50&name=&sites=${site.id}&statuses=ACTIVE`,
        false
      );
      if (!resp?.data || resp.data.length === 0) break;
      resp.data.forEach((s) => allSupplierMap.set(s.id, s));
      if (resp.data.length < 50) break;
      pg++;
      await delay(100);
    }
    const count = allSupplierMap.size;
    if (count > 0) log('🏢', `${site.name}: found suppliers (${count} total so far)`);
    await delay(100);
  }
  const suppliers = Array.from(allSupplierMap.values());
  log('✅', `${suppliers.length} active suppliers`);
  saveJSON('suppliers.json', suppliers);

  // Fetch full detail for each supplier (contacts, order cutoffs, account numbers)
  console.log('\n📇 Extracting supplier details (contacts, order config)...');
  const supplierDetails: unknown[] = [];
  for (const supplier of suppliers) {
    const detail = await apiGet<unknown>(`/suppliers/${supplier.id}`, false);
    if (detail) {
      supplierDetails.push(detail);
      const d = detail as Record<string, unknown>;
      const emails = (d.orderEmails as string[])?.join(', ') || '-';
      log('📇', `${supplier.name}: ${emails}`);
    }
    await delay(100);
  }
  saveJSON('suppliers-detail.json', supplierDetails);

  // Also get supplier categories
  const supplierCategories = await apiGet<unknown>('/suppliers/categories');
  saveJSON('supplier-categories.json', supplierCategories);

  // ─── 3b. Site Details (wholesale customer contacts) ────────────

  console.log('\n👥 Probing site detail endpoints for customer contacts...');
  const siteDetails: Record<string, unknown> = {};
  for (const site of sites) {
    if (site.isCPU) continue; // Skip CPU, only want customer sites
    // Try the full site detail endpoint
    const detail = await apiGet<unknown>(`/sites/${site.id}`, false);
    if (detail) {
      siteDetails[site.name] = detail;
      const d = detail as Record<string, unknown>;
      const hasContact = d.contactName || d.contactEmail || d.email || d.phone || d.address;
      log('👥', `${site.name}: ${hasContact ? 'has contact info' : 'basic data only'}`);
    }
    await delay(100);
  }
  saveJSON('sites-detail.json', siteDetails);

  // ─── 3c. Users / Team Members ─────────────────────────────────

  console.log('\n👤 Extracting users...');
  // Try common endpoint patterns for the /users page
  const usersEndpoints = [
    `/companies/${COMPANY_ID}/users`,
    `/companies/${COMPANY_ID}/users?page=1&size=200`,
    `/users?companyId=${COMPANY_ID}`,
    `/companies/${COMPANY_ID}/members`,
    `/companies/${COMPANY_ID}/team`,
  ];
  let usersData: unknown = null;
  for (const endpoint of usersEndpoints) {
    const resp = await apiGet<unknown>(endpoint, false);
    if (resp) {
      usersData = resp;
      log('✅', `Users found via ${endpoint}`);
      break;
    }
  }
  if (usersData) {
    saveJSON('users.json', usersData);
    // Log a summary
    const users = Array.isArray(usersData) ? usersData : (usersData as Record<string, unknown>).data as unknown[] || [];
    if (Array.isArray(users)) {
      users.forEach((u: unknown) => {
        const user = u as Record<string, unknown>;
        log('👤', `${user.firstName || ''} ${user.lastName || ''} — ${user.email || '-'} — ${user.contactPhone || '-'}`);
      });
      log('✅', `${users.length} users total`);
    }
  } else {
    log('⚠️', 'Could not find users endpoint — try running discovery script and visiting /users page');
  }

  // ─── 4. ALL Products (per supplier) ────────────────────────────

  console.log('\n📦 Extracting products from ALL suppliers...');
  const allProducts: EdifyProduct[] = [];
  const productsBySupplier: Record<string, EdifyProduct[]> = {};

  for (const supplier of suppliers) {
    try {
      // Paginate products per supplier (use first site from supplier)
      const siteId = supplier.sites?.[0] || sites[0].id;
      const supplierProducts: EdifyProduct[] = [];
      let pg = 1;
      while (true) {
        const productsResp = await apiGet<{ data: EdifyProduct[]; totalCount: number }>(
          `/suppliers/${supplier.id}/products?orderBy=name&orderDirection=ASC&page=${pg}&size=50&name=&sites=${siteId}&statuses=ACTIVE&query=`,
          false
        );
        if (!productsResp?.data || productsResp.data.length === 0) break;
        supplierProducts.push(...productsResp.data);
        if (productsResp.data.length < 50) break;
        pg++;
        await delay(100);
      }
      productsBySupplier[supplier.name] = supplierProducts;
      allProducts.push(...supplierProducts);
      log('📦', `${supplier.name}: ${supplierProducts.length} products`);

      await delay(200);
    } catch (err) {
      log('⚠️', `${supplier.name}: Failed - ${(err as Error).message}`);
    }
  }

  // Deduplicate products by ID (same product could appear under multiple suppliers)
  const uniqueProducts = new Map<string, EdifyProduct>();
  allProducts.forEach((p) => uniqueProducts.set(p.id, p));
  const deduped = Array.from(uniqueProducts.values());

  log('✅', `${deduped.length} unique products (${allProducts.length} total across suppliers)`);
  saveJSON('products-all.json', deduped);
  saveJSON('products-by-supplier.json', productsBySupplier);

  // Products CSV
  const productCSV = toCSV(
    ['ID', 'Name', 'Supplier', 'Product Class', 'Product Category', 'Pack Cost (£)',
     'Pack Quantity', 'Pack Type', 'Single Unit Type', 'Weight/Volume',
     'Unit of Measure', 'Supplier Code', 'Allergens', 'Status'],
    deduped.map((p) => [
      p.id,
      p.name,
      p.supplier?.name || '',
      p.productClass || '',
      p.productCategory || '',
      p.packCost,
      p.packQuantity,
      p.packType,
      p.singleUnitType,
      p.singleItemVolumeOrWeight || '',
      p.unitOfMeasure || '',
      p.supplierProductCode || '',
      p.containsAllergens?.join('; ') || '',
      p.status,
    ])
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'products.csv'), productCSV);
  log('💾', 'Saved products.csv');

  // ─── 5. Storage Areas (per site) ──────────────────────────────

  console.log('\n🗄️  Extracting storage areas...');
  const storageBysite: Record<string, unknown> = {};
  for (const site of sites) {
    try {
      const areas = await apiGet<unknown>(`/sites/${site.id}/storage-areas`);
      storageBysite[site.name] = areas;
      await delay(100);
    } catch {
      // Some sites might not have storage areas
    }
  }
  saveJSON('storage-areas.json', storageBysite);

  // ─── 6. Stock Take (per site) ─────────────────────────────────

  console.log('\n📊 Extracting stock take data...');
  const stockBysite: Record<string, unknown> = {};
  const stockItemsBySite: Record<string, unknown> = {};

  for (const site of sites) {
    try {
      const stockTake = await apiGet<unknown>(`/sites/${site.id}/stock-take`);
      stockBysite[site.name] = stockTake;

      // Also get stock items
      try {
        const stockItems = await apiGet<unknown>(
          `/sites/${site.id}/stock-items?filterByCountedInStockTake=true`
        );
        stockItemsBySite[site.name] = stockItems;
      } catch {
        // No stock items for this site
      }

      await delay(200);
    } catch {
      // No stocktake for this site
    }
  }
  log('✅', `Stock data for ${Object.keys(stockBysite).length} sites`);
  saveJSON('stock-takes.json', stockBysite);
  saveJSON('stock-items.json', stockItemsBySite);

  // ─── 7. Recipes ────────────────────────────────────────────────

  console.log('\n🍳 Extracting recipes...');
  // Fetch recipes per site then merge (API requires sites param)
  const allRecipeMap = new Map<string, EdifyRecipeSummary>();
  for (const site of sites) {
    let page = 1;
    while (true) {
      const resp = await apiGet<{ data: EdifyRecipeSummary[]; totalCount: number }>(
        `/companies/${COMPANY_ID}/recipes?orderBy=name&orderDirection=ASC&page=${page}&size=50&name=&sites=${site.id}`,
        false
      );
      if (!resp?.data || resp.data.length === 0) break;
      resp.data.forEach((r) => allRecipeMap.set(r.id, r));
      if (resp.data.length < 50) break; // last page
      page++;
      await delay(100);
    }
  }
  const recipeSummaries = Array.from(allRecipeMap.values());
  log('📋', `${recipeSummaries.length} recipes found, fetching details...`);
  saveJSON('recipes-summary.json', recipeSummaries);

  // Fetch full details for each recipe (with ingredients)
  const recipeDetails: EdifyRecipeDetail[] = [];
  let recipeCount = 0;

  for (const recipe of recipeSummaries) {
    try {
      const detail = await apiGet<EdifyRecipeDetail>(`/recipes/${recipe.id}`);
      recipeDetails.push(detail);
      recipeCount++;

      if (recipeCount % 10 === 0) {
        log('🍳', `${recipeCount}/${recipeSummaries.length} recipes fetched...`);
      }

      // Respectful delay
      await delay(150);
    } catch (err) {
      log('⚠️', `Recipe "${recipe.name}": Failed - ${(err as Error).message}`);
    }
  }

  log('✅', `${recipeDetails.length} recipe details fetched`);
  saveJSON('recipes-full.json', recipeDetails);

  // Recipe categories
  const recipeCategories = await apiGet<unknown>(
    `/recipe-category/company/${COMPANY_ID}`
  );
  saveJSON('recipe-categories.json', recipeCategories);

  // Recipes CSV
  const recipeCSV = toCSV(
    ['ID', 'Name', 'Product Class', 'Yield', 'Yield Type', 'Is Sub-Recipe',
     'Ingredients Cost (£)', 'Dine In SRP', 'Takeaway SRP', 'VAT %',
     'Allergens', 'Num Ingredients', 'Status'],
    recipeDetails.map((r) => [
      r.id,
      r.name,
      r.productClass || '',
      r.recipeYield,
      r.recipeYieldType,
      String(r.isSubRecipe),
      r.ingredients?.reduce((sum, ing) => {
        const prod = ing.product;
        if (!prod) return sum;
        const costPerUnit = parseFloat(prod.packCost) / (parseFloat(prod.singleItemVolumeOrWeight || '1') || 1);
        return sum + costPerUnit * parseFloat(ing.quantity);
      }, 0).toFixed(3) || '',
      r.dineInSrp || '',
      r.takeAwaySrp || '',
      r.vatPercent || '',
      r.allergens?.join('; ') || '',
      String(r.ingredients?.length || 0),
      r.status,
    ])
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'recipes.csv'), recipeCSV);
  log('💾', 'Saved recipes.csv');

  // ─── 8. Summary ────────────────────────────────────────────────

  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('✅ EXTRACTION COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`  📍 ${sites.length} sites`);
  console.log(`  🏢 ${suppliers.length} suppliers`);
  console.log(`  📦 ${deduped.length} unique products`);
  console.log(`  📂 ${categories.categories.length} product categories`);
  console.log(`  🏷️  ${classes.classes.length} product classes`);
  console.log(`  📊 ${Object.keys(stockBysite).length} site stocktakes`);
  console.log(`  🍳 ${recipeDetails.length} recipes (with ingredients)`);
  console.log('');
  console.log('  Files:');
  console.log('  ├── sites.json');
  console.log('  ├── suppliers.json');
  console.log('  ├── products-all.json       (all products, deduplicated)');
  console.log('  ├── products-by-supplier.json');
  console.log('  ├── products.csv');
  console.log('  ├── product-categories.json');
  console.log('  ├── product-classes.json');
  console.log('  ├── storage-areas.json');
  console.log('  ├── stock-takes.json');
  console.log('  ├── stock-items.json');
  console.log('  ├── recipes-summary.json');
  console.log('  ├── recipes-full.json       (with ingredients)');
  console.log('  ├── recipes.csv');
  console.log('  ├── recipe-categories.json');
  console.log('  └── supplier-categories.json');
  console.log('');

  await browser.close();
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
