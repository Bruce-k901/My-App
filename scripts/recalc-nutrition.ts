import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const COMPANY_ID = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';

async function main() {
  const { data: recipes } = await sb
    .from('recipes')
    .select('id, name')
    .eq('company_id', COMPANY_ID);

  console.log(`Recipes to recalculate: ${recipes?.length}`);

  let done = 0;
  for (const r of recipes || []) {
    const { error } = await sb.rpc('calculate_recipe_nutrition', {
      p_recipe_id: r.id,
    });
    if (error) {
      console.error(`  Error for ${r.name}: ${error.message}`);
    } else {
      done++;
    }
  }
  console.log(`Recalculated: ${done} / ${recipes?.length}`);

  // Verify samples
  const { data: sample } = await sb
    .from('recipes')
    .select('name, nutrition_per_portion, nutrition_data_complete')
    .eq('company_id', COMPANY_ID)
    .not('nutrition_per_portion', 'is', null)
    .limit(5);

  console.log('\nSample recipes with nutrition:');
  for (const s of sample || []) {
    const n = s.nutrition_per_portion as any;
    console.log(
      `  ${s.name}: ${n?.energy_kcal} kcal, ${n?.protein_g}g protein, ${n?.fat_g}g fat, complete=${s.nutrition_data_complete}`
    );
  }
}

main().catch(console.error);
