/**
 * Populate Allergens for Ingredients Library
 *
 * Auto-detects allergens from ingredient names using keyword matching
 * based on the UK 14 allergens (EU Food Information Regulation).
 * Merges with known Edify allergen data where available.
 *
 * Uses canonical short keys (same as src/lib/stockly/allergens.ts).
 *
 * Usage:
 *   npx tsx scripts/populate-allergens.ts --dry-run   # Preview changes
 *   npx tsx scripts/populate-allergens.ts              # Apply changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = '73ca65bb-5b6e-4ebe-9bec-5aeff5042680';

// ---------------------------------------------------------------------------
// Keyword → Allergen Key Mapping
// ---------------------------------------------------------------------------
// Each entry: [allergenKey, [...keywords]]
// Keywords are matched case-insensitively against ingredient_name.
// Word-boundary matching is used to avoid false positives (e.g. "nutmeg" ≠ nut).

type AllergenKey =
  | 'celery' | 'gluten' | 'crustaceans' | 'eggs' | 'fish' | 'lupin'
  | 'milk' | 'molluscs' | 'mustard' | 'nuts' | 'peanuts' | 'sesame'
  | 'soybeans' | 'sulphites';

interface KeywordRule {
  allergen: AllergenKey;
  /** Regex patterns matched against lowercase ingredient name */
  patterns: RegExp[];
  /** Exclusion patterns — if any match, skip this allergen */
  exclude?: RegExp[];
}

