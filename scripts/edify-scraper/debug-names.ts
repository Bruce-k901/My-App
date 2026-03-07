import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, 'extracted-data');

const suppliers = JSON.parse(readFileSync(join(DATA_DIR, 'suppliers-detail.json'), 'utf-8'));
const products = JSON.parse(readFileSync(join(DATA_DIR, 'products-by-supplier.json'), 'utf-8'));

console.log('Supplier names from detail:');
suppliers.forEach((s: any) => console.log(`  "${s.name}"`));
console.log('\nProduct group keys:');
Object.keys(products).forEach(k => console.log(`  "${k}"`));

// Check for mismatches
const supplierNames = new Set(suppliers.map((s: any) => s.name));
const productKeys = new Set(Object.keys(products));

console.log('\nIn products but not suppliers:');
for (const k of productKeys) {
  if (!supplierNames.has(k)) console.log(`  "${k}"`);
}
console.log('\nIn suppliers but not products:');
for (const n of supplierNames) {
  if (!productKeys.has(n)) console.log(`  "${n}"`);
}
