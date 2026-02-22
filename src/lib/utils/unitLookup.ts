/**
 * Unit lookup and normalization utilities
 * Handles fuzzy matching for unit names and abbreviations
 */

export interface UOM {
  id: string;
  name: string;
  abbreviation: string;
  unit_type: string;
}

/**
 * Normalize unit text for fuzzy matching
 * Removes spaces, converts to lowercase, handles common variations
 */
export function normalizeUnitText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

/**
 * Fuzzy match unit text against UOM list
 * Returns the best matching UOM abbreviation or null
 */
export function fuzzyMatchUnit(
  inputText: string,
  uomList: UOM[]
): string | null {
  if (!inputText || !uomList.length) return null;

  const normalizedInput = normalizeUnitText(inputText);

  // Exact match on abbreviation (case-insensitive)
  const exactAbbrMatch = uomList.find(
    (uom) => normalizeUnitText(uom.abbreviation) === normalizedInput
  );
  if (exactAbbrMatch) return exactAbbrMatch.abbreviation;

  // Exact match on name (case-insensitive, normalized)
  const exactNameMatch = uomList.find(
    (uom) => normalizeUnitText(uom.name) === normalizedInput
  );
  if (exactNameMatch) return exactNameMatch.abbreviation;

  // Partial match - abbreviation contains input or vice versa
  const partialAbbrMatch = uomList.find(
    (uom) =>
      normalizeUnitText(uom.abbreviation).includes(normalizedInput) ||
      normalizedInput.includes(normalizeUnitText(uom.abbreviation))
  );
  if (partialAbbrMatch) return partialAbbrMatch.abbreviation;

  // Partial match on name
  const partialNameMatch = uomList.find(
    (uom) =>
      normalizeUnitText(uom.name).includes(normalizedInput) ||
      normalizedInput.includes(normalizeUnitText(uom.name))
  );
  if (partialNameMatch) return partialNameMatch.abbreviation;

  // Common variations mapping
  const variations: Record<string, string> = {
    'kgs': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'gram': 'g',
    'grams': 'g',
    'litre': 'L',
    'litres': 'L',
    'liter': 'L',
    'liters': 'L',
    'mls': 'ml',
    'millilitre': 'ml',
    'milliliter': 'ml',
    'millilitres': 'ml',
    'milliliters': 'ml',
    'each': 'ea',
    'piece': 'ea',
    'pieces': 'ea',
    'pcs': 'ea',
    'pcs.': 'ea',
  };

  const normalizedVar = normalizedInput;
  if (variations[normalizedVar]) {
    const matchedUOM = uomList.find(
      (uom) => normalizeUnitText(uom.abbreviation) === normalizeUnitText(variations[normalizedVar])
    );
    if (matchedUOM) return matchedUOM.abbreviation;
  }

  return null;
}

