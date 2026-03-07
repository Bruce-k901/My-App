import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const tables = ['storage_areas', 'stock_categories', 'suppliers', 'stock_items', 'product_variants', 'recipes', 'recipe_ingredients', 'planly_customers'];
  for (const t of tables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : (cols.length ? cols.join(', ') : '(empty table)')}`);
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