const RULES: KeywordRule[] = [
  // --- GLUTEN (Cereals containing gluten) ---
  {
    allergen: 'gluten',
    patterns: [
      /\bwheat\b/, /\bflour\b/, /\bbread\b/, /\boat(?:s|meal)?\b/,
      /\bbarley\b/, /\brye\b/, /\bspelt\b/, /\bsemolina\b/,
      /\bcouscous\b/, /\bbulgur\b/, /\bpasta\b/, /\bnoodle/,
      /\bcrouton/, /\bbreadcrumb/, /\bpanko\b/, /\btortilla/,
      /\bwrap\b/, /\bpitta\b/, /\bnaan\b/, /\bchapati/,
      /\bbrioche\b/, /\bsourdough\b/, /\bciabatta\b/, /\bfocaccia\b/,
      /\bbaguette\b/, /\bcroissant\b/, /\bmuffin\b/, /\bscone\b/,
      /\bbran\b/, /\bmalt\b/, /\bsoy sauce\b/,
      /\boatly\b/, /\bgingerbread\b/, /\bsausage roll\b/,
      /\bpan au choc/, /\bpain au choc/,
    ],
    exclude: [/gluten.?free/, /\bgf\b/],
  },

  // --- MILK ---
  {
    allergen: 'milk',
    patterns: [
      /\bmilk\b/, /\bbutter\b/, /\bcream\b/, /\bcheese\b/,
      /\byogh?urt\b/, /\bmascarpone\b/, /\bricotta\b/,
      /\bmozzarella\b/, /\bparmesan\b/, /\bcheddar\b/,
      /\bgruyere\b/, /\bhalloumi\b/, /\bfeta\b/, /\bghee\b/,
      /\bwhey\b/, /\bcasein\b/, /\blactose\b/,
      /\bcr[eè]me\b/, /\bbuttermilk\b/,
      /\bcondensed milk\b/, /\bevaporated milk\b/,
      /\bclotted cream\b/, /\bsour cream\b/,
      /\bcr[eè]me fra[iî]che\b/, /\bpaneer\b/,
      /\bbrie\b/, /\bcamembert\b/, /\bstilton\b/,
      /\bpecorino\b/, /\bburrata\b/,
    ],
    exclude: [
      /\bcoconut milk\b/, /\bcoconut cream\b/, /coconut.*yogh?urt|yogh?urt.*coconut/,
      /\boat milk\b/, /\bsoy milk\b/, /\balmond milk\b/,
      /\boat cream\b/, /\bvegan butter\b/, /coconut collaborative/,
    ],
  },

  // --- EGGS ---
  {
    allergen: 'eggs',
    patterns: [
      /\begg(?:s)?\b/, /\bmayonnaise\b/, /\bmeringue\b/, /\baioli\b/,
    ],
    exclude: [/\beaubergine\b/, /\beggplant\b/],
  },

  // --- NUTS (tree nuts) ---
  {
    allergen: 'nuts',
    patterns: [
      /\balmond/, /\bcashew/, /\bhazelnut/, /\bwalnut/, /\bpecan/,
      /\bpistachio/, /\bmacadamia/, /\bbrazil nut/, /\bchestnut/,
      /\bpine nut/, /\bpraline/, /\bmarzipan/, /\bfrangipane/,
      /\bnoisette\b/, /\bnutella\b/, /\bamaretti\b/,
    ],
    // coconut and nutmeg are NOT tree nuts
  },

  // --- PEANUTS ---
  {
    allergen: 'peanuts',
    patterns: [/\bpeanut/, /\bgroundnut/],
  },

  // --- SESAME ---
  {
    allergen: 'sesame',
    patterns: [/\bsesame\b/, /\btahini\b/],
  },

  // --- SOYBEANS ---
  {
    allergen: 'soybeans',
    patterns: [
      /\bsoy(?:a)?\b/, /\bsoy sauce\b/, /\btofu\b/, /\btempeh\b/,
      /\bedamame\b/, /\bmiso\b/, /\btamari\b/,
    ],
  },

  // --- MUSTARD ---
  {
    allergen: 'mustard',
    patterns: [/\bmustard\b/],
  },

  // --- CELERY ---
  {
    allergen: 'celery',
    patterns: [/\bcelery\b/, /\bceleriac\b/],
  },

  // --- FISH ---
  {
    allergen: 'fish',
    patterns: [
      /\banchov(?:y|ies)\b/, /\bfish sauce\b/,
      /\bcod\b/, /\bsalmon\b/, /\btuna\b/, /\bmackerel\b/,
      /\bsardine/, /\bhaddock\b/, /\btrout\b/, /\bsea bass\b/,
      /\bhalibut\b/, /\bswordfish\b/, /\bplaice\b/, /\bsole\b/,
      /\bwhitebait\b/, /\bpollock\b/, /\bbream\b/,
    ],
  },

  // --- CRUSTACEANS ---
  {
    allergen: 'crustaceans',
    patterns: [
      /\bprawn/, /\bshrimp/, /\bcrab\b/, /\blobster/,
      /\bcrayfish\b/, /\blangoustine/, /\bscampi\b/,
    ],
  },

  // --- MOLLUSCS ---
  {
    allergen: 'molluscs',
    patterns: [
      /\bmussel/, /\boyster/, /\bclam\b/, /\bsquid\b/,
      /\bcalamari\b/, /\boctopus\b/, /\bscallop/,
      /\bwhelk/, /\bcockle/, /\bescargot/,
    ],
  },

  // --- LUPIN ---
  {
    allergen: 'lupin',
    patterns: [/\blupin/],
  },

  // --- SULPHITES ---
  {
    allergen: 'sulphites',
    patterns: [
      /\bsulphite/, /\bsulfite/, /\bmetabisulphite/, /\bmetabisulfite/,
      /\bsulphur dioxide\b/, /\bsulfur dioxide\b/,
    ],
  },
];

// ---------------------------------------------------------------------------
// Edify Allergen Overrides (known from scraped data)
// These are authoritative — product-level allergen declarations.
// Keys are lowercase ingredient names, values are allergen keys.
// ---------------------------------------------------------------------------
const EDIFY_OVERRIDES: Record<string, AllergenKey[]> = {
  // Edify scraped data
  'almond extract': ['nuts'],
  'rudehealth oat': ['gluten'],
  'dijon mustard': ['mustard'],
  'english mustard': ['mustard'],
  'wholegrain mustard': ['mustard'],
  'peanut butter': ['peanuts'],
  'sesame seeds': ['sesame'],
  'tahini': ['sesame'],
  'soy sauce': ['soybeans', 'gluten'],
  'tamari': ['soybeans'],
  'miso paste': ['soybeans'],
  'tofu': ['soybeans'],
  // Manual overrides — items where name alone can't indicate allergens
  'sausage roll': ['gluten', 'eggs'],
  'not a pan au choc': ['gluten'],
  'gingerbread': ['gluten'],
  'tom pesto': ['nuts'], // pesto typically contains pine nuts
};

