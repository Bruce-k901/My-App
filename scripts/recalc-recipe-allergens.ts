/**
 * Recalculate allergens for all recipes after ingredient allergens were updated.
 * Calls the existing update_recipe_allergens() DB function for each recipe.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data: recipes, error } = await sb
    .from('recipes')
    .select('id, name, allergens')
    .order('name');

  if (error) throw new Error(`Fetch error: ${error.message}`);
  console.log(`Total recipes: ${recipes!.length}\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const recipe of recipes!) {
    const { error: rpcErr } = await sb.rpc('update_recipe_allergens', {
      p_recipe_id: recipe.id,
    });

    if (rpcErr) {
      console.error(`  ERROR: ${recipe.name} — ${rpcErr.message}`);
      errors++;
      continue;
    }

    const { data: fresh } = await sb
      .from('recipes')
      .select('allergens')
      .eq('id', recipe.id)
      .single();

    const oldA = (recipe.allergens || []).sort().join(',');
    const newA = (fresh?.allergens || []).sort().join(',');

    if (oldA !== newA) {
      console.log(`  UPDATED: ${recipe.name} → [${(fresh?.allergens || []).join(', ')}]`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('Recipe allergen recalculation complete');
  console.log('='.repeat(50));
  console.log(`  Updated:   ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Errors:    ${errors}`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
