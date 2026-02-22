// @salsa - SALSA Compliance: Shared UK allergen utility (single source of truth)

/**
 * UK 14 Allergens — EU Food Information Regulation
 * Canonical short keys used everywhere in the database.
 * Display labels used for UI rendering.
 */
export const UK_ALLERGENS = [
  { key: 'celery', label: 'Celery' },
  { key: 'gluten', label: 'Cereals containing gluten' },
  { key: 'crustaceans', label: 'Crustaceans' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'fish', label: 'Fish' },
  { key: 'lupin', label: 'Lupin' },
  { key: 'milk', label: 'Milk' },
  { key: 'molluscs', label: 'Molluscs' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'nuts', label: 'Nuts (tree nuts)' },
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'sesame', label: 'Sesame' },
  { key: 'soybeans', label: 'Soybeans' },
  { key: 'sulphites', label: 'Sulphites/Sulphur dioxide' },
] as const;

export type AllergenKey = (typeof UK_ALLERGENS)[number]['key'];

/** All valid allergen keys */
export const ALLERGEN_KEYS: AllergenKey[] = UK_ALLERGENS.map((a) => a.key);

/** Map short key → display label */
const keyToLabelMap = new Map(UK_ALLERGENS.map((a) => [a.key, a.label]));

/** Map full label → short key (for migration from old full-name format) */
const labelToKeyMap = new Map<string, AllergenKey>([
  // Exact matches
  ...UK_ALLERGENS.map((a) => [a.label.toLowerCase(), a.key] as [string, AllergenKey]),
  // Legacy full-name matches from ingredients_library
  ['cereals containing gluten', 'gluten'],
  ['sulphites/sulphur dioxide', 'sulphites'],
  ['nuts', 'nuts'],
  ['tree nuts', 'nuts'],
  ['nuts (tree nuts)', 'nuts'],
  ['soya', 'soybeans'],
  ['soy', 'soybeans'],
]);

/** Convert a short key to its display label. Returns key if not found. */
export function allergenKeyToLabel(key: string): string {
  return keyToLabelMap.get(key) || key;
}

/** Convert a full label (or mixed format) to its short key. Returns lowercased input if no match. */
export function allergenLabelToKey(label: string): AllergenKey {
  const normalised = label.toLowerCase().trim();
  // Direct key match
  if (keyToLabelMap.has(normalised)) return normalised as AllergenKey;
  // Label → key lookup
  const mapped = labelToKeyMap.get(normalised);
  if (mapped) return mapped;
  // Fallback: return as-is (lowercased)
  return normalised as AllergenKey;
}

/**
 * Normalise an array of allergens (mixed keys/labels) to canonical short keys.
 * Deduplicates and filters to only valid UK allergen keys.
 */
export function normalizeAllergens(allergens: string[]): AllergenKey[] {
  const keys = new Set<AllergenKey>();
  for (const allergen of allergens) {
    const key = allergenLabelToKey(allergen);
    if (ALLERGEN_KEYS.includes(key)) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}