// ---------------------------------------------------------------------------
// Detection Logic
// ---------------------------------------------------------------------------

function detectAllergens(ingredientName: string): AllergenKey[] {
  const name = ingredientName.toLowerCase().trim();
  const detected = new Set<AllergenKey>();

  // 1. Check Edify overrides first (exact match on name)
  const edifyMatch = EDIFY_OVERRIDES[name];
  if (edifyMatch) {
    for (const key of edifyMatch) detected.add(key);
  }

  // 2. Apply keyword rules
  for (const rule of RULES) {
    // Check exclusions first
    if (rule.exclude?.some(re => re.test(name))) continue;

    // Check patterns
    if (rule.patterns.some(re => re.test(name))) {
      detected.add(rule.allergen);
    }
  }

  return Array.from(detected).sort();
}

// ---------------------------------------------------------------------------
// Main Script
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all ingredients for this company
  const { data: ingredients, error: fetchErr } = await supabase
    .from('ingredients_library')
    .select('id, ingredient_name, allergens')
    .eq('company_id', COMPANY_ID)
    .order('ingredient_name');

  if (fetchErr) throw new Error(`Failed to fetch ingredients: ${fetchErr.message}`);
  console.log(`\nFetched ${ingredients!.length} ingredients\n`);

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;
  let errors = 0;

  const results: { name: string; allergens: AllergenKey[]; existing: string[] | null; action: string }[] = [];
  const unmatched: string[] = [];

  for (const row of ingredients!) {
    const name = row.ingredient_name;
    const existing: string[] | null = row.allergens;
    const detected = detectAllergens(name);

    if (detected.length === 0) {
      noMatch++;
      unmatched.push(name);
      continue;
    }

    // Merge with any existing allergens (don't remove manually-set ones)
    const merged = new Set<string>([...(existing || []), ...detected]);
    const mergedArray = Array.from(merged).sort();

    // Skip if nothing changed
    const existingSorted = (existing || []).slice().sort();
    if (JSON.stringify(existingSorted) === JSON.stringify(mergedArray)) {
      skipped++;
      results.push({ name, allergens: detected, existing, action: 'SKIP (already set)' });
      continue;
    }

    results.push({ name, allergens: detected, existing, action: dryRun ? 'WOULD UPDATE' : 'UPDATE' });

    if (!dryRun) {
      const { error } = await supabase
        .from('ingredients_library')
        .update({ allergens: mergedArray })
        .eq('id', row.id);

      if (error) {
        console.error(`  ERROR updating "${name}": ${error.message}`);
        errors++;
        continue;
      }
    }

    updated++;
  }

  // Print results
  console.log(dryRun ? '--- DRY RUN ---\n' : '--- RESULTS ---\n');

  // Group by allergen for summary
  const allergenCounts: Record<string, string[]> = {};

  for (const r of results) {
    const flag = r.action.startsWith('SKIP') ? '  (already set)' : '';
    const existingStr = r.existing?.length ? ` [was: ${r.existing.join(', ')}]` : '';
    console.log(`  ${r.action}: ${r.name} → [${r.allergens.join(', ')}]${existingStr}${flag}`);

    for (const a of r.allergens) {
      if (!allergenCounts[a]) allergenCounts[a] = [];
      allergenCounts[a].push(r.name);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total ingredients:  ${ingredients!.length}`);
  console.log(`Detected allergens: ${results.length} ingredients`);
  console.log(`Updated:            ${updated}`);
  console.log(`Skipped (no change):${skipped}`);
  console.log(`No allergens found: ${noMatch}`);
  console.log(`Errors:             ${errors}`);

  console.log(`\nAllergen breakdown:`);
  for (const [allergen, names] of Object.entries(allergenCounts).sort()) {
    console.log(`  ${allergen.padEnd(14)} ${names.length} items`);
  }

  if (unmatched.length > 0) {
    console.log(`\nNo allergens detected (${unmatched.length} items):`);
    for (const name of unmatched) {
      console.log(`  - ${name}`);
    }
  }

  if (dryRun) {
    console.log('\nThis was a DRY RUN. Run without --dry-run to apply changes.');
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('\nFailed:', err);
  process.exit(1);
});
