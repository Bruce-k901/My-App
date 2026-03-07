#!/usr/bin/env npx tsx
/**
 * Edify → Opsly Import Script
 *
 * Reads extracted Edify data from ./extracted-data/ and imports into Supabase.
 * Run: npx tsx scripts/edify-scraper/import-to-supabase.ts
 *
 * Prerequisites:
 * - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * - Extracted data in scripts/edify-scraper/extracted-data/
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const DATA_DIR = join(__dir, 'extracted-data');

// ========================================================
// Load environment from .env.local
// ========================================================
function loadEnv(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const envPath = join(__dir, '../../.env.local');
const env = loadEnv(envPath);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ========================================================
// Helpers
// ========================================================
function readJSON<T = any>(filename: string): T {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf-8'));
}

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}

function round4(v: number): number { return Math.round(v * 10000) / 10000; }
function round6(v: number): number { return Math.round(v * 1000000) / 1000000; }

// ========================================================
// Mapping constants
// ========================================================
const UOM_FROM_EDIFY: Record<string, string> = {
  'GRAM': 'g', 'G': 'g',
  'KILOGRAM': 'kg', 'KG': 'kg',
  'MILLILITRE': 'ml', 'ML': 'ml',
  'LITRE': 'L', 'L': 'L',
  'EACH': 'ea', 'Each': 'ea',
};

const PACK_TYPE_TO_UOM: Record<string, string> = {
  'Each': 'ea', 'Box': 'case', 'Bag': 'bag', 'Pack': 'pack',
  'Bottle': 'btl', 'Can': 'can', 'Case': 'case', 'Tub': 'ea',
  'Kg': 'kg', 'L': 'L', 'Item': 'ea', 'Carton': 'case', 'Jar': 'ea',
};

const CLASS_TO_CATEGORY_TYPE: Record<string, string> = {
  'Food': 'food', 'Cookie': 'food', 'Croissant': 'food', 'Swirls': 'food',
  'Beverage': 'beverage', 'Beverage - Coffee': 'beverage',
  'Alcohol': 'alcohol',
  'Packaging': 'disposable', 'Other': 'other', 'Retail': 'other',
};

const STORAGE_DIVISION_MAP: Record<string, string> = {
  'Kitchen': 'kitchen',
  'Dry storage': 'dry_store',
  'Back fridge and freezer': 'walk_in',
  'Chemicals': 'chemicals',
  'Packaging': 'packaging',
};

// Library routing: productClass → which library table to use
// ingredients_library: food items (ingredient_name column)
// packaging_library: packaging/takeaway items (item_name column)
// chemicals_library: cleaning/chemicals/disposable supplies (product_name column)
interface LibraryRoute {
  table: string;
  libraryType: string;
  nameColumn: string;
}
function guessPackagingCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('cup') || n.includes('espresso')) return 'Drink Cups';
  if (n.includes('lid')) return 'Lids';
  if (n.includes('bag')) return 'Bags';
  if (n.includes('straw')) return 'Straws';
  if (n.includes('napkin')) return 'Napkins';
  if (n.includes('box') || n.includes('crashlock') || n.includes('tray')) return 'Boxes';
  if (n.includes('spoon') || n.includes('fork') || n.includes('knife') || n.includes('stirrer') || n.includes('cutlery')) return 'Cutlery';
  return 'Food Containers'; // default for greaseproof, stickers, paper, etc.
}

const LIBRARY_ROUTE: Record<string, LibraryRoute> = {
  'Packaging': { table: 'packaging_library', libraryType: 'packaging_library', nameColumn: 'item_name' },
  'Other': { table: 'chemicals_library', libraryType: 'chemicals_library', nameColumn: 'product_name' },
};
const DEFAULT_LIBRARY: LibraryRoute = {
  table: 'ingredients_library', libraryType: 'ingredients_library', nameColumn: 'ingredient_name',
};

// ========================================================
// Types for extracted data
// ========================================================
interface EdifyProduct {
  id: string;
  name: string;
  status: string;
  productClass: string;
  productCategory: string;
  packQuantity: string;
  packCost: string;
  packType: string;
  singleUnitType: string;
  singleItemVolumeOrWeight: string | null;
  supplierProductCode: string | null;
  taxRate: string | number | null;
  unitOfMeasure: string | null;
  containsAllergens?: string[];
}

interface EdifySupplier {
  id: string;
  name: string;
  status: string;
  contactName: string | null;
  contactPhones: string[];
  orderEmails: string[];
  accountsEmails: string[];
  orderCutOffTimes: Record<string, any>;
  minimumOrderValue: number | null;
  notes: string | null;
  sites: string[];
  sendOrderToEmail: boolean;
  sendOrderToApi: boolean;
  cpuId: string | null;
}

interface EdifyIngredient {
  id: string;
  name: string | null;
  quantity: string;
  unitOfMeasure: string;
  product: {
    id: string;
    name: string;
    supplier?: { id: string; name: string };
    packQuantity: string;
    packCost: string;
    singleItemVolumeOrWeight: string | null;
    unitOfMeasure: string | null;
    containsAllergens?: string[];
  } | null;
  subRecipe: {
    id: string;
    name: string;
    recipeYield: string;
    recipeYieldType: string;
    ingredientsCost: string;
  } | null;
  subRecipeId: string | null;
}

interface EdifyRecipe {
  id: string;
  name: string;
  status: string;
  productClass: string;
  recipeYield: string;
  recipeYieldType: string;
  isSubRecipe: boolean;
  vatPercent: string | null;
  dineInSrp: string | null;
  takeAwaySrp: string | null;
  allergens: string[];
  shelfLife: number | null;
  instructions: string | null;
  ingredients: EdifyIngredient[];
}

interface EdifySiteDetail {
  id: string;
  name: string;
  status: string;
  isCPU: boolean;
  deliveryContacts: { name: string | null; number: string | null }[];
  deliveryTimes: Record<string, { to: string; from: string; available: boolean }>;
  deliveryNotes: string;
  address: {
    address: string;
    addressSecondRow: string | null;
    city: string;
    postcode: string;
    country: string;
  } | null;
}

interface CustomerContact {
  site: string;
  siteId: string;
  contactName: string;
  email: string;
  phone: string | null;
}

// ========================================================
// MAIN
// ========================================================
async function main() {
  console.log('=== Edify → Opsly Import ===\n');

  // Auto-detect company and site IDs
  const { data: companies } = await supabase.from('companies').select('id, name');
  console.log('Available companies:');
  companies?.forEach(c => console.log(`  ${c.name} → ${c.id}`));

  const okja = companies?.find(c => c.name.toLowerCase().includes('okja'));
  const eag = companies?.find(c => c.name.toLowerCase().includes('eag'));

  if (!okja) {
    console.error('\n❌ No company containing "Okja" found. Create it first in Opsly.');
    process.exit(1);
  }

  const COMPANY_ID = okja.id;
  const EAG_ID = eag?.id || null;

  // Find Okja site
  const { data: opsySites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('company_id', COMPANY_ID);

  console.log(`\nOkja sites:`);
  opsySites?.forEach(s => console.log(`  ${s.name} → ${s.id}`));

  const cpuSite = opsySites?.[0];
  if (!cpuSite) {
    console.error('\n❌ No site found for Okja. Create it first in Opsly.');
    process.exit(1);
  }

  const SITE_ID = cpuSite.id;

  console.log(`\nUsing: Company=${COMPANY_ID}, Site=${SITE_ID}`);
  if (EAG_ID) console.log(`EAG cleanup: ${EAG_ID}`);
  console.log('');

  // Load UoM lookup
  const { data: uomRows } = await supabase.from('uom').select('id, abbreviation, name, unit_type, base_multiplier');
  if (!uomRows?.length) { console.error('❌ No UoM records found'); process.exit(1); }
  const uomByAbbr = new Map(uomRows.map((u: any) => [u.abbreviation, u]));
  console.log(`Loaded ${uomRows.length} UoM records`);

  // Find a valid profile UUID for created_by/updated_by (needed for audit triggers)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', COMPANY_ID)
    .limit(1);
  const IMPORT_USER_ID = profiles?.[0]?.id || null;
  console.log(`Import user: ${IMPORT_USER_ID || 'none (audit triggers may fail)'}\n`);

  function getUom(abbr: string): { id: string; abbreviation: string; name: string } {
    const u = uomByAbbr.get(abbr);
    if (!u) throw new Error(`UoM not found: "${abbr}". Available: ${[...uomByAbbr.keys()].join(', ')}`);
    return u;
  }

  // ==== Step 1: Cleanup EAG ====
  if (EAG_ID) {
    console.log('Step 1: Cleaning up EAG test data...');
    const { data: eagSites } = await supabase.from('sites').select('id').eq('company_id', EAG_ID);
    if (eagSites?.length) {
      const eagSiteIds = eagSites.map((s: any) => s.id);
      const { error } = await supabase
        .from('planly_customers')
        .delete()
        .in('site_id', eagSiteIds);
      if (error) console.error('  Error:', error.message);
      else console.log(`  Deleted EAG planly_customers for ${eagSiteIds.length} sites`);
    } else {
      console.log('  No EAG sites found, skipping');
    }
  } else {
    console.log('Step 1: No EAG company found, skipping cleanup');
  }
  console.log('');

  // ==== Step 2: Storage Areas ====
  // Actual schema: id, company_id, name, division, description, is_active, sort_order
  console.log('Step 2: Creating storage areas...');
  const storageData: Record<string, { id: string; name: string }[]> = readJSON('storage-areas.json');
  const cpuAreas = storageData['Okja - Kitchen CPU'] || [];
  let storageCount = 0;

  for (const area of cpuAreas) {
    const division = STORAGE_DIVISION_MAP[area.name] || null;

    const { data: existing } = await supabase
      .from('storage_areas')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('name', area.name)
      .maybeSingle();

    if (existing) {
      storageCount++;
    } else {
      const { error } = await supabase
        .from('storage_areas')
        .insert({
          company_id: COMPANY_ID,
          name: area.name,
          division: division,
          is_active: true,
        });
      if (error) console.error(`  Error for ${area.name}:`, error.message);
      else storageCount++;
    }
  }
  console.log(`  Created ${storageCount} storage areas\n`);

  // ==== Step 3: Stock Categories ====
  // Actual schema: id, company_id, name, slug, parent_id, sort_order, is_system
  console.log('Step 3: Creating stock categories...');
  const classData = readJSON<{ classes: { id: string; name: string }[] }>('product-classes.json');
  const categoryMap = new Map<string, string>(); // className → opsly categoryId

  for (const cls of classData.classes) {
    const slug = cls.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const catType = CLASS_TO_CATEGORY_TYPE[cls.name] || 'other';

    const { data: existing } = await supabase
      .from('stock_categories')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('name', cls.name)
      .maybeSingle();

    if (existing) {
      categoryMap.set(cls.name, existing.id);
    } else {
      // Use RPC function to bypass PostgREST schema cache issue with category_type
      const { data: catId, error: catErr } = await supabase
        .rpc('insert_stock_category', {
          p_company_id: COMPANY_ID,
          p_name: cls.name,
          p_slug: slug,
          p_category_type: catType,
        });

      if (catErr) {
        console.error(`  Error for "${cls.name}":`, catErr.message);
      } else if (catId) {
        categoryMap.set(cls.name, catId);
      }
    }
  }
  console.log(`  Created ${categoryMap.size} stock categories\n`);

  // ==== Step 4: Suppliers ====
  // Actual schema: id, company_id, name, code, contact_name, email, phone, address,
  //   payment_terms, account_number, notes, is_active, lead_time_days, delivery_days,
  //   minimum_order_value, ordering_method, ordering_config, order_cutoff_time, ...
  console.log('Step 4: Creating suppliers...');
  const suppliersData: EdifySupplier[] = readJSON('suppliers-detail.json');
  const supplierMapById = new Map<string, string>(); // edify ID → opsly ID
  const supplierMapByName = new Map<string, string>(); // name → opsly ID

  for (const sup of suppliersData) {
    // Parse account number from notes
    let accountNumber: string | null = null;
    let notes = sup.notes || '';
    if (notes) {
      const match = notes.match(/Account\s*(?:number|no|#)?[:\s]*(\S+)/i);
      if (match) accountNumber = match[1];
    }

    // Extract delivery days from orderCutOffTimes
    const deliveryDays: string[] = [];
    if (sup.orderCutOffTimes) {
      for (const [day, config] of Object.entries(sup.orderCutOffTimes)) {
        if (config?.available) deliveryDays.push(day);
      }
    }

    const orderingMethod = sup.sendOrderToEmail ? 'email' : (sup.sendOrderToApi ? 'app' : null);

    // Check if supplier already exists by code
    const { data: existingSup } = await supabase
      .from('suppliers')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('code', sup.id)
      .maybeSingle();

    let inserted: { id: string } | null = null;
    let error: any = null;

    if (existingSup) {
      // Update existing
      const result = await supabase
        .from('suppliers')
        .update({
          name: sup.name,
          contact_name: sup.contactName,
          email: sup.orderEmails?.[0] || null,
          phone: sup.contactPhones?.[0] || null,
          ordering_method: orderingMethod,
          ordering_config: sup.orderCutOffTimes || {},
          minimum_order_value: sup.minimumOrderValue,
          account_number: accountNumber,
          notes: notes || null,
          delivery_days: deliveryDays.length ? deliveryDays : null,
          is_active: sup.status === 'ACTIVE',
        })
        .eq('id', existingSup.id)
        .select('id')
        .single();
      inserted = result.data;
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from('suppliers')
        .insert({
          company_id: COMPANY_ID,
          name: sup.name,
          code: sup.id,
          contact_name: sup.contactName,
          email: sup.orderEmails?.[0] || null,
          phone: sup.contactPhones?.[0] || null,
          ordering_method: orderingMethod,
          ordering_config: sup.orderCutOffTimes || {},
          minimum_order_value: sup.minimumOrderValue,
          account_number: accountNumber,
          notes: notes || null,
          delivery_days: deliveryDays.length ? deliveryDays : null,
          is_active: sup.status === 'ACTIVE',
        })
        .select('id')
        .single();
      inserted = result.data;
      error = result.error;
    }

    if (error) {
      console.error(`  Error for ${sup.name}:`, error.message);
    } else if (inserted) {
      supplierMapById.set(sup.id, inserted.id);
      supplierMapByName.set(sup.name, inserted.id);
    }
  }
  console.log(`  Created ${supplierMapById.size} suppliers`);
  console.log(`  Supplier map: ${[...supplierMapByName.keys()].join(', ')}\n`);

  // ==== Step 5: Ingredients Library + Stock Items + Product Variants ====
  console.log('Step 5: Creating ingredients library + stock items + product variants...');
  const productsBySupplier: Record<string, EdifyProduct[]> = readJSON('products-by-supplier.json');
  const ingredientLibMap = new Map<string, string>(); // productName (lowercase trimmed) → ingredients_library id
  const libraryIdMap = new Map<string, { id: string; type: string }>(); // nameKey → {id, libraryType}
  const stockItemMap = new Map<string, string>(); // productName (lowercase trimmed) → stock_item_id
  let ingredientLibCount = 0;
  let packagingLibCount = 0;
  let chemicalsLibCount = 0;
  let itemCount = 0;
  let variantCount = 0;

  // Cleanup: remove Packaging/Other items wrongly placed in ingredients_library
  const allProductsList: EdifyProduct[] = [];
  for (const products of Object.values(productsBySupplier)) allProductsList.push(...products);
  const wrongLibNames = allProductsList
    .filter(p => LIBRARY_ROUTE[p.productClass])
    .map(p => p.name.trim());

  if (wrongLibNames.length > 0) {
    console.log(`  Cleaning up ${wrongLibNames.length} items wrongly placed in ingredients_library...`);
    for (let i = 0; i < wrongLibNames.length; i += 20) {
      const batch = wrongLibNames.slice(i, i + 20);
      await supabase
        .from('ingredients_library')
        .delete()
        .eq('company_id', COMPANY_ID)
        .in('ingredient_name', batch);
    }
  }

  for (const [supplierName, products] of Object.entries(productsBySupplier)) {
    const supplierId = supplierMapByName.get(supplierName);
    if (!supplierId) {
      console.error(`  ⚠ No supplier found for "${supplierName}", skipping ${products.length} products`);
      continue;
    }

    for (const prod of products) {
      const name = prod.name.trim();
      const nameKey = name.toLowerCase();

      // Determine base unit
      const edifyUom = prod.unitOfMeasure;
      const baseUomAbbr = edifyUom ? (UOM_FROM_EDIFY[edifyUom] || 'ea') : 'ea';
      const baseUom = getUom(baseUomAbbr);

      // Determine pack unit
      const packUomAbbr = PACK_TYPE_TO_UOM[prod.packType] || 'ea';
      const packUom = getUom(packUomAbbr);

      // Determine category
      const categoryId = prod.productClass ? categoryMap.get(prod.productClass) || null : null;

      // Calculate costs
      const packQty = num(prod.packQuantity) || 1;
      const packCost = num(prod.packCost) || 0;
      const itemWeight = num(prod.singleItemVolumeOrWeight);
      const conversionFactor = itemWeight ? packQty * itemWeight : packQty;
      const costPerUnit = conversionFactor > 0 ? packCost / conversionFactor : 0;

      // Display pack size: use actual weight/volume when packQty=1 with a single item
      // e.g. "500 g" instead of "1 ea" for a 500g box of Allspice
      const displayPackSize = (packQty === 1 && itemWeight) ? itemWeight : packQty;
      const displayPackUnitId = (packQty === 1 && itemWeight) ? baseUom.id : packUom.id;
      const displayPackUnitAbbr = (packQty === 1 && itemWeight) ? baseUomAbbr : packUomAbbr;

      // --- Create/update library record (routed by product class) ---
      const route = LIBRARY_ROUTE[prod.productClass] || DEFAULT_LIBRARY;

      if (!libraryIdMap.has(nameKey)) {
        const { data: existingLib } = await supabase
          .from(route.table)
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq(route.nameColumn, name)
          .maybeSingle();

        if (existingLib) {
          libraryIdMap.set(nameKey, { id: existingLib.id, type: route.libraryType });
          // Update with latest cost/supplier data
          const updatePayload: Record<string, any> = {
            unit_cost: round4(costPerUnit),
            supplier: supplierName,
          };
          if (route.table === 'ingredients_library') {
            updatePayload.pack_size = displayPackSize;
            updatePayload.pack_cost = packCost;
            updatePayload.unit = displayPackUnitAbbr;
            updatePayload.allergens = prod.containsAllergens?.length ? prod.containsAllergens : null;
            updatePayload.base_unit_id = baseUom.id;
            updatePayload.category = prod.productClass || null;
          } else if (route.table === 'packaging_library') {
            updatePayload.pack_size = displayPackSize;
            updatePayload.pack_cost = packCost;
          }
          await supabase.from(route.table).update(updatePayload).eq('id', existingLib.id);
        } else {
          // Build insert payload based on library type
          const insertPayload: Record<string, any> = {
            company_id: COMPANY_ID,
            [route.nameColumn]: name,
            unit_cost: round4(costPerUnit),
            supplier: supplierName,
          };

          if (route.table === 'ingredients_library') {
            insertPayload.pack_size = displayPackSize;
            insertPayload.pack_cost = packCost;
            insertPayload.unit = displayPackUnitAbbr;
            insertPayload.allergens = prod.containsAllergens?.length ? prod.containsAllergens : null;
            insertPayload.base_unit_id = baseUom.id;
            insertPayload.category = prod.productClass || null;
          } else if (route.table === 'packaging_library') {
            insertPayload.pack_size = displayPackSize;
            insertPayload.pack_cost = packCost;
            insertPayload.category = guessPackagingCategory(name);
            insertPayload.material = 'Unknown';
          }

          const { data: insertedLib, error: libErr } = await supabase
            .from(route.table)
            .insert(insertPayload)
            .select('id')
            .single();

          if (libErr) {
            console.error(`  Error for ${route.table} "${name}":`, libErr.message);
          } else if (insertedLib) {
            libraryIdMap.set(nameKey, { id: insertedLib.id, type: route.libraryType });
            if (route.table === 'ingredients_library') ingredientLibCount++;
            else if (route.table === 'packaging_library') packagingLibCount++;
            else if (route.table === 'chemicals_library') chemicalsLibCount++;
          }
        }

        // Populate ingredientLibMap for recipe FK (only ingredients_library items)
        if (route.table === 'ingredients_library') {
          const entry = libraryIdMap.get(nameKey);
          if (entry) ingredientLibMap.set(nameKey, entry.id);
        }
      }

      // --- Create/update stock item ---
      let stockItemId = stockItemMap.get(nameKey);
      const libraryEntry = libraryIdMap.get(nameKey);
      const libraryId = libraryEntry?.id || null;
      const libraryType = libraryEntry?.type || null;

      if (!stockItemId) {
        const { data: existing } = await supabase
          .from('stock_items')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('name', name)
          .maybeSingle();

        if (existing) {
          stockItemId = existing.id;
          await supabase
            .from('stock_items')
            .update({
              base_unit_id: baseUom.id,
              stock_unit: baseUomAbbr,
              purchase_unit: packUomAbbr,
              recipe_unit: baseUomAbbr,
              category_id: categoryId,
              default_vat_rate: num(prod.taxRate) || 0,
              is_active: prod.status === 'ACTIVE',
              last_cost: round4(costPerUnit),
              average_cost: round4(costPerUnit),
              pack_size: displayPackSize,
              pack_cost: packCost,
              library_item_id: libraryId,
              library_type: libraryType,
            })
            .eq('id', existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('stock_items')
            .insert({
              company_id: COMPANY_ID,
              name: name,
              base_unit_id: baseUom.id,
              stock_unit: baseUomAbbr,
              purchase_unit: packUomAbbr,
              recipe_unit: baseUomAbbr,
              category_id: categoryId,
              default_vat_rate: num(prod.taxRate) || 0,
              is_active: prod.status === 'ACTIVE',
              last_cost: round4(costPerUnit),
              average_cost: round4(costPerUnit),
              pack_size: displayPackSize,
              pack_cost: packCost,
              library_item_id: libraryId,
              library_type: libraryType,
            })
            .select('id')
            .single();

          if (error) {
            console.error(`  Error for stock item "${name}":`, error.message);
            continue;
          }
          stockItemId = inserted!.id;
          itemCount++;
        }
        stockItemMap.set(nameKey, stockItemId);
      }

      // --- Create/update product variant ---
      const supplierCode = prod.supplierProductCode || '';

      const { data: existingVar } = await supabase
        .from('product_variants')
        .select('id')
        .eq('stock_item_id', stockItemId)
        .eq('supplier_id', supplierId)
        .eq('supplier_code', supplierCode)
        .maybeSingle();

      if (existingVar) {
        await supabase
          .from('product_variants')
          .update({
            product_name: name,
            supplier_name: supplierName,
            pack_size: displayPackSize,
            pack_unit_id: displayPackUnitId,
            conversion_factor: round6(conversionFactor),
            unit_cost: round4(costPerUnit),
            is_preferred: true,
            is_active: prod.status === 'ACTIVE',
          })
          .eq('id', existingVar.id);
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert({
            stock_item_id: stockItemId,
            supplier_id: supplierId,
            supplier_code: supplierCode,
            product_name: name,
            supplier_name: supplierName,
            pack_size: displayPackSize,
            pack_unit_id: displayPackUnitId,
            conversion_factor: round6(conversionFactor),
            unit_cost: round4(costPerUnit),
            is_preferred: true,
            is_active: prod.status === 'ACTIVE',
          });
        if (error) {
          console.error(`  Error for variant "${name}" (${supplierName}):`, error.message);
        } else {
          variantCount++;
        }
      }
    }
  }
  console.log(`  Created ${ingredientLibCount} ingredients, ${packagingLibCount} packaging, ${chemicalsLibCount} chemicals library records`);
  console.log(`  Created ${itemCount} stock items, ${variantCount} product variants\n`);

  // ==== Step 6: Recipes + Ingredients ====
  // recipes schema: id, company_id, name, recipe_type, yield_quantity, yield_unit,
  //   is_ingredient, total_cost, cost_per_portion, sell_price, vat_rate,
  //   actual_gp_percent, is_active, shelf_life_days, notes, allergens, ...
  // recipe_ingredients schema: id, recipe_id, ingredient_id, sub_recipe_id,
  //   quantity, unit_id, sort_order, line_cost, unit_cost, company_id,
  //   ingredient_name, unit_abbreviation, unit_name, sub_recipe_name,
  //   pack_cost, pack_size, supplier, allergens, ...
  console.log('Step 6: Creating recipes + ingredients...');
  const recipesData: EdifyRecipe[] = readJSON('recipes-full.json');
  const recipeMap = new Map<string, string>(); // recipeName (lowercase trimmed) → opsly recipe_id

  // --- Pass 1: Create all recipes ---
  let recipeCount = 0;
  for (const rec of recipesData) {
    const name = rec.name.trim();
    const nameKey = name.toLowerCase();

    // Calculate total cost from ingredients
    let totalCost = 0;
    if (rec.ingredients) {
      for (const ing of rec.ingredients) {
        const ingQty = num(ing.quantity) || 0;
        if (ing.product) {
          const ingPackCost = num(ing.product.packCost) || 0;
          const ingPackQty = num(ing.product.packQuantity) || 1;
          const ingItemWeight = num(ing.product.singleItemVolumeOrWeight);
          const ingConversion = ingItemWeight ? ingPackQty * ingItemWeight : ingPackQty;
          let ingCostPerUnit = ingConversion > 0 ? ingPackCost / ingConversion : 0;

          // Convert unit cost from product's base unit to recipe ingredient's unit
          const ingUnitAbbr = UOM_FROM_EDIFY[ing.unitOfMeasure] || 'ea';
          const productUomAbbr = UOM_FROM_EDIFY[ing.product.unitOfMeasure || ''] || 'ea';
          if (productUomAbbr !== ingUnitAbbr) {
            const productUom = uomByAbbr.get(productUomAbbr);
            const recipeUom = uomByAbbr.get(ingUnitAbbr);
            if (productUom && recipeUom && productUom.unit_type === recipeUom.unit_type) {
              ingCostPerUnit = ingCostPerUnit * (recipeUom.base_multiplier / productUom.base_multiplier);
            }
          }
          totalCost += ingQty * ingCostPerUnit;
        } else if (ing.subRecipe) {
          const subCost = num(ing.subRecipe.ingredientsCost) || 0;
          const subYield = num(ing.subRecipe.recipeYield) || 1;
          const costPerUnit = subYield > 0 ? subCost / subYield : 0;
          totalCost += ingQty * costPerUnit;
        }
      }
    }

    // Map yield unit
    let yieldUnit = 'portion';
    if (rec.recipeYieldType) {
      const mapped = UOM_FROM_EDIFY[rec.recipeYieldType];
      if (mapped) yieldUnit = mapped;
      else if (['each', 'item'].includes(rec.recipeYieldType.toLowerCase())) yieldUnit = 'portion';
    }

    const yieldQty = num(rec.recipeYield) || 1;
    const costPerPortion = yieldQty > 0 ? totalCost / yieldQty : 0;
    const recipeType = rec.isSubRecipe ? 'prep' : 'dish';
    const sellPrice = num(rec.dineInSrp) || num(rec.takeAwaySrp) || null;
    const vatRate = num(rec.vatPercent) ?? 20;

    // Calculate GP (clamp to NUMERIC(5,2) range: -999.99 to 999.99)
    let actualGp: number | null = null;
    if (sellPrice && sellPrice > 0 && costPerPortion > 0) {
      const revenueExVat = sellPrice / (1 + vatRate / 100);
      if (revenueExVat > 0) {
        const gp = ((revenueExVat - costPerPortion) / revenueExVat) * 100;
        actualGp = Math.max(-999.99, Math.min(999.99, Math.round(gp * 100) / 100));
      }
    }

    const { data: existing } = await supabase
      .from('recipes')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      recipeMap.set(nameKey, existing.id);
      await supabase
        .from('recipes')
        .update({
          recipe_type: recipeType,
          yield_quantity: yieldQty,
          yield_unit: yieldUnit,
          is_ingredient: rec.isSubRecipe,
          total_cost: round4(totalCost),
          cost_per_portion: round4(costPerPortion),
          sell_price: sellPrice ? Math.round(sellPrice * 100) / 100 : null,
          vat_rate: vatRate,
          actual_gp_percent: actualGp,
          allergens: rec.allergens?.length ? rec.allergens : null,
          is_active: rec.status === 'ACTIVE',
          shelf_life_days: rec.shelfLife,
          notes: rec.instructions,
          data_version: 1,
          created_by: IMPORT_USER_ID,
          updated_by: IMPORT_USER_ID,
        })
        .eq('id', existing.id);
    } else {
      // Insert without .select() to avoid trigger conflict, then query ID
      const { error } = await supabase
        .from('recipes')
        .insert({
          company_id: COMPANY_ID,
          name: name,
          recipe_type: recipeType,
          yield_quantity: yieldQty,
          yield_unit: yieldUnit,
          is_ingredient: rec.isSubRecipe,
          total_cost: round4(totalCost),
          cost_per_portion: round4(costPerPortion),
          sell_price: sellPrice ? Math.round(sellPrice * 100) / 100 : null,
          vat_rate: vatRate,
          actual_gp_percent: actualGp,
          allergens: rec.allergens?.length ? rec.allergens : null,
          is_active: rec.status === 'ACTIVE',
          shelf_life_days: rec.shelfLife,
          notes: rec.instructions,
          data_version: 1,
          created_by: IMPORT_USER_ID,
        });

      if (error) {
        console.error(`  Error for recipe "${name}":`, error.message);
      } else {
        // Fetch the ID of the just-inserted recipe
        const { data: fetched } = await supabase
          .from('recipes')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('name', name)
          .single();
        if (fetched) {
          recipeMap.set(nameKey, fetched.id);
          recipeCount++;
        }
      }
    }
  }
  console.log(`  Created ${recipeCount} recipes`);

  // --- Pass 2: Create recipe ingredients ---
  let ingredientCount = 0;
  let ingredientSkipped = 0;

  for (const rec of recipesData) {
    const recipeKey = rec.name.trim().toLowerCase();
    const recipeId = recipeMap.get(recipeKey);
    if (!recipeId) continue;

    // Delete existing ingredients for idempotency
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);

    if (!rec.ingredients?.length) continue;

    // Pre-process: aggregate duplicate ingredient/sub-recipe combos
    interface IngredientRow {
      ingredientId: string | null;
      subRecipeId: string | null;
      quantity: number;
      unitId: string;
      unitCost: number;
      lineCost: number;
      sortOrder: number;
    }
    const mergedMap = new Map<string, IngredientRow>();

    for (let i = 0; i < rec.ingredients.length; i++) {
      const ing = rec.ingredients[i];
      const qty = num(ing.quantity) || 0;
      if (qty <= 0) continue;

      // Map unit abbreviation and get UoM record
      const unitAbbr = UOM_FROM_EDIFY[ing.unitOfMeasure] || ing.unitOfMeasure?.toLowerCase() || 'ea';
      let unitId: string;
      try {
        unitId = getUom(unitAbbr).id;
      } catch {
        unitId = getUom('ea').id;
      }

      let ingredientId: string | null = null;
      let subRecipeId: string | null = null;
      let unitCost = 0;

      if (ing.product) {
        const prodName = ing.product.name.trim().toLowerCase();
        ingredientId = ingredientLibMap.get(prodName) || null;

        if (!ingredientId) {
          for (const [key, id] of ingredientLibMap) {
            if (key === prodName || key.includes(prodName) || prodName.includes(key)) {
              ingredientId = id;
              break;
            }
          }
        }

        if (!ingredientId) {
          ingredientSkipped++;
          continue;
        }

        const ingPackCost = num(ing.product.packCost) || 0;
        const ingPackQty = num(ing.product.packQuantity) || 1;
        const ingItemWeight = num(ing.product.singleItemVolumeOrWeight);
        const ingConversion = ingItemWeight ? ingPackQty * ingItemWeight : ingPackQty;
        unitCost = ingConversion > 0 ? ingPackCost / ingConversion : 0;

        // Convert unit cost from product's base unit to recipe ingredient's unit
        const productUomAbbr = UOM_FROM_EDIFY[ing.product.unitOfMeasure || ''] || 'ea';
        if (productUomAbbr !== unitAbbr) {
          const productUom = uomByAbbr.get(productUomAbbr);
          const recipeUom = uomByAbbr.get(unitAbbr);
          if (productUom && recipeUom && productUom.unit_type === recipeUom.unit_type) {
            unitCost = unitCost * (recipeUom.base_multiplier / productUom.base_multiplier);
          }
        }

      } else if (ing.subRecipe || ing.subRecipeId) {
        const subName = ing.subRecipe?.name?.trim().toLowerCase();
        if (subName) {
          subRecipeId = recipeMap.get(subName) || null;
        }

        if (!subRecipeId) {
          ingredientSkipped++;
          continue;
        }

        if (ing.subRecipe) {
          const subCost = num(ing.subRecipe.ingredientsCost) || 0;
          const subYield = num(ing.subRecipe.recipeYield) || 1;
          unitCost = subYield > 0 ? subCost / subYield : 0;
        }
      } else {
        ingredientSkipped++;
        continue;
      }

      // Merge duplicates by (ingredientId, subRecipeId) key
      const dedupeKey = `${ingredientId || ''}|${subRecipeId || ''}`;
      const existing = mergedMap.get(dedupeKey);
      if (existing) {
        existing.quantity += qty;
        existing.lineCost = existing.quantity * existing.unitCost;
      } else {
        mergedMap.set(dedupeKey, {
          ingredientId,
          subRecipeId,
          quantity: qty,
          unitId,
          unitCost,
          lineCost: qty * unitCost,
          sortOrder: i,
        });
      }
    }

    // Insert merged ingredients
    let sortIdx = 0;
    for (const row of mergedMap.values()) {
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          company_id: COMPANY_ID,
          ingredient_id: row.ingredientId,
          sub_recipe_id: row.subRecipeId,
          quantity: row.quantity,
          unit_id: row.unitId,
          unit_cost: round4(row.unitCost),
          line_cost: round4(row.lineCost),
          sort_order: sortIdx++,
        });

      if (error) {
        console.error(`  Error for ingredient in "${rec.name}":`, error.message);
      } else {
        ingredientCount++;
      }
    }
  }
  console.log(`  Created ${ingredientCount} recipe ingredients (${ingredientSkipped} skipped)\n`);

  // ==== Step 7: Planly Customers ====
  console.log('Step 7: Importing wholesale customers...');
  const sitesData = readJSON<{ sites: { id: string; name: string; status: string; isCPU: boolean }[] }>('sites.json');
  const sitesDetail: Record<string, EdifySiteDetail> = readJSON('sites-detail.json');
  const contacts: CustomerContact[] = readJSON('customer-contacts.json');

  // Build contact lookup by siteId (first contact per site)
  const contactBySiteId = new Map<string, CustomerContact>();
  for (const c of contacts) {
    if (!contactBySiteId.has(c.siteId)) {
      contactBySiteId.set(c.siteId, c);
    }
  }

  // Delete existing planly_customers for Okja site (idempotency)
  const { error: delErr } = await supabase
    .from('planly_customers')
    .delete()
    .eq('site_id', SITE_ID);
  if (delErr) console.error('  Error deleting existing:', delErr.message);

  // Filter to wholesale customers (not CPU, not Kiosk)
  const wholesaleSites = sitesData.sites.filter(s =>
    !s.isCPU && !s.name.toLowerCase().includes('kiosk')
  );

  let customerCount = 0;
  for (const site of wholesaleSites) {
    const detail = sitesDetail[site.name];
    const contact = contactBySiteId.get(site.id);

    // Build address
    let address: string | null = null;
    let postcode: string | null = null;
    if (detail?.address) {
      const parts = [detail.address.address, detail.address.addressSecondRow, detail.address.city].filter(Boolean);
      address = parts.join(', ');
      postcode = detail.address.postcode;
    }

    // Build delivery notes from deliveryTimes
    let deliveryNotes = '';
    if (detail?.deliveryTimes) {
      const days = Object.entries(detail.deliveryTimes)
        .filter(([_, v]) => v.available)
        .map(([day, v]) => `${day}: ${v.from}-${v.to}`);
      if (days.length) deliveryNotes = `Delivery: ${days.join(', ')}`;
    }
    if (detail?.deliveryNotes) {
      deliveryNotes = deliveryNotes ? `${deliveryNotes}\n${detail.deliveryNotes}` : detail.deliveryNotes;
    }

    const { error } = await supabase
      .from('planly_customers')
      .insert({
        site_id: SITE_ID,
        name: site.name,
        contact_name: contact?.contactName || null,
        email: contact?.email || null,
        phone: contact?.phone || null,
        address: address,
        postcode: postcode,
        default_ship_state: 'baked',
        is_active: site.status === 'ACTIVE',
        notes: deliveryNotes || null,
      });

    if (error) console.error(`  Error for ${site.name}:`, error.message);
    else customerCount++;
  }
  console.log(`  Created ${customerCount} wholesale customers\n`);

  // ==== Done ====
  console.log('=== Import complete! ===');
  console.log(`Summary:
  Storage areas: ${storageCount}
  Stock categories: ${categoryMap.size}
  Ingredients library: ${ingredientLibCount}
  Packaging library: ${packagingLibCount}
  Chemicals library: ${chemicalsLibCount}
  Suppliers: ${supplierMapById.size}
  Stock items: ${itemCount}
  Product variants: ${variantCount}
  Recipes: ${recipeCount}
  Recipe ingredients: ${ingredientCount} (${ingredientSkipped} skipped)
  Wholesale customers: ${customerCount}
`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
