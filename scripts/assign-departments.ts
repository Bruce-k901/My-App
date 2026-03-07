/**
 * Full sync of ingredients_library from Excel + recipe departments from CSV
 *
 * Reads:
 * - public/ingredients_library.xlsx → syncs ALL fields (department, category, unit, costs, etc.)
 * - public/recipes_mapping_check.csv → "Site" column for recipe departments
 *
 * Usage: npx tsx scripts/assign-departments.ts [--dry-run]
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const COMPANY_ID = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';

function parseBool(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return !!val;
}

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(dryRun ? '=== DRY RUN ===\n' : '=== FULL INGREDIENT SYNC + DEPARTMENT ASSIGNMENT ===\n');

  // ─── 1. INGREDIENTS from Excel (full sync) ───
  const excelPath = path.join(process.cwd(), 'public', 'ingredients_library.xlsx');
  console.log(`Reading: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows: any[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`Excel: ${excelRows.length} rows\n`);

  // Fetch all ingredients from DB
  const { data: dbIngredients, error: fetchErr } = await supabase
    .from('ingredients_library')
    .select('id, ingredient_name')
    .eq('company_id', COMPANY_ID);

  if (fetchErr) throw new Error(`Failed to fetch ingredients: ${fetchErr.message}`);

  const ingredientNameToId = new Map<string, string>();
  for (const row of dbIngredients!) {
    ingredientNameToId.set(row.ingredient_name.toLowerCase().trim(), row.id);
  }

  let ingredientUpdated = 0;
  let ingredientSkipped = 0;
  let ingredientErrors = 0;

  for (const row of excelRows) {
    const name = row.ingredient_name?.trim();
    if (!name) continue;

    // Department from "Stock Item belongs to" — normalize BOTH/Both to null (shared)
    const belongsTo = (row['Stock Item belongs to'] || '').toUpperCase().trim();
    let department: string | null = null;
    if (belongsTo === 'CPU') department = 'CPU';
    else if (belongsTo === 'KIOSK') department = 'KIOSK';
    // BOTH = shared, leave as null

    // Category — trim trailing spaces
    const category = row.category?.toString().trim() || null;

    // Build the full update payload
    const payload: Record<string, any> = {
      department,
      category,
      unit: row.unit?.toString().trim() || null,
      unit_cost: parseNum(row.unit_cost),
      supplier: row.supplier?.toString().trim() || null,
      pack_size: parseNum(row.pack_size),
      pack_cost: parseNum(row.pack_cost),
      track_stock: parseBool(row.track_stock),
      yield_percent: parseNum(row.yield_percent),
      costing_method: row.costing_method?.toString().trim() || null,
      is_prep_item: parseBool(row.is_prep_item),
      is_purchasable: parseBool(row.is_purchasable),
      is_retail_saleable: parseBool(row.is_retail_saleable),
      is_wholesale_saleable: parseBool(row.is_wholesale_saleable),
      is_online_saleable: parseBool(row.is_online_saleable),
    };

    const dbId = ingredientNameToId.get(name.toLowerCase().trim());
    if (!dbId) {
      console.log(`  SKIP (not in DB): "${name}"`);
      ingredientSkipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  INGREDIENT: "${name}" → dept=${department || 'Shared'}, cat=${category}, unit=${payload.unit}, pack_cost=${payload.pack_cost}, pack_size=${payload.pack_size}`);
    } else {
      const { error } = await supabase
        .from('ingredients_library')
        .update(payload)
        .eq('id', dbId);

      if (error) {
        console.error(`  ERROR updating "${name}": ${error.message}`);
        ingredientErrors++;
        continue;
      }
    }
    ingredientUpdated++;
  }

  console.log(`\nIngredients: ${ingredientUpdated} updated, ${ingredientSkipped} not in DB, ${ingredientErrors} errors\n`);

  // ─── 2. RECIPES from CSV (department only) ───
  const csvPath = path.join(process.cwd(), 'public', 'recipes_mapping_check.csv');
  if (!fs.existsSync(csvPath)) {
    console.log(`Skipping recipes — CSV not found: ${csvPath}\n`);
  } else {
    console.log(`Reading: ${csvPath}`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvLines = csvContent.trim().split('\n');
    const headers = csvLines[0].split(',');
    const nameIdx = headers.indexOf('name');
    const siteIdx = headers.indexOf('Site');

    if (nameIdx === -1 || siteIdx === -1) {
      console.error('CSV must have "name" and "Site" columns — skipping recipes');
    } else {
      // Fetch all recipes
      const { data: dbRecipes, error: recipeFetchErr } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('company_id', COMPANY_ID);

      if (recipeFetchErr) throw new Error(`Failed to fetch recipes: ${recipeFetchErr.message}`);

      const recipeNameToId = new Map<string, string>();
      for (const row of dbRecipes!) {
        recipeNameToId.set(row.name.toLowerCase().trim(), row.id);
      }

      let recipeUpdated = 0;
      let recipeSkipped = 0;

      for (let i = 1; i < csvLines.length; i++) {
        const fields = csvLines[i].split(',');
        const name = fields[nameIdx]?.trim();
        const site = fields[siteIdx]?.trim().toUpperCase();
        if (!name) continue;

        let department: string | null = null;
        if (site === 'CPU') department = 'CPU';
        else if (site === 'KIOSK') department = 'KIOSK';

        const dbId = recipeNameToId.get(name.toLowerCase().trim());
        if (!dbId) {
          console.log(`  RECIPE NOT FOUND: "${name}"`);
          recipeSkipped++;
          continue;
        }

        if (dryRun) {
          console.log(`  RECIPE: "${name}" → department=${department || 'Shared'}`);
        } else {
          const { error } = await supabase
            .from('recipes')
            .update({ department })
            .eq('id', dbId);

          if (error) {
            console.error(`  ERROR updating recipe "${name}": ${error.message}`);
            continue;
          }
        }
        recipeUpdated++;
      }

      console.log(`\nRecipes: ${recipeUpdated} updated, ${recipeSkipped} not found in DB\n`);
    }
  }

  // ─── 3. Register departments in Stockly settings ───
  console.log('Registering departments in Stockly settings...');

  const { data: moduleRow, error: moduleErr } = await supabase
    .from('company_modules')
    .select('settings')
    .eq('company_id', COMPANY_ID)
    .eq('module', 'stockly')
    .single();

  if (moduleErr) {
    console.error('Could not load Stockly settings:', moduleErr.message);
  } else {
    const settings = moduleRow?.settings || {};
    const existingDepts: string[] = settings.departments || [];
    const needed = ['CPU', 'KIOSK'];
    const merged = [...new Set([...existingDepts, ...needed])];

    if (dryRun) {
      console.log(`  Current departments: [${existingDepts.join(', ')}]`);
      console.log(`  Would set to: [${merged.join(', ')}]`);
    } else {
      const { error: updateErr } = await supabase
        .from('company_modules')
        .update({ settings: { ...settings, departments: merged } })
        .eq('company_id', COMPANY_ID)
        .eq('module', 'stockly');

      if (updateErr) {
        console.error('  ERROR updating settings:', updateErr.message);
      } else {
        console.log(`  Departments set to: [${merged.join(', ')}]`);
      }
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
