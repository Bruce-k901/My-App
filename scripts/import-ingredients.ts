/**
 * Update Ingredients from Excel
 *
 * Matches existing ingredients by name and updates sales channel flags,
 * pricing, and category from the Excel file. Also configures the site.
 *
 * Usage: npx tsx scripts/import-ingredients.ts [--dry-run]
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';

const COMPANY_ID = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';
const SITE_ID = 'f6ddde35-74e3-4800-905d-b3ac01aadc67';

interface ExcelRow {
  ingredient_name: string;
  'Stock Item belongs to': string;
  Library?: string;
  category?: string;
  unit?: string;
  unit_cost?: number;
  supplier?: string;
  pack_size?: number;
  pack_cost?: number;
  allergens?: string;
  retail_price?: number;
  wholesale_price?: number;
  online_price?: number;
  is_retail_saleable?: boolean;
  is_wholesale_saleable?: boolean;
  is_online_saleable?: boolean;
  [key: string]: any;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read Excel
  const filePath = path.join(process.cwd(), 'public', 'ingredients_library.xlsx');
  console.log(`\nReading: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`Excel: ${excelRows.length} rows\n`);

  // Fetch all existing ingredients for this company
  const { data: dbIngredients, error: fetchErr } = await supabase
    .from('ingredients_library')
    .select('id, ingredient_name')
    .eq('company_id', COMPANY_ID);

  if (fetchErr) throw new Error(`Failed to fetch ingredients: ${fetchErr.message}`);
  console.log(`Database: ${dbIngredients!.length} ingredients\n`);

  // Build lookup map (lowercase name -> id)
  const nameToId = new Map<string, string>();
  for (const row of dbIngredients!) {
    nameToId.set(row.ingredient_name.toLowerCase().trim(), row.id);
  }

  // Stats
  let updated = 0;
  let notFound = 0;
  let inserted = 0;
  let errors = 0;

  console.log(dryRun ? '--- DRY RUN ---\n' : 'Updating ingredients...\n');

  for (const row of excelRows) {
    const name = row.ingredient_name?.trim();
    if (!name) continue;

    const belongsTo = (row['Stock Item belongs to'] || '').toUpperCase().trim();

    // Use Excel's own sales channel flags if present, otherwise derive from "belongs to"
    const isRetailSaleable = row.is_retail_saleable === true || row.is_retail_saleable === 1
      ? true
      : (belongsTo === 'KIOSK' || belongsTo === 'BOTH');
    const isWholesaleSaleable = row.is_wholesale_saleable === true || row.is_wholesale_saleable === 1
      ? true
      : (belongsTo === 'CPU' || belongsTo === 'BOTH');
    const isOnlineSaleable = row.is_online_saleable === true || row.is_online_saleable === 1
      ? true
      : false;

    const updateData: Record<string, any> = {
      is_retail_saleable: isRetailSaleable,
      is_wholesale_saleable: isWholesaleSaleable,
      is_online_saleable: isOnlineSaleable,
    };

    // Add pricing if present
    if (row.retail_price) updateData.retail_price = row.retail_price;
    if (row.wholesale_price) updateData.wholesale_price = row.wholesale_price;
    if (row.online_price) updateData.online_price = row.online_price;

    // Add category if present
    if (row.category) updateData.category = row.category;

    const dbId = nameToId.get(name.toLowerCase().trim());

    if (dbId) {
      // UPDATE existing ingredient
      if (dryRun) {
        const channels = [];
        if (isRetailSaleable) channels.push('retail');
        if (isWholesaleSaleable) channels.push('wholesale');
        if (isOnlineSaleable) channels.push('online');
        console.log(`  UPDATE: ${name} [${belongsTo}] -> ${channels.join(', ') || 'no channels'}`);
      } else {
        const { error } = await supabase
          .from('ingredients_library')
          .update(updateData)
          .eq('id', dbId);

        if (error) {
          console.error(`  ERROR updating "${name}": ${error.message}`);
          errors++;
          continue;
        }
      }
      updated++;
    } else {
      // INSERT new ingredient not in DB
      if (dryRun) {
        console.log(`  INSERT: ${name} [${belongsTo}] (not in database)`);
      } else {
        const { error } = await supabase
          .from('ingredients_library')
          .insert({
            company_id: COMPANY_ID,
            ingredient_name: name,
            unit: row.unit || 'each',
            unit_cost: row.unit_cost || 0,
            category: row.category || null,
            supplier: row.supplier || null,
            ...updateData,
          });

        if (error) {
          console.error(`  ERROR inserting "${name}": ${error.message}`);
          errors++;
          continue;
        }
      }
      inserted++;
      notFound++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Excel rows:     ${excelRows.length}`);
  console.log(`Updated:        ${updated}`);
  console.log(`New inserts:    ${inserted}`);
  console.log(`Errors:         ${errors}`);
  console.log('='.repeat(50));

  if (dryRun) {
    console.log('\nThis was a DRY RUN. Run without --dry-run to apply changes.');
    return;
  }

  // Configure site as hybrid (produces + sells retail)
  console.log('\nConfiguring Toynbee St site...');
  const { error: configErr } = await supabase
    .from('site_config')
    .update({
      receives_supplier_deliveries: true,
      produces_items: true,
      sells_retail: true,
      sells_wholesale: true,
      sells_online: true,
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', SITE_ID);

  if (configErr) {
    console.error(`ERROR configuring site: ${configErr.message}`);
  } else {
    console.log('Site configured as hybrid (produces, sells retail + wholesale + online)');
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('\nFailed:', err);
  process.exit(1);
});
