/**
 * Fix: Remove wrongly-tagged milk/soybeans from chocolate ingredients.
 * Okja is a vegan bakery — their chocolate is dairy-free.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';

const fixes = [
  { name: 'Chocolate 54%', allergens: [] as string[] },
  { name: 'Chocolate 70%', allergens: [] as string[] },
  { name: 'Chocolate choc Batons', allergens: [] as string[] },
  { name: 'White Chocolate', allergens: [] as string[] },
  { name: 'Not a Pan Au Choc', allergens: ['gluten'] },
];

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log('Fixing chocolate allergens...\n');

  for (const fix of fixes) {
    const { error } = await sb
      .from('ingredients_library')
      .update({ allergens: fix.allergens })
      .eq('ingredient_name', fix.name)
      .eq('company_id', COMPANY_ID);

    if (error) {
      console.error(`  ERROR: ${fix.name} — ${error.message}`);
    } else {
      console.log(`  FIXED: ${fix.name} → [${fix.allergens.join(', ')}]`);
    }
  }

  console.log('\nRecalculating all recipe allergens...');

  const { data: recipes } = await sb.from('recipes').select('id, name, allergens').order('name');
  let updated = 0;

  for (const r of recipes!) {
    const { error: rpcErr } = await sb.rpc('update_recipe_allergens', { p_recipe_id: r.id });
    if (rpcErr) {
      console.error(`  ERROR: ${r.name} — ${rpcErr.message}`);
      continue;
    }

    const { data: fresh } = await sb.from('recipes').select('allergens').eq('id', r.id).single();
    const oldA = (r.allergens || []).sort().join(',');
    const newA = (fresh?.allergens || []).sort().join(',');
    if (oldA !== newA) {
      console.log(`  UPDATED: ${r.name} → [${(fresh?.allergens || []).join(', ')}]`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} recipes updated.`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
