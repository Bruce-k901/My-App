// src/lib/utils/unitConversions.ts
//
// Unit conversion utilities for production calculations
//

/**
 * Normalize recipe yield to kilograms
 * Used for production calculations that operate in kg
 *
 * @param yieldQuantity - The numeric yield amount
 * @param yieldUnit - The unit string (g, kg, etc)
 * @returns The yield quantity converted to kilograms
 */
export function normalizeYieldToKg(yieldQuantity: number, yieldUnit: string): number {
  const unit = (yieldUnit || 'kg').toLowerCase().trim();

  // Kilograms - no conversion needed
  if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms' || unit === 'kgs') {
    return yieldQuantity;
  }

  // Grams - convert to kg
  if (unit === 'g' || unit === 'gram' || unit === 'grams') {
    return yieldQuantity / 1000;
  }

  // Default to treating as kg for other units (L, ml, etc.)
  // These would need density considerations for accurate conversion
  return yieldQuantity;
}

interface UnitNormalized {
  quantity: number;
  baseUnit: string;
}

/**
 * Normalize a quantity+unit to the base unit of its family.
 * - Weight family: base = 'g' (kg→g, g→g)
 * - Volume family: base = 'ml' (litres→ml, ml→ml)
 * - Other units: returned as-is (no conversion)
 */
export function normalizeToBaseUnit(quantity: number, unit: string): UnitNormalized {
  const u = (unit || '').toLowerCase().trim();

  // Weight family → grams
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms' || u === 'kgs') {
    return { quantity: quantity * 1000, baseUnit: 'g' };
  }
  if (u === 'g' || u === 'gram' || u === 'grams') {
    return { quantity, baseUnit: 'g' };
  }

  // Volume family → ml
  if (u === 'litres' || u === 'litre' || u === 'liter' || u === 'liters' || u === 'l' || u === 'lt' || u === 'ltr') {
    return { quantity: quantity * 1000, baseUnit: 'ml' };
  }
  if (u === 'ml' || u === 'millilitre' || u === 'millilitres' || u === 'milliliter' || u === 'milliliters') {
    return { quantity, baseUnit: 'ml' };
  }

  // No conversion possible
  return { quantity, baseUnit: u };
}

/**
 * Convert a quantity from one unit to a target unit within the same family.
 * Returns { quantity, unit } in the target unit if convertible,
 * or the original values if not in the same family.
 *
 * @example convertQuantity(18200, 'g', 'kg') → { quantity: 18.2, unit: 'kg' }
 * @example convertQuantity(4900, 'ml', 'litres') → { quantity: 4.9, unit: 'litres' }
 * @example convertQuantity(350, 'g', 'portions') → { quantity: 350, unit: 'g' } (no conversion)
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
): { quantity: number; unit: string } {
  if (!fromUnit || !toUnit) return { quantity, unit: fromUnit || toUnit || '' };

  const from = normalizeToBaseUnit(quantity, fromUnit);
  const toRef = normalizeToBaseUnit(1, toUnit);

  // Same unit family — convert via base unit
  if (from.baseUnit === toRef.baseUnit && toRef.quantity > 0) {
    return {
      quantity: Math.round((from.quantity / toRef.quantity) * 1000) / 1000,
      unit: toUnit,
    };
  }

  // Different families — no conversion
  return { quantity, unit: fromUnit };
}
